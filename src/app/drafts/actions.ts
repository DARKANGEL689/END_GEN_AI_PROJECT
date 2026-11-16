'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/infrastructure/db/client';
import { generateAudienceDraft, generateAllAudienceDrafts } from '@/domain/services/generationService';
import type { AudienceType, Role } from '@prisma/client';

export async function generateDraftAction(incidentId: string, audience: AudienceType) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const user = session.user as any;
  const result = await generateAudienceDraft({
    incidentId,
    audience,
    userId: user.id,
    userEmail: user.email || 'comms@sentineldefense.internal',
    userRole: user.role as Role,
  });

  revalidatePath('/drafts');
  revalidatePath(`/incidents/${incidentId}`);
  return { success: true, result };
}

export async function generateAllDraftsAction(incidentId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const user = session.user as any;
  const results = await generateAllAudienceDrafts({
    incidentId,
    userId: user.id,
    userEmail: user.email || 'comms@sentineldefense.internal',
    userRole: user.role as Role,
  });

  revalidatePath('/drafts');
  revalidatePath(`/incidents/${incidentId}`);
  return { success: true, results };
}

export async function getIncidentDraftsAction(incidentId: string) {
  const drafts = await prisma.communicationDraft.findMany({
    where: { incidentId },
    include: {
      createdBy: {
        select: { name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return drafts;
}
