'use client';

import React, { useState } from 'react';
import { updateEpistemicAction } from '@/app/incidents/actions';
import { AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert, Edit2, Check, X } from 'lucide-react';

interface EpistemicEditorProps {
  incidentId: string;
  field: 'accessScope' | 'exfiltration' | 'rootCause' | 'affectedSystems' | 'mitigation';
  fieldName: string;
  currentStatus: 'CONFIRMED' | 'SUSPECTED' | 'UNKNOWN' | 'DISPUTED';
  currentDetails?: string | null;
  canEdit: boolean;
}

export function EpistemicEditor({
  incidentId,
  field,
  fieldName,
  currentStatus,
  currentDetails,
  canEdit,
}: EpistemicEditorProps) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [details, setDetails] = useState(currentDetails || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    CONFIRMED: { bg: 'bg-emerald-950/70', text: 'text-emerald-300', border: 'border-emerald-500/40' },
    SUSPECTED: { bg: 'bg-amber-950/70', text: 'text-amber-300', border: 'border-amber-500/40' },
    UNKNOWN: { bg: 'bg-slate-900', text: 'text-slate-400', border: 'border-slate-700' },
    DISPUTED: { bg: 'bg-rose-950/70', text: 'text-rose-300', border: 'border-rose-500/40' },
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('incidentId', incidentId);
      formData.append('field', field);
      formData.append('status', status);
      formData.append('details', details);

      const res = await updateEpistemicAction(formData);
      if (res?.invalidatedDraftCount && res.invalidatedDraftCount > 0) {
        setMessage(`Status updated! ${res.invalidatedDraftCount} approved drafts were automatically invalidated.`);
      } else {
        setMessage('Status updated and logged to audit trail.');
      }
      setEditing(false);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const style = statusColors[status] || statusColors.UNKNOWN;

  return (
    <div className="bg-[#0b0f17] border border-border/80 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-200">{fieldName}</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${style.bg} ${style.text} ${style.border}`}>
            {status}
          </span>
        </div>

        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center space-x-1 px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
          >
            <Edit2 className="w-3 h-3" />
            <span>Update Status</span>
          </button>
        )}
      </div>

      {!editing ? (
        <p className="text-xs text-slate-300 leading-relaxed bg-[#111827]/60 rounded p-2.5 border border-border/50">
          {details || <span className="text-muted-foreground italic">No forensic notes recorded for this dimension.</span>}
        </p>
      ) : (
        <div className="space-y-3 pt-2 border-t border-border/50">
          <div className="p-2.5 rounded bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200 flex items-start space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Cryptographic Invalidation:</strong> Updating this epistemic status will mutate the incident facts hash and immediately revoke any active approvals on associated communication drafts.
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-300 font-medium">New Status:</span>
            <div className="flex items-center space-x-1">
              {(['CONFIRMED', 'SUSPECTED', 'UNKNOWN', 'DISPUTED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-colors ${
                    status === st
                      ? 'bg-blue-600/30 text-blue-300 border-blue-500 font-bold'
                      : 'bg-card text-muted-foreground border-border hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div>
            <textarea
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide updated forensic evidence or rationale..."
              className="w-full bg-[#111827] border border-border rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>

          <div className="flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setStatus(currentStatus);
                setDetails(currentDetails || '');
                setEditing(false);
              }}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded transition-colors flex items-center space-x-1 disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              <span>{loading ? 'Saving & Invalidating...' : 'Confirm & Log Audit'}</span>
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="text-[11px] text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 rounded p-1.5 font-mono">
          {message}
        </div>
      )}
    </div>
  );
}
