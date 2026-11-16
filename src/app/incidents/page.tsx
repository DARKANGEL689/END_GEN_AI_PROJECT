import React from 'react';
import Link from 'next/link';
import { prisma } from '@/infrastructure/db/client';
import { auth } from '@/auth';
import { Shield, AlertTriangle, Clock, ArrowRight, PlusCircle, CheckCircle2, HelpCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function IncidentsPage() {
  const session = await auth();
  const incidents = await prisma.incident.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: true,
      _count: { select: { advisories: true, drafts: true } },
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2.5">
            <Shield className="w-5 h-5 text-blue-400" />
            <span>Active Security Incidents</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Air-gapped incident command center with epistemic status tracking and grounded communications.
          </p>
        </div>

        {session?.user?.role === 'INCIDENT_MANAGER' && (
          <Link
            href="/incidents/new"
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Incident Intake</span>
          </Link>
        )}
      </div>

      {/* Incidents Table / Cards */}
      {incidents.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-sm font-semibold text-slate-300">No Incidents Recorded</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Run the seed script or log in as Incident Manager to create an incident.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-card border border-border rounded-xl p-5 hover:border-slate-700 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                  <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded">
                    {inc.incidentNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                      inc.severity === 'CRITICAL'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                        : inc.severity === 'HIGH'
                        ? 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                        : 'bg-blue-950/60 text-blue-300 border-blue-500/30'
                    }`}
                  >
                    {inc.severity}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                    STATUS: {inc.status}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Discovered {new Date(inc.discoveryTime).toLocaleTimeString()}</span>
                  </span>
                </div>

                <h2 className="text-base font-semibold text-white hover:text-blue-400 transition-colors">
                  <Link href={`/incidents/${inc.id}`}>{inc.title}</Link>
                </h2>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {inc.description}
                </p>

                {/* Epistemic Badges Summary */}
                <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-1">
                  <span className="text-[11px] text-muted-foreground font-mono">Epistemic:</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0b0f17] border border-border font-mono text-slate-300">
                    Access Scope: <span className="text-amber-400 font-bold">{inc.accessScopeStatus}</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0b0f17] border border-border font-mono text-slate-300">
                    Exfiltration: <span className="text-amber-400 font-bold">{inc.exfiltrationStatus}</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0b0f17] border border-border font-mono text-slate-300">
                    Root Cause: <span className="text-emerald-400 font-bold">{inc.rootCauseStatus}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 shrink-0">
                <Link
                  href={`/incidents/${inc.id}`}
                  className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  <span>Command Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
