import type { AtomicClaim } from '../entities/claim';

export interface GenerationInput {
  incidentNumber: string;
  title: string;
  severity: string;
  category: string;
  epistemicFacts: Record<string, { status: string; details?: string | null }>;
  advisories: Array<{ id: string; title: string; content: string; domain: string }>;
  template: { title: string; mandatorySections: string[]; body: string };
  terminologyRules: Array<{ term: string; definition: string; forbidden: string[] }>;
  audience: string;
}

export interface GenerationResult {
  bodyText: string;
  claims: AtomicClaim[];
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface VerificationInput {
  claims: AtomicClaim[];
  contextBundle: {
    incidentFields: Record<string, { status: string; value: string }>;
    advisories: Array<{ id: string; text: string }>;
  };
}

export interface VerificationResult {
  verdicts: Array<{
    claimId: string;
    verdict: 'SUPPORTED' | 'UNSUPPORTED' | 'CONFLICTING' | 'AMBIGUOUS';
    explanation: string;
  }>;
}

export interface LlmProvider {
  name: string;
  generateAudienceDraft(input: GenerationInput): Promise<GenerationResult>;
  verifyClaims(input: VerificationInput): Promise<VerificationResult>;
  checkHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; latencyMs: number; details?: string }>;
}
