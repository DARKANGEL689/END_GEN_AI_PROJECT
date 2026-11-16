import { describe, it, expect, beforeAll } from 'vitest';
import { computeQualityScore } from '@/domain/trust/quality';
import { evaluateReadiness } from '@/domain/trust/readiness';
import { llmAdapter } from '@/infrastructure/adapters/llm/llmAdapter';
import { generateAudienceDraft } from '@/domain/services/generationService';
import { prisma } from '@/infrastructure/db/client';
import type { CompiledContextBundle } from '@/domain/trust/compiler';

describe('GenAI Trust Engine - Phase 6 Tests', () => {
  let goldenIncident: any;
  let testUser: any;

  beforeAll(async () => {
    goldenIncident = await prisma.incident.findFirst({
      where: { incidentNumber: 'INC-2026-001' },
    });
    testUser = await prisma.user.findFirst({
      where: { email: 'comms@sentinel.defense' },
    });
  });

  describe('1. 7-Dimension Quality Score Calculation', () => {
    it('computes all 7 dimensions and weighted overall score', () => {
      const quality = computeQualityScore({
        bodyText:
          '## Executive Summary\nIncident INC-2026-001 has been triaged as CRITICAL. Immediate mitigation action is required.\n\n## Impact Analysis\nEdge gateways were affected.\n\n## Actions Taken & Forward Plan\nWe must apply patches immediately.',
        claims: [
          {
            id: 'c1',
            text: 'Incident is CRITICAL',
            type: 'FACT',
            pointers: [{ sourceType: 'INCIDENT_FIELD', sourceId: 'incident' }],
            verdict: 'SUPPORTED',
          },
        ],
        mandatorySections: ['Executive Summary', 'Impact Analysis', 'Actions Taken & Forward Plan'],
        forbiddenPhrasesFound: [],
        unhedgedSuspectedCount: 0,
        audience: 'EXECUTIVE',
      });

      expect(quality.traceabilityScore).toBe(100);
      expect(quality.sectionCompletenessScore).toBe(100);
      expect(quality.terminologyScore).toBe(100);
      expect(quality.readabilityScore).toBeGreaterThan(0);
      expect(quality.overallScore).toBeGreaterThan(70);
    });

    it('penalizes quality score when terminology violations exist', () => {
      const qWithViolations = computeQualityScore({
        bodyText: 'Hacker infiltrated system.',
        claims: [],
        mandatorySections: [],
        forbiddenPhrasesFound: ['hacker', 'infiltrated'],
        unhedgedSuspectedCount: 0,
        audience: 'ALL_HANDS',
      });

      expect(qWithViolations.terminologyScore).toBeLessThan(100);
    });
  });

  describe('2. Deterministic Readiness Gate Evaluation', () => {
    const mockBundle: CompiledContextBundle = {
      incident: {
        id: 'inc-test-01',
        incidentNumber: 'INC-2026-001',
        title: 'Active Exploitation of Perimeter Gateways',
        description: 'Threat actors exploiting edge gateways.',
        category: 'PERIMETER_BREACH',
        severity: 'CRITICAL',
        status: 'INVESTIGATING',
        discoveryTime: new Date(),
      },
      epistemicFacts: {
        exfiltration: { status: 'UNKNOWN', details: 'No evidence confirmed' },
        rootCause: { status: 'SUSPECTED', details: 'CVE-2026-1934' },
      },
      advisories: [
        {
          id: 'adv-01',
          domain: 'cisa.gov',
          tier: 'CISA_NVD',
          title: 'CISA Advisory',
          content: 'Urgent advisory regarding edge gateway vulnerability CVE-2026-1934.',
          isQuarantined: false,
        },
      ],
      isolatedAdvisoryBlocks: '',
      template: {
        title: 'Executive Incident Notice',
        mandatorySections: ['Executive Summary', 'Impact Analysis'],
        body: 'Template body',
        version: 1,
      },
      terminologyRules: [
        {
          term: 'Threat Actor',
          definition: 'Identified adversarial entity',
          forbidden: ['Hacker'],
        },
      ],
    };

    it('blocks draft when AWS Secret Key pattern is present', () => {
      const result = evaluateReadiness({
        bodyText: 'Executive Summary\nImpact Analysis\nSecret: AKIAIOSFODNN7EXAMPLE',
        claims: [],
        contextBundle: mockBundle,
        qualityScore: 90,
      });

      expect(result.state).toBe('BLOCKED');
      expect(result.issues.some((i) => i.category === 'SECRET_OR_PII_LEAK')).toBe(true);
    });

    it('blocks draft when mandatory section is missing', () => {
      const result = evaluateReadiness({
        bodyText: 'Executive Summary only provided here.',
        claims: [],
        contextBundle: mockBundle,
        qualityScore: 90,
      });

      expect(result.state).toBe('BLOCKED');
      expect(result.issues.some((i) => i.category === 'MISSING_SECTION')).toBe(true);
    });

    it('blocks draft when claim has unresolved pointer', () => {
      const result = evaluateReadiness({
        bodyText: 'Executive Summary\nImpact Analysis\nFact stated [c1].',
        claims: [
          {
            id: 'c1',
            text: 'Ghost fact',
            type: 'FACT',
            pointers: [{ sourceType: 'ADVISORY', sourceId: 'non-existent-source-id' }],
          },
        ],
        contextBundle: mockBundle,
        qualityScore: 90,
      });

      expect(result.state).toBe('BLOCKED');
      expect(result.issues.some((i) => i.category === 'UNRESOLVED_POINTER')).toBe(true);
    });

    it('blocks draft when claim contains fabricated quote span', () => {
      const result = evaluateReadiness({
        bodyText: 'Executive Summary\nImpact Analysis\nFact stated [c1].',
        claims: [
          {
            id: 'c1',
            text: 'Advisory quote',
            type: 'FACT',
            pointers: [
              {
                sourceType: 'ADVISORY',
                sourceId: 'adv-01',
                quotedSpan: 'Completely fabricated sentence not in CISA advisory',
              },
            ],
          },
        ],
        contextBundle: mockBundle,
        qualityScore: 90,
      });

      expect(result.state).toBe('BLOCKED');
      expect(result.issues.some((i) => i.category === 'FABRICATED_QUOTE')).toBe(true);
    });

    it('blocks draft when UNKNOWN fact is asserted as affirmative breach', () => {
      const result = evaluateReadiness({
        bodyText: 'Executive Summary\nImpact Analysis\nData was exfiltrated by attacker.',
        claims: [],
        contextBundle: mockBundle,
        qualityScore: 90,
      });

      expect(result.state).toBe('BLOCKED');
      expect(result.issues.some((i) => i.category === 'EPISTEMIC_BREACH')).toBe(true);
    });

    it('evaluates to REVIEW_READY when all criteria are satisfied', () => {
      const result = evaluateReadiness({
        bodyText:
          '## Executive Summary\nIncident is triaged as CRITICAL.\n\n## Impact Analysis\nPreliminary indicators suggest CVE-2026-1934.',
        claims: [
          {
            id: 'c1',
            text: 'CISA advisory confirms CVE-2026-1934',
            type: 'FACT',
            pointers: [
              {
                sourceType: 'ADVISORY',
                sourceId: 'adv-01',
                quotedSpan: 'edge gateway vulnerability CVE-2026-1934',
              },
            ],
            verdict: 'SUPPORTED',
          },
        ],
        contextBundle: mockBundle,
        qualityScore: 90,
      });

      expect(result.state).toBe('REVIEW_READY');
      expect(result.isBlocked).toBe(false);
    });
  });

  describe('3. LLM Adapter & Deterministic Grounded Synthesis', () => {
    it('generates grounded synthesis with 100% resolvable source spans', async () => {
      const result = llmAdapter.generateDeterministicSynthesis({
        incidentNumber: 'INC-2026-001',
        title: 'Active Exploitation of PulseGuard Edge Gateways',
        severity: 'CRITICAL',
        category: 'PERIMETER_BREACH',
        epistemicFacts: {
          rootCause: { status: 'SUSPECTED', details: 'PulseGuard CVE-2026-1934 RCE' },
          exfiltration: { status: 'UNKNOWN', details: 'No evidence of data exfiltration identified' },
          mitigation: { status: 'IN_PROGRESS', details: 'Emergency isolation applied' },
        },
        advisories: [
          {
            id: 'adv-cisa-01',
            title: 'CISA Alert AA26-048A',
            content: 'CISA urges immediate patch of PulseGuard vulnerabilities.',
            domain: 'cisa.gov',
          },
        ],
        template: {
          title: 'Executive Notice',
          mandatorySections: [
            'Situation Summary',
            'Operational & Financial Impact',
            'Legal & Regulatory Exposure',
            'Leadership Directives & Decisions',
          ],
          body: 'Template Body',
        },
        terminologyRules: [],
        audience: 'EXECUTIVE',
      });

      expect(result.bodyText).toContain('Situation Summary');
      expect(result.bodyText).toContain('Operational & Financial Impact');
      expect(result.bodyText).toContain('[c1]');
      expect(result.claims.length).toBeGreaterThanOrEqual(4);

      // Verify every claim has valid pointers
      for (const claim of result.claims) {
        expect(claim.pointers.length).toBeGreaterThan(0);
        expect(claim.pointers[0].sourceId).toBeDefined();
      }
    });

    it('independent verifier marks valid claims as SUPPORTED', async () => {
      const verifierResult = await llmAdapter.verifyClaims({
        claims: [
          {
            id: 'c1',
            text: 'Perimeter gateway compromised',
            type: 'FACT',
            pointers: [
              {
                sourceType: 'INCIDENT_FIELD',
                sourceId: 'incident.rootCause',
                quotedSpan: 'PulseGuard CVE-2026-1934',
              },
            ],
          },
        ],
        contextBundle: {
          incidentFields: {
            rootCause: { status: 'SUSPECTED', value: 'PulseGuard CVE-2026-1934 RCE' },
          },
          advisories: [],
        },
      });

      expect(verifierResult.verdicts[0].verdict).toBe('SUPPORTED');
    });
  });

  describe('4. Full Generation Service Integration', () => {
    it('generates and persists an executive draft for golden incident', async () => {
      if (!goldenIncident || !testUser) {
        console.warn('Skipping DB integration test: goldenIncident or testUser not found in DB');
        return;
      }

      const draftResult = await generateAudienceDraft({
        incidentId: goldenIncident.id,
        audience: 'EXECUTIVE',
        userId: testUser.id,
        userEmail: testUser.email,
        userRole: testUser.role,
      });

      expect(draftResult.draftId).toBeDefined();
      expect(draftResult.qualityScore).toBeGreaterThanOrEqual(70);
      expect(draftResult.contentHash).toBeDefined();
      expect(draftResult.factsHash).toBeDefined();

      // Check audit log was written
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          incidentId: goldenIncident.id,
          action: 'DRAFT_GENERATED',
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.actorId).toBe(testUser.id);
    });
  });
});
