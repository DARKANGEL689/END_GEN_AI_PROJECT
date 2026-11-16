export type DraftStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'INVALIDATED'
  | 'EXPORTED';

export type ReadinessState = 'BLOCKED' | 'NEEDS_REVIEW' | 'REVIEW_READY';

export interface StateTransitionContext {
  readinessGate: ReadinessState;
  currentContentHash: string;
  currentFactsHash: string;
  approvedDigest?: string | null;
  rationale?: string;
}

export interface TransitionResult {
  allowed: boolean;
  nextStatus?: DraftStatus;
  reason?: string;
}

/**
 * Validates state machine transition according to strict governance rules.
 */
export function transitionDraftState(
  fromStatus: DraftStatus,
  targetStatus: DraftStatus,
  context: StateTransitionContext
): TransitionResult {
  // 1. DRAFT -> PENDING_REVIEW
  if (fromStatus === 'DRAFT' && targetStatus === 'PENDING_REVIEW') {
    if (context.readinessGate === 'BLOCKED') {
      return {
        allowed: false,
        reason: 'Cannot request review while draft readiness gate is BLOCKED',
      };
    }
    return { allowed: true, nextStatus: 'PENDING_REVIEW' };
  }

  // 2. PENDING_REVIEW -> APPROVED
  if (fromStatus === 'PENDING_REVIEW' && targetStatus === 'APPROVED') {
    if (context.readinessGate === 'BLOCKED') {
      return {
        allowed: false,
        reason: 'Cannot approve a draft with BLOCKED readiness',
      };
    }
    return { allowed: true, nextStatus: 'APPROVED' };
  }

  // 3. PENDING_REVIEW -> REJECTED
  if (fromStatus === 'PENDING_REVIEW' && targetStatus === 'REJECTED') {
    return { allowed: true, nextStatus: 'REJECTED' };
  }

  // 4. APPROVED -> EXPORTED
  if (fromStatus === 'APPROVED' && targetStatus === 'EXPORTED') {
    return { allowed: true, nextStatus: 'EXPORTED' };
  }

  // 5. APPROVED -> INVALIDATED
  if (fromStatus === 'APPROVED' && targetStatus === 'INVALIDATED') {
    return { allowed: true, nextStatus: 'INVALIDATED' };
  }

  // 6. Any status back to DRAFT for new revisions
  if (targetStatus === 'DRAFT') {
    return { allowed: true, nextStatus: 'DRAFT' };
  }

  return {
    allowed: false,
    reason: `Illegal state transition from ${fromStatus} to ${targetStatus}`,
  };
}

/**
 * Verifies whether an existing approval is still cryptographically valid.
 */
export function isApprovalDigestValid(
  expectedDigest: string | null | undefined,
  currentContentHash: string,
  currentFactsHash: string,
  computeDigestFn: (c: string, f: string) => string
): boolean {
  if (!expectedDigest) return false;
  const currentDigest = computeDigestFn(currentContentHash, currentFactsHash);
  return expectedDigest === currentDigest;
}
