import React from 'react';
import Link from 'next/link';
import { prisma } from '@/infrastructure/db/client';
import { auth } from '@/auth';
import { fetchAdvisoryAction, toggleQuarantineAction } from './actions';
import {
  Globe,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Lock,
  PlusCircle,
  ExternalLink,
  ShieldAlert,
  Flame,
  Search,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface IntelligencePageProps {
  searchParams: Promise<{ incidentId?: string }>;
}

export default async function IntelligencePage({ searchParams }: IntelligencePageProps) {
  const { incidentId } = await searchParams;
  const session = await auth();

  const incidents = await prisma.incident.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, incidentNumber: true, title: true },
  });

  const selectedIncidentId = incidentId || incidents[0]?.id;

  const advisories = await prisma.externalAdvisory.findMany({
    where: selectedIncidentId ? { incidentId: selectedIncidentId } : {},
    orderBy: { fetchedAt: 'desc' },
    include: { incident: true },
  });

  const canQuarantine = session?.user?.role === 'INCIDENT_MANAGER' || session?.user?.role === 'SECURITY_LEAD';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2.5">
            <Globe className="w-5 h-5 text-blue-400" />
            <span>Threat Intelligence & Advisory Retrieval</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Powered by Firecrawl API with server-side allowlist filtering, freshness caching, and prompt injection quarantine.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono bg-blue-950/70 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>FIRECRAWL CONNECTOR ACTIVE</span>
          </span>
        </div>
      </div>

      {/* Ingestion & Scrape Bar */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
            <PlusCircle className="w-4 h-4 text-blue-400" />
            <span>Ingest Security Advisory / Threat Notice</span>
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground">
            Strict Domain Allowlist Enforced Server-Side
          </span>
        </div>

        <form
          action={async (formData: FormData) => {
            'use server';
            await fetchAdvisoryAction(formData);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Target Incident *
              </label>
              <select
                name="incidentId"
                defaultValue={selectedIncidentId}
                required
                className="w-full bg-[#0b0f17] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                {incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    {inc.incidentNumber} - {inc.title.slice(0, 32)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-8">
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Security Advisory URL *
              </label>
              <div className="flex space-x-2">
                <input
                  type="url"
                  name="url"
                  id="advisoryUrlInput"
                  defaultValue="https://cisa.gov/news-events/cybersecurity-advisories/aa26-048a"
                  required
                  placeholder="https://cisa.gov/... or https://pulseguard.security/..."
                  className="flex-1 bg-[#0b0f17] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm shrink-0 flex items-center space-x-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Scrape & Ingest</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Demo Pre-Fill Links */}
          <div className="flex items-center space-x-2 text-[11px] text-muted-foreground pt-1 flex-wrap gap-y-1">
            <span className="font-mono">Demo Advisories:</span>
            <button
              type="button"
              className="text-blue-400 hover:underline bg-[#0b0f17] border border-border/80 px-2 py-0.5 rounded font-mono text-[10px]"
            >
              CISA Alert AA26-048A
            </button>
            <button
              type="button"
              className="text-blue-400 hover:underline bg-[#0b0f17] border border-border/80 px-2 py-0.5 rounded font-mono text-[10px]"
            >
              PulseGuard CVE-2026-1934
            </button>
          </div>
        </form>
      </div>

      {/* Advisories Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">
            Ingested Intelligence Records ({advisories.length})
          </h2>
          {selectedIncidentId && (
            <Link
              href={`/incidents/${selectedIncidentId}`}
              className="text-xs text-blue-400 hover:underline font-mono"
            >
              View in Incident Command Center →
            </Link>
          )}
        </div>

        {advisories.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-sm font-semibold text-slate-300">No Threat Intelligence Ingested</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Use the form above to fetch official vendor advisories and CISA alerts using Firecrawl.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {advisories.map((adv) => {
              const meta = adv.metadataJson ? JSON.parse(adv.metadataJson) : {};
              return (
                <div
                  key={adv.id}
                  className={`bg-card border rounded-xl p-5 shadow-sm space-y-3 transition-colors ${
                    adv.isQuarantined ? 'border-rose-500/60 bg-rose-950/20' : 'border-border'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                      <span className="font-mono text-xs font-semibold text-slate-300">
                        {adv.sourceDomain}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                          adv.reliabilityTier === 'OFFICIAL_VENDOR'
                            ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                            : adv.reliabilityTier === 'CISA_NVD'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            : 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                        }`}
                      >
                        {adv.reliabilityTier}
                      </span>

                      {adv.isQuarantined ? (
                        <span className="text-[10px] font-mono font-bold bg-rose-900/80 text-rose-200 border border-rose-500/60 px-2 py-0.5 rounded flex items-center space-x-1 animate-pulse">
                          <ShieldAlert className="w-3 h-3 text-rose-300" />
                          <span>QUARANTINED (INJECTION DEFENSE)</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>CLEARED FOR AI SYNTHESIS</span>
                        </span>
                      )}

                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(adv.fetchedAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Quarantine Toggle Button */}
                    {canQuarantine && (
                      <form
                        action={async (formData: FormData) => {
                          'use server';
                          await toggleQuarantineAction(formData);
                        }}
                      >
                        <input type="hidden" name="advisoryId" value={adv.id} />
                        <input
                          type="hidden"
                          name="isQuarantined"
                          value={adv.isQuarantined ? 'false' : 'true'}
                        />
                        <button
                          type="submit"
                          className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                            adv.isQuarantined
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                              : 'bg-rose-950/60 text-rose-300 border-rose-500/40 hover:bg-rose-900'
                          }`}
                        >
                          {adv.isQuarantined ? 'Lift Quarantine' : 'Quarantine Advisory'}
                        </button>
                      </form>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {meta.title || adv.sourceUrl}
                    </h3>
                    <a
                      href={adv.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline flex items-center space-x-1 font-mono mt-0.5"
                    >
                      <span>{adv.sourceUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {adv.flagReason && (
                    <div className="p-2.5 rounded bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                      <strong>Flag Reason:</strong> {adv.flagReason}
                    </div>
                  )}

                  {/* Clean Markdown Snippet */}
                  <div className="bg-[#0b0f17] border border-border/80 rounded-lg p-3 text-xs text-slate-300 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {adv.cleanMarkdown.slice(0, 800)}
                    {adv.cleanMarkdown.length > 800 && '... [truncated for preview]'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
