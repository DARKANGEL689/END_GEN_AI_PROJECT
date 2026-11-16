import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/infrastructure/db/client';
import { auth } from '@/auth';
import { EpistemicEditor } from '@/components/incidents/EpistemicEditor';
import {
  Shield,
  Clock,
  FileText,
  Globe,
  Sparkles,
  History,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface IncidentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function IncidentDetailPage({ params }: IncidentDetailPageProps) {
  const { id } = await params;
  const session = await auth();

  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      createdBy: true,
      advisories: true,
      drafts: {
        orderBy: { audience: 'asc' },
      },
      auditLogs: {
        orderBy: { timestamp: 'desc' },
        take: 20,
      },
    },
  });

  if (!incident) {
    notFound();
  }

  const userRole = session?.user?.role;
  const canEditEpistemic = userRole === 'INCIDENT_MANAGER' || userRole === 'SECURITY_LEAD';

  const audiences = [
    { type: 'EXECUTIVE', label: 'Executive Leadership', desc: 'Financial, legal, and operational posture' },
    { type: 'ENGINEERING', label: 'Engineering & SecOps', desc: 'IOCs, containment, and patch deployment' },
    { type: 'ALL_HANDS', label: 'All-Hands Employees', desc: 'Staff guidance, phishing cautions, and safe ops' },
    { type: 'CUSTOMER', label: 'Customer-Facing Advisory', desc: 'Customer trust, SLA impact, and data assurance' },
    { type: 'REGULATORY', label: 'Regulatory Disclosure', desc: 'Statutory compliance (GDPR Art 33 / SEC 8-K)' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Incident Header & Command Bar */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-3 flex-wrap gap-y-1">
              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/70 border border-blue-500/30 px-2.5 py-0.5 rounded">
                {incident.incidentNumber}
              </span>
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                  incident.severity === 'CRITICAL'
                    ? 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                    : incident.severity === 'HIGH'
                    ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                    : 'bg-blue-950/70 text-blue-300 border-blue-500/40'
                }`}
              >
                {incident.severity} SEVERITY
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded">
                {incident.status}
              </span>
              <span className="text-xs text-muted-foreground flex items-center space-x-1 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>Detected: {new Date(incident.discoveryTime).toLocaleString()}</span>
              </span>
            </div>

            <h1 className="text-xl font-bold text-white tracking-tight">
              {incident.title}
            </h1>
            <p className="text-xs text-slate-400 max-w-4xl leading-relaxed">
              {incident.description}
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex items-center space-x-2 shrink-0">
            <Link
              href={`/intelligence?incidentId=${incident.id}`}
              className="inline-flex items-center space-x-1.5 bg-[#0f172a] hover:bg-slate-800 text-slate-200 text-xs font-medium px-3.5 py-2 rounded-lg border border-border transition-colors shadow-sm"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>External Intel ({incident.advisories.length})</span>
            </Link>

            <Link
              href={`/drafts?incidentId=${incident.id}`}
              className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Audience Comms Hub</span>
            </Link>
          </div>
        </div>

        {/* Regulatory & Compliance Banner */}
        {incident.regulatoryApplicability && (
          <div className="mt-4 p-3 rounded-lg bg-blue-950/30 border border-blue-500/20 flex items-center justify-between text-xs text-blue-200">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                <strong>Statutory Reporting Clock:</strong> {incident.regulatoryApplicability}
              </span>
            </div>
            <span className="text-[10px] font-mono text-blue-300/80 hidden sm:inline">
              MANDATORY DISCLOSURE GOVERNANCE
            </span>
          </div>
        )}
      </div>

      {/* Grid: Left Column (Epistemic Grounding) | Right Column (Drafts & Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Epistemic Grounding Engine (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>Epistemic Grounding Baseline</span>
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Human-in-the-loop fact classifications governing LLM drafting bounds.
                </p>
              </div>

              <span className="text-[10px] font-mono bg-blue-950/60 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">
                {canEditEpistemic ? 'COMMANDER EDIT ACTIVE' : 'READ-ONLY ROLE'}
              </span>
            </div>

            <div className="space-y-3">
              <EpistemicEditor
                incidentId={incident.id}
                field="accessScope"
                fieldName="1. Internal Access Scope"
                currentStatus={incident.accessScopeStatus as any}
                currentDetails={incident.accessScopeDetails}
                canEdit={canEditEpistemic}
              />

              <EpistemicEditor
                incidentId={incident.id}
                field="exfiltration"
                fieldName="2. Data Exfiltration Status"
                currentStatus={incident.exfiltrationStatus as any}
                currentDetails={incident.exfiltrationDetails}
                canEdit={canEditEpistemic}
              />

              <EpistemicEditor
                incidentId={incident.id}
                field="rootCause"
                fieldName="3. Forensic Root Cause"
                currentStatus={incident.rootCauseStatus as any}
                currentDetails={incident.rootCauseDetails}
                canEdit={canEditEpistemic}
              />

              <EpistemicEditor
                incidentId={incident.id}
                field="affectedSystems"
                fieldName="4. Affected Perimeter & Systems"
                currentStatus={incident.affectedSystemsStatus as any}
                currentDetails={incident.affectedSystemsDetails}
                canEdit={canEditEpistemic}
              />

              <EpistemicEditor
                incidentId={incident.id}
                field="mitigation"
                fieldName="5. Containment & Remediation"
                currentStatus={incident.mitigationStatus as any}
                currentDetails={incident.mitigationDetails}
                canEdit={canEditEpistemic}
              />
            </div>
          </div>
        </div>

        {/* Right Column: 5 Audience Comms & Audit Trail (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 5-Audience Communication Status */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Audience Drafts (5/5)</span>
              </h2>
              <Link
                href={`/drafts?incidentId=${incident.id}`}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
              >
                Open Studio →
              </Link>
            </div>

            <div className="space-y-2">
              {audiences.map((aud) => {
                const draft = incident.drafts.find((d) => d.audience === aud.type);
                return (
                  <div
                    key={aud.type}
                    className="p-3 rounded-lg bg-[#0b0f17] border border-border flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{aud.label}</div>
                      <div className="text-[10px] text-muted-foreground">{aud.desc}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {draft ? (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                            draft.status === 'APPROVED'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                              : draft.status === 'INVALIDATED'
                              ? 'bg-rose-950 text-rose-300 border-rose-500/40'
                              : draft.status === 'PENDING_REVIEW'
                              ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                              : 'bg-slate-900 text-slate-400 border-slate-700'
                          }`}
                        >
                          {draft.status}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                          NOT GENERATED
                        </span>
                      )}
                      <Link
                        href={`/drafts?incidentId=${incident.id}&audience=${aud.type}`}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Immutable Audit Trail Preview */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <History className="w-4 h-4 text-purple-400" />
                <span>Audit Trail (Append-Only)</span>
              </h2>
              <Link href="/audit" className="text-[11px] text-purple-400 hover:text-purple-300 font-medium">
                Full Log →
              </Link>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {incident.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded bg-[#0b0f17] border border-border/70 text-xs font-mono space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-purple-300 font-semibold">{log.action}</span>
                    <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 truncate">
                    Actor: <span className="text-slate-400">{log.actorEmail}</span> ({log.actorRole})
                  </div>
                  {log.metadataJson && (
                    <div className="text-[10px] text-muted-foreground truncate">
                      {log.metadataJson}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
