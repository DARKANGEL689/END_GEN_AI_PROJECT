import { describe, it, expect, beforeAll } from 'vitest';
import { transitionDraftState } from '@/domain/statemachine/approval';
import { computeContentHash, computeFactsHash, computeApprovalDigest } from '@/domain/trust/hash';
import { governanceService } from '@/domain/services/governanceService';
import { exportAdapter } from '@/infrastructure/adapters/export/exportAdapter';
import { prisma } from '@/infrastructure/db/client';
import type { AuthUser } from '@/domain/permissions/rbac';

describe('Phase 7: Governance, Approval State Machine & Multi-Format Export', () => {
  let testIncident: any;
  let commsUser: AuthUser;
  let legalUser: AuthUser;
  let execUser: AuthUser;
  let auditorUser: AuthUser;

  beforeAll(async () => {
    testIncident = await prisma.incident.findFirst({
      where: { incidentNumber: 'INC-2026-001' },
      include: { organization: true },
    });

    const dbComms = await prisma.user.findFirst({ where: { email: 'comms@sentinel.defense' } });
    const dbLegal = await prisma.user.findFirst({ where: { email: 'legal@sentinel.defense' } });
    const dbExec = await prisma.user.findFirst({ where: { email: 'exec@sentinel.defense' } });
    const dbAuditor = await prisma.user.findFirst({ where: { email: 'auditor@sentinel.defense' } });

    commsUser = {
      id: dbComms!.id,
      email: dbComms!.email,
      role: 'COMMUNICATIONS_OFFICER',
      organizationId: dbComms!.organizationId,
    };
    legalUser = {
      id: dbLegal!.id,
      email: dbLegal!.email,
      role: 'LEGAL_COUNSEL',
      organizationId: dbLegal!.organizationId,
    };
    execUser = {
      id: dbExec!.id,
      email: dbExec!.email,
      role: 'EXECUTIVE_REVIEWER',
      organizationId: dbExec!.organizationId,
    };
    auditorUser = {
      id: dbAuditor!.id,
      email: dbAuditor!.email,
      role: 'AUDITOR',
      organizationId: dbAuditor!.organizationId,
    };
  });

  describe('1. State Machine Legal & Illegal Transition Gates', () => {
    it('rejects promotion to PENDING_REVIEW when readiness is BLOCKED', () => {
      const res = transitionDraftState('DRAFT', 'PENDING_REVIEW', {
        readinessGate: 'BLOCKED',
        currentContentHash: 'hash-abc',
        currentFactsHash: 'facts-abc',
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('BLOCKED');
    });

    it('rejects direct jump from DRAFT to APPROVED without review phase', () => {
      const res = transitionDraftState('DRAFT', 'APPROVED', {
        readinessGate: 'REVIEW_READY',
        currentContentHash: 'hash-abc',
        currentFactsHash: 'facts-abc',
      });
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('Illegal state transition');
    });

    it('permits DRAFT to PENDING_REVIEW when REVIEW_READY', () => {
      const res = transitionDraftState('DRAFT', 'PENDING_REVIEW', {
        readinessGate: 'REVIEW_READY',
        currentContentHash: 'hash-abc',
        currentFactsHash: 'facts-abc',
      });
      expect(res.allowed).toBe(true);
      expect(res.nextStatus).toBe('PENDING_REVIEW');
    });

    it('permits PENDING_REVIEW to APPROVED and to REJECTED', () => {
      const approveRes = transitionDraftState('PENDING_REVIEW', 'APPROVED', {
        readinessGate: 'REVIEW_READY',
        currentContentHash: 'hash-abc',
        currentFactsHash: 'facts-abc',
      });
      expect(approveRes.allowed).toBe(true);
      expect(approveRes.nextStatus).toBe('APPROVED');

      const rejectRes = transitionDraftState('PENDING_REVIEW', 'REJECTED', {
        readinessGate: 'NEEDS_REVIEW',
        currentContentHash: 'hash-abc',
        currentFactsHash: 'facts-abc',
      });
      expect(rejectRes.allowed).toBe(true);
      expect(rejectRes.nextStatus).toBe('REJECTED');
    });
  });

  describe('2. Multi-Format Export Engine', () => {
    const mockInput = {
      incidentNumber: 'INC-2026-001',
      incidentTitle: 'Active Exploitation of PulseGuard Edge Concentrators',
      severity: 'CRITICAL',
      audience: 'EXECUTIVE',
      version: 1,
      status: 'APPROVED',
      bodyText:
        '## Situation Summary\nIncident INC-2026-001 is triaged as CRITICAL [c1].\n\n## Leadership Directives\nIsolate perimeter gateways immediately [c2].',
      contentHash: 'a1b2c3d4e5f6',
      factsHash: 'f1e2d3c4b5a6',
      approvalDigest: 'digest-approved-1234567890',
      approvedBy: {
        name: 'Legal Counsel',
        email: 'legal@sentinel.defense',
        role: 'LEGAL_COUNSEL',
      },
      approvedAt: new Date(),
      organizationName: 'Sentinel Enterprise Defense',
      isSynthetic: true,
    };

    it('generates valid binary DOCX buffer with Office XML magic bytes', async () => {
      const buffer = await exportAdapter.exportDocx(mockInput);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);
      // Office OpenXML files are ZIP archives starting with magic bytes 'PK' (0x50, 0x4B)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });

    it('generates clean Markdown with YAML frontmatter and synthetic watermark', async () => {
      const md = await exportAdapter.exportMarkdown(mockInput);
      expect(md).toContain('---');
      expect(md).toContain('incidentNumber: "INC-2026-001"');
      expect(md).toContain('approvalDigest: "digest-approved-1234567890"');
      expect(md).toContain('SYNTHETIC DATA EXERCISE');
      expect(md).toContain('## Situation Summary');
    });

    it('generates standalone publication-ready HTML document', async () => {
      const html = await exportAdapter.exportHtml(mockInput);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('SYNTHETIC EXERCISE DATA');
      expect(html).toContain('digest-approved-1234567890');
      expect(html).toContain('Incident Communications: INC-2026-001');
    });
  });

  describe('3. Governance Service End-to-End Database Lifecycle', () => {
    let draftId: string;

    it('creates test draft and enforces that Auditor cannot approve it', async () => {
      // 1. Create a draft in DRAFT status
      const draft = await prisma.communicationDraft.create({
        data: {
          incidentId: testIncident.id,
          audience: 'REGULATORY',
          version: 1,
          status: 'DRAFT',
          readinessGate: 'REVIEW_READY',
          qualityScore: 92,
          bodyText: '## Notification Details & Authority\nRegulatory filing notice [c1].',
          claimsJson: '[]',
          contentHash: 'init-content-hash',
          factsHash: 'init-facts-hash',
          createdById: commsUser.id,
        },
      });
      draftId = draft.id;

      // 2. Auditor tries to approve -> rejected by RBAC
      await expect(
        governanceService.submitApprovalDecision(auditorUser, {
          draftId,
          decision: 'APPROVE',
        })
      ).rejects.toThrow(/not authorized to approve communications drafts/);
    });

    it('requests review and transitions draft from DRAFT to PENDING_REVIEW', async () => {
      const updated = await governanceService.requestReview(commsUser, { draftId });
      expect(updated.status).toBe('PENDING_REVIEW');

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          entityId: draftId,
          action: 'DRAFT_REVIEW_REQUESTED',
        },
      });
      expect(audit).toBeDefined();
    });

    it('legal counsel approves draft: sets APPROVED, stores approval digest, writes approval event & audit log', async () => {
      const result = await governanceService.submitApprovalDecision(legalUser, {
        draftId,
        decision: 'APPROVE',
        rationale: 'Legally compliant with breach disclosure notification rules.',
      });

      expect(result.status).toBe('APPROVED');
      expect(result.decisionDigest).toBeDefined();

      // Verify draft in database
      const dbDraft = await prisma.communicationDraft.findUnique({
        where: { id: draftId },
        include: { approvals: true },
      });
      expect(dbDraft?.status).toBe('APPROVED');
      expect(dbDraft?.approvalDigest).toBe(result.decisionDigest);
      expect(dbDraft?.approvals.length).toBeGreaterThan(0);
      expect(dbDraft?.approvals[0].action).toBe('APPROVE');
      expect(dbDraft?.approvals[0].reviewerRole).toBe('LEGAL_COUNSEL');
    });

    it('editing an approved draft revokes approval, increments version, and resets status to DRAFT', async () => {
      const edited = await governanceService.editDraft(commsUser, {
        draftId,
        newBodyText: '## Notification Details & Authority\nAmended regulatory filing with modified timeline [c1].',
        rationale: 'Updated disclosure timeline per legal counsel instruction.',
      });

      expect(edited.version).toBe(2);
      expect(edited.status).toBe('DRAFT');
      expect(edited.approvalDigest).toBeNull(); // Approval explicitly revoked!

      // Check audit log explicitly logged APPROVAL_REVOKED_BY_EDIT
      const audit = await prisma.auditLog.findFirst({
        where: {
          entityId: draftId,
          action: 'APPROVAL_REVOKED_BY_EDIT',
        },
        orderBy: { timestamp: 'desc' },
      });
      expect(audit).toBeDefined();
      expect(audit?.actorId).toBe(commsUser.id);
    });
  });
});
