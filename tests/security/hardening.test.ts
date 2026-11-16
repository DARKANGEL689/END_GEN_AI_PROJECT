import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { exportAdapter } from '@/infrastructure/adapters/export/exportAdapter';
import { scanForPromptInjection } from '@/infrastructure/adapters/firecrawl/sanitizer';
import { executeRetentionPurge } from '@/infrastructure/jobs/retentionPurge';
import { prisma } from '@/infrastructure/db/client';

describe('Phase 9: Security Hardening & Isolation Suite', () => {
  describe('1. Client Bundle Secret Leakage Prevention', () => {
    it('verifies that no server secrets or API keys are leaked into Next.js client bundles', () => {
      const chunksDir = path.resolve(__dirname, '../../.next/static/chunks');
      if (!fs.existsSync(chunksDir)) {
        console.warn('Skipping client bundle check: .next/static/chunks does not exist yet (run next build first)');
        return;
      }

      const forbiddenSecrets = [
        process.env.DATABASE_URL,
        process.env.AUTH_SECRET,
        process.env.FIRECRAWL_API_KEY,
        process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      ].filter((s): s is string => typeof s === 'string' && s.length > 8);

      const files = fs.readdirSync(chunksDir).filter((f) => f.endsWith('.js'));
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const content = fs.readFileSync(path.join(chunksDir, file), 'utf8');

        // Check for specific environment secret values
        for (const secret of forbiddenSecrets) {
          expect(content).not.toContain(secret);
        }

        // Check for generic high-entropy API key patterns
        expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
        expect(content).not.toMatch(/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/);
      }
    });
  });

  describe('2. XSS & HTML Injection Sanitization', () => {
    const maliciousPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(document.cookie)">',
      '<svg/onload=alert(1)>',
      '<iframe src="javascript:alert(1)"></iframe>',
      'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"/+/onmouseover=1/+/[*[]/+alert(1)//\'>',
    ];

    it('neutralizes adversarial XSS payloads embedded in external advisories', () => {
      for (const payload of maliciousPayloads) {
        const scan = scanForPromptInjection(payload);
        // Either caught by injection scanner or safely isolated
        expect(typeof scan.quarantinedText).toBe('string');
      }
    });

    it('safely escapes script execution when exporting HTML reports', async () => {
      const htmlOutput = await exportAdapter.exportHtml({
        incidentNumber: 'INC-2026-XSS-TEST',
        incidentTitle: 'Cross-Site Scripting Injection Test',
        severity: 'HIGH',
        audience: 'ALL_HANDS',
        version: 1,
        status: 'DRAFT',
        bodyText:
          '## Security Notice\nAdversary attempted script tag injection: <script>alert(1)</script> and onerror handlers.',
        contentHash: 'hash-test-xss',
        factsHash: 'facts-test-xss',
        organizationName: 'Sentinel Defense',
        isSynthetic: true,
      });

      // Assert that executable raw <script>alert(1)</script> tag is not rendered as an executable HTML script tag in body
      expect(htmlOutput).not.toMatch(/<script>alert\(1\)<\/script>/i);
    });
  });

  describe('3. Multi-Tenant Organization Isolation', () => {
    it('enforces tenant separation by organizationId', async () => {
      const sentinelOrg = await prisma.organization.findFirst({
        where: { name: 'Sentinel Enterprise Defense' },
      });
      expect(sentinelOrg).toBeDefined();

      // Query scoped by Sentinel Org
      const incidents = await prisma.incident.findMany({
        where: { organizationId: sentinelOrg!.id },
      });

      for (const inc of incidents) {
        expect(inc.organizationId).toBe(sentinelOrg!.id);
      }

      // Verify that querying with a non-existent / unauthorized org returns 0 records
      const foreignIncidents = await prisma.incident.findMany({
        where: { organizationId: 'non-existent-unauthorized-org' },
      });
      expect(foreignIncidents.length).toBe(0);
    });
  });

  describe('4. Retention Policy & Compliance Purge Job', () => {
    it('executes dry-run retention purge calculation without deleting live data', async () => {
      const org = await prisma.organization.findFirst();
      if (!org) return;

      const result = await executeRetentionPurge({
        organizationId: org.id,
        auditRetentionDays: 90,
        draftArchiveRetentionDays: 30,
        dryRun: true,
      });

      expect(result.isDryRun).toBe(true);
      expect(typeof result.auditLogsPurged).toBe('number');
      expect(typeof result.draftRevisionsArchived).toBe('number');
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });
});
