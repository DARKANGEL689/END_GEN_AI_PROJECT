# Readiness Specification

## Purpose
Readiness is a deterministic safety gate, **not** a confidence percentage or subjective score. A draft cannot proceed to executive or legal review if it is `BLOCKED`.

---

## 1. Readiness States

| State | Definition | Permitted Actions |
|---|---|---|
| `BLOCKED` | One or more critical grounding or epistemic violations detected. | Edit draft, regenerate claims, update incident facts. Cannot request review. |
| `NEEDS_REVIEW` | All critical facts verified, but stylistic warnings, minor hedging advisories, or unhedged suspected items exist. | Reviewer may inspect warnings and optionally approve with recorded justification. |
| `REVIEW_READY` | 100% citation resolution, valid epistemic hedging, zero unsupported claims, all mandatory audience sections present. | Eligible for one-click Legal / Executive approval. |

---

## 2. Hard Blocking Conditions (Immediate `BLOCKED`)
A draft is `BLOCKED` if any of the following evaluate to true:
1. **Unresolved Pointer**: Any claim tag `[cx]` references a source ID that does not exist in the incident context bundle.
2. **Fabricated Quote**: A claim includes a `quotedSpan` that is not a substring of the referenced external advisory or incident record.
3. **Unsupported Claim**: The independent verifier or deterministic engine marks a claim as `UNSUPPORTED` or `CONFLICTING`.
4. **Epistemic Breach**: An incident field with status `UNKNOWN` is asserted as an established fact, or a field with status `SUSPECTED` is stated without hedging (e.g. stating "customer records were compromised" when data breach is `SUSPECTED`).
5. **PII / Secret Leak**: Unredacted secrets (tokens, AWS keys, passwords, private keys) or PII patterns detected in the draft body.
6. **Missing Mandatory Sections**: Audience template requires specific sections (e.g. Executive draft missing "Business & Financial Impact", Regulatory draft missing "Time of Discovery").
