import { describe, it, expect } from 'vitest';
import { transitionDraftState } from '../../src/domain/statemachine/approval';
import {
  computeContentHash,
  computeFactsHash,
  computeApprovalDigest,
} from '../../src/domain/trust/hash';

describe('Approval State Machine & Hash Invalidation', () => {
  it('blocks transition to PENDING_REVIEW when readiness gate is BLOCKED', () => {
    const res = transitionDraftState('DRAFT', 'PENDING_REVIEW', {
      readinessGate: 'BLOCKED',
      currentContentHash: 'hash-1',
      currentFactsHash: 'facts-1',
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('BLOCKED');
  });

  it('permits transition to PENDING_REVIEW when readiness is REVIEW_READY', () => {
    const res = transitionDraftState('DRAFT', 'PENDING_REVIEW', {
      readinessGate: 'REVIEW_READY',
      currentContentHash: 'hash-1',
      currentFactsHash: 'facts-1',
    });
    expect(res.allowed).toBe(true);
    expect(res.nextStatus).toBe('PENDING_REVIEW');
  });

  it('invalidates approval digest when draft content changes', () => {
    const claims = [{ id: 'c1', text: 'All systems isolated', type: 'FACT' as const, pointers: [] }];
    const contentHashV1 = computeContentHash('EXECUTIVE', 1, 'Draft body v1', claims);
    const factsHash = computeFactsHash({
      severity: 'CRITICAL',
      status: 'ACTIVE',
      accessScopeStatus: 'CONFIRMED',
      exfiltrationStatus: 'UNKNOWN',
      rootCauseStatus: 'SUSPECTED',
      affectedSystemsStatus: 'CONFIRMED',
      mitigationStatus: 'SUSPECTED',
      advisoryIds: ['adv-1'],
    });

    const approvalDigest = computeApprovalDigest(contentHashV1, factsHash);

    // Now simulate an edit to the draft body
    const contentHashV2 = computeContentHash('EXECUTIVE', 2, 'Draft body v2 (modified)', claims);
    const recomputedDigest = computeApprovalDigest(contentHashV2, factsHash);

    expect(approvalDigest).not.toBe(recomputedDigest);
  });

  it('invalidates approval digest when incident facts change (e.g. exfiltration confirmed)', () => {
    const claims = [{ id: 'c1', text: 'Isolation active', type: 'FACT' as const, pointers: [] }];
    const contentHash = computeContentHash('EXECUTIVE', 1, 'Draft body v1', claims);

    const factsHashInitial = computeFactsHash({
      severity: 'CRITICAL',
      status: 'ACTIVE',
      accessScopeStatus: 'CONFIRMED',
      exfiltrationStatus: 'UNKNOWN',
      rootCauseStatus: 'SUSPECTED',
      affectedSystemsStatus: 'CONFIRMED',
      mitigationStatus: 'SUSPECTED',
      advisoryIds: [],
    });

    const digestInitial = computeApprovalDigest(contentHash, factsHashInitial);

    // Later, exfiltration is CONFIRMED
    const factsHashUpdated = computeFactsHash({
      severity: 'CRITICAL',
      status: 'ACTIVE',
      accessScopeStatus: 'CONFIRMED',
      exfiltrationStatus: 'CONFIRMED',
      exfiltrationDetails: '10,000 records exfiltrated via compromised VPN credentials',
      rootCauseStatus: 'SUSPECTED',
      affectedSystemsStatus: 'CONFIRMED',
      mitigationStatus: 'SUSPECTED',
      advisoryIds: [],
    });

    const digestUpdated = computeApprovalDigest(contentHash, factsHashUpdated);
    expect(digestInitial).not.toBe(digestUpdated);
  });
});
