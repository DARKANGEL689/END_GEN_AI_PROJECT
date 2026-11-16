import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { checkCrossAudienceConsistency } from '@/domain/trust/consistency';
import { detectMissingInformation } from '@/domain/trust/missingInfo';
import type { AudienceType } from '@prisma/client';

describe('Phase 8: Tier 2 Differentiators & Evaluation Harness Tests', () => {
  describe('1. Cross-Audience Consistency Engine', () => {
    it('detects epistemic contradiction when one audience confirms exfiltration but another denies it', () => {
      const drafts = [
        {
          audience: 'EXECUTIVE' as AudienceType,
          version: 1,
          bodyText:
            '## Situation Summary\nIncident is CRITICAL. Data exfiltration remains unconfirmed; no evidence of data exfiltration identified.',
        },
        {
          audience: 'REGULATORY' as AudienceType,
          version: 1,
          bodyText:
            '## Notification Details\nIncident is CRITICAL. Preliminary investigation confirms data was exfiltrated by adversary.',
        },
      ];

      const report = checkCrossAudienceConsistency(drafts);
      expect(report.hasViolations).toBe(true);
      expect(report.criticalCount).toBeGreaterThanOrEqual(1);

      const exfilViolation = report.violations.find((v) => v.field === 'exfiltrationStatus');
      expect(exfilViolation).toBeDefined();
      expect(exfilViolation?.category).toBe('EPISTEMIC_CONTRADICTION');
    });

    it('detects severity representation mismatch across audiences', () => {
      const drafts = [
        {
          audience: 'ENGINEERING' as AudienceType,
          version: 1,
          bodyText: 'Incident INC-001 is classified as CRITICAL severity.',
        },
        {
          audience: 'CUSTOMER' as AudienceType,
          version: 1,
          bodyText: 'Notice regarding minor event with low severity impact.',
        },
      ];

      const report = checkCrossAudienceConsistency(drafts);
      expect(report.hasViolations).toBe(true);
      const sevViolation = report.violations.find((v) => v.category === 'SEVERITY_MISMATCH');
      expect(sevViolation).toBeDefined();
    });

    it('detects operational availability contradictions (outage vs zero downtime)', () => {
      const drafts = [
        {
          audience: 'ENGINEERING' as AudienceType,
          version: 1,
          bodyText: 'Complete system outage in progress across gateway concentrators.',
        },
        {
          audience: 'CUSTOMER' as AudienceType,
          version: 1,
          bodyText: 'Zero downtime experienced; services remain operational without disruption.',
        },
      ];

      const report = checkCrossAudienceConsistency(drafts);
      expect(report.hasViolations).toBe(true);
      const scopeViolation = report.violations.find((v) => v.category === 'SCOPE_DISCREPANCY');
      expect(scopeViolation).toBeDefined();
    });

    it('passes cleanly when all audience drafts are consistent', () => {
      const drafts = [
        {
          audience: 'EXECUTIVE' as AudienceType,
          version: 1,
          bodyText: '## Situation Summary\nIncident is CRITICAL. Data exfiltration remains unconfirmed [c1].',
        },
        {
          audience: 'ENGINEERING' as AudienceType,
          version: 1,
          bodyText: '## Incident Overview\nIncident is CRITICAL. Data exfiltration remains unconfirmed [c1].',
        },
        {
          audience: 'CUSTOMER' as AudienceType,
          version: 1,
          bodyText: '## Security Notice\nSecurity event ongoing. Data exfiltration remains unconfirmed [c1].',
        },
      ];

      const report = checkCrossAudienceConsistency(drafts);
      expect(report.hasViolations).toBe(false);
      expect(report.criticalCount).toBe(0);
    });
  });

  describe('2. Missing Information Detector', () => {
    it('flags high-urgency gap when regulatory applicability exists but statutory timeline is omitted', () => {
      const report = detectMissingInformation({
        severity: 'CRITICAL',
        category: 'DATA_EXFILTRATION',
        regulatoryApplicability: 'GDPR Article 33, SEC 4-Day Disclosure',
        rootCauseStatus: 'CONFIRMED',
        mitigationStatus: 'IN_PROGRESS',
        advisoriesCount: 1,
        drafts: [
          {
            audience: 'REGULATORY',
            bodyText: 'Official notification of security event. Details pending further analysis.',
          },
        ],
      });

      expect(report.hasGaps).toBe(true);
      const timelineGap = report.gaps.find((g) => g.category === 'REGULATORY_STATUTORY_TIMELINE');
      expect(timelineGap).toBeDefined();
      expect(timelineGap?.urgency).toBe('HIGH');
    });

    it('flags high-urgency gap when critical incident has UNKNOWN root cause and no active forensics mention', () => {
      const report = detectMissingInformation({
        severity: 'CRITICAL',
        category: 'PERIMETER_BREACH',
        regulatoryApplicability: null,
        rootCauseStatus: 'UNKNOWN',
        mitigationStatus: 'SUSPECTED',
        advisoriesCount: 1,
        drafts: [
          {
            audience: 'ENGINEERING',
            bodyText: 'Vulnerabilities detected. Teams are monitoring systems.',
          },
        ],
      });

      expect(report.hasGaps).toBe(true);
      const rcGap = report.gaps.find((g) => g.category === 'ROOT_CAUSE_DETAIL');
      expect(rcGap).toBeDefined();
      expect(rcGap?.urgency).toBe('HIGH');
    });

    it('flags customer protective guidance deficit when customer draft lacks action items', () => {
      const report = detectMissingInformation({
        severity: 'MEDIUM',
        category: 'CREDENTIAL_STUFFING',
        regulatoryApplicability: null,
        rootCauseStatus: 'CONFIRMED',
        mitigationStatus: 'CONFIRMED',
        advisoriesCount: 1,
        drafts: [
          {
            audience: 'CUSTOMER',
            bodyText: 'We noticed unusual logins on our platform. We fixed it.',
          },
        ],
      });

      expect(report.hasGaps).toBe(true);
      const custGap = report.gaps.find((g) => g.category === 'CUSTOMER_ACTIONABLE_GUIDANCE');
      expect(custGap).toBeDefined();
    });

    it('flags external intelligence deficit when vulnerability incident has zero advisories', () => {
      const report = detectMissingInformation({
        severity: 'CRITICAL',
        category: 'ZERO_DAY_BREACH',
        regulatoryApplicability: null,
        rootCauseStatus: 'SUSPECTED',
        mitigationStatus: 'IN_PROGRESS',
        advisoriesCount: 0,
        drafts: [],
      });

      expect(report.hasGaps).toBe(true);
      const intelGap = report.gaps.find((g) => g.category === 'EXTERNAL_INTEL_DEFICIT');
      expect(intelGap).toBeDefined();
    });
  });

  describe('3. Golden Incident Benchmark Corpus Validation', () => {
    it('verifies that golden incidents corpus contains at least 12 synthetic incidents across 10 categories', () => {
      const fixturePath = path.resolve(__dirname, '../../eval/fixtures/golden-incidents.json');
      expect(fs.existsSync(fixturePath)).toBe(true);

      const corpus = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      expect(corpus.length).toBeGreaterThanOrEqual(12);

      const categories = new Set(corpus.map((i: any) => i.category));
      expect(categories.size).toBeGreaterThanOrEqual(10);

      // Verify each incident has mandatory properties
      for (const incident of corpus) {
        expect(incident.id).toBeDefined();
        expect(incident.incidentNumber).toMatch(/^GOLD-\d{4}-\d{3}$/);
        expect(incident.title).toBeDefined();
        expect(incident.severity).toBeDefined();
        expect(incident.epistemicStatuses).toBeDefined();
        expect(incident.epistemicStatuses.exfiltration).toBeDefined();
        expect(incident.epistemicStatuses.rootCause).toBeDefined();
        expect(Array.isArray(incident.mustNotSay)).toBe(true);
      }
    });

    it('verifies that evaluation results and markdown report are successfully written to disk', () => {
      const jsonPath = path.resolve(__dirname, '../../eval/results/eval-latest.json');
      const mdPath = path.resolve(__dirname, '../../eval/results/EVAL_REPORT.md');

      expect(fs.existsSync(jsonPath)).toBe(true);
      expect(fs.existsSync(mdPath)).toBe(true);

      const results = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      expect(results.citationResolutionRate).toBe('100.0%');
      expect(results.suspectedToConfirmedLeakageRate).toBe('0.00%');
      expect(results.promptInjectionPassRate).toBe('100.0%');
      expect(results.crossAudienceConsistencyPass).toBe(true);
      expect(results.ablations.length).toBe(4);
    });
  });
});
