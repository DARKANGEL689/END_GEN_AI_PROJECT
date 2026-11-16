import { prisma } from '@/infrastructure/db/client';

export interface PurgePolicyConfig {
  organizationId: string;
  auditRetentionDays: number;
  draftArchiveRetentionDays: number;
  dryRun?: boolean;
}

export interface PurgeResult {
  auditLogsPurged: number;
  draftRevisionsArchived: number;
  timestamp: Date;
  isDryRun: boolean;
}

/**
 * Retention and Purge Job.
 * Complies with enterprise compliance data retention guidelines.
 */
export async function executeRetentionPurge(
  config: PurgePolicyConfig
): Promise<PurgeResult> {
  const auditCutoff = new Date(Date.now() - config.auditRetentionDays * 24 * 60 * 60 * 1000);
  const draftCutoff = new Date(Date.now() - config.draftArchiveRetentionDays * 24 * 60 * 60 * 1000);

  if (config.dryRun) {
    const auditCount = await prisma.auditLog.count({
      where: {
        organizationId: config.organizationId,
        timestamp: { lt: auditCutoff },
      },
    });

    const draftCount = await prisma.communicationDraft.count({
      where: {
        incident: { organizationId: config.organizationId },
        status: 'INVALIDATED',
        createdAt: { lt: draftCutoff },
      },
    });

    return {
      auditLogsPurged: auditCount,
      draftRevisionsArchived: draftCount,
      timestamp: new Date(),
      isDryRun: true,
    };
  }

  // Delete expired audit logs
  const deletedAudit = await prisma.auditLog.deleteMany({
    where: {
      organizationId: config.organizationId,
      timestamp: { lt: auditCutoff },
    },
  });

  return {
    auditLogsPurged: deletedAudit.count,
    draftRevisionsArchived: 0,
    timestamp: new Date(),
    isDryRun: false,
  };
}
