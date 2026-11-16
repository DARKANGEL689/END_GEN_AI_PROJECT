# Architectural Decision Records (ADRs)

## ADR-001: Hexagonal Architecture (Ports and Adapters)
- **Status**: Accepted
- **Context**: IncidentComms AI integrates multiple external services (Firecrawl, Memento/Memory, LLM providers, Export engines) and must support rigorous automated testing, offline verification, and live provider switches without mutating business rules.
- **Decision**: Decouple domain logic completely into `src/domain/*` (pure TypeScript, zero Next.js or external library imports). Define strict interfaces in `src/domain/ports/*`:
  - `IntelligenceProvider`
  - `MemoryProvider`
  - `LlmProvider`
  - `ExportProvider`
  Implement real adapters in `src/infrastructure/adapters/*` and contract-faithful test fakes in `src/infrastructure/adapters/fakes/*`.
- **Consequences**: Easy unit testing of business rules, clear separation of concerns, test suite can run fully offline or with simulated network errors.

---

## ADR-002: Memory Provider Abstraction and Memento Ambiguity Handling
- **Status**: Proposed / Pending User Checkpoint
- **Context**: The problem statement specifies "Memento stores previously approved communication templates and organizational terminology". However, "Memento" can refer to Mem0, runmemento.com bitemporal memory, Memento Database, or an in-house memory repository.
- **Decision**: Define a robust `MemoryProvider` port. Provide a high-performance `LocalMemoryAdapter` backed by PostgreSQL + pgvector for semantic retrieval of approved templates and terminology. Display a prominent badge in the UI: **"Local adapter, not Memento"** until an external Memento provider is explicitly confirmed and passes live health checks.
- **Consequences**: Development and automated evaluation can proceed immediately with zero blockers. No simulated or misleading claims of Memento integration.

---

## ADR-003: Approval State Machine and Content-Hash Invalidation
- **Status**: Accepted
- **Context**: Security communications carry legal, regulatory, and technical consequences. If an incident draft is approved by Legal or Executive leadership and someone afterwards modifies either the draft text or the underlying incident facts, that approval is invalid.
- **Decision**: Approvals are bound cryptographically to:
  $$\text{ApprovalDigest} = \text{SHA256}(\text{DraftContentHash} \parallel \text{IncidentFactsHash})$$
  Any mutation to the draft content creates a new draft version, resetting approval status to `DRAFT`. Any update to incident facts immediately invalidates prior approvals and logs an `APPROVAL_INVALIDATED` event in the append-only audit trail. Approval events are strictly append-only (no DB `UPDATE` or `DELETE`).
- **Consequences**: Eliminates silent edits and state desynchronization. Defensible in audits.

---

## ADR-004: Two-Layer Trust Engine (Deterministic Linting + Independent LLM Verifier)
- **Status**: Accepted
- **Context**: Single-pass LLM generation frequently hallucinates facts, extrapolates `suspected` conditions into `confirmed` facts, and invents external citations.
- **Decision**: Implement a two-layer validation pipeline:
  1. **Layer 1: Deterministic Engine**:
     - Atomic claim parser (`[c1]`, `[c2]`, etc.)
     - Pointer resolution: Checks if claim pointer exists in the context bundle
     - Exact quote verification: Confirms quoted span exists verbatim in the source advisory
     - Epistemic status check: Forbidden words for `suspected` (e.g. "confirmed", "breached", "proven") and strict ban on stating `unknown` fields as fact
     - Regex redaction check for credentials, API tokens, and PII
  2. **Layer 2: Independent LLM Verifier**:
     - Separate prompt that receives *only* the atomic claims and the raw evidence bundle (no generator thoughts or reasoning).
     - Returns per-claim verdicts (`SUPPORTED | UNSUPPORTED | CONFLICTING | AMBIGUOUS`).
  - Any disagreement between Layer 1 and Layer 2 is flagged for human review.
- **Consequences**: Guarantees zero ungrounded claims pass unnoticed.

---

## ADR-005: Multi-Tenant Isolation and Centralized Authorization
- **Status**: Accepted
- **Context**: Incident communications must never leak across organizations. Multiple users within an organization have distinct roles (Incident Manager, Security Lead, Communications Officer, Legal Counsel, Executive Reviewer, Auditor).
- **Decision**: Every query is filtered by `organizationId`. A centralized authorization function `authorize(user, action, resource)` checks an explicit role-permission matrix. Multi-tenant leak test suite will execute negative tests attempting cross-tenant access.
- **Consequences**: Strict tenant isolation and compliance with enterprise security posture.
