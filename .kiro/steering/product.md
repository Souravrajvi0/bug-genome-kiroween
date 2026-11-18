---
inclusion: always
---

# Product: Bug Genome

Hackathon: Kiroween 2026. Category: Frankenstein.

## Idea
Bugs have families. Bug Genome finds historical bugs from unrelated projects that share a root cause or failure mechanism, and shows the code evidence behind each relationship.

Example (illustrative, not a dataset result): duplicate orders from a double click, duplicate records from an API retry, and a job processed twice can all come from missing protection against duplicate execution.

## Current scope: Genome Atlas (Version A) only
Discover relationships between bugs that were already fixed.

Pipeline:
1. Import historical bugs and their patches.
2. Extract a fingerprint per bug: symptom, root cause, fix mechanism, code references.
3. Propose candidate relationships: semantic retrieval, then pairwise reasoning, then evidence checks.
4. Show families, original patches, and review controls in the Atlas.

## Out of scope for now: Variant Hunter (Version B)
Scanning new repositories for instances of a known failure mechanism. Document it as a future enhancement. Do not build it until Atlas is functional, tested and evaluated.

## Build order
1. Core Atlas experience first, using mock/sample data: layout and navigation, graph visualization, bug detail views (symptom, root cause, fix evidence), side-by-side buggy and fixed code, relationship explanations with evidence status, and Accept/Reject review.
2. Data pipeline, dataset, importer and LLM processing only when the owner explicitly asks.
3. Variant Hunter only after Atlas is functional, tested and evaluated.

Mock/sample data must be labelled in the UI as illustrative, not verified findings.

## Product rules
- Evidence first. A family needs a shared root cause or failure mechanism supported by actual code and patches. Similar descriptions or similar embeddings are not enough.
- LLM conclusions are hypotheses until a human accepts them.
- Every relationship has a status: `evidence-backed`, `plausible`, or `rejected`.
- The UI must let a reviewer inspect the supporting patch code and Accept or Reject each relationship. Human corrections are stored and are a core feature.
- Prefer a few convincing, verified relationships over many speculative matches.
- Do not claim a bug family exists until the dataset supports it. Duplicate execution, idempotency, retries and async mistakes are candidates to investigate, not assumptions.
- Any example in the UI or docs that is not from the dataset must be labelled as conceptual.

## Success criteria
- Functional public demo with a working URL.
- A measurable evaluation of relationship quality on a small labelled set.
- Visible, meaningful Kiro usage in `.kiro/`.
