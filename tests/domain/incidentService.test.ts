import { describe, it, expect } from 'vitest';
import { createIncident, updateEpistemicStatus } from '../../src/domain/services/incidentService';
import type { AuthUser } from '../../src/domain/permissions/rbac';
import { prisma } from '../../src/infrastructure/db/client';

describe('Phase 3 Core Slice: Incident Intake & Epistemic Audit Service', () => {
  const testOrgId = 'cmwjkl7oe0000u4441ya9rmm7'; // Sentinel Enterprise Defense org id

  const incidentManager: AuthUser = {
    id: 'user-im-test',
    email: 'im@sentinel.defense',
    role: 'INCIDENT_MANAGER',
    organizationId: testOrgId,
  };

  const auditorUser: AuthUser = {
    id: 'user-auditor-test',
    email: 'auditor@sentinel.defense',
    role: 'AUDITOR',
    organizationId: testOrgId,
  };

  it('rejects incident creation by non-commander role (Auditor)', async () => {
    await expect(
      createIncident(auditorUser, {
        title: 'Unauthorized Incident Intake',
        description: 'Should fail RBAC check',
        category: 'RANSOMWARE',
        severity: 'HIGH',
      })
    ).rejects.toThrow(/not permitted to perform INCIDENT_CREATE/);
  });

  it('creates incident and writes immutable audit trail entry', async () => {
    // Look up an existing user from the database to satisfy foreign key
    const dbUser = await prisma.user.findFirst({
      where: { role: 'INCIDENT_MANAGER' },
    });
    expect(dbUser).toBeDefined();

    const imUser: AuthUser = {
      id: dbUser!.id,
      email: dbUser!.email,
      role: 'INCIDENT_MANAGER',
      organizationId: dbUser!.organizationId,
    };

    const incident = await createIncident(imUser, {
      title: 'Automated Test Incident: Infiltration Wave',
      description: 'Synthetic incident generated during automated CI test verification.',
      category: 'PHISHING',
      severity: 'HIGH',
      accessScopeStatus: 'UNKNOWN',
      exfiltrationStatus: 'UNKNOWN',
      rootCauseStatus: 'SUSPECTED',
      affectedSystemsStatus: 'CONFIRMED',
      mitigationStatus: 'SUSPECTED',
    });

    expect(incident.id).toBeDefined();
    expect(incident.incidentNumber).toMatch(/^INC-\d{4}-\d{3}$/);
    expect(incident.accessScopeStatus).toBe('UNKNOWN');

    // Verify AuditLog entry was written
    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        incidentId: incident.id,
        action: 'INCIDENT_CREATED',
      },
    });
    expect(auditEntry).toBeDefined();
    expect(auditEntry?.actorEmail).toBe(imUser.email);
    expect(auditEntry?.entityType).toBe('INCIDENT');
  });

  it('updates epistemic status, generates audit entry, and automatically invalidates approved drafts', async () => {
    const dbUser = await prisma.user.findFirst({
      where: { role: 'INCIDENT_MANAGER' },
    });
    expect(dbUser).toBeDefined();

    const imUser: AuthUser = {
      id: dbUser!.id,
      email: dbUser!.email,
      role: 'INCIDENT_MANAGER',
      organizationId: dbUser!.organizationId,
    };

    // 1. Create test incident
    const incident = await createIncident(imUser, {
      title: 'Epistemic Invalidation Test Incident',
      description: 'Testing automatic approval revocation upon fact mutation.',
      category: 'ZERO_DAY',
      severity: 'CRITICAL',
      exfiltrationStatus: 'UNKNOWN',
    });

    // 2. Attach an APPROVED draft to this incident
    const draft = await prisma.communicationDraft.create({
      data: {
        incidentId: incident.id,
        audience: 'EXECUTIVE',
        version: 1,
        status: 'APPROVED',
        bodyText: 'Preliminary executive assessment - zero data confirmed exfiltrated.',
        claimsJson: JSON.stringify([{ id: 'c1', text: 'Exfiltration unknown', type: 'FACT', pointers: [] }]),
        readinessGate: 'REVIEW_READY',
        qualityScore: 92.5,
        contentHash: 'hash-v1',
        factsHash: 'facts-v1',
        approvalDigest: 'digest-approved-v1',
        createdById: dbUser!.id,
      },
    });

    expect(draft.status).toBe('APPROVED');

    // 3. Mutate exfiltration from UNKNOWN to CONFIRMED
    const updateResult = await updateEpistemicStatus(imUser, {
      incidentId: incident.id,
      field: 'exfiltration',
      status: 'CONFIRMED',
      details: 'Confirmed 2.4 GB egress of database archive to malicious C2 server.',
    });

    expect(updateResult.incident.exfiltrationStatus).toBe('CONFIRMED');
    expect(updateResult.invalidatedDraftCount).toBe(1);

    // 4. Verify draft status in database transitioned to INVALIDATED
    const refreshedDraft = await prisma.communicationDraft.findUnique({
      where: { id: draft.id },
    });
    expect(refreshedDraft?.status).toBe('INVALIDATED');

    // 5. Verify APPROVAL_INVALIDATED audit log was written
    const invalidationAudit = await prisma.auditLog.findFirst({
      where: {
        incidentId: incident.id,
        action: 'APPROVAL_INVALIDATED',
        entityId: draft.id,
      },
    });
    expect(invalidationAudit).toBeDefined();
    expect(invalidationAudit?.actorEmail).toBe(imUser.email);
  });
});
