'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { localMemoryAdapter } from '@/infrastructure/adapters/memory/localMemoryAdapter';
import { prisma } from '@/infrastructure/db/client';
import { authorize, type Role } from '@/domain/permissions/rbac';
import { z } from 'zod';
import type { AudienceType } from '@prisma/client';

const templateSchema = z.object({
  audience: z.enum(['EXECUTIVE', 'ENGINEERING', 'ALL_HANDS', 'CUSTOMER', 'REGULATORY']),
  title: z.string().min(5),
  mandatorySections: z.string().min(3), // comma-separated or newline-separated
  templateBody: z.string().min(10),
});

const terminologySchema = z.object({
  term: z.string().min(2),
  approvedDefinition: z.string().min(5),
  forbiddenSynonyms: z.string().min(2), // comma-separated
  category: z.string().default('GENERAL'),
});

export async function createTemplateAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthenticated');

  const rawData = {
    audience: formData.get('audience') as AudienceType,
    title: formData.get('title') as string,
    mandatorySections: formData.get('mandatorySections') as string,
    templateBody: formData.get('templateBody') as string,
  };

  const parsed = templateSchema.parse(rawData);
  const sections = parsed.mandatorySections
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const authUser = {
    id: session.user.id,
    email: session.user.email!,
    role: session.user.role as Role,
    organizationId: session.user.organizationId,
  };

  await localMemoryAdapter.createTemplate(authUser, {
    organizationId: authUser.organizationId,
    audience: parsed.audience,
    title: parsed.title,
    mandatorySections: sections,
    templateBody: parsed.templateBody,
  });

  revalidatePath('/memory');
  return { success: true };
}

export async function updateTemplateAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthenticated');

  const templateId = formData.get('templateId') as string;
  const title = formData.get('title') as string;
  const rawSections = formData.get('mandatorySections') as string;
  const templateBody = formData.get('templateBody') as string;

  const sections = rawSections
    ? rawSections
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : undefined;

  const authUser = {
    id: session.user.id,
    email: session.user.email!,
    role: session.user.role as Role,
    organizationId: session.user.organizationId,
  };

  await localMemoryAdapter.updateTemplate(authUser, {
    templateId,
    organizationId: authUser.organizationId,
    title: title || undefined,
    mandatorySections: sections,
    templateBody: templateBody || undefined,
  });

  revalidatePath('/memory');
  return { success: true };
}

export async function createTerminologyAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthenticated');

  const rawData = {
    term: formData.get('term') as string,
    approvedDefinition: formData.get('approvedDefinition') as string,
    forbiddenSynonyms: formData.get('forbiddenSynonyms') as string,
    category: (formData.get('category') as string) || 'GENERAL',
  };

  const parsed = terminologySchema.parse(rawData);
  const synonyms = parsed.forbiddenSynonyms
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const authUser = {
    id: session.user.id,
    email: session.user.email!,
    role: session.user.role as Role,
    organizationId: session.user.organizationId,
  };

  await localMemoryAdapter.createTerminology(authUser, {
    organizationId: authUser.organizationId,
    term: parsed.term,
    approvedDefinition: parsed.approvedDefinition,
    forbiddenSynonyms: synonyms,
    category: parsed.category,
  });

  revalidatePath('/memory');
  return { success: true };
}

export async function deleteTerminologyAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthenticated');

  const id = formData.get('id') as string;
  const authUser = {
    id: session.user.id,
    email: session.user.email!,
    role: session.user.role as Role,
    organizationId: session.user.organizationId,
  };

  const authz = authorize(authUser, 'TERMINOLOGY_MANAGE', { organizationId: authUser.organizationId });
  if (!authz.authorized) {
    throw new Error(authz.reason || 'Unauthorized to manage terminology');
  }

  await prisma.organizationalTerminology.delete({
    where: { id },
  });

  revalidatePath('/memory');
  return { success: true };
}
