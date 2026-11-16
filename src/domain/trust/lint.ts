import type { AtomicClaim, EvidencePointer } from '../entities/claim';

export interface DeterministicLintIssue {
  type: 'POINTER_MISSING' | 'QUOTE_MISMATCH' | 'FORBIDDEN_PHRASE' | 'SECRET_DETECTED' | 'HEDGE_MISSING';
  severity: 'BLOCKING' | 'WARNING';
  claimId?: string;
  message: string;
}

// Regex patterns for secrets and sensitive material
const SECRET_PATTERNS = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Generic Secret Token', regex: /(?:api[_-]?key|client[_-]?secret|password|bearer)\s*[:=]\s*["']?[A-Za-z0-9_\-\.]{20,}["']?/i },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
];

// Forbidden absolute phrases for suspected or unknown context
const ABSOLUTE_GUARANTEE_PHRASES = [
  'guarantee that',
  'we guarantee',
  'there is no risk',
  'zero impact',
  'no data was accessed', // forbidden unless CONFIRMED
  'impossible to breach',
  '100% secure',
];

const HEDGING_REQUIRED_WORDS = [
  'suspected',
  'preliminary',
  'potential',
  'under investigation',
  'apparent',
  'indicates possible',
];

/**
 * Runs fast, deterministic auditing against claims, quoted spans, and body text.
 */
export function runDeterministicLint(
  bodyText: string,
  claims: AtomicClaim[],
  contextBundle: {
    incidentFields: Record<string, { status: string; value: string }>;
    advisories: Array<{ id: string; content: string }>;
    templates: Array<{ id: string; content: string }>;
  }
): DeterministicLintIssue[] {
  const issues: DeterministicLintIssue[] = [];

  // 1. Secret & PII Scanning
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(bodyText)) {
      issues.push({
        type: 'SECRET_DETECTED',
        severity: 'BLOCKING',
        message: `Potential credential or secret detected (${pattern.name}) in draft text. Redaction required.`,
      });
    }
  }

  // 2. Guarantee Phrase Checks
  const lowerBody = bodyText.toLowerCase();
  for (const phrase of ABSOLUTE_GUARANTEE_PHRASES) {
    if (lowerBody.includes(phrase)) {
      issues.push({
        type: 'FORBIDDEN_PHRASE',
        severity: 'BLOCKING',
        message: `Forbidden absolute guarantee phrase detected: "${phrase}". Revise with objective, measured terminology.`,
      });
    }
  }

  // 3. Claim Pointer & Quoted Span Verification
  const advisoryMap = new Map(contextBundle.advisories.map((a) => [a.id, a.content]));
  const templateMap = new Map(contextBundle.templates.map((t) => [t.id, t.content]));

  for (const claim of claims) {
    if (!claim.pointers || claim.pointers.length === 0) {
      issues.push({
        type: 'POINTER_MISSING',
        severity: 'BLOCKING',
        claimId: claim.id,
        message: `Claim [${claim.id}] ("${claim.text.slice(0, 40)}...") has no evidence pointers.`,
      });
      continue;
    }

    for (const pointer of claim.pointers) {
      if (pointer.sourceType === 'ADVISORY') {
        const sourceText = advisoryMap.get(pointer.sourceId);
        if (!sourceText) {
          issues.push({
            type: 'POINTER_MISSING',
            severity: 'BLOCKING',
            claimId: claim.id,
            message: `Claim [${claim.id}] points to advisory ID "${pointer.sourceId}" which does not exist in context.`,
          });
        } else if (pointer.quotedSpan) {
          if (!sourceText.includes(pointer.quotedSpan)) {
            issues.push({
              type: 'QUOTE_MISMATCH',
              severity: 'BLOCKING',
              claimId: claim.id,
              message: `Claim [${claim.id}] quote "${pointer.quotedSpan.slice(0, 30)}..." does not exist verbatim in advisory source.`,
            });
          }
        }
      } else if (pointer.sourceType === 'INCIDENT_FIELD') {
        const field = contextBundle.incidentFields[pointer.sourceId];
        if (!field) {
          issues.push({
            type: 'POINTER_MISSING',
            severity: 'BLOCKING',
            claimId: claim.id,
            message: `Claim [${claim.id}] points to non-existent incident field "${pointer.sourceId}".`,
          });
        } else {
          // Epistemic check on the field
          if (field.status === 'UNKNOWN' && claim.type === 'FACT') {
            issues.push({
              type: 'HEDGE_MISSING',
              severity: 'BLOCKING',
              claimId: claim.id,
              message: `Field "${pointer.sourceId}" is UNKNOWN, but claim [${claim.id}] states it as a FACT.`,
            });
          }
          if (field.status === 'SUSPECTED') {
            const claimLower = claim.text.toLowerCase();
            const hasHedge = HEDGING_REQUIRED_WORDS.some((h) => claimLower.includes(h));
            if (!hasHedge) {
              issues.push({
                type: 'HEDGE_MISSING',
                severity: 'WARNING',
                claimId: claim.id,
                message: `Field "${pointer.sourceId}" is SUSPECTED. Claim [${claim.id}] should include epistemic hedging language (e.g. "suspected", "preliminary", "under investigation").`,
              });
            }
          }
        }
      }
    }
  }

  return issues;
}
