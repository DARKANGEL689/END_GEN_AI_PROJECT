import type { AtomicClaim } from '../entities/claim';

export interface QualityBreakdown {
  traceabilityScore: number; // S1 (0.25)
  epistemicHedgingScore: number; // S2 (0.15)
  sectionCompletenessScore: number; // S3 (0.15)
  terminologyScore: number; // S4 (0.15)
  readabilityScore: number; // S5 (0.10)
  actionabilityScore: number; // S6 (0.10)
  concisenessScore: number; // S7 (0.10)
  overallScore: number; // Q (0-100)
}

export interface QualityComputationInput {
  bodyText: string;
  claims: AtomicClaim[];
  mandatorySections: string[];
  forbiddenPhrasesFound: string[];
  unhedgedSuspectedCount: number;
  audience: string;
}

/**
 * Computes deterministic Flesch-Kincaid Reading Ease score.
 */
function computeReadabilityScore(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  if (words.length === 0 || sentences.length === 0) return 80;

  const syllables = words.reduce((acc, word) => {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (clean.length <= 3) return acc + 1;
    const match = clean.match(/[aeiouy]{1,2}/g);
    return acc + (match ? match.length : 1);
  }, 0);

  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = syllables / words.length;

  // Standard Flesch Reading Ease formula
  const flesch = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  // Normalize to 0-100
  return Math.max(0, Math.min(100, Math.round(flesch)));
}

/**
 * Computes overall quality score and 7-dimension breakdown.
 */
export function computeQualityScore(input: QualityComputationInput): QualityBreakdown {
  const totalClaims = input.claims.length;
  const supportedClaims = input.claims.filter(
    (c) => c.verdict === 'SUPPORTED' || !c.verdict // Default to supported if verified
  ).length;

  // S1: Traceability & Grounding (Weight: 0.25)
  const s1 = totalClaims > 0 ? Math.round((supportedClaims / totalClaims) * 100) : 100;

  // S2: Epistemic Hedging Accuracy (Weight: 0.15)
  const s2 = Math.max(0, 100 - input.unhedgedSuspectedCount * 25);

  // S3: Audience Section Completeness (Weight: 0.15)
  const lowerBody = input.bodyText.toLowerCase();
  const presentSections = input.mandatorySections.filter((sec) =>
    lowerBody.includes(sec.toLowerCase())
  ).length;
  const s3 =
    input.mandatorySections.length > 0
      ? Math.round((presentSections / input.mandatorySections.length) * 100)
      : 100;

  // S4: Terminology & Policy Conformance (Weight: 0.15)
  const s4 = Math.max(0, 100 - input.forbiddenPhrasesFound.length * 30);

  // S5: Readability & Grade-Level Fit (Weight: 0.10)
  const s5 = computeReadabilityScore(input.bodyText);

  // S6: Actionability & Guidance Clarity (Weight: 0.10)
  const actionMarkers = ['must', 'should', 'immediately', 'remediation', 'action', 'apply', 'isolate'];
  const actionCount = actionMarkers.filter((m) => lowerBody.includes(m)).length;
  const s6 = Math.min(100, actionCount * 20);

  // S7: Conciseness & Information Density (Weight: 0.10)
  const wordCount = input.bodyText.trim().split(/\s+/).length;
  let s7 = 100;
  if (wordCount < 100) s7 = 60;
  else if (wordCount > 1000) s7 = 70;

  // Weighted Sum: Q = sum(w_i * S_i)
  const overallScore = Math.round(
    0.25 * s1 +
    0.15 * s2 +
    0.15 * s3 +
    0.15 * s4 +
    0.10 * s5 +
    0.10 * s6 +
    0.10 * s7
  );

  return {
    traceabilityScore: s1,
    epistemicHedgingScore: s2,
    sectionCompletenessScore: s3,
    terminologyScore: s4,
    readabilityScore: s5,
    actionabilityScore: s6,
    concisenessScore: s7,
    overallScore,
  };
}
