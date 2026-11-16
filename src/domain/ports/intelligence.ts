export interface ScrapedAdvisory {
  sourceUrl: string;
  sourceDomain: string;
  title: string;
  cleanMarkdown: string;
  rawContent?: string;
  reliabilityTier: 'OFFICIAL_VENDOR' | 'CISA_NVD' | 'THREAT_INTEL' | 'COMMUNITY' | 'UNVERIFIED';
  isQuarantined: boolean;
  flagReason?: string;
  fetchedAt: Date;
}

export interface IntelligenceProvider {
  scrapeAdvisory(url: string): Promise<ScrapedAdvisory>;
  crawlAdvisories(baseUrl: string, limit?: number): Promise<ScrapedAdvisory[]>;
  checkHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; latencyMs: number; details?: string }>;
}
