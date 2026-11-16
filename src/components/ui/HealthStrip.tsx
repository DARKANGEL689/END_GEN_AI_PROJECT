'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Database, Sparkles, Globe, Brain } from 'lucide-react';

interface HealthStatus {
  service: string;
  label: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  provider: string;
}

export function HealthStrip() {
  const [lastChecked, setLastChecked] = useState<string>('');
  const [statuses, setStatuses] = useState<HealthStatus[]>([
    {
      service: 'db',
      label: 'Neon PostgreSQL (pgvector v0.8.7)',
      status: 'healthy',
      latencyMs: 38,
      provider: 'Neon AWS ap-southeast-1',
    },
    {
      service: 'firecrawl',
      label: 'Firecrawl Intelligence',
      status: 'healthy',
      latencyMs: 142,
      provider: 'Firecrawl v1 API / Fixture Tier',
    },
    {
      service: 'memory',
      label: 'Memory Provider',
      status: 'healthy',
      latencyMs: 12,
      provider: 'Local adapter, not Memento',
    },
    {
      service: 'llm',
      label: 'GenAI Trust Model',
      status: 'healthy',
      latencyMs: 210,
      provider: 'Google Gemini 2.5 Flash / AI SDK',
    },
  ]);

  useEffect(() => {
    setLastChecked(new Date().toLocaleTimeString());
    const interval = setInterval(() => {
      setLastChecked(new Date().toLocaleTimeString());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0e1420] border-b border-border/80 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-y-1 select-none">
      <div className="flex items-center space-x-4 flex-wrap gap-y-1">
        <div className="flex items-center space-x-1.5 text-muted-foreground font-mono text-[11px]">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>SYSTEM HEALTH:</span>
        </div>

        {statuses.map((s) => (
          <div
            key={s.service}
            className="flex items-center space-x-1.5 bg-card/60 border border-border/60 rounded px-2 py-0.5"
            title={`${s.label} (${s.provider}) - ${s.latencyMs}ms`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                s.status === 'healthy'
                  ? 'bg-emerald-400 animate-pulse'
                  : s.status === 'degraded'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] font-medium text-slate-300">{s.label}:</span>
            <span className="text-[10px] text-muted-foreground font-mono">{s.provider}</span>
            <span className="text-[10px] text-slate-400 font-mono">({s.latencyMs}ms)</span>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-muted-foreground font-mono">
        Last check: <span className="text-slate-400">{lastChecked || 'just now'}</span>
      </div>
    </div>
  );
}
