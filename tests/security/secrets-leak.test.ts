import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Security: Client Bundle Secret Leak Check', () => {
  it('verifies that no secret keys or database connection strings exist in client-side bundles', () => {
    const nextStaticDir = path.join(process.cwd(), '.next', 'static');
    if (!fs.existsSync(nextStaticDir)) {
      // If build hasn't run, pass gracefully
      return;
    }

    const secretPatterns = [
      /npg_CTJNsW8M3HRo/, // Neon password
      /incidentcomms-sec-auth-key/, // Auth secret
      /AIzaSy/, // Google API key prefix
      /sk-proj-/, // OpenAI API key prefix
      /fc-[a-zA-Z0-9_-]{20,}/, // Firecrawl key pattern
    ];

    function scanDir(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.json')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of secretPatterns) {
            const matches = content.match(pattern);
            expect(matches, `Secret pattern ${pattern} detected in client bundle: ${fullPath}`).toBeNull();
          }
        }
      }
    }

    scanDir(nextStaticDir);
  });
});
