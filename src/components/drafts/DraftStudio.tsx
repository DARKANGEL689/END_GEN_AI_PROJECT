'use client';

import React, { useState, useTransition } from 'react';
import {
  FileText,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Lock,
  Layers,
  ChevronRight,
  Info,
  Clock,
  Hash,
  Send,
  RefreshCw,
  Download,
  Edit3,
  CheckCheck,
  XCircle,
  FileDown,
  Check,
  X,
} from 'lucide-react';
import {
  generateDraftAction,
  generateAllDraftsAction,
  requestReviewAction,
  submitApprovalAction,
  editDraftAction,
} from '@/app/drafts/actions';
import type { AudienceType, ReadinessState } from '@prisma/client';
import type { AtomicClaim } from '@/domain/entities/claim';

interface DraftData {
  id: string;
  incidentId: string;
  audience: AudienceType;
  version: number;
  status: string;
  bodyText: string;
  claimsJson: string;
  readinessGate: ReadinessState;
  qualityScore: number;
  qualityBreakdown: string | null;
  contentHash: string;
  factsHash: string;
  approvalDigest: string | null;
  createdBy: { name: string | null; email: string; role: string };
  createdAt: string | Date;
}

interface IncidentOption {
  id: string;
  incidentNumber: string;
  title: string;
  severity: string;
  status: string;
}

interface DraftStudioProps {
  incidents: IncidentOption[];
  currentIncidentId: string;
  initialDrafts: DraftData[];
}

const AUDIENCES: { key: AudienceType; label: string; desc: string }[] = [
  { key: 'EXECUTIVE', label: 'Executive Bridge', desc: 'Board & C-Suite financial & operational impact' },
  { key: 'ENGINEERING', label: 'Engineering Runbook', desc: 'Technical triage, indicators & mitigation' },
  { key: 'ALL_HANDS', label: 'All-Hands Internal', desc: 'Company-wide guidance & security vigilance' },
  { key: 'CUSTOMER', label: 'Customer Trust Notice', desc: 'External advisory & security protection' },
  { key: 'REGULATORY', label: 'Regulatory Disclosure', desc: 'Statutory compliance & timeline disclosures' },
];

export function DraftStudio({
  incidents,
  currentIncidentId,
  initialDrafts,
}: DraftStudioProps) {
  const [selectedIncidentId, setSelectedIncidentId] = useState(currentIncidentId);
  const [selectedAudience, setSelectedAudience] = useState<AudienceType>('EXECUTIVE');
  const [drafts, setDrafts] = useState<DraftData[]>(initialDrafts);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  // Modals state
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [signRationale, setSignRationale] = useState('');
  const [editText, setEditText] = useState('');
  const [editRationale, setEditRationale] = useState('');

  const activeDraft = drafts.find(
    (d) => d.incidentId === selectedIncidentId && d.audience === selectedAudience
  );

  const parsedClaims: AtomicClaim[] = React.useMemo(() => {
    if (!activeDraft?.claimsJson) return [];
    try {
      return JSON.parse(activeDraft.claimsJson);
    } catch {
      return [];
    }
  }, [activeDraft?.claimsJson]);

  const parsedBreakdown = React.useMemo(() => {
    if (!activeDraft?.qualityBreakdown) return null;
    try {
      return JSON.parse(activeDraft.qualityBreakdown);
    } catch {
      return null;
    }
  }, [activeDraft?.qualityBreakdown]);

  const activeClaim = parsedClaims.find((c) => c.id === selectedClaimId);

  const handleGenerateSingle = () => {
    setNotice(null);
    startTransition(async () => {
      try {
        const res = await generateDraftAction(selectedIncidentId, selectedAudience);
        if (res.success && res.result) {
          setNotice(`Generated draft for ${selectedAudience} (v${res.result.version}).`);
          window.location.reload();
        }
      } catch (err: any) {
        setNotice(`Generation failed: ${err.message}`);
      }
    });
  };

  const handleGenerateAll = () => {
    setNotice(null);
    startTransition(async () => {
      try {
        const res = await generateAllDraftsAction(selectedIncidentId);
        if (res.success && res.results) {
          setNotice(`Generated all 5 grounded audience drafts in parallel.`);
          window.location.reload();
        }
      } catch (err: any) {
        setNotice(`All-audience generation failed: ${err.message}`);
      }
    });
  };

  const handleRequestReview = () => {
    if (!activeDraft) return;
    setNotice(null);
    startTransition(async () => {
      try {
        await requestReviewAction(activeDraft.id, selectedIncidentId);
        setNotice(`Draft submitted for formal Legal & Executive review.`);
        window.location.reload();
      } catch (err: any) {
        setNotice(`Review request rejected: ${err.message}`);
      }
    });
  };

  const handleApprove = () => {
    if (!activeDraft) return;
    setNotice(null);
    startTransition(async () => {
      try {
        const res = await submitApprovalAction(
          activeDraft.id,
          selectedIncidentId,
          'APPROVE',
          signRationale || 'Approved for external / internal distribution'
        );
        setIsSignModalOpen(false);
        setNotice(`Draft successfully approved and cryptographically signed. Digest: ${res.result.decisionDigest.slice(0, 16)}...`);
        window.location.reload();
      } catch (err: any) {
        setNotice(`Approval failed: ${err.message}`);
      }
    });
  };

  const handleReject = () => {
    if (!activeDraft) return;
    setNotice(null);
    startTransition(async () => {
      try {
        await submitApprovalAction(
          activeDraft.id,
          selectedIncidentId,
          'REJECT',
          signRationale || 'Rejected by reviewer with feedback'
        );
        setIsSignModalOpen(false);
        setNotice(`Draft was marked REJECTED.`);
        window.location.reload();
      } catch (err: any) {
        setNotice(`Rejection action failed: ${err.message}`);
      }
    });
  };

  const handleSaveEdit = () => {
    if (!activeDraft) return;
    setNotice(null);
    startTransition(async () => {
      try {
        await editDraftAction(
          activeDraft.id,
          selectedIncidentId,
          editText,
          editRationale || 'Manual draft revision'
        );
        setIsEditModalOpen(false);
        setNotice(`Draft revised to v${activeDraft.version + 1}. Previous approvals revoked.`);
        window.location.reload();
      } catch (err: any) {
        setNotice(`Draft update failed: ${err.message}`);
      }
    });
  };

  const openEditModal = () => {
    if (activeDraft) {
      setEditText(activeDraft.bodyText);
      setEditRationale('');
      setIsEditModalOpen(true);
    }
  };

  // Helper to render markdown text with interactive claim tags
  const renderInteractiveBody = (text: string) => {
    const parts = text.split(/(\[c\d+\])/g);
    return parts.map((part, idx) => {
      const match = part.match(/\[(c\d+)\]/);
      if (match) {
        const claimId = match[1];
        const isSelected = selectedClaimId === claimId;
        const claimObj = parsedClaims.find((c) => c.id === claimId);
        const isSupported = !claimObj?.verdict || claimObj?.verdict === 'SUPPORTED';

        return (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedClaimId(claimId)}
            className={`inline-flex items-center px-1.5 py-0.5 mx-0.5 text-xs font-mono font-bold rounded cursor-pointer transition-all ${
              isSelected
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30 ring-2 ring-cyan-300'
                : isSupported
                ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-800/60'
                : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700'
            }`}
            title={`Click to view verifiable evidence for [${claimId}]`}
          >
            [{claimId}]
          </button>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Incident Switcher & Generation Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-800/50 text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">Draft Studio</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 font-mono">
                GenAI Trust Engine v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Evidence-grounded synthesis tailored across 5 enterprise communication tiers
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedIncidentId}
            onChange={(e) => setSelectedIncidentId(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.incidentNumber} - {inc.title.slice(0, 35)} ({inc.severity})
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerateSingle}
            disabled={isPending}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-colors shadow-sm shadow-cyan-600/30 disabled:opacity-50"
          >
            {isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Generate {selectedAudience} Draft
          </button>

          <button
            onClick={handleGenerateAll}
            disabled={isPending}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Generate All 5 Audiences
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 text-xs rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 flex items-center gap-2">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Audience Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 border-b border-slate-800 pb-2">
        {AUDIENCES.map((aud) => {
          const isSelected = selectedAudience === aud.key;
          const draftForAud = drafts.find(
            (d) => d.incidentId === selectedIncidentId && d.audience === aud.key
          );

          return (
            <button
              key={aud.key}
              onClick={() => {
                setSelectedAudience(aud.key);
                setSelectedClaimId(null);
              }}
              className={`p-3 rounded-lg text-left transition-all ${
                isSelected
                  ? 'bg-slate-800/90 border border-cyan-500/60 shadow-md shadow-cyan-950/50'
                  : 'bg-slate-900/50 border border-slate-800/60 hover:bg-slate-800/40 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isSelected ? 'text-cyan-400' : 'text-slate-300'
                  }`}
                >
                  {aud.label}
                </span>
                {draftForAud ? (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                      draftForAud.status === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                        : draftForAud.status === 'PENDING_REVIEW'
                        ? 'bg-indigo-950 text-indigo-400 border border-indigo-800/50'
                        : draftForAud.status === 'REJECTED'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {draftForAud.status}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-600 font-mono">NO DRAFT</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">{aud.desc}</p>
            </button>
          );
        })}
      </div>

      {activeDraft ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content Area: Draft Body & Quality Breakdown */}
          <div className="lg:col-span-8 space-y-6">
            {/* Trust Engine Status Banner & Governance Toolbar */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Workflow Status Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold uppercase ${
                      activeDraft.status === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60 shadow-sm shadow-emerald-900/30'
                        : activeDraft.status === 'PENDING_REVIEW'
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/60'
                        : activeDraft.status === 'REJECTED'
                        ? 'bg-rose-950 text-rose-400 border border-rose-700/60'
                        : activeDraft.status === 'INVALIDATED'
                        ? 'bg-amber-950 text-amber-400 border border-amber-700/60'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {activeDraft.status}
                  </span>
                </div>

                {/* Readiness Gate Badge */}
                <div className="flex items-center gap-2">
                  {activeDraft.readinessGate === 'REVIEW_READY' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-600/60 text-emerald-400 text-xs font-mono font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>REVIEW_READY</span>
                    </div>
                  ) : activeDraft.readinessGate === 'NEEDS_REVIEW' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-600/60 text-amber-400 text-xs font-mono font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>NEEDS_REVIEW</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-600/60 text-rose-400 text-xs font-mono font-bold">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>BLOCKED</span>
                    </div>
                  )}
                </div>

                {/* Quality Score */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-400">Quality:</span>
                  <span
                    className={`font-mono font-bold ${
                      activeDraft.qualityScore >= 85
                        ? 'text-emerald-400'
                        : activeDraft.qualityScore >= 70
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {Math.round(activeDraft.qualityScore)}/100
                  </span>
                </div>

                <div className="text-xs text-slate-400 font-mono">v{activeDraft.version}</div>
              </div>

              {/* Action Buttons: Request Review, Review & Sign, Edit, Export */}
              <div className="flex flex-wrap items-center gap-2">
                {activeDraft.status === 'DRAFT' && (
                  <button
                    onClick={handleRequestReview}
                    disabled={isPending || activeDraft.readinessGate === 'BLOCKED'}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Request Review
                  </button>
                )}

                {(activeDraft.status === 'PENDING_REVIEW' || activeDraft.status === 'DRAFT') && (
                  <button
                    onClick={() => {
                      setSignRationale('');
                      setIsSignModalOpen(true);
                    }}
                    disabled={isPending || activeDraft.readinessGate === 'BLOCKED'}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 transition-colors disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Review & Sign
                  </button>
                )}

                <button
                  onClick={openEditModal}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                  Edit Revision
                </button>

                {/* Multi-Format Export Dropdown / Links */}
                <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5">
                  <a
                    href={`/api/drafts/${activeDraft.id}/export?format=docx`}
                    download
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-cyan-400 transition-colors"
                    title="Export as DOCX Word Document"
                  >
                    <FileDown className="w-3 h-3 text-cyan-400" />
                    DOCX
                  </a>
                  <span className="text-slate-700">|</span>
                  <a
                    href={`/api/drafts/${activeDraft.id}/export?format=md`}
                    download
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-cyan-400 transition-colors"
                    title="Export as Markdown"
                  >
                    MD
                  </a>
                  <span className="text-slate-700">|</span>
                  <a
                    href={`/api/drafts/${activeDraft.id}/export?format=html`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-cyan-400 transition-colors"
                    title="View / Print HTML"
                  >
                    HTML
                  </a>
                </div>
              </div>
            </div>

            {/* Approved Cryptographic Stamp Banner */}
            {activeDraft.status === 'APPROVED' && activeDraft.approvalDigest && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-emerald-300 shadow-lg shadow-emerald-950/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-900/60 border border-emerald-700 text-emerald-300">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                      Cryptographically Signed & Approved for Distribution
                    </h4>
                    <p className="text-[11px] text-emerald-400 font-mono">
                      Signature Digest: {activeDraft.approvalDigest}
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono text-emerald-400">
                  <div>Content: {activeDraft.contentHash.slice(0, 10)}...</div>
                  <div>Facts: {activeDraft.factsHash.slice(0, 10)}...</div>
                </div>
              </div>
            )}

            {/* Quality Dimensions Breakdown Accordion */}
            {parsedBreakdown?.quality && (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    7-Dimension Quality Diagnostic
                  </span>
                  <span className="text-slate-400 font-mono font-normal">
                    Weighted Q = Σ(wᵢ · Sᵢ)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {[
                    { label: 'Traceability', score: parsedBreakdown.quality.traceabilityScore, weight: '25%' },
                    { label: 'Epistemic Hedge', score: parsedBreakdown.quality.epistemicHedgingScore, weight: '15%' },
                    { label: 'Completeness', score: parsedBreakdown.quality.sectionCompletenessScore, weight: '15%' },
                    { label: 'Terminology', score: parsedBreakdown.quality.terminologyScore, weight: '15%' },
                    { label: 'Readability', score: parsedBreakdown.quality.readabilityScore, weight: '10%' },
                    { label: 'Actionability', score: parsedBreakdown.quality.actionabilityScore, weight: '10%' },
                    { label: 'Conciseness', score: parsedBreakdown.quality.concisenessScore, weight: '10%' },
                  ].map((dim, i) => (
                    <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400 truncate">{dim.label}</div>
                      <div className="text-xs font-mono font-bold text-cyan-400">{dim.score}%</div>
                      <div className="text-[9px] text-slate-500 font-mono">{dim.weight}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Draft Body with Interactive Grounding Claims */}
            <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-slate-200">
                    Draft Content ({selectedAudience})
                  </h3>
                </div>
                <div className="text-xs text-slate-400">
                  Click any <span className="text-cyan-400 font-mono font-bold">[c1]</span> tag to inspect source evidence
                </div>
              </div>

              <div className="text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap selection:bg-cyan-500/30">
                {renderInteractiveBody(activeDraft.bodyText)}
              </div>
            </div>
          </div>

          {/* Right Area: Evidence Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <div className="sticky top-6 p-5 rounded-xl bg-slate-900/90 border border-cyan-800/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-slate-100">Evidence Sidebar</h3>
                </div>
                {activeClaim && (
                  <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                    [{activeClaim.id}]
                  </span>
                )}
              </div>

              {activeClaim ? (
                <div className="space-y-4 animate-fadeIn">
                  {/* Claim Header & Type */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                        Claim Statement
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {activeClaim.type}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-200 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      &ldquo;{activeClaim.text}&rdquo;
                    </p>
                  </div>

                  {/* Independent Verifier Verdict */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
                        Verifier Verdict
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          activeClaim.verdict === 'SUPPORTED' || !activeClaim.verdict
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                        }`}
                      >
                        {activeClaim.verdict || 'SUPPORTED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {activeClaim.verdictExplanation || 'Claim verified against source span.'}
                    </p>
                  </div>

                  {/* Grounding Source Pointers */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      Grounding Evidence ({activeClaim.pointers?.length || 0})
                    </span>

                    {activeClaim.pointers?.map((ptr, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-cyan-400 truncate max-w-[180px]">
                            {ptr.sourceTitle || ptr.sourceId}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {ptr.sourceType}
                          </span>
                        </div>

                        {ptr.quotedSpan && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-400 uppercase font-mono">
                              Verbatim Source Span
                            </span>
                            <div className="text-xs font-mono bg-cyan-950/30 text-cyan-200 border-l-2 border-cyan-500 p-2 rounded-r">
                              &ldquo;{ptr.quotedSpan}&rdquo;
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cryptographically bound to SHA-256 facts snapshot</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <div className="inline-flex p-3 rounded-full bg-slate-800/50 text-slate-500">
                    <Info className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-300">No Claim Selected</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Click any <span className="text-cyan-400 font-mono">[c1]</span> tag in the draft body to inspect verifiable source evidence, quoted spans, and reliability tiers.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-4">
          <div className="inline-flex p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">
              No Draft Generated for {selectedAudience}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Synthesize a strictly grounded draft tailored to {selectedAudience} with verified citations from CISA/vendor advisories, epistemic status hedging, and approved templates.
            </p>
          </div>
          <button
            onClick={handleGenerateSingle}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-colors shadow-lg shadow-cyan-600/20 disabled:opacity-50"
          >
            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate {selectedAudience} Draft
          </button>
        </div>
      )}

      {/* Review & Sign Modal */}
      {isSignModalOpen && activeDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">Review & Sign Draft</h3>
              </div>
              <button
                onClick={() => setIsSignModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Audience:</span>
                <span className="font-semibold text-cyan-400">{activeDraft.audience}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Draft Version:</span>
                <span className="font-mono text-slate-200">v{activeDraft.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Quality Score:</span>
                <span className="font-mono text-emerald-400 font-bold">{Math.round(activeDraft.qualityScore)}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Content Hash:</span>
                <span className="font-mono text-slate-400">{activeDraft.contentHash.slice(0, 16)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Facts Hash:</span>
                <span className="font-mono text-slate-400">{activeDraft.factsHash.slice(0, 16)}...</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Reviewer Rationale & Notes
              </label>
              <textarea
                value={signRationale}
                onChange={(e) => setSignRationale(e.target.value)}
                placeholder="Confirming facts alignment against latest forensic logs and external guidance..."
                rows={3}
                className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={handleReject}
                disabled={isPending}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors disabled:opacity-50"
              >
                Reject Draft
              </button>
              <button
                onClick={handleApprove}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Approve & Digitally Sign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Edit Revision Modal */}
      {isEditModalOpen && activeDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-2xl p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Edit Revision (Will become v{activeDraft.version + 1})
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Warning:</strong> Modifying text alters the SHA-256 content hash and will immediately revoke any active legal/executive approval seal.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Draft Markdown Body</label>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={12}
                className="w-full p-3 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 leading-relaxed focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Revision Rationale</label>
              <input
                type="text"
                value={editRationale}
                onChange={(e) => setEditRationale(e.target.value)}
                placeholder="Reason for revision..."
                className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isPending || !editText.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-colors disabled:opacity-50"
              >
                Save New Revision & Revoke Prior Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
