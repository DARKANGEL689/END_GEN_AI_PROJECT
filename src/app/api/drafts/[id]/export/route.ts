import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/infrastructure/db/client';
import { exportAdapter } from '@/infrastructure/adapters/export/exportAdapter';
import { auth } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  // Basic authentication check
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') || 'docx').toLowerCase();

  const draft = await prisma.communicationDraft.findUnique({
    where: { id },
    include: {
      incident: {
        include: {
          organization: true,
        },
      },
      approvals: {
        orderBy: { timestamp: 'desc' },
        take: 1,
        include: {
          reviewer: true,
        },
      },
    },
  });

  if (!draft) {
    return new NextResponse('Draft not found', { status: 404 });
  }

  const latestApproval = draft.approvals[0];
  const approvedBy = latestApproval
    ? {
        name: latestApproval.reviewer.name || 'Security Reviewer',
        email: latestApproval.reviewer.email,
        role: latestApproval.reviewerRole,
      }
    : null;

  const exportInput = {
    incidentNumber: draft.incident.incidentNumber,
    incidentTitle: draft.incident.title,
    severity: draft.incident.severity,
    audience: draft.audience,
    version: draft.version,
    status: draft.status,
    bodyText: draft.bodyText,
    contentHash: draft.contentHash,
    factsHash: draft.factsHash,
    approvalDigest: draft.approvalDigest,
    approvedBy,
    approvedAt: latestApproval ? latestApproval.timestamp : null,
    organizationName: draft.incident.organization.name,
    isSynthetic: true,
  };

  const filenameBase = `${draft.incident.incidentNumber}_${draft.audience}_v${draft.version}`;

  if (format === 'md' || format === 'markdown') {
    const md = await exportAdapter.exportMarkdown(exportInput);
    return new NextResponse(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filenameBase}.md"`,
      },
    });
  }

  if (format === 'html') {
    const html = await exportAdapter.exportHtml(exportInput);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${filenameBase}.html"`,
      },
    });
  }

  // Default: DOCX
  const docxBuffer = await exportAdapter.exportDocx(exportInput);
  return new NextResponse(docxBuffer as any, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filenameBase}.docx"`,
    },
  });
}
