'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, Key, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';

const PRESET_USERS = [
  {
    role: 'INCIDENT_MANAGER',
    name: 'Alex Rivera',
    email: 'im@sentinel.defense',
    desc: 'Incident Commander with full lifecycle control and intake rights.',
  },
  {
    role: 'SECURITY_LEAD',
    name: 'Marcus Vance',
    email: 'sec@sentinel.defense',
    desc: 'Forensics Lead with authority over Engineering drafts & technical status.',
  },
  {
    role: 'COMMUNICATIONS_OFFICER',
    name: 'Elena Rostova',
    email: 'comms@sentinel.defense',
    desc: 'Crisis Communications Director; drafts updates & manages publishing.',
  },
  {
    role: 'LEGAL_COUNSEL',
    name: 'Sarah Chen',
    email: 'legal@sentinel.defense',
    desc: 'Chief Regulatory Counsel; signs off on Customer & Regulatory disclosures.',
  },
  {
    role: 'EXECUTIVE_REVIEWER',
    name: 'David Keller',
    email: 'exec@sentinel.defense',
    desc: 'VP Technology & Operations; signs Executive & All-Hands communications.',
  },
  {
    role: 'AUDITOR',
    name: 'Rachel Adams',
    email: 'auditor@sentinel.defense',
    desc: 'Governance & Compliance; strict read-only access to records & audit trail.',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('im@sentinel.defense');
  const [password, setPassword] = useState('incident2026!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Invalid credentials. Please verify your email and password.');
      } else {
        router.push('/incidents');
        router.refresh();
      }
    } catch {
      setError('An unexpected login error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('incident2026!');
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          IncidentComms AI Authentication
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Role-Based Access Control & Cryptographic Verification Environment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Preset Role Quick-Switch Panel */}
        <div className="md:col-span-7 bg-card border border-border rounded-xl p-5 shadow-lg">
          <div className="flex items-center space-x-2 mb-4">
            <UserCheck className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Demo Persona & Role Switcher
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Select an enterprise persona to automatically populate credentials and test role-specific authorization:
          </p>

          <div className="space-y-2.5">
            {PRESET_USERS.map((p) => {
              const isSelected = email === p.email;
              return (
                <button
                  key={p.role}
                  type="button"
                  onClick={() => selectPreset(p.email)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/50 shadow-sm'
                      : 'bg-[#0f172a]/60 border-border/70 hover:border-border hover:bg-[#0f172a]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-200">{p.name}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        isSelected
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 font-bold'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {p.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    {p.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Credentials Sign In Form */}
        <div className="md:col-span-5 bg-card border border-border rounded-xl p-5 shadow-lg">
          <div className="flex items-center space-x-2 mb-4">
            <Key className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200">Sign In to Sentinel</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Account Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#0b0f17] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Security Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#0b0f17] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Default demo password: <code className="text-slate-400">incident2026!</code>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Authenticate & Enter'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-border/60 text-[11px] text-muted-foreground text-center">
            Organization: <span className="text-slate-300 font-semibold">Sentinel Enterprise Defense</span>
          </div>
        </div>
      </div>
    </div>
  );
}
