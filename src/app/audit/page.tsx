import React from 'react';
import Link from 'next/link';
import { prisma } from '@/infrastructure/db/client';
import { auth } from '@/auth';
import { History, Shield, Filter, Search, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AuditTrailPage() {
  const session = await auth();

  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 100,
    include: {
      incident: true,
      actor: true,
    },
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2.5">
            <History className="w-5 h-5 text-purple-400" />
            <span>Immutable Governance Audit Trail</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tamper-evident, append-only operational log recording every security decision, epistemic mutation, and approval state.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono bg-purple-950/70 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg">
            TOTAL EVENTS: {auditLogs.length}
          </span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-card border border-border rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0b0f17] text-slate-400 border-b border-border uppercase text-[10px] tracking-wider select-none">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Incident / Entity</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Event Metadata / Cryptographic Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No audit records registered yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          log.action.includes('INVALIDATED')
                            ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                            : log.action.includes('APPROVED')
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : log.action.includes('EPISTEMIC')
                            ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                            : 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.incident ? (
                        <Link
                          href={`/incidents/${log.incident.id}`}
                          className="text-blue-400 hover:text-blue-300 hover:underline font-semibold"
                        >
                          {log.incident.incidentNumber}
                        </Link>
                      ) : (
                        <span className="text-slate-500">{log.entityType} ({log.entityId.slice(0, 8)}...)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-200">{log.actorEmail}</div>
                      <div className="text-[10px] text-slate-500">{log.actorRole}</div>
                    </td>
                    <td className="py-3 px-4 max-w-md truncate text-slate-400">
                      {log.metadataJson ? (
                        <span title={log.metadataJson}>{log.metadataJson}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
