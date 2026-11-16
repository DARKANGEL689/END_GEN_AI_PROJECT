export type ClaimType = 'FACT' | 'INSTRUCTION' | 'ESTIMATE' | 'COMMITMENT';

export type SourceType = 'INCIDENT_FIELD' | 'ADVISORY' | 'MEMORY_TEMPLATE';

export interface EvidencePointer {
  sourceType: SourceType;
  sourceId: string; // incident field key, advisory ID, or template ID
  sourceTitle?: string;
  quotedSpan?: string; // Exact substring that must exist in source
}

export type ClaimVerificationVerdict =
  | 'SUPPORTED'
  | 'UNSUPPORTED'
  | 'CONFLICTING'
  | 'AMBIGUOUS';

export interface AtomicClaim {
  id: string; // e.g. "c1", "c2"
  text: string;
  type: ClaimType;
  pointers: EvidencePointer[];
  verdict?: ClaimVerificationVerdict;
  verdictExplanation?: string;
}

export interface GroundingContextBundle {
  incidentFields: Record<string, { status: string; value: string }>;
  advisories: Array<{ id: string; domain: string; content: string }>;
  templates: Array<{ id: string; title: string; content: string }>;
}
