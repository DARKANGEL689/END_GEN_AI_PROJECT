import React from 'react';
import Link from 'next/link';
import { prisma } from '@/infrastructure/db/client';
import { auth } from '@/auth';
import { createTerminologyAction, deleteTerminologyAction, updateTemplateAction } from './actions';
import {
  Database,
  Shield,
  FileText,
  BookOpen,
  PlusCircle,
  AlertOctagon,
  CheckCircle2,
  Trash2,
  Layers,
  Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MemoryPage() {
  const session = await auth();

  const templates = await prisma.approvedTemplate.findMany({
    where: { isActive: true },
    orderBy: { audience: 'asc' },
  });

  const terminology = await prisma.organizationalTerminology.findMany({
    where: { isActive: true },
    orderBy: { term: 'asc' },
  });

  const canManageTemplates = session?.user?.role === 'INCIDENT_MANAGER' || session?.user?.role === 'COMMUNICATIONS_OFFICER';
  const canManageTerminology = session?.user?.role === 'LEGAL_COUNSEL' || session?.user?.role === 'INCIDENT_MANAGER';

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header & Provider Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2.5">
            <Database className="w-5 h-5 text-blue-400" />
            <span>Organizational Memory & Terminology Engine</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Stores previously approved communication templates, mandatory section gates, and standardized terminology.
          </p>
        </div>

        {/* Mandatory Explicit Checkpoint Label */}
        <div className="flex items-center space-x-2">
          <div className="bg-amber-950/60 border border-amber-500/50 rounded-lg px-3 py-1.5 flex items-center space-x-2 text-xs font-mono text-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-semibold">ENGINE: Local adapter, not Memento</span>
          </div>
        </div>
      </div>

      {/* Section 1: Approved Templates */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Approved Audience Templates ({templates.length}/5)</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Templates dictate required sections for readiness gating and style structures.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            let mandatorySections: string[] = [];
            try {
              mandatorySections = JSON.parse(tpl.mandatorySections);
            } catch {
              mandatorySections = [];
            }

            return (
              <div
                key={tpl.id}
                className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/70 border border-blue-500/30 px-2 py-0.5 rounded">
                      {tpl.audience}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      VERSION {tpl.version}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white">{tpl.title}</h3>

                  <div>
                    <span className="text-[11px] font-mono text-muted-foreground block mb-1">
                      Mandatory Sections ({mandatorySections.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {mandatorySections.map((sec, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-[#0b0f17] border border-border/80 text-slate-300 px-2 py-0.5 rounded font-mono"
                        >
                          {sec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[11px] font-mono text-muted-foreground block mb-1">
                      Template Body Preview:
                    </span>
                    <div className="bg-[#0b0f17] border border-border/70 rounded p-2 text-[11px] text-slate-400 font-mono line-clamp-3 leading-relaxed">
                      {tpl.templateBody}
                    </div>
                  </div>
                </div>

                {canManageTemplates && (
                  <details className="pt-2 border-t border-border/60 text-xs">
                    <summary className="cursor-pointer text-blue-400 hover:text-blue-300 font-medium text-[11px]">
                      Edit Template Body & Bump Version
                    </summary>
                    <form
                      action={async (formData: FormData) => {
                        'use server';
                        await updateTemplateAction(formData);
                      }}
                      className="space-y-2 mt-2"
                    >
                      <input type="hidden" name="templateId" value={tpl.id} />
                      <textarea
                        name="templateBody"
                        defaultValue={tpl.templateBody}
                        rows={4}
                        className="w-full bg-[#0b0f17] border border-border rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold py-1.5 rounded transition-colors"
                      >
                        Save as v{tpl.version + 1}
                      </button>
                    </form>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Organizational Terminology & Forbidden Phrasing */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Standardized Terminology & Forbidden Phrasing Rules</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Deterministic lint checks reject drafts containing unapproved sensationalist synonyms.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Terminology Table (8 cols) */}
          <div className="lg:col-span-8 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0b0f17] text-slate-400 border-b border-border uppercase text-[10px] tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-4">Standard Term</th>
                    <th className="py-3 px-4">Approved Definition</th>
                    <th className="py-3 px-4">Forbidden Synonyms (Flagged)</th>
                    {canManageTerminology && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {terminology.map((item) => {
                    let synonyms: string[] = [];
                    try {
                      synonyms = JSON.parse(item.forbiddenSynonyms);
                    } catch {
                      synonyms = [];
                    }

                    return (
                      <tr key={item.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap font-bold text-purple-300">
                          {item.term}
                          <span className="block text-[10px] text-muted-foreground font-normal">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs font-sans text-xs">
                          {item.approvedDefinition}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {synonyms.map((syn, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-rose-950/60 border border-rose-500/40 text-rose-300 px-1.5 py-0.5 rounded font-mono"
                              >
                                {syn}
                              </span>
                            ))}
                          </div>
                        </td>
                        {canManageTerminology && (
                          <td className="py-3 px-4 text-right">
                            <form
                              action={async (formData: FormData) => {
                                'use server';
                                await deleteTerminologyAction(formData);
                              }}
                            >
                              <input type="hidden" name="id" value={item.id} />
                              <button
                                type="submit"
                                className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                                title="Delete Rule"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </form>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* New Terminology Form (4 cols) */}
          {canManageTerminology && (
            <div className="lg:col-span-4 bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-purple-400" />
                <span>Add Approved Terminology Rule</span>
              </h3>

              <form
                action={async (formData: FormData) => {
                  'use server';
                  await createTerminologyAction(formData);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Standardized Term *
                  </label>
                  <input
                    type="text"
                    name="term"
                    required
                    placeholder="e.g. Service Degradation"
                    className="w-full bg-[#0b0f17] border border-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    className="w-full bg-[#0b0f17] border border-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  >
                    <option value="CLASSIFICATION">CLASSIFICATION</option>
                    <option value="IMPACT">IMPACT</option>
                    <option value="STATUS">STATUS</option>
                    <option value="TECHNICAL">TECHNICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Approved Objective Definition *
                  </label>
                  <textarea
                    name="approvedDefinition"
                    rows={2}
                    required
                    placeholder="Approved factual phrasing to describe this condition..."
                    className="w-full bg-[#0b0f17] border border-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Forbidden Synonyms (Comma-separated) *
                  </label>
                  <input
                    type="text"
                    name="forbiddenSynonyms"
                    required
                    placeholder="e.g. System Crash, Total Outage, Meltdown"
                    className="w-full bg-[#0b0f17] border border-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono text-[11px]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold py-2 rounded-lg transition-colors shadow-sm"
                >
                  Register Rule in Memory Engine
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
