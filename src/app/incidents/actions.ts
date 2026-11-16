'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createIncident, updateEpistemicStatus } from '@/domain/services/incidentService';
import type { Role } from '@/domain/permissions/rbac';
import { z } from 'zod';

const createIncidentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(2),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  regulatoryApplicability: z.string().optional(),
  accessScopeStatus: z.enum(['CONFIRMED', 'SUSPECTED', 'UNKNOWN', 'DISPUTED']).default('UNKNOWN'),
  accessScopeDetails: z.string().optional(),
  exfiltrationStatus: z.enum(['CONFIRMED', 'SUSPECTED', 'UNKNOWN', 'DISPUTED']).default('UNKNOWN'),
  exfiltrationDetails: z.string().optional(),
  rootCauseStatus: z.enum(['CONFIRMED', 'SUSPECTED', 'UNKNOWN', 'DISPUTED']).default('UNKNOWN'),
  rootCauseDetails: z.string().optional(),
  affectedSystemsStatus: z.enum(['CONFIRMED', 'SUSPECTED', 'UNKNOWN', 'DISPUTED']).default('UNKNOWN'),
  affectedSystemsDetails: z.string().optional(),
  mitigationStatus: z.enum(['CONFIRMED', 'SUSPECTED', 'UNKNOWN', 'DISPUTED']).default('SUSPECTED'),
  mitigationDetails: z.string().optional(),
});

export async function createIncidentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthenticated');
  }

  const rawData = {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    category: formData.get('category') as string,
    severity: formData.get('severity') as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
    regulatoryApplicability: formData.get('regulatoryApplicability') as string,
    accessScopeStatus: (formData.get('accessScopeStatus') as 'CONFIRMED' | 'SUSPECTED' | 'UNKNOWN' | 'DISPUTED') || 'UNKNOWN',
    accessScopeDetails: formData.get('accessScopeDetails') as string,
    exfiltrationStatus: (formData.get('exfiltrationStatus') as 'CONFIRMED' | 'SUSPECTED' | 'UNKNOWN' | 'DISPUTED') || 'UNKNOWN',
    exfiltrationDetails: formData.get('exfiltrationDetails') as string,
    rootCauseStatus: (formData.get('rootCauseStatus') as 'CONFIRMED' | 'SUSPECTED' | 'UNKNOWN' | 'DISPUTED') || 'UNKNOWN',
    rootCauseDetails: formData.get('rootCauseDetails') as string,
    affectedSystemsStatus: (formData.get('affectedSystemsStatus') as 'CONFIRMED' | 'SUSPECTED' | 'UNKNOWN' | 'DISPUTED') || 'UNKNOWN',
    affectedSystemsDetails: formData.get('affectedSystemsDetails') as string,
    mitigationStatus: (formData.get('mitigationStatus') as 'CONFIRMED' | 'SUSPECTED' | 'UNKNOWN' | 'DISPUTED') || 'SUSPECTED',
    mitigationDetails: formData.get('mitigationDetails') as string,
  };

  const parsed = createIncidentSchema.parse(rawData);

  const authUser = {
    id: session.user.id,
    email: session.user.email!,
    role: session.user.role as Role,
    organizationId: session.user.organizationId,
  };

  const incident = await createIncident(authUser, parsed);

  revalidatePath('/incidents');
  redirect(`/incidents/${incident.id}`);
}

export async function updateEpistemicAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthenticated');
  }

  const incidentId = formData.get('incidentId') as string;
  const field = formData.get('field') as 'accessScope' | 'exfiltration' | 'rootCause' | 'affectedSystems' | 'mitigation';
  const status = formData.get('status') as 'CONFIRMED' | 'SUSPECTED' | 'UNKNOWN' | 'DISPUTED';
  const details = (formData.get('details') as string) || undefined;

  const authUser = {
    id: session.user.id,
    email: session.user.email!,
    role: session.user.role as Role,
    organizationId: session.user.organizationId,
  };

  const result = await updateEpistemicStatus(authUser, {
    incidentId,
    field,
    status,
    details,
  });

  revalidatePath(`/incidents/${incidentId}`);
  revalidatePath('/incidents');
  revalidatePath('/audit');

  return { success: true, invalidatedDraftCount: result.invalidatedDraftCount };
}
