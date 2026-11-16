import type { AudienceType } from '@prisma/client';

export interface ConsistencyViolation {
  id: string;
  severity: 'CRITICAL' | 'WARNING';
  category: 'EPISTEMIC_CONTRADICTION' | 'SEVERITY_MISMATCH' | 'SCOPE_DISCREPANCY' | 'ROOT_CAUSE_CONFLICT';
  audiences: AudienceType[];
  field: string;
  explanation: string;
  draftExcerpts: Record<string, string>;
}

export interface ConsistencyReport {
  hasViolations: boolean;
  criticalCount: number;
  warningCount: number;
  violations: ConsistencyViolation[];
}

export interface DraftSummaryForConsistency {
  audience: AudienceType;
  version: number;
  bodyText: string;
}

/**
 * Cross-Audience Consistency Checker.
 * Detects factual or epistemic contradictions across drafts prepared for different audiences.
 */
export function checkCrossAudienceConsistency(
  drafts: DraftSummaryForConsistency[]
): ConsistencyReport {
  const violations: ConsistencyViolation[] = [];

  if (drafts.length < 2) {
    return {
      hasViolations: false,
      criticalCount: 0,
      warningCount: 0,
      violations: [],
    };
  }

  // 1. Check Data Exfiltration Epistemic Consistency
  // If one draft states data was stolen/exfiltrated definitively, while another states unconfirmed/no exfiltration
  const exfilAffirmative: { audience: AudienceType; excerpt: string }[] = [];
  const exfilNegativeOrUnconfirmed: { audience: AudienceType; excerpt: string }[] = [];

  for (const draft of drafts) {
    const text = draft.bodyText.toLowerCase();

    // Look for affirmative exfiltration statements
    const hasAffirmative =
      /\b(data (was|has been) exfiltrated|records were exfiltrated|attacker stole|exfiltration confirmed)\b/i.test(
        text
      );
    const hasNegative =
      /\b(no evidence of (data )?exfiltration|exfiltration remains unconfirmed|no customer data (was )?accessed|exfiltration: unconfirmed)\b/i.test(
        text
      );

    if (hasAffirmative) {
      const match = draft.bodyText.match(
        /.{0,40}(?:data (?:was|has been) exfiltrated|records were exfiltrated|attacker stole|exfiltration confirmed).{0,40}/i
      );
      exfilAffirmative.push({
        audience: draft.audience,
        excerpt: match ? match[0].trim() : 'Data exfiltrated',
      });
    }

    if (hasNegative) {
      const match = draft.bodyText.match(
        /.{0,40}(?:no evidence of (?:data )?exfiltration|exfiltration remains unconfirmed|no customer data (?:was )?accessed|exfiltration: unconfirmed).{0,40}/i
      );
      exfilNegativeOrUnconfirmed.push({
        audience: draft.audience,
        excerpt: match ? match[0].trim() : 'Exfiltration unconfirmed',
      });
    }
  }

  if (exfilAffirmative.length > 0 && exfilNegativeOrUnconfirmed.length > 0) {
    const excerpts: Record<string, string> = {};
    for (const item of exfilAffirmative) {
      excerpts[item.audience] = `Affirmative: "${item.excerpt}"`;
    }
    for (const item of exfilNegativeOrUnconfirmed) {
      excerpts[item.audience] = `Unconfirmed: "${item.excerpt}"`;
    }

    violations.push({
      id: 'cons-exfil-01',
      severity: 'CRITICAL',
      category: 'EPISTEMIC_CONTRADICTION',
      audiences: [...exfilAffirmative.map((a) => a.audience), ...exfilNegativeOrUnconfirmed.map((a) => a.audience)],
      field: 'exfiltrationStatus',
      explanation:
        'Contradictory data exfiltration statements: one or more audience drafts assert confirmed exfiltration while other drafts assert no evidence or unconfirmed status.',
      draftExcerpts: excerpts,
    });
  }

  // 2. Check Severity Representation Alignment
  const severityMentions: Record<string, AudienceType[]> = {};
  for (const draft of drafts) {
    const text = draft.bodyText.toUpperCase();
    if (text.includes('CRITICAL')) {
      severityMentions['CRITICAL'] = [...(severityMentions['CRITICAL'] || []), draft.audience];
    }
    if (text.includes('LOW SEVERITY') || text.includes('SEVERITY: LOW')) {
      severityMentions['LOW'] = [...(severityMentions['LOW'] || []), draft.audience];
    }
  }

  if (severityMentions['CRITICAL']?.length && severityMentions['LOW']?.length) {
    violations.push({
      id: 'cons-sev-01',
      severity: 'CRITICAL',
      category: 'SEVERITY_MISMATCH',
      audiences: [...severityMentions['CRITICAL'], ...severityMentions['LOW']],
      field: 'severity',
      explanation:
        'Incident severity described inconsistently: designated CRITICAL in some audience drafts, but described as LOW severity in others.',
      draftExcerpts: {
        critical: severityMentions['CRITICAL'].join(', '),
        low: severityMentions['LOW'].join(', '),
      },
    });
  }

  // 3. Check Downtime / Outage Consistency
  const outageAffirmative: AudienceType[] = [];
  const outageDenial: AudienceType[] = [];

  for (const draft of drafts) {
    const text = draft.bodyText.toLowerCase();
    if (/\b(complete system outage|services are down|widespread downtime)\b/i.test(text)) {
      outageAffirmative.push(draft.audience);
    }
    if (/\b(zero downtime|services remain operational|no impact to production)\b/i.test(text)) {
      outageDenial.push(draft.audience);
    }
  }

  if (outageAffirmative.length > 0 && outageDenial.length > 0) {
    violations.push({
      id: 'cons-scope-01',
      severity: 'WARNING',
      category: 'SCOPE_DISCREPANCY',
      audiences: [...outageAffirmative, ...outageDenial],
      field: 'operationalImpact',
      explanation:
        'Discrepancy in service availability: one draft reports downtime/outage while another reports zero downtime/continuous operations.',
      draftExcerpts: {
        reportedOutage: outageAffirmative.join(', '),
        reportedZeroDowntime: outageDenial.join(', '),
      },
    });
  }

  const criticalCount = violations.filter((v) => v.severity === 'CRITICAL').length;
  const warningCount = violations.filter((v) => v.severity === 'WARNING').length;

  return {
    hasViolations: violations.length > 0,
    criticalCount,
    warningCount,
    violations,
  };
}
