'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/infrastructure/db/client';
import { firecrawlAdapter } from '@/infrastructure/adapters/firecrawl/firecrawlAdapter';
import { authorize, type Role } from '@/domain/permissions/rbac';
import { z } from 'zod';

const fetchAdvisorySchema = z.object({
  incidentId: z.string(),
  url: z.string().url('Must provide a valid advisory URL'),
});

export async function fetchAdvisoryAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthenticated');
  }

  const rawData = {
    incidentId: formData.get('incidentId') as string,
    url: (formData.get('url') as string).trim(),
  };

  const parsed = fetchAdvisorySchema.parse(rawData);

  const authUser = {
    id: session.user.id,
    email: session.user.email!,
    role: session.user.role as Role,
    organizationId: session.user.organizationId,
  };

  // 1. Authorize
  const authz = authorize(authUser, 'INTELLIGENCE_FETCH', { organizationId: authUser.organizationId });
  if (!authz.authorized) {
    throw new Error(authz.reason || 'Unauthorized to fetch intelligence');
  }

  // 2. Fetch via Firecrawl Adapter (allowlist, cache & injection scan handled inside)
  const scraped = await firecrawlAdapter.scrapeAdvisory(parsed.url);

  // 3. Persist in database
  const advisory = await prisma.externalAdvisory.create({
    data: {
      incidentId: parsed.incidentId,
      sourceUrl: scraped.sourceUrl,
      sourceDomain: scraped.sourceDomain,
      reliabilityTier: scraped.reliabilityTier,
      isQuarantined: scraped.isQuarantined,
      flagReason: scraped.flagReason,
      cleanMarkdown: scraped.cleanMarkdown,
      rawContent: scraped.rawContent,
      metadataJson: JSON.stringify({
        title: scraped.title,
        fetchedAt: scraped.fetchedAt,
      }),
    },
  });

  // 4. Append-only audit log
  await prisma.auditLog.create({
    data: {
      organizationId: authUser.organizationId,
      incidentId: parsed.incidentId,
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      action: 'INTELLIGENCE_RETRIEVED',
      entityType: 'ADVISORY',
      entityId: advisory.id,
      metadataJson: JSON.stringify({
        url: scraped.sourceUrl,
        domain: scraped.sourceDomain,
        tier: scraped.reliabilityTier,
        isQuarantined: scraped.isQuarantined,
        flagReason: scraped.flagReason,
      }),
    },
  });

  revalidatePath('/intelligence');
  revalidatePath(`/incidents/${parsed.incidentId}`);

  return { success: true, advisoryId: advisory.id, isQuarantined: advisory.isQuarantined };
}

export async function toggleQuarantineAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthenticated');
  }

  const advisoryId = formData.get('advisoryId') as string;
  const isQuarantined = formData.get('isQuarantined') === 'true';
  const reason = (formData.get('reason') as string) || 'Manual quarantine toggle by security officer';

  const authUser = {
    id: session.user.id,
    email: session.user.email!,
    role: session.user.role as Role,
    organizationId: session.user.organizationId,
  };

  // Authorize
  const authz = authorize(authUser, 'INTELLIGENCE_QUARANTINE', { organizationId: authUser.organizationId });
  if (!authz.authorized) {
    throw new Error(authz.reason || 'Unauthorized to modify quarantine status');
  }

  const updated = await prisma.externalAdvisory.update({
    where: { id: advisoryId },
    data: {
      isQuarantined,
      flagReason: isQuarantined ? reason : null,
    },
    include: { incident: true },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      organizationId: authUser.organizationId,
      incidentId: updated.incidentId,
      actorId: authUser.id,
      actorEmail: authUser.email,
      actorRole: authUser.role,
      action: isQuarantined ? 'INTELLIGENCE_QUARANTINED' : 'INTELLIGENCE_UNQUARANTINED',
      entityType: 'ADVISORY',
      entityId: updated.id,
      metadataJson: JSON.stringify({ isQuarantined, reason }),
    },
  });

  revalidatePath('/intelligence');
  revalidatePath(`/incidents/${updated.incidentId}`);

  return { success: true };
}
