import { createHash } from 'crypto';
import type { AtomicClaim } from '../entities/claim';

/**
 * Computes deterministic SHA-256 hash of communication draft content.
 */
export function computeContentHash(
  audience: string,
  version: number,
  bodyText: string,
  claims: AtomicClaim[]
): string {
  // Normalize claims to sorted representation for deterministic hashing
  const normalizedClaims = [...claims].sort((a, b) => a.id.localeCompare(b.id));
  const payload = `${audience}::v${version}::${bodyText.trim()}::${JSON.stringify(normalizedClaims)}`;
  return createHash('sha256').update(payload).digest('hex');
}

export interface IncidentFactSnapshot {
  severity: string;
  status: string;
  accessScopeStatus: string;
  accessScopeDetails?: string | null;
  exfiltrationStatus: string;
  exfiltrationDetails?: string | null;
  rootCauseStatus: string;
  rootCauseDetails?: string | null;
  affectedSystemsStatus: string;
  affectedSystemsDetails?: string | null;
  mitigationStatus: string;
  mitigationDetails?: string | null;
  regulatoryApplicability?: string | null;
  advisoryIds: string[];
}

/**
 * Computes deterministic SHA-256 hash of incident facts & epistemic statuses.
 */
export function computeFactsHash(snapshot: IncidentFactSnapshot): string {
  const sortedAdvisories = [...snapshot.advisoryIds].sort();
  const payload = JSON.stringify({
    severity: snapshot.severity,
    status: snapshot.status,
    accessScope: `${snapshot.accessScopeStatus}:${snapshot.accessScopeDetails || ''}`,
    exfiltration: `${snapshot.exfiltrationStatus}:${snapshot.exfiltrationDetails || ''}`,
    rootCause: `${snapshot.rootCauseStatus}:${snapshot.rootCauseDetails || ''}`,
    affectedSystems: `${snapshot.affectedSystemsStatus}:${snapshot.affectedSystemsDetails || ''}`,
    mitigation: `${snapshot.mitigationStatus}:${snapshot.mitigationDetails || ''}`,
    regulatory: snapshot.regulatoryApplicability || '',
    advisories: sortedAdvisories,
  });
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Computes cryptographic approval digest tying draft content to incident facts.
 */
export function computeApprovalDigest(contentHash: string, factsHash: string): string {
  return createHash('sha256').update(`${contentHash}::${factsHash}`).digest('hex');
}
