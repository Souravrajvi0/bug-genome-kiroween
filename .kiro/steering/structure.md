---
inclusion: always
---

# Repository structure

This is the planned layout. It was confirmed and adjusted in the design of the first spec, .kiro/specs/genome-atlas-core-experience/design.md. No application code exists yet.

```
.kiro/
  steering/      project rules (this folder)
  specs/         one folder per feature: requirements.md, design.md, tasks.md
  hooks/         agent hooks
src/
  app/           Next.js routes, pages and API routes
  components/    UI, including the Cytoscape graph view and review controls
  lib/
    db/          SQLite access and schema (repository layer)
    llm/         provider-independent interface, adapters, response cache
    data-source/ data-access interface; mock/ holds the illustrative mock implementation and dataset
    review-store/ review-decision persistence: interface and the localStorage implementation
    pipeline/    LATER, only on request: import, fingerprints, candidate discovery, evidence checks
    domain/      types and relationship status logic
data/            RESERVED for future real data: small committed sample dataset and evaluation labels. Never put invented mock data here.
docs/            README support: architecture, evaluation results, Kiro usage notes
tests/           unit and property-based tests
LICENSE          MIT
README.md        setup, run, dataset, pre-existing work disclosure
```

## Conventions
- One spec per major feature, named in kebab-case, for example `.kiro/specs/atlas-import-and-fingerprints/`.
- Pipeline stages are separate modules with typed inputs and outputs, so each can be tested and cached on its own.
- Large raw datasets are not committed. Commit only a small sample and a script or instructions to fetch the rest.
- Invented mock data lives only in src/lib/data-source/mock/. It is labelled illustrative everywhere it is shown.
- Variant Hunter code, if built later, goes in its own folder and must not change Atlas modules.
