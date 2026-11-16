import { prisma } from '@/infrastructure/db/client';
import { localMemoryAdapter } from '@/infrastructure/adapters/memory/localMemoryAdapter';
import { wrapInIsolatedDataBlock } from '@/infrastructure/adapters/firecrawl/sanitizer';
import type { AudienceType } from '@prisma/client';

export interface CompiledContextBundle {
  incident: {
    id: string;
    incidentNumber: string;
    title: string;
    description: string;
    category: string;
    severity: string;
    status: string;
    discoveryTime: Date;
    regulatoryApplicability?: string | null;
  };
  epistemicFacts: Record<string, { status: string; details?: string | null }>;
  advisories: Array<{
    id: string;
    domain: string;
    tier: string;
    title: string;
    content: string;
    isQuarantined: boolean;
  }>;
  isolatedAdvisoryBlocks: string;
  template: {
    title: string;
    mandatorySections: string[];
    body: string;
    version: number;
  };
  terminologyRules: Array<{
    term: string;
    definition: string;
    forbidden: string[];
  }>;
}

/**
 * Compiles a hermetic, strictly typed context bundle for draft generation.
 */
export async function compileContextBundle(
  incidentId: string,
  audience: AudienceType
): Promise<CompiledContextBundle> {
  // 1. Fetch incident record with advisories
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      advisories: {
        where: { isQuarantined: false }, // Quarantined content is quarantined from active generation context
      },
    },
  });

  if (!incident) {
    throw new Error(`Incident ${incidentId} not found`);
  }

  // 2. Fetch approved template from memory provider
  const templateDto = await localMemoryAdapter.getTemplateForAudience(incident.organizationId, audience);
  if (!templateDto) {
    throw new Error(`No approved template registered for audience ${audience}`);
  }

  // 3. Fetch organizational terminology rules
  const terminologyRules = await localMemoryAdapter.getTerminologyRules(incident.organizationId);

  // 4. Map human epistemic statuses
  const epistemicFacts: Record<string, { status: string; details?: string | null }> = {
    accessScope: {
      status: incident.accessScopeStatus,
      details: incident.accessScopeDetails,
    },
    exfiltration: {
      status: incident.exfiltrationStatus,
      details: incident.exfiltrationDetails,
    },
    rootCause: {
      status: incident.rootCauseStatus,
      details: incident.rootCauseDetails,
    },
    affectedSystems: {
      status: incident.affectedSystemsStatus,
      details: incident.affectedSystemsDetails,
    },
    mitigation: {
      status: incident.mitigationStatus,
      details: incident.mitigationDetails,
    },
  };

  // 5. Wrap external advisories into isolated data blocks with strict instruction hierarchy
  const advisories = incident.advisories.map((a) => {
    const meta = a.metadataJson ? JSON.parse(a.metadataJson) : {};
    return {
      id: a.id,
      domain: a.sourceDomain,
      tier: a.reliabilityTier,
      title: meta.title || a.sourceDomain,
      content: a.cleanMarkdown,
      isQuarantined: a.isQuarantined,
    };
  });

  const isolatedAdvisoryBlocks = advisories
    .map((adv) =>
      wrapInIsolatedDataBlock({
        id: adv.id,
        domain: adv.domain,
        tier: adv.tier,
        title: adv.title,
        content: adv.content,
      })
    )
    .join('\n\n');

  return {
    incident: {
      id: incident.id,
      incidentNumber: incident.incidentNumber,
      title: incident.title,
      description: incident.description,
      category: incident.category,
      severity: incident.severity,
      status: incident.status,
      discoveryTime: incident.discoveryTime,
      regulatoryApplicability: incident.regulatoryApplicability,
    },
    epistemicFacts,
    advisories,
    isolatedAdvisoryBlocks,
    template: {
      title: templateDto.title,
      mandatorySections: templateDto.mandatorySections,
      body: templateDto.templateBody,
      version: templateDto.version,
    },
    terminologyRules: terminologyRules.map((r) => ({
      term: r.term,
      definition: r.approvedDefinition,
      forbidden: r.forbiddenSynonyms,
    })),
  };
}
