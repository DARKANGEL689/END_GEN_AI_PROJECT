export interface ExportPayload {
  incidentNumber: string;
  incidentTitle: string;
  severity: string;
  audience: string;
  version: number;
  approvedAt: Date;
  approvedBy: string;
  approvedRole: string;
  approvalDigest: string;
  bodyText: string;
  claimsCount: number;
  qualityScore: number;
}

export interface ExportProvider {
  generateDocx(payload: ExportPayload): Promise<Buffer>;
  generatePdf(payload: ExportPayload): Promise<Buffer>;
}
