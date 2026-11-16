import { describe, it, expect } from 'vitest';
import { LocalMemoryAdapter } from '../../src/infrastructure/adapters/memory/localMemoryAdapter';
import type { AuthUser } from '../../src/domain/permissions/rbac';
import { prisma } from '../../src/infrastructure/db/client';

describe('Phase 5: Memory Provider Contract & Template/Terminology Governance', () => {
  const adapter = new LocalMemoryAdapter();

  const orgId = 'cmwjkl7oe0000u4441ya9rmm7';

  it('exposes the mandatory labeled provider identity ("Local adapter, not Memento")', () => {
    expect(adapter.name).toBe('Local adapter, not Memento');
  });

  it('fetches approved templates with parsed mandatory sections for all 5 audiences', async () => {
    const audiences = ['EXECUTIVE', 'ENGINEERING', 'ALL_HANDS', 'CUSTOMER', 'REGULATORY'] as const;

    for (const aud of audiences) {
      const template = await adapter.getTemplateForAudience(orgId, aud);
      expect(template, `Template missing for audience ${aud}`).toBeDefined();
      expect(template?.audience).toBe(aud);
      expect(template?.mandatorySections.length).toBeGreaterThan(0);
      expect(template?.version).toBeGreaterThanOrEqual(1);
    }
  });

  it('retrieves active organizational terminology rules and forbidden synonyms', async () => {
    const rules = await adapter.getTerminologyRules(orgId);
    expect(rules.length).toBeGreaterThanOrEqual(3);

    const incidentTerm = rules.find((r) => r.term === 'Security Incident');
    expect(incidentTerm).toBeDefined();
    expect(incidentTerm?.forbiddenSynonyms).toContain('Disaster');
    expect(incidentTerm?.forbiddenSynonyms).toContain('Catastrophe');
  });

  it('enforces RBAC on template updates and increments version number', async () => {
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

    const auditorUser: AuthUser = {
      id: dbUser!.id,
      email: 'auditor@sentinel.defense',
      role: 'AUDITOR',
      organizationId: dbUser!.organizationId,
    };

    // 1. Auditor should be rejected
    await expect(
      adapter.updateTemplate(auditorUser, {
        templateId: 'non-existent',
        organizationId: orgId,
      })
    ).rejects.toThrow(/not permitted to perform TEMPLATE_MANAGE/);

    // 2. Fetch existing Executive template
    const dbTemplate = await prisma.approvedTemplate.findFirst({
      where: { organizationId: orgId, audience: 'EXECUTIVE' },
    });
    expect(dbTemplate).toBeDefined();

    const previousVersion = dbTemplate!.version;

    // 3. Incident Manager updates template
    const updated = await adapter.updateTemplate(imUser, {
      templateId: dbTemplate!.id,
      organizationId: orgId,
      title: 'Executive Briefing Template (Updated via CI)',
    });

    expect(updated.version).toBe(previousVersion + 1);

    // 4. Verify audit log was recorded
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityId: dbTemplate!.id,
        action: 'TEMPLATE_UPDATED',
      },
    });
    expect(audit).toBeDefined();
    expect(audit?.actorEmail).toBe(imUser.email);
  });

  it('reports healthy health status with labeled details', async () => {
    const health = await adapter.checkHealth();
    expect(health.status).toBe('healthy');
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    expect(health.details).toContain('Local adapter, not Memento');
  });
});
