# Communication Quality Score Specification

## 1. Scope & Transparency Warning
The **Quality Score** measures *communication clarity, structure, terminology adherence, and evidence traceability*. It does **NOT** measure objective incident truth. Incident truth is governed solely by the **Readiness Gate** and human epistemic statuses.

---

## 2. Weighted Formula

The Overall Quality Score $Q \in [0, 100]$ is computed as:

$$Q = \sum_{i=1}^{7} w_i \cdot S_i$$

where $\sum w_i = 1.0$, defined by the following 7 sub-scores:

| Dimension ($i$) | Weight ($w_i$) | Metric Name | Calculation Method |
|---|---|---|---|
| $S_1$ | 0.25 | **Traceability & Grounding** | $\frac{\text{Supported Grounded Claims}}{\text{Total Claims}} \times 100$ |
| $S_2$ | 0.15 | **Epistemic Hedging Accuracy** | Penalty of $-25$ per unhedged suspected statement; base 100 |
| $S_3$ | 0.15 | **Audience Section Completeness** | $\frac{\text{Present Required Sections}}{\text{Mandatory Sections for Audience}} \times 100$ |
| $S_4$ | 0.15 | **Terminology & Policy Conformance** | Percentage of approved organizational terms used vs. flagged forbidden terms |
| $S_5$ | 0.10 | **Readability & Grade-Level Fit** | Flesch-Kincaid grade level alignment with target audience (Exec: 10-12, All-Hands: 7-9, SecOps: 11-14) |
| $S_6$ | 0.10 | **Actionability & Guidance Clarity** | Proportion of concrete next steps/mitigations containing clear owner and deadline/status |
| $S_7$ | 0.10 | **Conciseness & Information Density** | Word count adherence to target bounds (Executive: 250-400 words, All-Hands: 200-350 words, etc.) |

---

## 3. UI Display Requirements
The UI displays the overall quality score (0–100) alongside individual breakdowns and an explicit tooltip:
> *"Quality score assesses style, readability, structure, and citation density. Incident validity is governed by the Readiness Gate."*
