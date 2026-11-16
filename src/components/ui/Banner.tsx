import React from 'react';
import { ShieldAlert } from 'lucide-react';

export function SyntheticDataBanner() {
  return (
    <div className="bg-amber-950/80 border-b border-amber-500/40 px-4 py-1.5 text-xs text-amber-200 flex items-center justify-between font-mono tracking-tight select-none">
      <div className="flex items-center space-x-2">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span className="font-semibold text-amber-300">DEMO AIR-GAP: SYNTHETIC DATA ONLY</span>
        <span className="text-amber-400/60 hidden sm:inline">|</span>
        <span className="hidden sm:inline text-amber-300/80">No production credentials or real incident data transmitted</span>
      </div>
      <div className="flex items-center space-x-3 text-amber-400/90">
        <span className="bg-amber-900/60 border border-amber-600/40 px-1.5 py-0.5 rounded text-[10px]">
          EP-2026 AUDIT ACTIVE
        </span>
      </div>
    </div>
  );
}
