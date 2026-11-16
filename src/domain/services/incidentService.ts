import { prisma } from '@/infrastructure/db/client';
import { authorize, type AuthUser } from '../permissions/rbac';

export interface CreateIncidentDTO {
  title: string;
  description: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  discoveryTime?: Date;
  regulatoryApplicability?: string;
  accessScopeStatus?: 'CONFIRMED' | 'SUSPECTED' | 'UNKNOWN' | 'DISPUTED';
  accessScopeDetails?: string;
  exfiltrationStatus?: 'CONFIRMED' | 'SUSPECTED' | 'UNKNOWN' | 'DISPUTED';
  exfiltrationDetails?: string;
  rootCauseStatus?: 'CONFIRMED' | 'SUSPECTED' | 'UNKNOWN' | 'DISPUTED';
  rootCauseDetails?: string;
  affectedSystemsStatus?: 'CONFIRMED' | 'SUSPECTED' | 'UNKNOWN' | 'DISPUTED';
  affectedSystemsDetails?: string;
  mitigationStatus?: 'CONFIRMED' | 'SUSPECTED' | 'UNKNOWN' | 'DISPUTED';
  mitigationDetails?: string;
}

export interface UpdateEpistemicFieldDTO {
  incidentId: string;
  field: 'accessScope' | 'exfiltration' | 'rootCause' | 'affectedSystems' | 'mitigation';
  status: 'CONFIRMED' | 'SUSPECTED' | 'UNKNOWN' | 'DISPUTED';
  details?: string;
}

/**
 * Generates next sequential incident number scoped to current year.
 */
async function generateIncidentNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.incident.count();
  const seq = String(count + 1).padStart(3, '0');
  return `INC-${currentYear}-${seq}`;
}

/**
 * Creates a new security incident with full audit logging and RBAC enforcement.
 */
export async function createIncident(user: AuthUser, dto: CreateIncidentDTO) {
  // 1. Authorize
  const authz = authorize(user, 'INCIDENT_CREATE', { organizationId: user.organizationId });
  if (!authz.authorized) {
    throw new Error(authz.reason || 'Unauthorized to create incidents');
  }

  const incidentNumber = await generateIncidentNumber();

  // 2. Create incident record
  const incident = await prisma.incident.create({
    data: {
      incidentNumber,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      severity: dto.severity,
      organizationId: user.organizationId,
      createdById: user.id,
      discoveryTime: dto.discoveryTime || new Date(),
      regulatoryApplicability: dto.regulatoryApplicability,
      accessScopeStatus: dto.accessScopeStatus || 'UNKNOWN',
      accessScopeDetails: dto.accessScopeDetails,
      exfiltrationStatus: dto.exfiltrationStatus || 'UNKNOWN',
      exfiltrationDetails: dto.exfiltrationDetails,
      rootCauseStatus: dto.rootCauseStatus || 'UNKNOWN',
      rootCauseDetails: dto.rootCauseDetails,
      affectedSystemsStatus: dto.affectedSystemsStatus || 'UNKNOWN',
      affectedSystemsDetails: dto.affectedSystemsDetails,
      mitigationStatus: dto.mitigationStatus || 'SUSPECTED',
      mitigationDetails: dto.mitigationDetails,
    },
  });

  // 3. Append-only audit log
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      incidentId: incident.id,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'INCIDENT_CREATED',
      entityType: 'INCIDENT',
      entityId: incident.id,
      metadataJson: JSON.stringify({
        incidentNumber,
        severity: dto.severity,
        category: dto.category,
        title: dto.title,
      }),
    },
  });

  return incident;
}

/**
 * Updates an incident's epistemic status with automatic approval invalidation and audit logging.
 */
export async function updateEpistemicStatus(user: AuthUser, dto: UpdateEpistemicFieldDTO) {
  // 1. Authorize
  const authz = authorize(user, 'EPISTEMIC_UPDATE', { organizationId: user.organizationId });
  if (!authz.authorized) {
    throw new Error(authz.reason || 'Unauthorized to update epistemic statuses');
  }

  // 2. Fetch existing incident
  const incident = await prisma.incident.findUnique({
    where: { id: dto.incidentId },
  });

  if (!incident || incident.organizationId !== user.organizationId) {
    throw new Error('Incident not found or unauthorized');
  }

  // Snapshot before update
  const previousStatusMap = {
    accessScope: incident.accessScopeStatus,
    exfiltration: incident.exfiltrationStatus,
    rootCause: incident.rootCauseStatus,
    affectedSystems: incident.affectedSystemsStatus,
    mitigation: incident.mitigationStatus,
  };
  const previousStatus = previousStatusMap[dto.field];

  // 3. Prepare updated data mapping
  const updateData: Record<string, unknown> = {};
  if (dto.field === 'accessScope') {
    updateData.accessScopeStatus = dto.status;
    if (dto.details !== undefined) updateData.accessScopeDetails = dto.details;
  } else if (dto.field === 'exfiltration') {
    updateData.exfiltrationStatus = dto.status;
    if (dto.details !== undefined) updateData.exfiltrationDetails = dto.details;
  } else if (dto.field === 'rootCause') {
    updateData.rootCauseStatus = dto.status;
    if (dto.details !== undefined) updateData.rootCauseDetails = dto.details;
  } else if (dto.field === 'affectedSystems') {
    updateData.affectedSystemsStatus = dto.status;
    if (dto.details !== undefined) updateData.affectedSystemsDetails = dto.details;
  } else if (dto.field === 'mitigation') {
    updateData.mitigationStatus = dto.status;
    if (dto.details !== undefined) updateData.mitigationDetails = dto.details;
  }

  // 4. Update incident without nested include to avoid transaction requirement
  const updatedIncident = await prisma.incident.update({
    where: { id: dto.incidentId },
    data: updateData,
  });

  // 5. Append-only audit log for epistemic update
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      incidentId: incident.id,
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'EPISTEMIC_UPDATED',
      entityType: 'INCIDENT',
      entityId: incident.id,
      metadataJson: JSON.stringify({
        field: dto.field,
        previousStatus,
        newStatus: dto.status,
        details: dto.details,
      }),
    },
  });

  // 6. Fetch approved drafts to invalidate
  const approvedDrafts = await prisma.communicationDraft.findMany({
    where: {
      incidentId: dto.incidentId,
      status: 'APPROVED',
    },
  });

  for (const draft of approvedDrafts) {
    await prisma.communicationDraft.update({
      where: { id: draft.id },
      data: {
        status: 'INVALIDATED',
      },
    });

    await prisma.approvalEvent.create({
      data: {
        draftId: draft.id,
        reviewerId: user.id,
        reviewerRole: user.role,
        action: 'INVALIDATE',
        decisionDigest: 'SYSTEM_AUTOMATIC_INVALIDATION',
        rationale: `Automatic invalidation: underlying incident fact [${dto.field}] transitioned from ${previousStatus} to ${dto.status}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        incidentId: incident.id,
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'APPROVAL_INVALIDATED',
        entityType: 'DRAFT',
        entityId: draft.id,
        metadataJson: JSON.stringify({
          draftId: draft.id,
          audience: draft.audience,
          triggerField: dto.field,
          previousStatus,
          newStatus: dto.status,
        }),
      },
    });
  }

  return {
    incident: updatedIncident,
    invalidatedDraftCount: approvedDrafts.length,
  };
}
