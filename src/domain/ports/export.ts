export type ExportFormat = 'DOCX' | 'MARKDOWN' | 'HTML';

export interface ExportDraftInput {
  incidentNumber: string;
  incidentTitle: string;
  severity: string;
  audience: string;
  version: number;
  status: string;
  bodyText: string;
  contentHash: string;
  factsHash: string;
  approvalDigest?: string | null;
  approvedBy?: {
    name: string;
    email: string;
    role: string;
  } | null;
  approvedAt?: Date | null;
  organizationName: string;
  isSynthetic: boolean;
}

export interface ExportResult {
  filename: string;
  contentType: string;
  buffer: Buffer;
}

export interface ExportProvider {
  exportDocx(input: ExportDraftInput): Promise<Buffer>;
  exportMarkdown(input: ExportDraftInput): Promise<string>;
  exportHtml(input: ExportDraftInput): Promise<string>;
}
