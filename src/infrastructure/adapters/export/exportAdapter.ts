import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer,
} from 'docx';
import type { ExportProvider, ExportDraftInput } from '@/domain/ports/export';

export class ExportAdapter implements ExportProvider {
  /**
   * Generates a corporate DOCX document with cryptographic seals and synthetic data notice.
   */
  async exportDocx(input: ExportDraftInput): Promise<Buffer> {
    const docChildren: (Paragraph | Table)[] = [];

    // 1. Synthetic Data Warning Banner (Header)
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: '⚠️ SYNTHETIC INCIDENT EXERCISE DATA - RESTRICTED DISTRIBUTION',
            bold: true,
            color: 'D97706',
            size: 20,
          }),
        ],
      })
    );

    // 2. Document Title
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `Incident Communications Notice: ${input.incidentNumber}`,
            bold: true,
            size: 32,
            color: '0F172A',
          }),
        ],
      })
    );

    docChildren.push(
      new Paragraph({
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: `${input.organizationName} • Target Audience: ${input.audience} • Severity: ${input.severity}`,
            italics: true,
            color: '475569',
            size: 20,
          }),
        ],
      })
    );

    // 3. Metadata & Cryptographic Table
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: 'Incident Reference', bold: true })] })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun(input.incidentNumber)] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Draft Version / Status', bold: true })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun(`v${input.version} (${input.status})`)] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Facts Hash (SHA-256)', bold: true })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: input.factsHash, font: 'Courier New', size: 16 })] })],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Content Hash (SHA-256)', bold: true })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: input.contentHash, font: 'Courier New', size: 16 })] })],
          }),
        ],
      }),
    ];

    if (input.approvalDigest) {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Approval Signature Digest', bold: true, color: '059669' })] })],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: input.approvalDigest,
                      font: 'Courier New',
                      size: 16,
                      bold: true,
                      color: '059669',
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    }

    docChildren.push(
      new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );

    docChildren.push(new Paragraph({ spacing: { after: 240 } }));

    // 4. Draft Body Content (parse markdown headers and paragraphs)
    const lines = input.bodyText.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        docChildren.push(new Paragraph({ spacing: { after: 120 } }));
        continue;
      }

      if (line.startsWith('## ')) {
        docChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: line.replace('## ', ''),
                bold: true,
                size: 24,
                color: '1E293B',
              }),
            ],
          })
        );
      } else if (line.startsWith('# ')) {
        docChildren.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: line.replace('# ', ''),
                bold: true,
                size: 28,
                color: '0F172A',
              }),
            ],
          })
        );
      } else {
        docChildren.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: line,
                size: 22,
                color: '334155',
              }),
            ],
          })
        );
      }
    }

    // 5. Audit & Governance Sign-off Box
    docChildren.push(new Paragraph({ spacing: { before: 360, after: 120 } }));
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: '----------------------------- END OF COMMUNICATIONS NOTICE -----------------------------',
            color: '94A3B8',
            size: 16,
          }),
        ],
      })
    );

    if (input.approvedBy) {
      docChildren.push(
        new Paragraph({
          spacing: { before: 120 },
          children: [
            new TextRun({
              text: `Digitally Approved by: ${input.approvedBy.name} (${input.approvedBy.role}) <${input.approvedBy.email}>`,
              bold: true,
              color: '059669',
              size: 18,
            }),
          ],
        })
      );
      if (input.approvedAt) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Timestamp: ${new Date(input.approvedAt).toISOString()}`,
                color: '64748B',
                size: 18,
              }),
            ],
          })
        );
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docChildren,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  /**
   * Generates clean Markdown with YAML frontmatter.
   */
  async exportMarkdown(input: ExportDraftInput): Promise<string> {
    const frontmatter = `---
incidentNumber: "${input.incidentNumber}"
incidentTitle: "${input.incidentTitle.replace(/"/g, '\\"')}"
audience: "${input.audience}"
severity: "${input.severity}"
version: ${input.version}
status: "${input.status}"
contentHash: "${input.contentHash}"
factsHash: "${input.factsHash}"
approvalDigest: "${input.approvalDigest || 'NONE'}"
approvedBy: "${input.approvedBy ? `${input.approvedBy.name} (${input.approvedBy.role})` : 'UNAPPROVED'}"
approvedAt: "${input.approvedAt ? new Date(input.approvedAt).toISOString() : 'N/A'}"
classification: "SYNTHETIC_DATA_EXERCISE"
---

> [!WARNING]
> **SYNTHETIC DATA EXERCISE**: This incident communication document was generated as part of a synthetic incident response simulation.

# Incident Communication: ${input.incidentNumber}
**Audience:** ${input.audience} | **Severity:** ${input.severity} | **Status:** ${input.status} (v${input.version})

${input.bodyText}

---

### Cryptographic Verification Signatures
- **Facts Hash:** \`${input.factsHash}\`
- **Content Hash:** \`${input.contentHash}\`
- **Approval Digest:** \`${input.approvalDigest || 'UNAPPROVED'}\`
`;
    return frontmatter;
  }

  /**
   * Generates a self-contained, publication-ready HTML document with dark enterprise styling.
   */
  async exportHtml(input: ExportDraftInput): Promise<string> {
    const bodyFormatted = input.bodyText
      .replace(/## (.*)/g, '<h2 class="text-xl font-bold text-slate-100 mt-6 mb-2">$1</h2>')
      .replace(/# (.*)/g, '<h1 class="text-2xl font-black text-cyan-400 mt-8 mb-3">$1</h1>')
      .replace(/(\[c\d+\])/g, '<span class="px-1.5 py-0.5 text-xs font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">$1</span>')
      .replace(/\n\n/g, '</p><p class="my-3 text-slate-300 leading-relaxed">');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>IncidentComms AI - ${input.incidentNumber} (${input.audience})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #020617; color: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 800px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .banner { background: #451a03; border: 1px solid #b45309; color: #fef3c7; padding: 12px; border-radius: 8px; font-weight: bold; text-align: center; margin-bottom: 24px; font-size: 13px; }
    .title { font-size: 24px; font-weight: 800; color: #38bdf8; margin: 0 0 8px 0; }
    .subtitle { font-size: 14px; color: #94a3b8; margin-bottom: 24px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
    .table td { padding: 8px 12px; border: 1px solid #1e293b; }
    .table td:first-child { font-weight: bold; color: #cbd5e1; width: 30%; background: #0b1120; }
    .code { font-family: monospace; color: #38bdf8; word-break: break-all; }
    .content { font-size: 15px; line-height: 1.6; color: #e2e8f0; border-top: 1px solid #1e293b; padding-top: 20px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="banner">⚠️ SYNTHETIC EXERCISE DATA - RESTRICTED INTERNAL COMMUNICATIONS ONLY</div>
    <h1 class="title">Incident Communications: ${input.incidentNumber}</h1>
    <div class="subtitle">${input.organizationName} • Audience: ${input.audience} • Severity: ${input.severity} • Status: ${input.status} (v${input.version})</div>

    <table class="table">
      <tr><td>Facts Hash</td><td class="code">${input.factsHash}</td></tr>
      <tr><td>Content Hash</td><td class="code">${input.contentHash}</td></tr>
      <tr><td>Approval Digest</td><td class="code">${input.approvalDigest || 'UNAPPROVED'}</td></tr>
      ${input.approvedBy ? `<tr><td>Approved By</td><td>${input.approvedBy.name} (${input.approvedBy.role}) - ${new Date(input.approvedAt || Date.now()).toISOString()}</td></tr>` : ''}
    </table>

    <div class="content">
      <p class="my-3 text-slate-300 leading-relaxed">${bodyFormatted}</p>
    </div>

    <div class="footer">
      Generated by IncidentComms AI • Cryptographically Signed Communication Record • Append-Only Audit ID: ${input.contentHash.slice(0, 16)}
    </div>
  </div>
</body>
</html>`;
  }
}

export const exportAdapter = new ExportAdapter();
