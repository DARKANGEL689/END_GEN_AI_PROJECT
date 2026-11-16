import { prisma } from '@/infrastructure/db/client';
import { DraftStudio } from '@/components/drafts/DraftStudio';

export const metadata = {
  title: 'Draft Studio | IncidentComms AI',
};

export default async function DraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ incidentId?: string }>;
}) {
  const { incidentId } = await searchParams;

  // Fetch all incidents
  const incidents = await prisma.incident.findMany({
    select: {
      id: true,
      incidentNumber: true,
      title: true,
      severity: true,
      status: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const activeIncident = incidentId
    ? incidents.find((i) => i.id === incidentId) || incidents[0]
    : incidents[0];

  let initialDrafts: any[] = [];
  if (activeIncident) {
    initialDrafts = await prisma.communicationDraft.findMany({
      where: { incidentId: activeIncident.id },
      include: {
        createdBy: {
          select: { name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  return (
    <div className="space-y-6">
      <DraftStudio
        incidents={incidents}
        currentIncidentId={activeIncident?.id || ''}
        initialDrafts={initialDrafts}
      />
    </div>
  );
}
