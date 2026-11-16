import { prisma } from '@/infrastructure/db/client';
import { transitionDraftState } from '@/domain/statemachine/approval';
import { computeContentHash, computeApprovalDigest } from '@/domain/trust/hash';
import type { AuthUser } from '@/domain/permissions/rbac';
import type { DraftStatus, ReadinessState } from '@prisma/client';

export interface RequestReviewInput {
  draftId: string;
}

export interface SubmitApprovalInput {
  draftId: string;
  decision: 'APPROVE' | 'REJECT';
  rationale?: string;
}

export interface EditDraftInput {
  draftId: string;
  newBodyText: string;
  rationale?: string;
}

export class GovernanceService {
  /**
   * Promotes draft from DRAFT to PENDING_REVIEW if readiness gate permits.
   */
  async requestReview(actor: AuthUser, input: RequestReviewInput) {
    const draft = await prisma.communicationDraft.findUnique({
      where: { id: input.draftId },
      include: { incident: true },
    });

    if (!draft) {
      throw new Error(`Draft ${input.draftId} not found`);
    }

    const transition = transitionDraftState(
      draft.status as any,
      'PENDING_REVIEW',
      {
        readinessGate: draft.readinessGate as any,
        currentContentHash: draft.contentHash,
        currentFactsHash: draft.factsHash,
      }
    );

    if (!transition.allowed) {
      throw new Error(transition.reason || 'Transition to PENDING_REVIEW disallowed');
    }

    const updated = await prisma.communicationDraft.update({
      where: { id: input.draftId },
      data: {
        status: 'PENDING_REVIEW',
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: draft.incident.organizationId,
        incidentId: draft.incidentId,
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role as any,
        action: 'DRAFT_REVIEW_REQUESTED',
        entityType: 'COMMUNICATION_DRAFT',
        entityId: draft.id,
        newStateHash: draft.contentHash,
        metadataJson: JSON.stringify({
          audience: draft.audience,
          version: draft.version,
          readinessGate: draft.readinessGate,
        }),
      },
    });

    return updated;
  }

  /**
   * Records cryptographic approval decision (APPROVE | REJECT) by authorized reviewer.
   */
  async submitApprovalDecision(actor: AuthUser, input: SubmitApprovalInput) {
    const permittedRoles = ['LEGAL_COUNSEL', 'EXECUTIVE_REVIEWER', 'INCIDENT_MANAGER'];
    if (!permittedRoles.includes(actor.role)) {
      throw new Error(
        `Role ${actor.role} is not authorized to approve communications drafts. Required: Legal, Executive, or Incident Manager.`
      );
    }

    const draft = await prisma.communicationDraft.findUnique({
      where: { id: input.draftId },
      include: { incident: true },
    });

    if (!draft) {
      throw new Error(`Draft ${input.draftId} not found`);
    }

    const targetStatus: DraftStatus = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const transition = transitionDraftState(
      draft.status as any,
      targetStatus as any,
      {
        readinessGate: draft.readinessGate as any,
        currentContentHash: draft.contentHash,
        currentFactsHash: draft.factsHash,
      }
    );

    if (!transition.allowed) {
      throw new Error(transition.reason || `Transition to ${targetStatus} disallowed`);
    }

    let decisionDigest = '';

    if (input.decision === 'APPROVE') {
      // Cryptographically compute approval digest binding content + facts + reviewer
      decisionDigest = computeApprovalDigest(draft.contentHash, draft.factsHash);

      // 1. Record immutable ApprovalEvent
      await prisma.approvalEvent.create({
        data: {
          draftId: draft.id,
          reviewerId: actor.id,
          reviewerRole: actor.role as any,
          action: 'APPROVE',
          decisionDigest,
          rationale: input.rationale || 'Approved for release.',
        },
      });

      // 2. Update Draft with approval digest
      await prisma.communicationDraft.update({
        where: { id: draft.id },
        data: {
          status: 'APPROVED',
          approvalDigest: decisionDigest,
        },
      });

      // 3. Write immutable AuditLog
      await prisma.auditLog.create({
        data: {
          organizationId: draft.incident.organizationId,
          incidentId: draft.incidentId,
          actorId: actor.id,
          actorEmail: actor.email,
          actorRole: actor.role as any,
          action: 'DRAFT_APPROVED',
          entityType: 'COMMUNICATION_DRAFT',
          entityId: draft.id,
          previousStateHash: draft.contentHash,
          newStateHash: decisionDigest,
          metadataJson: JSON.stringify({
            audience: draft.audience,
            version: draft.version,
            approvalDigest: decisionDigest,
            rationale: input.rationale,
          }),
        },
      });
    } else {
      // REJECT decision
      decisionDigest = computeApprovalDigest(draft.contentHash, `${draft.factsHash}::REJECTED`);

      await prisma.approvalEvent.create({
        data: {
          draftId: draft.id,
          reviewerId: actor.id,
          reviewerRole: actor.role as any,
          action: 'REJECT',
          decisionDigest,
          rationale: input.rationale || 'Rejected by reviewer.',
        },
      });

      await prisma.communicationDraft.update({
        where: { id: draft.id },
        data: {
          status: 'REJECTED',
          approvalDigest: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          organizationId: draft.incident.organizationId,
          incidentId: draft.incidentId,
          actorId: actor.id,
          actorEmail: actor.email,
          actorRole: actor.role as any,
          action: 'DRAFT_REJECTED',
          entityType: 'COMMUNICATION_DRAFT',
          entityId: draft.id,
          metadataJson: JSON.stringify({
            audience: draft.audience,
            version: draft.version,
            rationale: input.rationale,
          }),
        },
      });
    }

    return {
      draftId: draft.id,
      status: targetStatus,
      decisionDigest,
    };
  }

  /**
   * Edits an existing draft.
   * If draft was previously APPROVED or PENDING_REVIEW, this mutation automatically
   * revokes approval and returns status to DRAFT with incremented version.
   */
  async editDraft(actor: AuthUser, input: EditDraftInput) {
    const draft = await prisma.communicationDraft.findUnique({
      where: { id: input.draftId },
      include: { incident: true },
    });

    if (!draft) {
      throw new Error(`Draft ${input.draftId} not found`);
    }

    const previousStatus = draft.status;
    const previousDigest = draft.approvalDigest;
    const newVersion = draft.version + 1;

    let parsedClaims = [];
    try {
      parsedClaims = JSON.parse(draft.claimsJson);
    } catch {
      parsedClaims = [];
    }

    const newContentHash = computeContentHash(
      draft.audience,
      newVersion,
      input.newBodyText,
      parsedClaims
    );

    const updatedDraft = await prisma.communicationDraft.update({
      where: { id: draft.id },
      data: {
        version: newVersion,
        bodyText: input.newBodyText,
        contentHash: newContentHash,
        status: 'DRAFT',
        approvalDigest: null, // Revokes previous approval
        readinessGate: draft.readinessGate === 'BLOCKED' ? 'BLOCKED' : 'NEEDS_REVIEW',
      },
    });

    // Write audit log recording manual edit and approval revocation if applicable
    await prisma.auditLog.create({
      data: {
        organizationId: draft.incident.organizationId,
        incidentId: draft.incidentId,
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role as any,
        action: previousStatus === 'APPROVED' ? 'APPROVAL_REVOKED_BY_EDIT' : 'DRAFT_EDITED',
        entityType: 'COMMUNICATION_DRAFT',
        entityId: draft.id,
        previousStateHash: draft.contentHash,
        newStateHash: newContentHash,
        metadataJson: JSON.stringify({
          previousVersion: draft.version,
          newVersion,
          previousStatus,
          revokedDigest: previousDigest,
          rationale: input.rationale || 'Manual draft revision',
        }),
      },
    });

    return updatedDraft;
  }
}

export const governanceService = new GovernanceService();
