'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createIncidentAction } from '../actions';
import { Shield, ArrowLeft, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function NewIncidentPage() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ZERO_DAY');
  const [severity, setSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [description, setDescription] = useState('');
  const [regulatoryApplicability, setRegulatoryApplicability] = useState('GDPR Art 33 (72h) & SEC Item 1.05');

  // Epistemic Statuses
  const [accessScopeStatus, setAccessScopeStatus] = useState('UNKNOWN');
  const [accessScopeDetails, setAccessScopeDetails] = useState('');

  const [exfiltrationStatus, setExfiltrationStatus] = useState('UNKNOWN');
  const [exfiltrationDetails, setExfiltrationDetails] = useState('');

  const [rootCauseStatus, setRootCauseStatus] = useState('SUSPECTED');
  const [rootCauseDetails, setRootCauseDetails] = useState('');

  const [affectedSystemsStatus, setAffectedSystemsStatus] = useState('CONFIRMED');
  const [affectedSystemsDetails, setAffectedSystemsDetails] = useState('');

  const [mitigationStatus, setMitigationStatus] = useState('SUSPECTED');
  const [mitigationDetails, setMitigationDetails] = useState('');

  const [loading, setLoading] = useState(false);

  // Quick fill preset for evaluation demo
  const handleQuickFill = () => {
    setTitle('SolarFlare Identity Broker Lateral Compromise (CVE-2026-4402)');
    setCategory('SUPPLY_CHAIN');
    setSeverity('CRITICAL');
    setDescription(
      'Third-party federated SAML token forging vulnerability identified in cloud identity provider module. Security operations flagged unauthorized cross-tenant admin sessions created via forged assertions.'
    );
    setRegulatoryApplicability('SEC Item 1.05 (4 business days) & GDPR Article 33');

    setAccessScopeStatus('UNKNOWN');
    setAccessScopeDetails('Active enumeration of all tenant assertion tokens minted over past 72 hours.');

    setExfiltrationStatus('SUSPECTED');
    setExfiltrationDetails('Anomalous export of 12 cloud IAM role definitions observed; zero customer PII confirmed exfiltrated.');

    setRootCauseStatus('CONFIRMED');
    setRootCauseDetails('Improper cryptographic signature validation on assertion envelope headers in identity broker v3.4.');

    setAffectedSystemsStatus('CONFIRMED');
    setAffectedSystemsDetails('2 regional SSO authentication clusters isolated; backup IdP proxy routed.');

    setMitigationStatus('SUSPECTED');
    setMitigationDetails('Emergency token revocation keys rotated; waiting on SIEM telemetry confirmation.');
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/incidents"
          className="inline-flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Incidents</span>
        </Link>

        <button
          type="button"
          onClick={handleQuickFill}
          className="inline-flex items-center space-x-1.5 text-xs bg-card hover:bg-slate-800 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick Fill Synthetic Scenario</span>
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-md">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-border">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Security Incident Intake</h1>
            <p className="text-xs text-muted-foreground">
              Declare an active incident and initialize human-vetted epistemic status baselines.
            </p>
          </div>
        </div>

        <form action={createIncidentAction} onSubmit={() => setLoading(true)} className="space-y-6">
          {/* Basic Incident Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Incident Title *
              </label>
              <input
                type="text"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Critical Zero-Day Remote Code Execution in Gateway VPN"
                className="w-full bg-[#0b0f17] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Threat Category *
              </label>
              <select
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0b0f17] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ZERO_DAY">Zero-Day Vulnerability (RCE)</option>
                <option value="RANSOMWARE">Ransomware / Extortion</option>
                <option value="SUPPLY_CHAIN">Supply Chain / Dependency Compromise</option>
                <option value="DATA_EXFILTRATION">Unauthorized Data Exfiltration</option>
                <option value="PHISHING">Phishing / Credential Harvest</option>
                <option value="DDOS">Distributed Denial of Service (DDoS)</option>
                <option value="CLOUD_COMPROMISE">Cloud Infrastructure Compromise</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Severity Level *
              </label>
              <select
                name="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW')}
                className="w-full bg-[#0b0f17] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="CRITICAL">CRITICAL (Enterprise-wide impact / Active breach)</option>
                <option value="HIGH">HIGH (Severe vulnerability / Confirmed breach attempt)</option>
                <option value="MEDIUM">MEDIUM (Localized containment / Limited exposure)</option>
                <option value="LOW">LOW (Informational / Defensive anomaly)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Incident Summary & Initial Findings *
              </label>
              <textarea
                name="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Factual description of telemetry, initial detection time, and perimeter observations..."
                className="w-full bg-[#0b0f17] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Regulatory Applicability / Statutory Clocks
              </label>
              <input
                type="text"
                name="regulatoryApplicability"
                value={regulatoryApplicability}
                onChange={(e) => setRegulatoryApplicability(e.target.value)}
                placeholder="e.g. GDPR Article 33 (72h notice), SEC Item 1.05 (4 business days)"
                className="w-full bg-[#0b0f17] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Epistemic Grounding Section */}
          <div className="pt-4 border-t border-border space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Epistemic Grounding Statuses</span>
                <span className="text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">
                  Trust Engine Foundation
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Each field status dictates strict LLM generation rules. Suspected items will enforce hedged phrasing; unknown items cannot be asserted as facts.
              </p>
            </div>

            {/* Field: Access Scope */}
            <div className="bg-[#0b0f17] border border-border/70 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-slate-200">1. Access Scope</span>
                <div className="flex items-center space-x-1">
                  {['CONFIRMED', 'SUSPECTED', 'UNKNOWN', 'DISPUTED'].map((st) => (
                    <label
                      key={st}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                        accessScopeStatus === st
                          ? 'bg-blue-600/20 text-blue-300 border-blue-500 font-bold'
                          : 'bg-card text-muted-foreground border-border hover:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="accessScopeStatus"
                        value={st}
                        checked={accessScopeStatus === st}
                        onChange={() => setAccessScopeStatus(st)}
                        className="hidden"
                      />
                      {st}
                    </label>
                  ))}
                </div>
              </div>
              <input
                type="text"
                name="accessScopeDetails"
                value={accessScopeDetails}
                onChange={(e) => setAccessScopeDetails(e.target.value)}
                placeholder="Details on lateral movement or directory access..."
                className="w-full bg-[#111827] border border-border/80 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Field: Exfiltration */}
            <div className="bg-[#0b0f17] border border-border/70 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-slate-200">2. Data Exfiltration</span>
                <div className="flex items-center space-x-1">
                  {['CONFIRMED', 'SUSPECTED', 'UNKNOWN', 'DISPUTED'].map((st) => (
                    <label
                      key={st}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                        exfiltrationStatus === st
                          ? 'bg-blue-600/20 text-blue-300 border-blue-500 font-bold'
                          : 'bg-card text-muted-foreground border-border hover:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="exfiltrationStatus"
                        value={st}
                        checked={exfiltrationStatus === st}
                        onChange={() => setExfiltrationStatus(st)}
                        className="hidden"
                      />
                      {st}
                    </label>
                  ))}
                </div>
              </div>
              <input
                type="text"
                name="exfiltrationDetails"
                value={exfiltrationDetails}
                onChange={(e) => setExfiltrationDetails(e.target.value)}
                placeholder="Network egress volume, destination IPs, or observed dumps..."
                className="w-full bg-[#111827] border border-border/80 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Field: Root Cause */}
            <div className="bg-[#0b0f17] border border-border/70 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-slate-200">3. Root Cause</span>
                <div className="flex items-center space-x-1">
                  {['CONFIRMED', 'SUSPECTED', 'UNKNOWN', 'DISPUTED'].map((st) => (
                    <label
                      key={st}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                        rootCauseStatus === st
                          ? 'bg-blue-600/20 text-blue-300 border-blue-500 font-bold'
                          : 'bg-card text-muted-foreground border-border hover:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="rootCauseStatus"
                        value={st}
                        checked={rootCauseStatus === st}
                        onChange={() => setRootCauseStatus(st)}
                        className="hidden"
                      />
                      {st}
                    </label>
                  ))}
                </div>
              </div>
              <input
                type="text"
                name="rootCauseDetails"
                value={rootCauseDetails}
                onChange={(e) => setRootCauseDetails(e.target.value)}
                placeholder="CVE number, vulnerable library, or initial entry vector..."
                className="w-full bg-[#111827] border border-border/80 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Field: Affected Systems */}
            <div className="bg-[#0b0f17] border border-border/70 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-slate-200">4. Affected Systems</span>
                <div className="flex items-center space-x-1">
                  {['CONFIRMED', 'SUSPECTED', 'UNKNOWN', 'DISPUTED'].map((st) => (
                    <label
                      key={st}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                        affectedSystemsStatus === st
                          ? 'bg-blue-600/20 text-blue-300 border-blue-500 font-bold'
                          : 'bg-card text-muted-foreground border-border hover:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="affectedSystemsStatus"
                        value={st}
                        checked={affectedSystemsStatus === st}
                        onChange={() => setAffectedSystemsStatus(st)}
                        className="hidden"
                      />
                      {st}
                    </label>
                  ))}
                </div>
              </div>
              <input
                type="text"
                name="affectedSystemsDetails"
                value={affectedSystemsDetails}
                onChange={(e) => setAffectedSystemsDetails(e.target.value)}
                placeholder="Specific hostnames, VPC clusters, or application nodes..."
                className="w-full bg-[#111827] border border-border/80 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Field: Mitigation */}
            <div className="bg-[#0b0f17] border border-border/70 rounded-lg p-3.5 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-slate-200">5. Mitigation & Containment</span>
                <div className="flex items-center space-x-1">
                  {['CONFIRMED', 'SUSPECTED', 'UNKNOWN', 'DISPUTED'].map((st) => (
                    <label
                      key={st}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                        mitigationStatus === st
                          ? 'bg-blue-600/20 text-blue-300 border-blue-500 font-bold'
                          : 'bg-card text-muted-foreground border-border hover:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="mitigationStatus"
                        value={st}
                        checked={mitigationStatus === st}
                        onChange={() => setMitigationStatus(st)}
                        className="hidden"
                      />
                      {st}
                    </label>
                  ))}
                </div>
              </div>
              <input
                type="text"
                name="mitigationDetails"
                value={mitigationDetails}
                onChange={(e) => setMitigationDetails(e.target.value)}
                placeholder="Emergency patches, routing isolation, or credential rotation status..."
                className="w-full bg-[#111827] border border-border/80 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
            <Link
              href="/incidents"
              className="text-xs text-muted-foreground hover:text-white px-4 py-2 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
            >
              <span>{loading ? 'Creating Incident...' : 'Register Incident & Initialize Command Center'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
