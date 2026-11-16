# IncidentComms AI: Evaluation Rubric & Requirement Traceability Matrix

This document provides a line-item traceability mapping between the Problem Statement (Row 16: Security Incident Communication Assistant with Firecrawl and Memento), the university grading rubric, the exact source files, automated tests, and terminal verification commands.

---

## 1. Problem Statement Requirements Traceability

| S.No | Problem Statement Requirement | Implementation File(s) | Unit / Integration Test(s) | Verification CLI Command | UI Demonstration Screen |
|---|---|---|---|---|---|
| **1** | **Internal Communications During Security Incidents**<br>IT teams need clear, audience-tailored internal communications. | `src/domain/services/generationService.ts`<br>`src/infrastructure/adapters/llm/llmAdapter.ts` | `tests/domain/trust-engine.test.ts` | `npm test` | `/drafts`<br>(Executive, Engineering, All-Hands tabs) |
| **2** | **Firecrawl Intelligence Ingestion**<br>Gathers current official guidance and vendor notices. | `src/infrastructure/adapters/firecrawl/firecrawlAdapter.ts`<br>`src/infrastructure/adapters/firecrawl/allowlist.ts`<br>`src/infrastructure/adapters/firecrawl/sanitizer.ts` | `tests/domain/firecrawl-intelligence.test.ts`<br>`tests/fixtures/redteam-injections.json` | `npx tsx scripts/run-drills.ts` | `/intelligence`<br>(CISA Alert AA26-048A & PulseGuard Advisory) |
| **3** | **Memory Provider (Memento / Local)**<br>Stores previously approved templates and organizational terminology. | `src/domain/ports/memory.ts`<br>`src/infrastructure/adapters/memory/localMemoryAdapter.ts` | `tests/domain/memory-provider.test.ts` | `npm test` | `/memory`<br>(Approved Templates & Terminology CRUD) |
| **4** | **LLM Grounded Drafting**<br>Drafts incident updates using current guidance and prior templates. | `src/domain/trust/compiler.ts`<br>`src/domain/trust/quality.ts`<br>`src/domain/trust/readiness.ts` | `tests/domain/trust-engine.test.ts` | `npm run eval` | `/drafts`<br>(Interactive Claims `[c1]..[c5]`) |
| **5** | **Human Approval Governance**<br>Enforces human sign-off before communications can be released. | `src/domain/statemachine/approval.ts`<br>`src/domain/trust/hash.ts`<br>`src/domain/services/governanceService.ts` | `tests/domain/approval.test.ts`<br>`tests/domain/governance-export.test.ts` | `npm test` | `/drafts`<br>("Review & Sign" Modal & Seal) |

---

## 2. Advanced Evaluation Criteria (Tier 1 & Tier 2 Differentiators)

### 2.1 The GenAI Trust Engine & Grounding
- **Claim-Level Grounding:**
  - *Source Code:* [`src/domain/entities/claim.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/domain/entities/claim.ts), [`src/infrastructure/adapters/llm/llmAdapter.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/infrastructure/adapters/llm/llmAdapter.ts)
  - *Validation:* 100% citation resolution rate verified via `npm run eval`.
  - *UI Experience:* Clicking any inline tag (`[c1]..[c5]`) opens the **Evidence Sidebar** displaying verbatim quoted source spans, source domain, and reliability tier.
- **Epistemic Status Model:**
  - *Source Code:* [`src/domain/trust/readiness.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/domain/trust/readiness.ts), [`src/components/incidents/EpistemicEditor.tsx`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/components/incidents/EpistemicEditor.tsx)
  - *Enforcement:* `UNKNOWN` facts are strictly barred from affirmative assertions. `SUSPECTED` facts mandate epistemic hedging words ("preliminary indicators suggest", "suspected", "potential").
  - *Test:* `tests/domain/trust-engine.test.ts` asserts immediate `BLOCKED` status on epistemic breaches.
- **7-Dimension Quality Score:**
  - *Source Code:* [`src/domain/trust/quality.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/domain/trust/quality.ts)
  - *Formula:* $Q = \sum (w_i \cdot S_i)$ spanning Traceability (0.25), Epistemic Hedging (0.15), Section Completeness (0.15), Terminology (0.15), Readability (0.10, Flesch-Kincaid), Actionability (0.10), Conciseness (0.10).

---

### 2.2 Security & Threat Defense
- **Prompt Injection Defense on Untrusted Content:**
  - *Source Code:* [`src/infrastructure/adapters/firecrawl/sanitizer.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/infrastructure/adapters/firecrawl/sanitizer.ts)
  - *Corpus:* 15 adversarial payloads in [`tests/fixtures/redteam-injections.json`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/tests/fixtures/redteam-injections.json).
  - *Verification:* `npm test` and `npm run eval` confirm 100.0% quarantine pass rate.
- **Server Secret Isolation & Client Bundle Grep:**
  - *Source Code:* [`tests/security/hardening.test.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/tests/security/hardening.test.ts)
  - *Verification:* Scans all Next.js `.next/static/chunks/` bundles to verify zero leaked API keys or private keys.
- **Role-Based Access Control (RBAC):**
  - *Source Code:* [`src/domain/permissions/rbac.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/domain/permissions/rbac.ts), [`src/middleware.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/middleware.ts)
  - *Matrix Tested:* Full 6-role $\times$ 14-action matrix in [`tests/domain/rbac.test.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/tests/domain/rbac.test.ts).

---

### 2.3 Cryptographic Governance & Immutability
- **Approval State Machine:**
  - *Source Code:* [`src/domain/statemachine/approval.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/domain/statemachine/approval.ts)
  - *Transitions:* `DRAFT` $\to$ `PENDING_REVIEW` $\to$ `APPROVED` | `REJECTED`. Rejects illegal transitions and blocks unreviewed drafts.
- **Cryptographic Digest Binding:**
  - *Source Code:* [`src/domain/trust/hash.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/domain/trust/hash.ts)
  - *Digest Formula:* $\text{ApprovalDigest} = \text{SHA256}(\text{ContentHash} \parallel \text{FactsHash})$.
- **Revision-Based Revocation:**
  - *Source Code:* [`src/domain/services/governanceService.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/domain/services/governanceService.ts)
  - *Test:* [`tests/domain/governance-export.test.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/tests/domain/governance-export.test.ts) verifies that manual edits revoke prior approvals, increment version, and log `APPROVAL_REVOKED_BY_EDIT`.

---

### 2.4 Multi-Format Export Engine
- **DOCX Generation:**
  - *Source Code:* [`src/infrastructure/adapters/export/exportAdapter.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/infrastructure/adapters/export/exportAdapter.ts)
  - *Outputs:* Native Microsoft Word (.docx) with synthetic data warning banners, metadata tables, cryptographic digests, and digital sign-off blocks.
- **Markdown & HTML Export:**
  - *Source Code:* [`src/app/api/drafts/[id]/export/route.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/app/api/drafts/[id]/export/route.ts)
  - *Outputs:* YAML frontmatter-enabled markdown and self-contained HTML documents.

---

### 2.5 Tier 2 Differentiators: Consistency, Missing Info & Evaluation
- **Cross-Audience Consistency Engine:**
  - *Source Code:* [`src/domain/trust/consistency.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/domain/trust/consistency.ts)
  - *Test:* [`tests/domain/eval-harness.test.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/tests/domain/eval-harness.test.ts) confirms detection of planted contradictions (exfiltration status, severity mismatches, downtime discrepancies).
- **Missing Information Detector:**
  - *Source Code:* [`src/domain/trust/missingInfo.ts`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/src/domain/trust/missingInfo.ts)
  - *Gaps Detected:* Statutory compliance deadlines (GDPR/SEC), uninvestigated root causes on critical incidents, customer guidance omissions, external intel deficits.
- **12 Golden Incident Benchmark & Ablation Studies:**
  - *Corpus:* [`eval/fixtures/golden-incidents.json`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/eval/fixtures/golden-incidents.json)
  - *Execution:* `npm run eval`
  - *Report:* [`eval/results/EVAL_REPORT.md`](file:///c:/Users/ANGEL_OF_CODE_689/END_GEN_AI_PROJECT/eval/results/EVAL_REPORT.md)

---

## 3. Command Line Verification Quick Reference

```bash
# 1. Run all 64 unit and integration tests
npm test

# 2. Run automated evaluation harness across 12 golden incidents & ablations
npm run eval

# 3. Run subsystem failure-mode drills (Firecrawl, Memory, LLM, DB)
npx tsx scripts/run-drills.ts

# 4. Strict TypeScript type check
npm run typecheck

# 5. ESLint code quality scan
npm run lint

# 6. Production Next.js build compilation
npm run build
```
