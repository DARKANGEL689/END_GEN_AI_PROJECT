export type ReliabilityTier =
  | 'OFFICIAL_VENDOR'
  | 'CISA_NVD'
  | 'THREAT_INTEL'
  | 'COMMUNITY'
  | 'UNVERIFIED';

export interface AllowlistEntry {
  pattern: RegExp;
  tier: ReliabilityTier;
  organization: string;
}

export const DOMAIN_ALLOWLIST: AllowlistEntry[] = [
  // CISA & National Vulnerability Databases
  { pattern: /^([a-z0-9-]+\.)?cisa\.gov$/i, tier: 'CISA_NVD', organization: 'CISA (Cybersecurity and Infrastructure Security Agency)' },
  { pattern: /^([a-z0-9-]+\.)?nvd\.nist\.gov$/i, tier: 'CISA_NVD', organization: 'NIST National Vulnerability Database' },
  { pattern: /^([a-z0-9-]+\.)?cve\.org$/i, tier: 'CISA_NVD', organization: 'CVE Program' },

  // Official Security Vendors & Primary OS/Hardware
  { pattern: /^([a-z0-9-]+\.)?msrc\.microsoft\.com$/i, tier: 'OFFICIAL_VENDOR', organization: 'Microsoft Security Response Center' },
  { pattern: /^([a-z0-9-]+\.)?support\.apple\.com$/i, tier: 'OFFICIAL_VENDOR', organization: 'Apple Security Updates' },
  { pattern: /^([a-z0-9-]+\.)?sec\.cloud\.google$/i, tier: 'OFFICIAL_VENDOR', organization: 'Google Cloud Security' },
  { pattern: /^([a-z0-9-]+\.)?cisco\.com$/i, tier: 'OFFICIAL_VENDOR', organization: 'Cisco Security Advisories' },
  { pattern: /^([a-z0-9-]+\.)?pulseguard\.security$/i, tier: 'OFFICIAL_VENDOR', organization: 'PulseGuard Security (Demo Vendor)' },
  { pattern: /^([a-z0-9-]+\.)?ivanti\.com$/i, tier: 'OFFICIAL_VENDOR', organization: 'Ivanti Security Advisories' },

  // Tier 1 Threat Intelligence & Research Firms
  { pattern: /^([a-z0-9-]+\.)?mandiant\.com$/i, tier: 'THREAT_INTEL', organization: 'Mandiant Threat Intelligence' },
  { pattern: /^([a-z0-9-]+\.)?crowdstrike\.com$/i, tier: 'THREAT_INTEL', organization: 'CrowdStrike Falcon OverWatch' },
  { pattern: /^([a-z0-9-]+\.)?unit42\.paloaltonetworks\.com$/i, tier: 'THREAT_INTEL', organization: 'Palo Alto Networks Unit 42' },
  { pattern: /^([a-z0-9-]+\.)?krebsonsecurity\.com$/i, tier: 'THREAT_INTEL', organization: 'Krebs on Security' },
  { pattern: /^([a-z0-9-]+\.)?bleepingcomputer\.com$/i, tier: 'THREAT_INTEL', organization: 'Bleeping Computer Security News' },

  // Community & Open Source Repositories
  { pattern: /^([a-z0-9-]+\.)?github\.com$/i, tier: 'COMMUNITY', organization: 'GitHub Security Advisory Database' },
];

export interface AllowlistCheckResult {
  allowed: boolean;
  tier: ReliabilityTier;
  organization?: string;
  hostname: string;
}

/**
 * Validates whether a target URL or redirect hostname matches the strict server-side allowlist.
 */
export function checkDomainAllowlist(urlString: string): AllowlistCheckResult {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    for (const entry of DOMAIN_ALLOWLIST) {
      if (entry.pattern.test(hostname)) {
        return {
          allowed: true,
          tier: entry.tier,
          organization: entry.organization,
          hostname,
        };
      }
    }

    return {
      allowed: false,
      tier: 'UNVERIFIED',
      hostname,
    };
  } catch {
    return {
      allowed: false,
      tier: 'UNVERIFIED',
      hostname: 'invalid-url',
    };
  }
}
