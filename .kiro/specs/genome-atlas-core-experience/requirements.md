# Requirements Document

## Introduction

Bug Genome finds historical bugs from unrelated projects that share a root cause or failure mechanism, and shows the code evidence behind each relationship. This spec covers the Genome Atlas (Version A) interface and interaction foundation: three views (Atlas Graph, Bug Detail, Relationship Detail), reviewer Accept/Reject decisions persisted in browser localStorage, and a set of invented, clearly labelled illustrative mock data.

The central idea the interface must make visible is cross-project discovery: bugs from unrelated projects that share a failure mechanism. The mock data, the graph and the relationship comparison are all built to show this.

The application is built with TypeScript, Next.js and Cytoscape.js. The UI reads bug and relationship data through a Data_Source interface and reads and writes review decisions through a Review_Store interface, so real datasets, LLM processing and SQLite can replace the mock implementations later without rewriting the UI.

A reviewer decision and the provenance of the evidence are separate things. Accepting a relationship records the Reviewer's judgment. It never changes where the evidence came from or whether it was independently verified.

Out of scope: real dataset research, ingestion, importer, final data model, LLM fingerprint extraction, embeddings, SQLite, authentication, multi-user review and Variant Hunter. These belong to separate future specs.

## Glossary

- **Atlas**: The Genome Atlas web application described in this document.
- **Atlas_Graph**: The main view that renders bugs as nodes and relationships as edges, with search and filters.
- **Bug_Detail_View**: The view showing the description, symptoms, suspected root cause, project information and code snippets of one bug.
- **Relationship_Detail_View**: The view showing the comparison, evidence, explanation, status and review controls of one relationship between two bugs.
- **Bug**: A mock record of a historical bug, with description, symptoms, suspected root cause, project information, a buggy snippet and a fixed snippet.
- **Family**: A named group of Bugs that share a suspected root cause or failure mechanism.
- **Relationship**: A proposed link between two Bugs, with an explanation, evidence items, an Evidence_Provenance and a status.
- **Cross_Project_Relationship**: A Relationship whose two Bugs belong to different projects.
- **Relationship_Status**: One of `evidence-backed`, `plausible` or `rejected`. It describes the current judgment about the relationship.
- **Fix_Summary**: A short text on a Bug that states what changed in the fix and why that change addresses the suspected root cause. It is separate from the suspected root cause and from the code snippets. In the Mock_Dataset it is invented.
- **Atlas_Query**: The part of the Atlas_Graph URL query string that stores the search text and filter selections.
- **Baseline_Status**: The Relationship_Status stored in the mock data before any reviewer decision.
- **Effective_Status**: The Relationship_Status shown in the UI, derived from the Baseline_Status and the stored Review_Decision.
- **Review_Decision**: A reviewer's Accept or Reject action on one Relationship, stored with a timestamp.
- **Review_State**: One of `unreviewed`, `accepted` or `rejected`, derived only from the presence and kind of a Review_Decision. It records who judged, not what the evidence is.
- **Evidence_Provenance**: A property of a Relationship's evidence that states where the evidence came from and whether it has been independently verified. In this spec every value is `illustrative`, meaning invented and not verified. Review decisions never change it.
- **Provenance_Badge**: A visible marker that shows the Evidence_Provenance next to a status.
- **Accept**: The review action that sets a Relationship's Effective_Status to `evidence-backed` and its Review_State to `accepted`.
- **Reject**: The review action that sets a Relationship's Effective_Status to `rejected` and its Review_State to `rejected`.
- **Negative_Example**: A Cross_Project_Relationship between two Bugs that look similar but have different root causes, with a Baseline_Status of `rejected`.
- **Mock_Dataset**: The set of invented Bugs, Families and Relationships bundled with the Atlas.
- **Illustrative_Label**: A visible marker stating that an item is invented and is not real historical evidence.
- **Data_Source**: The interface through which the UI reads Bugs, Families and Relationships.
- **Review_Store**: The interface through which the UI reads and writes Review_Decisions.
- **Local_Review_Store**: The Review_Store implementation backed by browser localStorage.
- **Code_Comparison**: A side-by-side display of a buggy snippet and a fixed snippet.
- **Node_Criteria**: The search text, Family filter and language filter. They decide which Bugs are visible.
- **Edge_Criteria**: The Relationship_Status filter. It decides which Relationships are visible, among those whose two Bugs are visible.
- **Visible_Bug**: A Bug that satisfies all Node_Criteria.
- **Visible_Relationship**: A Relationship whose two Bugs are Visible_Bugs and whose Effective_Status satisfies the Edge_Criteria.
- **Isolated_Bug**: A Visible_Bug that has no Visible_Relationship.
- **Viewport**: The zoom level and pan position of the graph canvas.
- **Reviewer**: The person using the Atlas to inspect and decide on Relationships.

## Requirements

### Requirement 1: Atlas Graph as the main view

**User Story:** As a Reviewer, I want a graph dashboard of bug families and connections, so that I can see the overall structure of related bugs at a glance, and see which connections cross project boundaries.

#### Acceptance Criteria

1. WHEN the Reviewer opens the root route, THE Atlas SHALL display the Atlas_Graph as the default view.
2. THE Atlas_Graph SHALL render each Bug in the Mock_Dataset as a node.
3. THE Atlas_Graph SHALL render each Relationship in the Mock_Dataset as an edge between its two Bug nodes.
4. THE Atlas_Graph SHALL render the Family membership of each node using a distinct color and a text label in a legend.
5. THE Atlas_Graph SHALL render each edge with a visual style that differs for each Effective_Status, and SHALL include a legend that maps each style to its Effective_Status name.
6. WHEN the Reviewer hovers over or focuses a node, THE Atlas_Graph SHALL display the Bug title, Family name and project name.
7. WHEN the Reviewer hovers over or focuses an edge, THE Atlas_Graph SHALL display the two Bug titles, the Effective_Status and whether the edge is a Cross_Project_Relationship.
8. THE Atlas_Graph SHALL display the counts defined in Requirement 3 for the Bugs, Families and Relationships currently visible.
9. THE Atlas_Graph SHALL allow the Reviewer to zoom and pan the graph canvas.
10. WHEN the Reviewer activates a fit control, THE Atlas_Graph SHALL fit all Visible_Bugs within the canvas.
11. THE Atlas_Graph SHALL show the project of each node through a visible text or shape marker, so that the project boundary of every edge can be seen.
12. THE Atlas_Graph SHALL mark each Cross_Project_Relationship edge with a style or marker that is distinct from a same-project edge, and SHALL include that marker in the legend.
13. WHEN the Reviewer selects a node, THE Atlas_Graph SHALL emphasize the selected node and its Visible_Relationships and de-emphasize all other nodes and edges, without changing the Viewport.

### Requirement 2: Navigation from the graph to detail views

**User Story:** As a Reviewer, I want to open the details of nodes and edges, so that I can move from overview to evidence quickly.

#### Acceptance Criteria

1. WHEN the Reviewer activates a node, THE Atlas SHALL navigate to the Bug_Detail_View of that Bug.
2. WHEN the Reviewer activates an edge, THE Atlas SHALL navigate to the Relationship_Detail_View of that Relationship.
3. THE Atlas SHALL assign each Bug_Detail_View and Relationship_Detail_View a unique URL that contains the identifier of the Bug or Relationship.
4. WHEN the Reviewer opens a Bug_Detail_View or Relationship_Detail_View URL directly, THE Atlas SHALL display that view without requiring prior navigation through the Atlas_Graph.
5. IF the identifier in a detail view URL does not match any Bug or Relationship, THEN THE Atlas SHALL display a not-found message with a link back to the Atlas_Graph.
6. WHEN the Reviewer uses the browser back control from a detail view, THE Atlas SHALL return to the previous view.
7. WHEN the Reviewer returns to the Atlas_Graph from a detail view, THE Atlas SHALL restore the search text and filter selections that were active when the Reviewer left the Atlas_Graph.
8. WHEN the Reviewer returns to the Atlas_Graph from a detail view during the same browser session, THE Atlas SHALL restore the Viewport and the selected node that were active when the Reviewer left the Atlas_Graph.
9. THE Atlas SHALL provide the link back to the Atlas_Graph on each detail view such that it opens the Atlas_Graph with the Atlas_Query that was active when the Reviewer opened the detail view, including after a page refresh of the detail view.

### Requirement 3: Search and filters on the Atlas Graph

**User Story:** As a Reviewer, I want to search and filter the graph, so that I can focus on specific bugs, families or relationship states, and understand exactly what is shown.

#### Acceptance Criteria

1. WHEN the Reviewer enters search text, THE Atlas_Graph SHALL treat as satisfying the search only those Bugs whose title, description, symptoms, suspected root cause, project name or Family name contains the text, ignoring letter case.
2. THE Atlas_Graph SHALL provide a Family filter that lists each Family and allows one or more Families to be selected.
3. THE Atlas_Graph SHALL provide a Relationship_Status filter that lists `evidence-backed`, `plausible` and `rejected` and allows one or more to be selected.
4. THE Atlas_Graph SHALL provide a language filter that lists `JavaScript` and `TypeScript` and allows one or more to be selected.
5. WITHIN one filter, THE Atlas_Graph SHALL combine multiple selected values with OR. ACROSS search text, Family filter and language filter, THE Atlas_Graph SHALL combine active criteria with AND. A filter with no selected value SHALL be inactive.
6. THE Atlas_Graph SHALL decide node visibility only from the Node_Criteria. The Relationship_Status filter SHALL NOT hide any Bug.
7. THE Atlas_Graph SHALL show a Relationship only when both of its Bugs are Visible_Bugs and its Effective_Status satisfies the Edge_Criteria. WHEN a Bug is hidden by the Node_Criteria, THE Atlas_Graph SHALL hide every edge connected to that Bug.
8. WHEN the Relationship_Status filter hides all Relationships of a Visible_Bug, THE Atlas_Graph SHALL keep that Bug visible as an Isolated_Bug, rendered de-emphasized with an accessible text alternative that states it has no matching relationships.
9. THE Atlas_Graph SHALL display these counts, each as visible value of total: Bugs (Visible_Bugs of all Bugs), Relationships (Visible_Relationships of all Relationships), Families (distinct Families among Visible_Bugs of all Families) and Isolated_Bugs (number of Isolated_Bugs, shown only while at least one exists).
10. WHEN the Reviewer activates a clear control, THE Atlas_Graph SHALL remove all search text and filter selections and show the full Mock_Dataset.
11. WHEN the Reviewer changes search text or a filter, THE Atlas_Graph SHALL update the visible nodes, edges and counts within 300 ms.
12. IF no Bug satisfies the Node_Criteria, THEN THE Atlas_Graph SHALL display a no-results message that names the active criteria and offers the clear control.
13. WHEN the Reviewer changes search text or a filter, THE Atlas_Graph SHALL show and hide nodes and edges without moving the remaining nodes (see Requirement 18).
14. THE Atlas_Graph SHALL read its search text and filter selections from the Atlas_Query, so that the URL is the single source of truth for them. WHEN the Reviewer refreshes the page, or navigates with the browser back or forward control to an Atlas_Graph entry, THE Atlas_Graph SHALL show the criteria stored in that entry's Atlas_Query.
15. WHEN the Reviewer changes search text or a filter, THE Atlas SHALL update the Atlas_Query by replacing the current history entry, and SHALL NOT add a history entry. WHEN the Reviewer types search text, THE Atlas SHALL update the Atlas_Query no more often than once per 300 ms of typing pause.
16. THE Atlas SHALL ignore any Atlas_Query parameter that is unknown or has an invalid value, and SHALL NOT report an error for it. THE Atlas SHALL keep the Viewport out of the Atlas_Query.

### Requirement 4: Bug Detail view

**User Story:** As a Reviewer, I want to read the details of a single bug, so that I can understand its failure and fix before judging relationships.

#### Acceptance Criteria

1. THE Bug_Detail_View SHALL display the Bug title, description, symptoms, suspected root cause, Fix_Summary, Family name, language and project information.
2. THE Bug_Detail_View SHALL display the project information as a project name, a project type and a short project description.
3. THE Bug_Detail_View SHALL display the buggy snippet and the fixed snippet of the Bug, each with a label and a syntax-highlighted, monospaced rendering.
4. THE Bug_Detail_View SHALL display the suspected root cause as a hypothesis and not as a verified fact.
5. THE Bug_Detail_View SHALL list every Relationship that involves the Bug, with the other Bug's title, the other Bug's project, the Effective_Status with its Provenance_Badge and a link to the Relationship_Detail_View.
6. WHEN the Bug has no Relationships, THE Bug_Detail_View SHALL display a message stating that no relationships are proposed for the Bug.
7. THE Bug_Detail_View SHALL provide a link back to the Atlas_Graph.
8. WHEN the Reviewer activates a related-Bug link, THE Atlas SHALL navigate to the Bug_Detail_View of that Bug.
9. THE Bug_Detail_View SHALL display the Fix_Summary in a section separate from the suspected root cause and from the code snippets, with an Illustrative_Label.

### Requirement 5: Relationship Detail view

**User Story:** As a Reviewer, I want to inspect why two bugs may share a root cause, so that I can judge the relationship from code evidence.

#### Acceptance Criteria

1. THE Relationship_Detail_View SHALL display the titles and projects of both Bugs, each Bug with a link to its Bug_Detail_View.
2. THE Relationship_Detail_View SHALL display the Effective_Status, the Baseline_Status, the Review_State and the Provenance_Badge of the Relationship as separate, labelled items.
3. THE Relationship_Detail_View SHALL display the relationship explanation, stating why the two Bugs may share a root cause or why they do not.
4. THE Relationship_Detail_View SHALL display a Code_Comparison that places the buggy snippet and fixed snippet of the first Bug beside the buggy snippet and fixed snippet of the second Bug.
5. THE Relationship_Detail_View SHALL display a list of supporting evidence items, each with a text statement, a reference to the snippet and line range it concerns, and the Evidence_Provenance.
6. WHEN the Reviewer selects an evidence item, THE Relationship_Detail_View SHALL highlight the referenced line range in the Code_Comparison.
7. WHILE the Review_State is `unreviewed`, THE Relationship_Detail_View SHALL present the explanation and status as a hypothesis.
8. WHILE the viewport width is below 768 px, THE Relationship_Detail_View SHALL stack the Code_Comparison panels vertically.
9. THE Relationship_Detail_View SHALL provide a link back to the Atlas_Graph.
10. WHERE the Relationship is a Negative_Example, THE Relationship_Detail_View SHALL show a distinct "different root causes" treatment that names the root cause of each Bug beside the explanation.
11. THE Relationship_Detail_View SHALL display the Fix_Summary of each Bug in the Code_Comparison column header, separate from the suspected root cause.

### Requirement 6: Accept and Reject review controls

**User Story:** As a Reviewer, I want to accept or reject a relationship, so that my judgment is recorded and reflected across the Atlas.

#### Acceptance Criteria

1. THE Relationship_Detail_View SHALL provide an Accept control and a Reject control.
2. WHEN the Reviewer activates the Accept control, THE Atlas SHALL store a Review_Decision of Accept for the Relationship through the Review_Store, set its Effective_Status to `evidence-backed` and set its Review_State to `accepted`.
3. WHEN the Reviewer activates the Reject control, THE Atlas SHALL store a Review_Decision of Reject for the Relationship through the Review_Store, set its Effective_Status to `rejected` and set its Review_State to `rejected`.
4. WHEN a Review_Decision is stored, THE Atlas SHALL update the status shown in the Relationship_Detail_View, the Bug_Detail_View and the Atlas_Graph without a page reload.
5. WHEN the Reviewer activates a decision control for a Relationship that already has a Review_Decision, THE Atlas SHALL replace the previous Review_Decision with the new one.
6. WHERE a Review_Decision exists for a Relationship, THE Relationship_Detail_View SHALL provide a reset control that removes the Review_Decision, restores the Baseline_Status and sets the Review_State to `unreviewed`.
7. WHERE a Review_Decision exists for a Relationship, THE Relationship_Detail_View SHALL display the decision and its timestamp.
8. WHEN a Review_Decision is stored or reset, THE Atlas SHALL announce the resulting Effective_Status and Review_State to assistive technology through a live region.
9. THE Atlas SHALL derive the Effective_Status of a Relationship as the status implied by the Review_Decision when one exists, and the Baseline_Status otherwise.
10. FOR ALL Relationships, applying a Review_Decision and then resetting it SHALL restore the Baseline_Status and the `unreviewed` Review_State (round-trip property).
11. FOR ALL Relationships and decisions, applying the same Review_Decision twice SHALL produce the same Effective_Status and Review_State as applying it once (idempotence property).
12. THE Atlas SHALL NOT include the Evidence_Provenance in a Review_Decision, and no review action SHALL change the Evidence_Provenance of a Relationship or of its evidence items.

### Requirement 7: Persistence of review decisions

**User Story:** As a Reviewer, I want my decisions to survive page refreshes, so that I do not lose my review work.

#### Acceptance Criteria

1. THE Local_Review_Store SHALL persist Review_Decisions in browser localStorage under a single namespaced key, and SHALL store a schema version inside the stored value.
2. WHEN the Atlas loads, THE Atlas SHALL read stored Review_Decisions through the Review_Store and apply them to the Effective_Status and Review_State of each Relationship.
3. WHEN the Reviewer refreshes the page, THE Atlas SHALL display the same Effective_Status and Review_State for every Relationship as before the refresh.
4. THE Atlas SHALL access localStorage only through the Local_Review_Store, and no UI component SHALL call localStorage directly.
5. THE Review_Store SHALL expose operations to list decisions, get a decision by Relationship identifier, save a decision, remove a decision and clear all decisions.
6. FOR ALL valid sets of Review_Decisions, serializing them to the stored format and parsing the result SHALL produce an equivalent set (round-trip property).
7. WHEN a stored Review_Decision refers to a Relationship identifier that is not in the Mock_Dataset, THE Local_Review_Store SHALL ignore that Review_Decision when computing Effective_Status values and SHALL keep the record in storage.
8. THE Atlas SHALL provide a control that clears all stored Review_Decisions after the Reviewer confirms the action.

### Requirement 8: Storage error handling

**User Story:** As a Reviewer, I want the Atlas to keep working when browser storage is corrupt or unavailable, and to keep the decisions that are still valid, so that I do not lose review work because of one bad record.

The Local_Review_Store validates the stored value in two levels. The envelope is the overall structure: parseable JSON, an object, a supported schema version and a decisions map. A record is one entry of the decisions map.

#### Acceptance Criteria

1. IF the stored value cannot be parsed as JSON, or is not an object, or has an unsupported schema version, or has no decisions map of the expected shape, THEN THE Local_Review_Store SHALL treat the envelope as invalid, use an empty set of decisions and report a corrupt-data condition to the UI.
2. WHEN the envelope is invalid, THE Local_Review_Store SHALL NOT modify or delete the stored value on read. The next successful save SHALL overwrite it.
3. IF the envelope is valid and one or more records fail validation, THEN THE Local_Review_Store SHALL keep every valid record, drop only the invalid records and report a partially-recovered condition that includes the number of dropped records.
4. A record SHALL be valid only when its key equals its Relationship identifier, its decision is `accept` or `reject` and its timestamp is a valid ISO 8601 date-time string.
5. IF localStorage is unavailable or throws an error on read, THEN THE Local_Review_Store SHALL treat the set of decisions as empty and report an unavailable-storage condition to the UI.
6. IF localStorage throws an error on write, including a quota error, THEN THE Local_Review_Store SHALL keep the decision in memory for the current session and report a not-persisted condition to the UI.
7. WHEN the Local_Review_Store reports a corrupt-data, partially-recovered, unavailable-storage or not-persisted condition, THE Atlas SHALL display a visible, dismissible notice that states the condition and that decisions may not survive a refresh.
8. WHEN an error condition is reported, THE Atlas SHALL keep the Atlas_Graph, Bug_Detail_View and Relationship_Detail_View usable.
9. THE Atlas SHALL write no localStorage content that contains data other than Review_Decisions and the schema version.
10. FOR ALL stored values whose envelope is valid, THE number of Review_Decisions kept plus the number dropped SHALL equal the number of records in the stored value (partition property).

### Requirement 9: Illustrative mock dataset

**User Story:** As a Reviewer, I want a realistic set of invented bugs that show cross-project discovery, so that I can evaluate the Atlas experience before real data exists.

#### Acceptance Criteria

1. THE Mock_Dataset SHALL contain between 10 and 12 Bugs.
2. THE Mock_Dataset SHALL contain between 3 and 4 Families.
3. THE Mock_Dataset SHALL contain only Bugs written in JavaScript or TypeScript.
4. THE Mock_Dataset SHALL give each Bug a description, a list of symptoms, a suspected root cause, a Fix_Summary, project information, a buggy snippet of at most 25 lines and a fixed snippet of at most 25 lines.
5. THE Mock_Dataset SHALL give each Relationship an explanation, at least one evidence item, a Baseline_Status and an Evidence_Provenance of `illustrative`.
6. THE Mock_Dataset SHALL include at least one Relationship with each of the Baseline_Status values `evidence-backed`, `plausible` and `rejected`.
7. THE Mock_Dataset SHALL include at least 8 Relationships, and at least 8 of them SHALL be Cross_Project_Relationships.
8. THE Mock_Dataset SHALL include Bugs from at least 4 distinct invented projects, and each Family SHALL contain Bugs from at least 3 distinct invented projects when it has 3 or more Bugs, or from 2 distinct invented projects otherwise.
9. EACH Family in the Mock_Dataset SHALL have at least 2 Cross_Project_Relationships among its own Bugs.
10. THE Mock_Dataset SHALL include at least one Negative_Example, and its explanation SHALL state the different root causes of the two Bugs. THE Negative_Example SHALL connect Bugs whose symptoms are similar enough that a reader could mistake them for one family.
11. THE Mock_Dataset SHALL give each Bug at least one Relationship.
12. THE Mock_Dataset SHALL use invented project names that do not name real repositories, organizations or people.
13. THE Mock_Dataset SHALL assign each Bug, Family, Relationship and evidence item a unique identifier.
14. THE Mock_Dataset SHALL reference only existing Bugs and existing snippet line ranges from each Relationship and evidence item.
15. THE Mock_Dataset SHALL NOT be presented as evidence that any particular real-world bug family exists.
16. THE Mock_Dataset SHALL give each Bug a Fix_Summary that is non-empty, states what changed and why the change addresses the suspected root cause, is not identical to the suspected root cause and is written as an invented illustration.

### Requirement 10: Illustrative labelling

**User Story:** As a Reviewer, I want every invented item marked as illustrative, so that I never mistake mock data for real historical evidence.

#### Acceptance Criteria

1. THE Atlas SHALL display a persistent Illustrative_Label on every view stating that all bugs, snippets and relationships are invented and not verified findings.
2. THE Atlas_Graph SHALL mark each node and each edge as illustrative through a visual marker and an accessible text alternative.
3. THE Bug_Detail_View SHALL display an Illustrative_Label adjacent to the Bug description, the Fix_Summary and each code snippet.
4. THE Relationship_Detail_View SHALL display an Illustrative_Label adjacent to the explanation, the evidence list and the Code_Comparison.
5. THE Atlas SHALL set a mock-data flag on each Bug and each Relationship in the Data_Source output, and SHALL derive every Illustrative_Label from that flag.
6. THE Atlas SHALL use the term "illustrative" and SHALL NOT use the terms "verified", "confirmed" or "real" to describe mock items, except in the explicit negation "not verified".
7. WHEN the Reviewer Accepts a mock Relationship, THE Relationship_Detail_View SHALL keep the Illustrative_Label and the Provenance_Badge visible.

### Requirement 11: Data-access interfaces and modularity

**User Story:** As a developer, I want data and review storage behind interfaces, so that real datasets and SQLite can replace the mock implementations without rewriting the UI.

#### Acceptance Criteria

1. THE Atlas SHALL read Bugs, Families and Relationships through the Data_Source interface.
2. THE Data_Source interface SHALL expose operations to list Families, list Bugs, get a Bug by identifier, list Relationships, get a Relationship by identifier and list Relationships for a Bug.
3. THE Atlas SHALL provide a mock implementation of the Data_Source interface that returns the Mock_Dataset.
4. THE Atlas SHALL read and write Review_Decisions through the Review_Store interface.
5. THE Atlas SHALL provide the Local_Review_Store as the implementation of the Review_Store interface.
6. THE Atlas SHALL define the Data_Source and Review_Store operations as asynchronous so that a network or database implementation can replace them.
7. THE Atlas SHALL contain the Effective_Status and Review_State derivation as pure functions in the domain module that have no dependency on React, Cytoscape.js or browser APIs.
8. THE Atlas SHALL contain no import of the mock implementation or the Local_Review_Store from UI components, and SHALL supply both through a single composition point.
9. THE Atlas SHALL define Bug, Family, Relationship, Relationship_Status, Review_State, Evidence_Provenance and Review_Decision as TypeScript types in the domain module, using strict mode.
10. WHEN the Data_Source operation fails, THE Atlas SHALL display an error message with a retry control in the affected view.
11. WHILE the Data_Source operation is pending, THE Atlas SHALL display a loading indicator in the affected view.

### Requirement 12: Visual design

**User Story:** As a Reviewer, I want a dark research-lab developer-tool look with an ambitious graph and evidence comparison, so that the Atlas feels like a credible bug intelligence product and is comfortable to read.

#### Acceptance Criteria

1. THE Atlas SHALL render all views with a dark background and a layered depth effect created with gradients or shadows.
2. THE Atlas SHALL use cyan and teal as primary accent colors and purple as a restrained secondary accent color.
3. THE Atlas SHALL render each Relationship_Status with a distinct color and a distinct line style, so that status is distinguishable without relying on color alone.
4. THE Atlas SHALL render edges with a glow effect that differs between Effective_Status values.
5. THE Atlas SHALL render code snippets in a monospaced font with syntax highlighting and line numbers.
6. THE Atlas SHALL use transitions of 150 ms to 400 ms for hover, focus, view navigation and status change effects.
7. WHILE the user has enabled a reduced-motion preference, THE Atlas SHALL disable decorative animations and transitions longer than 100 ms.
8. THE Atlas SHALL use a consistent typographic scale, with one sans-serif family for interface text and one monospaced family for code.
9. THE Atlas SHALL exclude Halloween decorations, cartoon Frankenstein imagery and visual effects that reduce text readability.
10. THE Atlas SHALL apply the same navigation header, color tokens and spacing tokens to all three views.
11. THE Atlas_Graph SHALL arrange nodes so that Bugs of the same Family sit near each other and Cross_Project_Relationships are visible as links between those clusters.
12. THE Code_Comparison SHALL connect the two Bugs visually, with the highlighted evidence line ranges of both Bugs emphasized at the same time and a visible link between them.

### Requirement 13: Responsive layout

**User Story:** As a Reviewer, I want the Atlas to work on different screen sizes, so that I can use it on a laptop, tablet or phone during a demo.

#### Acceptance Criteria

1. THE Atlas SHALL display all three views without horizontal page scrolling at viewport widths from 360 px to 2560 px.
2. WHILE the viewport width is 1024 px or greater, THE Atlas_Graph SHALL display the search and filter controls in a side panel beside the graph canvas.
3. WHILE the viewport width is below 1024 px, THE Atlas_Graph SHALL display the search and filter controls in a collapsible panel above the graph canvas.
4. WHILE the viewport width is below 768 px, THE Atlas SHALL display Bug_Detail_View sections in a single column.
5. THE Atlas SHALL provide touch targets of at least 44 by 44 CSS pixels for the Accept control, the Reject control, the reset control and the filter controls.
6. WHEN the Reviewer uses touch gestures on the graph canvas, THE Atlas_Graph SHALL support pinch zoom and drag pan.
7. WHEN the graph canvas changes size, including when the filter panel opens or closes, THE Atlas_Graph SHALL update the canvas dimensions and SHALL preserve the current Viewport, as defined in Requirement 18.

### Requirement 14: Accessibility and keyboard navigation

**User Story:** As a Reviewer who uses a keyboard or assistive technology, I want to use every Atlas feature without a mouse, so that the Atlas is accessible.

#### Acceptance Criteria

1. THE Atlas SHALL allow every interactive control in all three views to be reached and activated using the keyboard alone.
2. THE Atlas SHALL display a visible focus indicator with a contrast ratio of at least 3:1 against adjacent colors on every focusable element.
3. THE Atlas SHALL provide a skip link that moves focus to the main content of each view.
4. THE Atlas_Graph SHALL provide a keyboard-operable list of Bugs and Relationships that offers the same open-detail actions as activating nodes and edges.
5. WHEN the Reviewer presses Enter or Space on a node or edge entry in that list, THE Atlas SHALL navigate to the corresponding detail view.
6. THE Atlas SHALL meet a text contrast ratio of at least 4.5:1 for normal text and 3:1 for large text, in accordance with WCAG 2.2 level AA.
7. THE Atlas SHALL convey Relationship_Status and Family membership through text or pattern in addition to color.
8. THE Atlas SHALL use semantic landmarks and heading levels, with one main landmark and one level-one heading in each view.
9. THE Atlas SHALL provide an accessible name for every control, node, edge and code panel.
10. WHEN the view changes through navigation, THE Atlas SHALL move focus to the level-one heading of the new view and update the document title to name the view.
11. WHEN search or filter changes alter the visible results, THE Atlas SHALL announce the number of visible Bugs and Relationships through a live region.
12. THE Atlas SHALL keep each Code_Comparison panel keyboard-scrollable and labelled with the Bug title and snippet type.

### Requirement 15: Empty states and robustness of views

**User Story:** As a Reviewer, I want clear messages when there is nothing to show, so that I understand the state of the Atlas.

#### Acceptance Criteria

1. IF the Data_Source returns zero Bugs, THEN THE Atlas_Graph SHALL display an empty-state message that states that no bugs are loaded.
2. IF the active Edge_Criteria hide every Relationship but at least one Bug remains visible, THEN THE Atlas_Graph SHALL display a notice that no relationships match the active filters, while keeping the Isolated_Bugs visible.
3. IF a Bug references a Family that the Data_Source does not return, THEN THE Atlas SHALL display the Bug with the Family name "Unknown family".
4. IF the Atlas_Graph fails to initialize the graph canvas, THEN THE Atlas SHALL display an error message and the keyboard-operable list of Bugs and Relationships.
5. THE Atlas SHALL display a 404 page with a link back to the Atlas_Graph for any route that does not exist.

### Requirement 16: Quality and testability

**User Story:** As a developer, I want the core logic covered by tests, so that status logic and persistence stay correct as the Atlas grows.

#### Acceptance Criteria

1. THE Atlas SHALL include unit tests for the Effective_Status and Review_State derivation, the Local_Review_Store, the mock Data_Source and the search and filter logic.
2. THE Atlas SHALL include property-based tests for the round-trip serialization of Review_Decisions, the apply-then-reset round trip of Review_Decisions, the idempotence of applying the same Review_Decision and the partition property of Requirement 8.10.
3. THE Atlas SHALL include a Mock_Dataset validation test that checks the constraints in Requirement 9, including unique identifiers, valid references, cross-project counts, the presence of a Negative_Example and the Fix_Summary constraints.
4. THE Atlas SHALL include unit tests for the Local_Review_Store that simulate corrupt envelope, partially invalid records, unavailable storage and quota-exceeded storage.
5. THE Atlas SHALL pass TypeScript strict-mode compilation with no type errors.
6. THE Atlas SHALL provide the Local_Review_Store tests with an injected storage dependency, so that tests run without a real browser.
7. THE Atlas SHALL include unit tests for the filter counts that cover a status filter that leaves Isolated_Bugs and a Node_Criteria filter that hides Bugs.
8. THE Atlas SHALL include unit tests for Atlas_Query parsing and serialization, including unknown and invalid parameters, and a property-based test that parsing a serialized set of criteria returns an equivalent set.

### Requirement 17: Review decisions are separate from evidence provenance

**User Story:** As a Reviewer, I want accepting a relationship to record my judgment without claiming that the evidence is verified, so that the Atlas never presents illustrative data as proven.

#### Acceptance Criteria

1. THE Atlas SHALL model Review_State and Evidence_Provenance as separate fields, and SHALL display them as separate labelled items wherever a Relationship status is shown.
2. THE Atlas SHALL derive Evidence_Provenance only from the Data_Source output and SHALL derive Review_State only from the Review_Decision.
3. WHILE the Evidence_Provenance is `illustrative`, THE Atlas SHALL display the Provenance_Badge with the text "Illustrative, not verified" next to every Effective_Status, including after Accept.
4. THE Atlas SHALL label the Accept control "Accept as reviewer judgment" and SHALL label the resulting state "Accepted by reviewer", and SHALL NOT label it "verified" or "confirmed".
5. THE Atlas SHALL provide no control that sets or changes the Evidence_Provenance.
6. WHERE an Effective_Status of `evidence-backed` results from an Accept on an `illustrative` Relationship, THE Atlas SHALL display it as "Evidence-backed (illustrative)" in text and in the graph legend.
7. WHEN a future Data_Source supplies another Evidence_Provenance value, THE Atlas SHALL display that value in the Provenance_Badge without changes to the Review_Store.

### Requirement 18: Graph layout and Viewport stability

**User Story:** As a Reviewer, I want the graph to stay where I put it, so that resizing, filtering and reviewing do not make me lose my place.

#### Acceptance Criteria

1. THE Atlas_Graph SHALL fit all Visible_Bugs once when the graph first renders with a non-zero canvas size, and SHALL defer that initial fit until the canvas has a non-zero size.
2. WHEN the canvas changes size, THE Atlas_Graph SHALL update the canvas dimensions without changing the zoom level or the pan position.
3. WHEN the Reviewer changes a filter, changes search text, selects a node or stores a Review_Decision, THE Atlas_Graph SHALL NOT change the Viewport and SHALL NOT recompute node positions.
4. THE Atlas_Graph SHALL change the Viewport only on first render, on an explicit fit control activation, on a Reviewer zoom or pan gesture and on Viewport restoration under Requirement 2.8.
5. THE Atlas_Graph SHALL compute node positions deterministically from the Mock_Dataset, so that the same Mock_Dataset produces the same layout in every session.
6. WHEN the filter changes leave no Visible_Bug inside the current Viewport, THE Atlas_Graph SHALL show a "Fit to results" control, and SHALL NOT move the Viewport automatically.
7. FOR ALL sequences of canvas size changes, THE zoom level and pan position after the sequence SHALL equal those before it (invariance property).

## Delivery Priorities

Priority tiers decide build order. Finish every P0 item before starting P1, and every P1 item before starting P2. A tier is complete when its items work and are tested.

- **P0, MVP.** The complete core experience: explore the graph, open evidence, compare code, review, persist.
- **P1, Polish.** Visual ambition, depth and usability improvements that make the demo convincing.
- **P2, Robustness and refinement.** Edge-case handling, fine accessibility and extra testing that matter after the core works.

| Requirement | P0 (MVP) | P1 (Polish) | P2 (Robustness) |
| --- | --- | --- | --- |
| R1 Atlas Graph | 1.1 to 1.5, 1.8 to 1.12 | 1.6, 1.7, 1.13 | |
| R2 Navigation | 2.1 to 2.7, 2.9 | 2.8 | |
| R3 Search and filters | 3.1 to 3.10, 3.12, 3.14, 3.15 | 3.11, 3.13, 3.16 | |
| R4 Bug Detail | 4.1 to 4.9 | | |
| R5 Relationship Detail | 5.1 to 5.7, 5.9 | 5.8, 5.10, 5.11 | |
| R6 Review controls | 6.1 to 6.7, 6.9, 6.12 | 6.8, 6.10, 6.11 | |
| R7 Persistence | 7.1 to 7.5, 7.8 | 7.6 | 7.7 |
| R8 Storage errors | 8.1 to 8.4, 8.7, 8.8 | 8.5, 8.6, 8.9 | 8.10 |
| R9 Mock dataset | 9.1 to 9.16 | | |
| R10 Labelling | 10.1 to 10.7 | | |
| R11 Interfaces | 11.1 to 11.9 | 11.10, 11.11 | |
| R12 Visual design | 12.1 to 12.3, 12.5, 12.8, 12.10, 12.11 | 12.4, 12.6, 12.9, 12.12 | 12.7 |
| R13 Responsive | 13.1 to 13.3, 13.7 | 13.4, 13.6 | 13.5 |
| R14 Accessibility | 14.1, 14.4, 14.5, 14.8, 14.9 | 14.2, 14.6, 14.7, 14.10 | 14.3, 14.11, 14.12 |
| R15 Empty states | 15.2, 15.3 | 15.1, 15.5 | 15.4 |
| R16 Quality | 16.1, 16.3, 16.5, 16.6, 16.8 | 16.2, 16.4, 16.7 | |
| R17 Review vs provenance | 17.1 to 17.6 | | 17.7 |
| R18 Viewport stability | 18.1 to 18.5 | 18.6 | 18.7 |

Notes:
- Requirement 3.11 (300 ms) is P1 because filtering over about 12 nodes is naturally fast. It is verified, not engineered for.
- Requirement 12.12 (linked evidence ranges in the Code_Comparison) is P1 but is the first polish item to build, because it is the core of the demo.
- Requirement 13.5, the touch target sizes, is P2 for the MVP but must hold before any public demo.
