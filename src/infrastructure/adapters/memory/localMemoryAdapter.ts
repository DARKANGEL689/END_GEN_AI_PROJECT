import { prisma } from '@/infrastructure/db/client';
import type { MemoryProvider, ApprovedTemplateDTO, TerminologyDTO } from '@/domain/ports/memory';
import { authorize, type AuthUser } from '@/domain/permissions/rbac';
import type { AudienceType } from '@prisma/client';

export interface CreateTemplateInput {
  organizationId: string;
  audience: AudienceType;
  title: string;
  mandatorySections: string[];
  templateBody: string;
}

export interface UpdateTemplateInput {
  templateId: string;
  organizationId: string;
  title?: string;
  mandatorySections?: string[];
  templateBody?: string;
}

export interface CreateTerminologyInput {
  organizationId: string;
  term: string;
  approvedDefinition: string;
  forbiddenSynonyms: string[];
  category?: string;
}

export class LocalMemoryAdapter implements MemoryProvider {
  // Explicitly labeled per Section 2 requirement until an external provider is confirmed
  readonly name = 'Local adapter, not Memento';

  async getTemplateForAudience(
    organizationId: string,
    audience: string
  ): Promise<ApprovedTemplateDTO | null> {
    const template = await prisma.approvedTemplate.findFirst({
      where: {
        organizationId,
        audience: audience as AudienceType,
        isActive: true,
      },
      orderBy: { version: 'desc' },
    });

    if (!template) return null;

    let mandatorySections: string[] = [];
    try {
      mandatorySections = JSON.parse(template.mandatorySections);
    } catch {
      mandatorySections = [];
    }

    return {
      id: template.id,
      audience: template.audience,
      title: template.title,
      mandatorySections,
      templateBody: template.templateBody,
      version: template.version,
    };
  }

  async searchRelevantTemplates(
    organizationId: string,
    query: string,
    limit = 5
  ): Promise<ApprovedTemplateDTO[]> {
    const templates = await prisma.approvedTemplate.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    return templates.map((t) => {
      let mandatorySections: string[] = [];
      try {
        mandatorySections = JSON.parse(t.mandatorySections);
      } catch {
        mandatorySections = [];
      }

      return {
        id: t.id,
        audience: t.audience,
        title: t.title,
        mandatorySections,
        templateBody: t.templateBody,
        version: t.version,
      };
    });
  }

  async getTerminologyRules(organizationId: string): Promise<TerminologyDTO[]> {
    const items = await prisma.organizationalTerminology.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: { term: 'asc' },
    });

    return items.map((i) => {
      let forbiddenSynonyms: string[] = [];
      try {
        forbiddenSynonyms = JSON.parse(i.forbiddenSynonyms);
      } catch {
        forbiddenSynonyms = [];
      }

      return {
        id: i.id,
        term: i.term,
        approvedDefinition: i.approvedDefinition,
        forbiddenSynonyms,
        category: i.category,
      };
    });
  }

  async createTemplate(user: AuthUser, input: CreateTemplateInput) {
    const authz = authorize(user, 'TEMPLATE_MANAGE', { organizationId: input.organizationId });
    if (!authz.authorized) {
      throw new Error(authz.reason || 'Unauthorized to manage templates');
    }

    const template = await prisma.approvedTemplate.create({
      data: {
        organizationId: input.organizationId,
        audience: input.audience,
        title: input.title,
        mandatorySections: JSON.stringify(input.mandatorySections),
        templateBody: input.templateBody,
        version: 1,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'TEMPLATE_CREATED',
        entityType: 'TEMPLATE',
        entityId: template.id,
        metadataJson: JSON.stringify({ audience: input.audience, version: 1 }),
      },
    });

    return template;
  }

  async updateTemplate(user: AuthUser, input: UpdateTemplateInput) {
    const authz = authorize(user, 'TEMPLATE_MANAGE', { organizationId: input.organizationId });
    if (!authz.authorized) {
      throw new Error(authz.reason || 'Unauthorized to manage templates');
    }

    const existing = await prisma.approvedTemplate.findUnique({
      where: { id: input.templateId },
    });

    if (!existing || existing.organizationId !== input.organizationId) {
      throw new Error('Template not found or unauthorized');
    }

    const newVersion = existing.version + 1;

    const updated = await prisma.approvedTemplate.update({
      where: { id: input.templateId },
      data: {
        title: input.title !== undefined ? input.title : existing.title,
        templateBody: input.templateBody !== undefined ? input.templateBody : existing.templateBody,
        mandatorySections:
          input.mandatorySections !== undefined
            ? JSON.stringify(input.mandatorySections)
            : existing.mandatorySections,
        version: newVersion,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'TEMPLATE_UPDATED',
        entityType: 'TEMPLATE',
        entityId: updated.id,
        metadataJson: JSON.stringify({ audience: existing.audience, previousVersion: existing.version, newVersion }),
      },
    });

    return updated;
  }

  async createTerminology(user: AuthUser, input: CreateTerminologyInput) {
    const authz = authorize(user, 'TERMINOLOGY_MANAGE', { organizationId: input.organizationId });
    if (!authz.authorized) {
      throw new Error(authz.reason || 'Unauthorized to manage terminology');
    }

    const terminology = await prisma.organizationalTerminology.create({
      data: {
        organizationId: input.organizationId,
        term: input.term,
        approvedDefinition: input.approvedDefinition,
        forbiddenSynonyms: JSON.stringify(input.forbiddenSynonyms),
        category: input.category || 'GENERAL',
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'TERMINOLOGY_CREATED',
        entityType: 'TERMINOLOGY',
        entityId: terminology.id,
        metadataJson: JSON.stringify({ term: input.term, category: input.category }),
      },
    });

    return terminology;
  }

  async checkHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; latencyMs: number; details?: string }> {
    const start = Date.now();
    try {
      const count = await prisma.approvedTemplate.count();
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
        details: `Local adapter, not Memento (${count} templates registered in PostgreSQL)`,
      };
    } catch (err: unknown) {
      return {
        status: 'degraded',
        latencyMs: Date.now() - start,
        details: `Memory adapter degraded: ${(err as Error).message}`,
      };
    }
  }
}

export const localMemoryAdapter = new LocalMemoryAdapter();
