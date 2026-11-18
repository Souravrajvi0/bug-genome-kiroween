/**
 * Domain types for the Genome Atlas.
 * Pure TypeScript. No React, Cytoscape or browser APIs.
 */

export const RELATIONSHIP_STATUSES = ['evidence-backed', 'plausible', 'rejected'] as const;
export type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number];

/** Who judged. Derived only from the stored Review_Decision. */
export type ReviewState = 'unreviewed' | 'accepted' | 'rejected';

/**
 * Where the evidence came from. Derived only from the data source.
 * `illustrative` means invented and not verified. Review decisions never change it.
 * Widen this union when a real data source exists.
 */
export type EvidenceProvenance = 'illustrative';

export const LANGUAGES = ['JavaScript', 'TypeScript'] as const;
export type Language = (typeof LANGUAGES)[number];

export type SnippetKind = 'buggy' | 'fixed';

export interface Project {
  id: string;
  name: string;
  type: string;
  description: string;
}

export interface Family {
  id: string;
  name: string;
  summary: string;
  /** Hex color used for the hull and node accents. */
  color: string;
  /** One letter, shown as a non-color cue. */
  glyph: string;
}

export interface Snippet {
  lines: readonly string[];
  /** Displayed number of the first line. */
  startLine: number;
}

export interface Bug {
  id: string;
  title: string;
  description: string;
  symptoms: readonly string[];
  /** Always rendered as a hypothesis. */
  suspectedRootCause: string;
  /** What changed in the fix and why it addresses the suspected root cause. */
  fixSummary: string;
  familyId: string;
  language: Language;
  project: Project;
  buggy: Snippet;
  fixed: Snippet;
  /** Drives every Illustrative_Label. */
  isMock: true;
}

export interface EvidenceRef {
  bugId: string;
  snippet: SnippetKind;
  /** Displayed line numbers, inclusive. */
  fromLine: number;
  toLine: number;
}

export interface EvidenceItem {
  id: string;
  statement: string;
  refs: readonly EvidenceRef[];
  provenance: EvidenceProvenance;
}

export interface Relationship {
  id: string;
  bugAId: string;
  bugBId: string;
  explanation: string;
  baselineStatus: RelationshipStatus;
  evidence: readonly EvidenceItem[];
  evidenceProvenance: EvidenceProvenance;
  /** Set only for a Negative_Example. */
  negative?: { rootCauseA: string; rootCauseB: string };
  isMock: true;
}

export type DecisionKind = 'accept' | 'reject';

/** A stored reviewer action. It deliberately has no provenance field. */
export interface ReviewDecision {
  relationshipId: string;
  decision: DecisionKind;
  /** ISO 8601 date-time. */
  decidedAt: string;
}

export interface Criteria {
  search: string;
  families: readonly string[];
  languages: readonly Language[];
  statuses: readonly RelationshipStatus[];
}

export const EMPTY_CRITERIA: Criteria = { search: '', families: [], languages: [], statuses: [] };

export interface AtlasData {
  families: readonly Family[];
  bugs: readonly Bug[];
  relationships: readonly Relationship[];
}