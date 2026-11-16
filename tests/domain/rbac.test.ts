import { describe, it, expect } from 'vitest';
import { authorize, type AuthUser, type Role, type Action } from '../../src/domain/permissions/rbac';

describe('RBAC Authorization Engine', () => {
  const orgA = 'org-cyber-defense-01';
  const orgB = 'org-external-vendor-99';

  const userIncidentManager: AuthUser = {
    id: 'user-im',
    email: 'im@corp.local',
    role: 'INCIDENT_MANAGER',
    organizationId: orgA,
  };

  const userSecLead: AuthUser = {
    id: 'user-sec',
    email: 'seclead@corp.local',
    role: 'SECURITY_LEAD',
    organizationId: orgA,
  };

  const userCommsOfficer: AuthUser = {
    id: 'user-comms',
    email: 'comms@corp.local',
    role: 'COMMUNICATIONS_OFFICER',
    organizationId: orgA,
  };

  const userLegal: AuthUser = {
    id: 'user-legal',
    email: 'legal@corp.local',
    role: 'LEGAL_COUNSEL',
    organizationId: orgA,
  };

  const userExec: AuthUser = {
    id: 'user-exec',
    email: 'ceo@corp.local',
    role: 'EXECUTIVE_REVIEWER',
    organizationId: orgA,
  };

  const userAuditor: AuthUser = {
    id: 'user-auditor',
    email: 'auditor@corp.local',
    role: 'AUDITOR',
    organizationId: orgA,
  };

  describe('Tenant Isolation Verification', () => {
    it('blocks access when user attempts to access resource of another organization', () => {
      const foreignResource = { organizationId: orgB };
      const result = authorize(userIncidentManager, 'INCIDENT_READ', foreignResource);
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('Tenant isolation violation');
    });

    it('permits access when organization IDs match', () => {
      const localResource = { organizationId: orgA };
      const result = authorize(userIncidentManager, 'INCIDENT_READ', localResource);
      expect(result.authorized).toBe(true);
    });
  });

  describe('Role-Specific Permissions Matrix', () => {
    it('allows Incident Manager full lifecycle operations', () => {
      const actions: Action[] = [
        'INCIDENT_CREATE',
        'INCIDENT_UPDATE',
        'EPISTEMIC_UPDATE',
        'INTELLIGENCE_FETCH',
        'DRAFT_GENERATE',
        'DRAFT_REQUEST_REVIEW',
        'DRAFT_APPROVE',
        'AUDIT_READ',
      ];
      for (const action of actions) {
        expect(authorize(userIncidentManager, action, { organizationId: orgA }).authorized).toBe(true);
      }
    });

    it('restricts Security Lead approvals to ENGINEERING audience only', () => {
      const engDraft = { organizationId: orgA, audience: 'ENGINEERING' as const };
      const execDraft = { organizationId: orgA, audience: 'EXECUTIVE' as const };

      expect(authorize(userSecLead, 'DRAFT_APPROVE', engDraft).authorized).toBe(true);
      const deniedExec = authorize(userSecLead, 'DRAFT_APPROVE', execDraft);
      expect(deniedExec.authorized).toBe(false);
      expect(deniedExec.reason).toContain('Security Lead may only approve ENGINEERING');
    });

    it('restricts Legal Counsel approvals to REGULATORY and CUSTOMER drafts', () => {
      const regDraft = { organizationId: orgA, audience: 'REGULATORY' as const };
      const custDraft = { organizationId: orgA, audience: 'CUSTOMER' as const };
      const engDraft = { organizationId: orgA, audience: 'ENGINEERING' as const };

      expect(authorize(userLegal, 'DRAFT_APPROVE', regDraft).authorized).toBe(true);
      expect(authorize(userLegal, 'DRAFT_APPROVE', custDraft).authorized).toBe(true);
      expect(authorize(userLegal, 'DRAFT_APPROVE', engDraft).authorized).toBe(false);
    });

    it('enforces read-only posture for Auditor', () => {
      expect(authorize(userAuditor, 'INCIDENT_READ', { organizationId: orgA }).authorized).toBe(true);
      expect(authorize(userAuditor, 'AUDIT_READ', { organizationId: orgA }).authorized).toBe(true);

      const writeActions: Action[] = [
        'INCIDENT_CREATE',
        'INCIDENT_UPDATE',
        'EPISTEMIC_UPDATE',
        'DRAFT_GENERATE',
        'DRAFT_EDIT',
        'DRAFT_APPROVE',
        'DRAFT_EXPORT',
      ];

      for (const action of writeActions) {
        const result = authorize(userAuditor, action, { organizationId: orgA });
        expect(result.authorized).toBe(false);
        expect(result.reason).toContain('is not permitted');
      }
    });

    it('allows Communications Officer to edit and export drafts, but not approve', () => {
      expect(authorize(userCommsOfficer, 'DRAFT_GENERATE', { organizationId: orgA }).authorized).toBe(true);
      expect(authorize(userCommsOfficer, 'DRAFT_EDIT', { organizationId: orgA }).authorized).toBe(true);
      expect(authorize(userCommsOfficer, 'DRAFT_EXPORT', { organizationId: orgA }).authorized).toBe(true);
      expect(authorize(userCommsOfficer, 'DRAFT_APPROVE', { organizationId: orgA }).authorized).toBe(false);
    });
  });
});
