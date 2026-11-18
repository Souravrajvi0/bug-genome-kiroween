import type {
  Bug,
  EvidenceProvenance,
  Relationship,
  RelationshipStatus,
  ReviewDecision,
  ReviewState,
} from './types';

export interface DerivedRelationship {
  effectiveStatus: RelationshipStatus;
  reviewState: ReviewState;
  /** Always the relationship's own provenance. No decision can change it. */
  provenance: EvidenceProvenance;
}

/**
 * Derives what the UI shows for one relationship.
 * Accept implies `evidence-backed` (a reviewer judgment). Reject implies `rejected`.
 * Provenance is read only from the relationship.
 */
export function deriveRelationship(rel: Relationship, decision?: ReviewDecision | null): DerivedRelationship {
  if (decision?.decision === 'accept') {
    return { effectiveStatus: 'evidence-backed', reviewState: 'accepted', provenance: rel.evidenceProvenance };
  }
  if (decision?.decision === 'reject') {
    return { effectiveStatus: 'rejected', reviewState: 'rejected', provenance: rel.evidenceProvenance };
  }
  return { effectiveStatus: rel.baselineStatus, reviewState: 'unreviewed', provenance: rel.evidenceProvenance };
}

/** True when the two bugs belong to different projects. Derived, never stored. */
export function isCrossProject(rel: Relationship, bugsById: ReadonlyMap<string, Bug>): boolean {
  const a = bugsById.get(rel.bugAId);
  const b = bugsById.get(rel.bugBId);
  if (!a || !b) return false;
  return a.project.id !== b.project.id;
}

/** Text for a status. "(illustrative)" is added to the claim-bearing status when the evidence is invented. */
export function statusLabel(status: RelationshipStatus, provenance: EvidenceProvenance): string {
  if (status === 'evidence-backed') {
    return provenance === 'illustrative' ? 'Evidence-backed (illustrative)' : 'Evidence-backed';
  }
  return status === 'plausible' ? 'Plausible' : 'Rejected';
}

export function reviewStateLabel(state: ReviewState): string {
  switch (state) {
    case 'accepted':
      return 'Accepted by reviewer';
    case 'rejected':
      return 'Rejected by reviewer';
    default:
      return 'Unreviewed';
  }
}

export function provenanceLabel(provenance: EvidenceProvenance): string {
  return provenance === 'illustrative' ? 'Illustrative, not verified' : provenance;
}