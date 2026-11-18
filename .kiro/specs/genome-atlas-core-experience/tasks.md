# Implementation Plan: Genome Atlas Core Experience

## Overview

Tasks follow the delivery tiers in `requirements.md`. Finish every P0 task before starting P1, and every P1 task before starting P2. Each tier ends with a checkpoint. All data is invented and illustrative. No task touches real datasets, an importer, LLM integration, SQLite, Railway deployment or Variant Hunter.

Conventions for every task:
- TypeScript strict mode, no `any` without a comment.
- UI code imports only from `domain` and the provider hooks, never from `MockDataSource`, `LocalReviewStore` or `localStorage` (R11.4, R11.8).
- Each module gets its tests in the same task, in `tests/`, named after the module.
- Task requirement references use the form `R<requirement>.<criterion>`.

## Tasks

## Tier P0: MVP, complete core experience

- [ ] 1. Project setup and tooling
  - [ ] 1.1 Scaffold the Next.js app
    - Create the Next.js App Router project with TypeScript strict mode and ESLint at the repository root, using the folder layout in `design.md`.
    - Add dependencies, each with the reason from the design: `cytoscape`, `@types/cytoscape`, `zod`, `prism-react-renderer`; dev: `vitest`, `fast-check`.
    - Add `npm` scripts: `dev`, `build`, `test`, `typecheck`.
    - Add MIT `LICENSE`, `.env.example` (no variables yet, comment only), and a `.gitignore` that does not list `.kiro/`.
    - _Requirements: R16.5, R11.9_
  - [ ] 1.2 Design tokens and base styles
    - Create the global stylesheet with the color, spacing, type and focus tokens from `design.md`, dark layered background, and `next/font` for Inter and JetBrains Mono.
    - Add the `prefers-reduced-motion` base rule.
    - _Requirements: R12.1, R12.2, R12.8, R12.10_
  - [ ] 1.3 Start the Kiro usage note
    - Create `docs/kiro-usage.md` with the first entries: steering files, the requirements-first spec, the approval rounds that shaped the design.
    - _Requirements: none (project rule in `tech.md`)_

- [ ] 2. Domain core (pure TypeScript, no React or browser APIs)
  - [ ] 2.1 Domain types
    - Write `types.ts`: `Bug` (including `fixSummary`), `Family`, `Project`, `Snippet`, `EvidenceItem`, `Relationship`, `RelationshipStatus`, `ReviewState`, `EvidenceProvenance`, `ReviewDecision`, `Criteria`.
    - _Requirements: R11.9, R17.1_
  - [ ] 2.2 Status and review-state derivation
    - Write `status.ts` with `deriveRelationship(rel, decision?)` returning effective status, review state and provenance, and `isCrossProject`.
    - Unit tests: no decision, accept, reject, accept on a baseline `rejected`, provenance unchanged after any decision.
    - _Requirements: R6.2, R6.3, R6.9, R6.12, R17.2_
  - [ ] 2.3 Search and visibility
    - Write `search.ts` (case-insensitive match over title, description, symptoms, root cause, project, family) and `visibility.ts` with `computeVisibility` returning visible bugs, visible relationships, isolated bugs and counts.
    - Rules: OR inside a filter, AND across search, family and language, status filter never hides bugs, hidden bug hides its edges.
    - Unit tests: the worked examples in `design.md` (`rejected` only gives 12/12 bugs, 1/10 relationships, 10 isolated; family filter gives 3/12 bugs), empty criteria, no match.
    - _Requirements: R3.1, R3.5 to R3.9, R3.12, R16.7_
  - [ ] 2.4 Atlas query parsing
    - Write `atlas-query.ts` with `parseAtlasQuery` (zod schema, drops unknown parameters and invalid values, never throws) and `serializeAtlasQuery` (canonical, sorted, empty omitted).
    - Unit tests: valid query, unknown keys, unknown family id, bad language, empty values, duplicate values.
    - _Requirements: R3.14, R3.16, R16.8_
  - [ ] 2.5 Deterministic layout
    - Write `layout.ts` with `computeLayout(families, bugs)`: family centers on a ring ordered by id, bugs on a smaller ring per family, fixed rotation offsets.
    - Unit tests: same input gives identical output, no two bugs closer than a minimum distance, each family's bugs sit within a bounded radius of its center.
    - _Requirements: R12.11, R18.5_

- [ ] 3. Illustrative mock data and Data_Source
  - [ ] 3.1 Data source interface
    - Write `DataSource.ts` with the six asynchronous operations.
    - _Requirements: R11.1, R11.2, R11.6_
  - [ ] 3.2 Author the mock projects, families and bugs
    - In `src/lib/data-source/mock/`, write 4 invented projects, 4 invented families and 12 bugs from the table in `design.md`. Each bug has description, symptoms, suspected root cause, `fixSummary`, language, project, and buggy and fixed snippets of at most 25 lines.
    - Each `fixSummary` states what changed and why that addresses the root cause, differs from the root cause text, and is written as an invented illustration. Set `isMock: true`.
    - Use only invented names. No real repositories, organizations or people.
    - _Requirements: R9.1 to R9.4, R9.12, R9.16, R10.5_
  - [ ] 3.3 Author the mock relationships
    - Write the 10 relationships from `design.md`, all cross-project, with explanation, 2 to 3 evidence items each (one line range per side), baseline status and `evidenceProvenance: 'illustrative'`.
    - Write `rel-10` as the negative example with `negative.rootCauseA` and `negative.rootCauseB`, and an explanation that names both root causes.
    - _Requirements: R9.5 to R9.11, R9.13 to R9.15_
  - [ ] 3.4 MockDataSource and dataset validation test
    - Write `MockDataSource` implementing `DataSource`.
    - Write the validation test: counts, unique ids, valid references, line ranges inside snippets, snippet length, at least 8 cross-project relationships, each family has at least 2 cross-project relationships, each family spans at least 3 projects, every bug has a relationship, all three baseline statuses present, a negative example present, fix summary rules (non-empty, at most 400 characters, not equal to root cause), no forbidden words ("verified", "confirmed", "real") outside the negation "not verified".
    - _Requirements: R9.1 to R9.16, R10.6, R11.3, R16.1, R16.3_

- [ ] 4. Review store
  - [ ] 4.1 Interface and stored schema
    - Write `ReviewStore.ts` (list, get, save, remove, clear; `StoreCondition` type) and `schema.ts` with the envelope zod schema and the per-record schema. Key: `bug-genome:review-decisions:v1`, schema version inside the value.
    - _Requirements: R7.1, R7.5, R11.4_
  - [ ] 4.2 LocalReviewStore
    - Implement with an injected `StorageLike`. Two-level validation as in `design.md`: invalid envelope gives an empty set and `corrupt-data` and leaves storage untouched; valid envelope keeps valid records, drops invalid ones and reports `partially-recovered(dropped)`. A record is valid only if key equals id, decision is `accept` or `reject`, and the timestamp is ISO 8601.
    - Read errors give `unavailable-storage`. Write errors keep the decision in memory and report `not-persisted`. Unknown relationship ids are kept in storage.
    - Write only decisions and the schema version.
    - _Requirements: R7.1 to R7.7, R8.1 to R8.6, R8.9_
  - [ ] 4.3 LocalReviewStore tests
    - With a fake storage: save and reload, replace, remove, clear, corrupt JSON, wrong version, wrong shape, one bad record among good ones, unavailable on read, quota on write, unknown ids kept, read never writes.
    - _Requirements: R16.1, R16.4, R16.6_

- [ ] 5. Composition, providers and shell
  - [ ] 5.1 Composition point and providers
    - Write `composition.ts` as the only file importing `MockDataSource` and `LocalReviewStore`.
    - Write `DataProvider` (loading, error with retry) and `ReviewProvider` with `useReview(relId)` returning decision, effective status, review state, and `accept`, `reject`, `reset`. Statuses update everywhere without reload.
    - _Requirements: R6.4, R7.2, R7.3, R11.8, R11.10, R11.11_
  - [ ] 5.2 Shared UI components
    - Write `StatusBadge` (text and pattern as well as color, "Evidence-backed (illustrative)" wording), `ProvenanceBadge` ("Illustrative, not verified"), `FamilyChip`, `IllustrativeTag` (derived from the `isMock` flag) and `CodeBlock` (prism-react-renderer, line numbers, optional highlighted ranges, non-selectable line numbers).
    - _Requirements: R10.5, R12.5, R14.7, R17.1, R17.3, R17.6_
  - [ ] 5.3 App shell
    - Write the root layout: header with navigation, persistent illustrative banner, skip link, two live regions, a not-found page, route announcer that sets the document title and moves focus to the `h1`.
    - Add the "Clear all decisions" control with a confirmation step in the header menu.
    - _Requirements: R7.8, R10.1, R14.3, R14.8, R14.10, R15.5_

- [ ] 6. Atlas Graph view
  - [ ] 6.1 GraphController
    - Implement the Cytoscape boundary class from `design.md`: `mount` (one initial fit, deferred until the container has a size), `setElements` (family compound parents, bug nodes, edges, preset positions from `computeLayout`), `applyVisibility`, `applyStatuses`, `select`, `resize` (calls `cy.resize()` only), `fit`, `getViewport`, `setViewport`, `destroy`. Add the `USE_FAMILY_HULLS` flag.
    - Hidden bugs use the `hidden` class (opacity 0, no events), not `display: none`. Edges use `display: none`.
    - Tests on a headless instance: visibility, status, select and resize calls leave zoom and pan unchanged and do not move any bug.
    - Faded means not matching. A bug hidden by the Node_Criteria must not be hit-testable, must not be focusable or listed, and must not be counted or included in fit. Tests assert this for the controller's `visibleBugIds()`, and that hidden bugs ignore pointer events. An edge that fails the Edge_Criteria or whose bug is hidden is `display: none` and is excluded from list and counts in the same way. Selection spotlight fading (P1) is style only and does not change matching or counts.
    - _Requirements: R1.9, R1.10, R3.13, R18.1 to R18.5_
  - [ ] 6.2 Graph styling (core)
    - Family hulls (quiet, non-interactive), project shape and tag per node, status-specific edge color and line style, cross-project edge marker, isolated and selection classes, illustrative marker on nodes and edges with accessible text.
    - _Requirements: R1.4, R1.5, R1.11, R1.12, R10.2, R12.3, R14.7_
  - [ ] 6.3 GraphCanvas component
    - Client component that owns the controller through a ref, creates it once per mount, feeds visibility, statuses and selection through separate effects, and calls `resize()` from a `ResizeObserver`. Node and edge activation navigates to the detail pages.
    - _Requirements: R1.2, R1.3, R2.1, R2.2, R13.7_
  - [ ] 6.4 Criteria in the URL
    - Write a `useAtlasCriteria` hook: reads criteria from `useSearchParams` through `parseAtlasQuery`, writes with `router.replace` only, debounces search typing by 300 ms, writes discrete filter changes immediately, resets the search draft when the URL changes from outside.
    - Detail links from the graph and the list carry `?from=<serialized query>`.
    - _Requirements: R2.7, R3.14, R3.15_
  - [ ] 6.5 Filters, counts, legend and list
    - Write `FilterPanel` (search, family, language, status, clear), `CountsBar` (bugs, relationships, families, isolated, each "visible of total"), `GraphLegend` (families, statuses, cross-project marker), and `GraphList` (tabs "Bugs" and "Relationships", every entry is a link, isolated bugs marked in text).
    - Empty state, no-results state naming the active criteria with the clear control, and the "no relationships match" notice.
    - _Requirements: R1.8, R3.1 to R3.10, R3.12, R14.4, R14.5, R15.2_
  - [ ] 6.6 Atlas page assembly
    - Compose the page: filter side panel beside the canvas at 1024 px and wider, a stacked panel below. Wire `computeVisibility` over data, review decisions and criteria. Include the fit control.
    - _Requirements: R1.1, R1.10, R13.2, R13.3_

- [ ] 7. Bug Detail view
  - [ ] 7.1 Bug detail page
    - Write `/bugs/[bugId]`: title, family chip, language, project card, description, symptoms, "Suspected root cause (hypothesis)", a separate "Fix summary" section, buggy and fixed snippets, each with an Illustrative_Label.
    - Related bugs list: other bug's title and project, status badge with provenance badge, link to the relationship. Cross-project entries first. Empty message, back link built from `?from=`, not-found for unknown ids.
    - _Requirements: R2.3 to R2.5, R2.9, R4.1 to R4.9, R10.3_

- [ ] 8. Relationship Detail view
  - [ ] 8.1 Status ledger and explanation
    - Write `/relationships/[relationshipId]` header with both bugs (title, project, link), `StatusLedger` with separate labelled items for Status, Review, Provenance and Baseline, and the explanation presented as a hypothesis while unreviewed. Add `NegativeExampleCard` content for the negative example.
    - _Requirements: R5.1 to R5.3, R5.7, R5.10, R17.1_
  - [ ] 8.2 Evidence bench
    - Write `EvidenceBench` with the 2x2 grid (columns: Bug A, Bug B; rows: buggy, fixed), column headers with the suspected root cause and the fix summary as separate items, `SnippetPanel` with focusable scrollable regions labelled "{Bug title}, buggy code".
    - Write `EvidenceList`: selecting an item highlights its line ranges in all referenced panels and scrolls them into view. This functional highlighting is P0. Only the animated connector, glow and advanced hover effects are P1.
    - _Requirements: R5.4 to R5.6, R5.11, R10.4, R14.12_
  - [ ] 8.3 Review bench
    - Accept ("Accept as reviewer judgment"), Reject and Reset controls with the helper text "Records your judgment. Does not verify the evidence." Show decision and timestamp, keep the illustrative label and provenance badge visible after Accept, announce the result through the live region, replace on repeat decisions.
    - _Requirements: R6.1 to R6.7, R6.12, R10.7, R17.3 to R17.6_
  - [ ] 8.4 Review flow test
    - Component or logic-level test of accept, reject, replace, reset and refresh persistence through the providers with the fake storage.
    - If this needs `@testing-library/react` and `jsdom`, add them here and record the reason.
    - _Requirements: R6.4, R6.5, R7.3_

  - [ ] 8.5 End-to-end journey test
    - Add Playwright as a dev dependency (reason: a real browser is needed to cover the canvas, URL state and localStorage together). Add the e2e script and a Playwright config that starts the dev server.
    - One journey test: open the graph, activate a relationship from the graph, open the relationship detail, select an evidence item and assert that the referenced lines are highlighted in both bugs, Accept, return to the graph and assert the edge shows the accepted state, reload the page, and assert the decision persists on the graph and on the relationship page. Repeat the decision step with Reject on a second relationship.
    - Add a second short test: apply a search filter, open a detail page, press back, assert the filter and URL are restored and that bugs outside the filter are not listed or clickable.
    - _Requirements: R2.1 to R2.7, R5.6, R6.2 to R6.4, R7.2, R7.3, R3.14, R3.15, R16.1_

- [ ] 9. Checkpoint: P0 complete
  - Run `typecheck`, `test`, `e2e` and `build`. All must pass with no strict-mode errors.
  - Walk through in a browser: open the graph, filter, open a bug, open `rel-01` and `rel-10`, accept and reject, refresh, clear all decisions.
  - Confirm every P0 criterion in the priority table is met, and list any gaps before starting P1. Ask the owner if something is unclear.
  - _Requirements: R16.5_

## Tier P1: Polish

- [ ] 10. Visual ambition
  - [ ] 10.1 Evidence connector
    - Write `ConnectorOverlay`: an SVG ribbon between the highlighted ranges in Bug A and Bug B panels, positioned from line element rectangles, updated by `ResizeObserver`, scroll and `requestAnimationFrame`, decorative (`aria-hidden`), not rendered when panels are stacked.
    - _Requirements: R12.12_
  - [ ] 10.2 Graph depth
    - Edge glow through underlays that differ by status, hover card for nodes and edges (also shown when a list entry gains focus), selection spotlight that fades unrelated nodes and edges without moving the Viewport.
    - _Requirements: R1.6, R1.7, R1.13, R12.4_
  - [ ] 10.3 Motion and remaining visual rules
    - Transitions of 150 to 400 ms for hover, focus, status change and view change. Confirm no decorative Halloween imagery.
    - _Requirements: R12.6, R12.9_

- [ ] 11. Navigation state and layout behavior
  - [ ] 11.1 Viewport and selection restore
    - Add the in-memory `NavStateStore`. Save the Viewport and selected bug id when leaving the graph, restore them on return and skip the initial fit.
    - _Requirements: R2.8_
  - [ ] 11.2 Fit to results and collapsible filters
    - Add the "Fit to results" control shown when no visible bug is inside the Viewport (`isViewportEmpty`). Make the filter panel collapsible below 1024 px, and confirm opening or closing it keeps the Viewport.
    - _Requirements: R3.11, R13.3, R13.7, R18.6_
  - [ ] 11.3 Responsive refinements
    - Single-column bug detail below 768 px, stacked comparison panels below 768 px, pinch zoom and drag pan on the canvas.
    - _Requirements: R5.8, R13.4, R13.6_

- [ ] 12. Robustness basics and property-based tests
  - [ ] 12.1 Storage notices, loading and errors
    - Write `StorageNotice` for corrupt, partially recovered (with the dropped count), unavailable and not-persisted conditions, dismissible, with the views still usable. Loading skeletons and retry states are in all three views. Zero-bug empty state, unknown-family display, 404 handling.
    - _Requirements: R8.7, R8.8, R11.10, R11.11, R15.1, R15.3, R15.5_
  - [ ] 12.2 Property-based tests: status and storage
    - With `fast-check`: derivation, apply-then-reset round trip, idempotence, provenance independence, serialization round trip, partition of kept and dropped records, record isolation, envelope failure.
    - _Requirements: R6.10, R6.11, R7.6, R8.10, R16.2_
  - [ ] 12.3 Property-based tests: filters, query, layout, graph
    - Status filter does not hide bugs, edge visibility, isolated count, monotonicity, clear, query round trip and robustness, layout determinism, viewport invariance and hull stability on headless Cytoscape.
    - _Requirements: R3.5 to R3.10, R3.16, R16.2, R16.8, R18.3, R18.5, R18.7_
  - [ ] 12.4 Accessibility pass
    - Visible focus indicator on every focusable element, text contrast check against the tokens, text-or-pattern encoding for status and family, accessible names on all controls, nodes, edges and panels.
    - _Requirements: R14.2, R14.6, R14.7, R14.9_

- [ ] 13. Checkpoint: P1 complete
  - Run `typecheck`, `test` and `build`. Re-walk the demo flow including a refresh at a filtered graph, back from a detail page, and a refresh of a detail page followed by "Back to Atlas".
  - Verify compound family hulls in a browser: bugs clickable, cross-project edges visible, no clutter, no hull jitter while filtering. Report problems and propose using `USE_FAMILY_HULLS` as the fallback if needed.
  - Review gaps against the P1 column of the priority table.

## Tier P2: Robustness and refinement

- [ ] 14. Refinement
  - [ ] 14.1 Reduced motion
    - Disable decorative animation and cap transitions at 100 ms under `prefers-reduced-motion: reduce`.
    - _Requirements: R12.7_
  - [ ] 14.2 Touch targets and wide screens
    - Audit Accept, Reject, Reset and filter controls for 44 by 44 px targets. Check all views from 360 px to 2560 px for horizontal scrolling.
    - _Requirements: R13.1, R13.5_
  - [ ] 14.3 Keyboard and announcement refinements
    - Confirm skip link on every view, announce filter result counts through the live region, confirm panels are keyboard-scrollable.
    - _Requirements: R14.3, R14.11, R14.12_
  - [ ] 14.4 Graph initialization failure
    - Show an error and the `GraphList` if Cytoscape fails to initialize. Add a test that forces the failure.
    - _Requirements: R15.4_
  - [ ] 14.5 Viewport resize invariance in a real browser
    - Manually resize the window and toggle the filter panel while zoomed and panned, and confirm the Viewport is unchanged.
    - _Requirements: R18.7_
  - [ ] 14.6 Unknown stored records
    - Test that unknown relationship ids in storage are ignored for statuses and kept in storage.
    - _Requirements: R7.7_

- [ ] 15. Documentation and final checkpoint
  - [ ] 15.1 README and docs
    - README with setup and run steps, a statement that all data is invented and illustrative, a "Pre-existing work" section that says the concept and `GOAL.md` exist outside the application code and that their origin and dates are unverified (no claim either way until the owner confirms), and a "Future work" note naming Variant Hunter as not built.
    - Add `docs/architecture.md` from `design.md` and finish `docs/kiro-usage.md`.
    - _Requirements: none (project rules in `tech.md` and `product.md`)_
  - [ ] 15.2 Final checkpoint
    - Run `typecheck`, `test` and `build`. Confirm every requirement in the priority table is met or listed as a known gap. Confirm no code, folder or text refers to real dataset work, an importer, LLM calls or Variant Hunter beyond the future-work note.

## Notes

- Property-based tests are written in tier P1 even though the logic they cover is built in P0. P0 modules ship with unit tests.
- The public demo on Railway is a separate spec, after the Atlas is functional and tested.
- Task 3.2 and 3.3 are authoring work. The validation test checks structure and wording rules, not whether the fix reasoning is sound. The owner reviews the mock content.
