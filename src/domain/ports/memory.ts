export interface ApprovedTemplateDTO {
  id: string;
  audience: 'EXECUTIVE' | 'ENGINEERING' | 'ALL_HANDS' | 'CUSTOMER' | 'REGULATORY';
  title: string;
  mandatorySections: string[];
  templateBody: string;
  version: number;
}

export interface TerminologyDTO {
  id: string;
  term: string;
  approvedDefinition: string;
  forbiddenSynonyms: string[];
  category: string;
}

export interface MemoryProvider {
  name: string; // e.g. "Local adapter, not Memento" or "Mem0"
  getTemplateForAudience(
    organizationId: string,
    audience: string
  ): Promise<ApprovedTemplateDTO | null>;
  searchRelevantTemplates(
    organizationId: string,
    query: string,
    limit?: number
  ): Promise<ApprovedTemplateDTO[]>;
  getTerminologyRules(organizationId: string): Promise<TerminologyDTO[]>;
  checkHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; latencyMs: number; details?: string }>;
}
