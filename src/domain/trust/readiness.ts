import type { AtomicClaim } from '../entities/claim';
import type { CompiledContextBundle } from './compiler';

export type ReadinessState = 'BLOCKED' | 'NEEDS_REVIEW' | 'REVIEW_READY';

export interface ReadinessIssue {
  severity: 'CRITICAL' | 'WARNING';
  category:
    | 'UNRESOLVED_POINTER'
    | 'FABRICATED_QUOTE'
    | 'UNSUPPORTED_CLAIM'
    | 'EPISTEMIC_BREACH'
    | 'SECRET_OR_PII_LEAK'
    | 'MISSING_SECTION'
    | 'TERMINOLOGY_VIOLATION'
    | 'LOW_QUALITY_SCORE';
  message: string;
  claimId?: string;
}

export interface ReadinessEvaluation {
  state: ReadinessState;
  score: number;
  isBlocked: boolean;
  issues: ReadinessIssue[];
  metrics: {
    totalClaims: number;
    supportedClaims: number;
    resolvedPointersCount: number;
    totalPointersCount: number;
    mandatorySectionsCount: number;
    foundSectionsCount: number;
  };
}

export interface ReadinessEvaluationInput {
  bodyText: string;
  claims: AtomicClaim[];
  contextBundle: CompiledContextBundle;
  qualityScore: number;
}

const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/i, // AWS Access Key
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i, // RSA / SSH Private key
  /(?:password|passwd|api[_-]?key|bearer\s+[a-z0-9_-]{20,})\s*[:=]\s*['"][^'"]+['"]/i, // Exposed credentials
];

const HEDGING_WORDS = [
  'suspected',
  'potential',
  'preliminary',
  'investigating',
  'unconfirmed',
  'indicators suggest',
  'under evaluation',
  'currently assessing',
  'possible',
];

/**
 * Evaluates the deterministic Readiness Gate according to docs/READINESS_SPEC.md
 */
export function evaluateReadiness(input: ReadinessEvaluationInput): ReadinessEvaluation {
  const issues: ReadinessIssue[] = [];
  const { bodyText, claims, contextBundle, qualityScore } = input;
  const lowerBody = bodyText.toLowerCase();

  // 1. Check for Secret / PII Leaks
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(bodyText)) {
      issues.push({
        severity: 'CRITICAL',
        category: 'SECRET_OR_PII_LEAK',
        message: 'Draft contains high-entropy secret, credential, or private key pattern.',
      });
      break;
    }
  }

  // 2. Check Missing Mandatory Sections
  const mandatorySections = contextBundle.template.mandatorySections;
  let foundSectionsCount = 0;
  for (const section of mandatorySections) {
    if (lowerBody.includes(section.toLowerCase())) {
      foundSectionsCount++;
    } else {
      issues.push({
        severity: 'CRITICAL',
        category: 'MISSING_SECTION',
        message: `Mandatory audience section "${section}" is missing from draft.`,
      });
    }
  }

  // 3. Check Grounding Pointers & Fabricated Quotes
  let totalPointersCount = 0;
  let resolvedPointersCount = 0;

  // Build lookup index of all valid source IDs and their contents
  const sourceIndex = new Map<string, string>();
  sourceIndex.set('incident', `${contextBundle.incident.title} ${contextBundle.incident.description}`);
  for (const [key, fact] of Object.entries(contextBundle.epistemicFacts)) {
    sourceIndex.set(`incident.${key}`, `${fact.status} ${fact.details || ''}`);
    sourceIndex.set(key, `${fact.status} ${fact.details || ''}`);
  }
  for (const adv of contextBundle.advisories) {
    sourceIndex.set(adv.id, adv.content);
  }
  sourceIndex.set('template', contextBundle.template.body);

  for (const claim of claims) {
    // 3a. Unsupported / Conflicting claims from verifier
    if (claim.verdict === 'UNSUPPORTED' || claim.verdict === 'CONFLICTING') {
      issues.push({
        severity: 'CRITICAL',
        category: 'UNSUPPORTED_CLAIM',
        message: `Claim ${claim.id} is marked as ${claim.verdict}: ${claim.verdictExplanation || claim.text}`,
        claimId: claim.id,
      });
    }

    if (claim.pointers && claim.pointers.length > 0) {
      for (const ptr of claim.pointers) {
        totalPointersCount++;
        const sourceText = sourceIndex.get(ptr.sourceId);

        if (!sourceText) {
          issues.push({
            severity: 'CRITICAL',
            category: 'UNRESOLVED_POINTER',
            message: `Claim ${claim.id} references non-existent sourceId "${ptr.sourceId}".`,
            claimId: claim.id,
          });
        } else {
          resolvedPointersCount++;
          // If quotedSpan is specified, verify it is genuinely in the source text
          if (ptr.quotedSpan) {
            const normalizedSource = sourceText.replace(/\s+/g, ' ').toLowerCase();
            const normalizedQuote = ptr.quotedSpan.replace(/\s+/g, ' ').trim().toLowerCase();
            if (!normalizedSource.includes(normalizedQuote)) {
              issues.push({
                severity: 'CRITICAL',
                category: 'FABRICATED_QUOTE',
                message: `Claim ${claim.id} contains quote span not found in source "${ptr.sourceId}": "${ptr.quotedSpan.slice(0, 50)}..."`,
                claimId: claim.id,
              });
            }
          }
        }
      }
    }
  }

  // 4. Epistemic Breach Checks
  for (const [field, fact] of Object.entries(contextBundle.epistemicFacts)) {
    const fieldNameReadable = field.replace(/([A-Z])/g, ' $1').toLowerCase();

    if (fact.status === 'UNKNOWN') {
      // If field is UNKNOWN, asserting definitive outcomes is a critical breach
      const affirmativeBreach =
        (field === 'exfiltration' && /\b(data (was|has been) exfiltrated|records were exfiltrated|attacker stole)\b/i.test(bodyText)) ||
        (field === 'rootCause' && /\b(root cause is definitively|determined root cause)\b/i.test(bodyText));

      if (affirmativeBreach) {
        issues.push({
          severity: 'CRITICAL',
          category: 'EPISTEMIC_BREACH',
          message: `Epistemic breach: ${fieldNameReadable} is UNKNOWN in incident record, but asserted definitively in draft.`,
        });
      }
    } else if (fact.status === 'SUSPECTED') {
      // If SUSPECTED, must be accompanied by epistemic hedging
      const mentionsField = bodyText.toLowerCase().includes(field.toLowerCase()) ||
        bodyText.toLowerCase().includes(fieldNameReadable);

      if (mentionsField) {
        const hasHedge = HEDGING_WORDS.some((hedge) => lowerBody.includes(hedge));
        if (!hasHedge) {
          issues.push({
            severity: 'WARNING',
            category: 'EPISTEMIC_BREACH',
            message: `Field ${fieldNameReadable} is SUSPECTED but draft does not include required epistemic hedging words.`,
          });
        }
      }
    }
  }

  // 5. Terminology Warnings
  for (const rule of contextBundle.terminologyRules) {
    for (const forbidden of rule.forbidden) {
      if (lowerBody.includes(forbidden.toLowerCase())) {
        issues.push({
          severity: 'WARNING',
          category: 'TERMINOLOGY_VIOLATION',
          message: `Forbidden synonym "${forbidden}" detected. Use approved term "${rule.term}".`,
        });
      }
    }
  }

  // 6. Quality Score Warnings
  if (qualityScore < 70) {
    issues.push({
      severity: 'WARNING',
      category: 'LOW_QUALITY_SCORE',
      message: `Quality score is ${qualityScore}/100, which is below the review threshold (70).`,
    });
  }

  // Determine Final State
  const hasCritical = issues.some((i) => i.severity === 'CRITICAL');
  const hasWarnings = issues.some((i) => i.severity === 'WARNING');

  let state: ReadinessState = 'REVIEW_READY';
  if (hasCritical) {
    state = 'BLOCKED';
  } else if (hasWarnings || qualityScore < 85) {
    state = 'NEEDS_REVIEW';
  }

  const supportedClaims = claims.filter(
    (c) => c.verdict === 'SUPPORTED' || !c.verdict
  ).length;

  return {
    state,
    score: qualityScore,
    isBlocked: state === 'BLOCKED',
    issues,
    metrics: {
      totalClaims: claims.length,
      supportedClaims,
      resolvedPointersCount,
      totalPointersCount,
      mandatorySectionsCount: mandatorySections.length,
      foundSectionsCount,
    },
  };
}
