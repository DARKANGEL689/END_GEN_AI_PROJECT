# IncidentComms AI: 7-Minute Golden Incident Walkthrough Demo Script

**Project Title:** IncidentComms AI: Security Incident Communication Assistant  
**Golden Incident:** `INC-2026-001` — Active Exploitation of PulseGuard Edge Gateways (CVE-2026-1934)  
**Target Duration:** Exactly 7 minutes (420 seconds)  
**Target Evaluator Audience:** University Faculty, Security Engineers, and AI System Auditors  

---

## 0. Demo Credentials & Pre-Flight Setup

| Persona | Email | Password | Role / Primary Screen |
|---|---|---|---|
| **Incident Commander** | `im@sentinel.defense` | `incident2026!` | Overall Command Center, Epistemic Fact Management |
| **Security Analyst** | `sec@sentinel.defense` | `incident2026!` | Intelligence Feed, Firecrawl Scraping, Injection Scanner |
| **Comms Officer** | `comms@sentinel.defense` | `incident2026!` | Draft Studio, Evidence Sidebar, Content Editing |
| **Legal Counsel** | `legal@sentinel.defense` | `incident2026!` | Approval Workflow, Cryptographic Digital Signing |
| **Executive Reviewer** | `exec@sentinel.defense` | `incident2026!` | Executive Briefing & One-Click Sign-off |
| **Auditor** | `auditor@sentinel.defense` | `incident2026!` | Read-Only Immutable Audit Trail & Hash Verification |

**Pre-Flight Verification:**
```bash
# 1. Start application locally
npm run dev

# 2. Open browser at
http://localhost:3000
```

---

## Minute 0:00 – 1:00 | The Problem & Incident Command Center

### Screen
`http://localhost:3000/incidents/cmwjkladx000uu444w3upa6pa` (Logged in as `im@sentinel.defense`)

### What the Evaluator Sees
- The dark enterprise Command Center header displaying:  
  `INC-2026-001: Active Exploitation of PulseGuard Edge Gateways (CVE-2026-1934)`
- Yellow warning banner: `⚠️ SYNTHETIC INCIDENT EXERCISE DATA - RESTRICTED TO AUTHORIZED SENTINEL PERSONNEL`.
- Top-level health strip showing live database status (`Neon PostgreSQL 18 HTTP Mode`) and Memory status (`Local adapter, not Memento`).

### Speaker Script
> *"Good morning. When a critical cybersecurity breach occurs, seconds matter, but words matter more. A single misstatement to customers or regulators can trigger millions in regulatory fines or statutory liability. Current generative AI tools hallucinate citations, leak unconfirmed suspicions as established facts, and ignore strict organizational terminology.*
> 
> *IncidentComms AI solves this through a GenAI Trust Engine. Right now, we are in the Incident Command Center for INC-2026-001, a critical zero-day exploit targeting our perimeter gateway concentrators.*
> 
> *Notice our Epistemic Status Matrix. Every incident fact carries a human-assigned status: CONFIRMED, SUSPECTED, UNKNOWN, or DISPUTED. Notice that Exfiltration Status is set to UNKNOWN, Root Cause is SUSPECTED, and Mitigation is IN_PROGRESS. Our AI is mathematically forbidden from upgrading these statuses."*

### Key Action
- Toggle the Epistemic Status for `exfiltrationStatus` to show real-time persistence and cryptographic hash generation.

---

## Minute 1:00 – 2:00 | Threat Intelligence Ingestion via Firecrawl

### Screen
`http://localhost:3000/intelligence` (Logged in as `sec@sentinel.defense`)

### What the Evaluator Sees
- The Firecrawl Intelligence Dashboard with domain allowlist tiers:
  - `cisa.gov` (Tier 1: CISA/NVD)
  - `pulseguard.security` (Tier 2: Official Vendor)
- Ingested external advisories:
  - `CISA Alert AA26-048A: Active Exploitation of Perimeter SSL VPN Gateways (CVE-2026-1934)`
  - `PulseGuard Advisory: Critical Buffer Overflow in Gateway Nodes`
- Injection Quarantine status badge (`CLEAN - 0 PAYLOADS DETECTED`).

### Speaker Script
> *"To ground our communications in external reality, we integrate Firecrawl. During an active crisis, we cannot trust raw, untrusted web content. Threat actors embed prompt injections into advisories to manipulate model responses.*
> 
> *IncidentComms AI enforces a three-tier defense: First, a server-side domain allowlist that rejects non-authoritative URLs. Second, a 15-pattern regex pre-filter that neutralizes instruction overrides and hidden cloaking. Third, a strict instruction hierarchy wrapping scraped content inside isolated data blocks where untrusted web content is treated exclusively as data, never instructions."*

### Key Action
- Click on `CISA Alert AA26-048A` to display the ingested markdown, reliability tier badge, and SHA-256 content digest.

---

## Minute 2:00 – 3:00 | Organizational Memory & Template Governance

### Screen
`http://localhost:3000/memory` (Logged in as `comms@sentinel.defense`)

### What the Evaluator Sees
- Memory Provider Status Card clearly showing:  
  `Local adapter, not Memento (PostgreSQL + pgvector)`
- Approved Templates tab showing all 5 communication tiers:
  1. `EXECUTIVE` (Board & C-Suite)
  2. `ENGINEERING` (Technical IOCs & Runbooks)
  3. `ALL_HANDS` (Company-wide security guidance)
  4. `CUSTOMER` (Trust & transparency notice)
  5. `REGULATORY` (Statutory compliance disclosure)
- Organizational Terminology rules:
  - Approved: `Threat Actor` (Forbidden: `Hacker`, `Culprit`)
  - Approved: `Security Incident` (Forbidden: `Disaster`, `Catastrophe`)

### Speaker Script
> *"Next is the Memory Provider. To ensure absolute transparency, our UI explicitly labels this as 'Local adapter, not Memento'. It uses PostgreSQL with pgvector to govern approved organizational templates and strict terminology rules.*
> 
> *For every audience, mandatory sections are codified into policy. For example, our Executive template requires 'Situation Summary', 'Operational & Financial Impact', 'Legal Exposure', and 'Leadership Directives'. The AI is evaluated against section completeness as part of our 7-dimension quality score."*

---

## Minute 3:00 – 4:30 | The Trust Engine & The Signature Evidence Sidebar

### Screen
`http://localhost:3000/drafts` (Logged in as `comms@sentinel.defense`)

### What the Evaluator Sees
- Audience switcher tabs across all 5 tiers.
- The **Trust Engine Status Banner**:
  - Readiness Gate: `REVIEW_READY` (ShieldCheck icon)
  - Quality Score Meter: `92/100` (Emerald badge)
  - Facts Hash: `sha256:d8a412...`
  - Content Hash: `sha256:59bf38...`
- The 7-Dimension Quality Diagnostic:
  - Traceability (25% weight): `100%`
  - Epistemic Hedging (15% weight): `100%`
  - Completeness (15% weight): `100%`
  - Terminology (15% weight): `100%`
  - Readability (10% weight): `78%` (Flesch-Kincaid)
  - Actionability (10% weight): `100%`
  - Conciseness (10% weight): `100%`
- The Draft Body with inline claim pill citations `[c1]`, `[c2]`, `[c3]`, `[c4]`, `[c5]`.
- **The Evidence Sidebar** on the right pane.

### Speaker Script
> *"This is the core differentiator: the Draft Studio. Notice our 7-dimension quality score. It doesn't report subjective 'confidence'; it calculates a deterministic weighted formula covering traceability, epistemic hedging, and Flesch readability.*
> 
> *Notice our epistemic hedging in action: Because exfiltration was UNKNOWN in our command center, Claim [c4] reads: 'Data exfiltration remains unconfirmed; forensic inspection is actively assessing all egress logs.' It never states customer data was stolen.*
> 
> *Now watch our signature interaction: When I click on [c3], the Evidence Sidebar instantly opens. It displays the claim statement, the independent verifier verdict of SUPPORTED, the source domain cisa.gov, the reliability tier CISA_NVD, and the exact verbatim quoted span from CISA Alert AA26-048A. Fabricated citations are structurally impossible."*

### Key Action
- Click `[c1]`, `[c3]`, and `[c4]` in sequence. Show the Evidence Sidebar highlighting the exact verbatim quoted source spans in real time.

---

## Minute 4:30 – 5:30 | Cryptographic Approval & Automatic Revocation

### Screen
`http://localhost:3000/drafts` $\to$ Switch persona to `legal@sentinel.defense`

### What the Evaluator Sees
- "Review & Sign" modal opening.
- Shows Reviewer Name: `Legal Counsel`, Role: `LEGAL_COUNSEL`.
- Preview of Content Hash + Facts Hash $\to$ Calculated Approval Digest:
  $$\text{Approval Digest} = \text{SHA256}(\text{ContentHash} \parallel \text{FactsHash})$$
- Green digital signature banner appearing with timestamp and digest.

### Speaker Script
> *"Now we transition to Governance. A Communications Officer cannot publish a draft. Only Legal Counsel, Executive Reviewers, or Incident Commanders can sign off.*
> 
> *As Legal Counsel, I click 'Review & Sign'. The system computes a SHA-256 approval digest tying the exact content hash to the exact incident facts snapshot. I click 'Approve & Digitally Sign'. The draft is now locked in an APPROVED state.*
> 
> *Now observe what happens if a human editor modifies the draft: I switch back to Comms Officer and click 'Edit Revision'. I change a single sentence and save. Watch closely: The version increments to v2, and the prior approval seal is immediately revoked. Approval digests are mathematically bound to content; an edited draft cannot masquerade as approved."*

### Key Action
- Approve draft as `legal@sentinel.defense`. Show the green cryptographic seal.
- Click "Edit Revision", add a test sentence, and click save. Point out that the approval badge immediately revokes back to `DRAFT`.

---

## Minute 5:30 – 6:30 | Multi-Format Export (DOCX, Markdown, HTML)

### Screen
`http://localhost:3000/drafts` (Export Toolbar) & Open downloaded documents.

### What the Evaluator Sees
- Export options: DOCX, MD, HTML.
- Downloaded Word document (.docx) opening in Word / Preview:
  - Header: `⚠️ SYNTHETIC INCIDENT EXERCISE DATA - RESTRICTED DISTRIBUTION`
  - Document Title & Classification Metadata Table
  - Facts Hash, Content Hash, and Approval Digest
  - Formatted Headings and Body
  - Digital Approval Sign-off Box with Legal Reviewer signature.
- HTML export opening in a new browser tab with clean dark enterprise styling.

### Speaker Script
> *"Enterprise stakeholders consume communications in different formats: C-Suite and Legal require Microsoft Word documents with corporate branding, PR teams need Markdown, and web trust centers require HTML.*
> 
> *With one click, IncidentComms AI compiles native Word DOCX files via our export adapter. Notice the prominent synthetic data warning banner, the metadata table embedding our SHA-256 hashes, and the digital sign-off block. Everything is tamper-evident and audit-ready."*

### Key Action
- Click `DOCX`, `MD`, and `HTML` links. Show the generated files with watermarks and cryptographic digests.

---

## Minute 6:30 – 7:00 | Terminal Verification & Automated Evaluation Harness

### Screen
Terminal / PowerShell

### What the Evaluator Sees
- Running `npm run eval` and showing the evaluation report:
  - `Citation Resolution Rate: 100.0%`
  - `Suspected-to-Confirmed Leakage Rate: 0.00%`
  - `Prompt Injection Pass Rate: 100.0%`
  - `Ablation Studies table comparing Full Platform vs Ablations A/B/C`.
- Running `npm test` showing all 10 test files and 64 unit/integration tests passing.

### Speaker Script
> *"Finally, we don't just assert our system works; we prove it through our automated evaluation harness across 12 golden incidents spanning 10 threat categories.*
> 
> *Running `npm run eval`: We achieve 100.0% citation resolution across 300 claims, exactly 0.00% epistemic leakage, and 100.0% prompt injection neutralization across our red-team corpus. Our ablation study proves that removing Firecrawl drops quality by 14 points, while removing epistemic validation immediately triggers critical state blocking.*
> 
> *All 64 tests in our test suite pass cleanly on live Neon PostgreSQL. IncidentComms AI turns high-stress incident communications into an auditable, evidence-grounded science. Thank you, and I look forward to your questions."*

### Key Action
- Run `npm run eval` and show the completed ablation table and test output.

---

## Summary Checklist for Demo Presenter

- [x] Pre-seeded incident `INC-2026-001` loaded.
- [x] Showed Epistemic Editor (`UNKNOWN` vs `CONFIRMED`).
- [x] Showed Firecrawl CISA alert ingestion and allowlist tiers.
- [x] Highlighted `"Local adapter, not Memento"` transparency.
- [x] Demonstrated Evidence Sidebar with verbatim quoted spans.
- [x] Demonstrated Legal approval and revision-based revocation.
- [x] Generated DOCX export with synthetic watermark banner.
- [x] Showed `npm run eval` real benchmark metrics and ablations.
