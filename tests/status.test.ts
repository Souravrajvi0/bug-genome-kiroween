import { describe, expect, it } from 'vitest';
import { MOCK_DATASET } from '@/lib/data-source/mock';
import { deriveRelationship, isCrossProject, provenanceLabel, reviewStateLabel, statusLabel } from '@/lib/domain/status';
import type { ReviewDecision } from '@/lib/domain/types';

const rel = (id: string) => {
  const r = MOCK_DATASET.relationships.find((x) => x.id === id);
  if (!r) throw new Error('missing ' + id);
  return r;
};
const decision = (relationshipId: string, d: 'accept' | 'reject'): ReviewDecision => ({
  relationshipId,
  decision: d,
  decidedAt: '2026-01-05T10:00:00.000Z',
});

describe('deriveRelationship', () => {
  it('uses the baseline status when there is no decision', () => {
    const d = deriveRelationship(rel('rel-02'));
    expect(d).toEqual({ effectiveStatus: 'plausible', reviewState: 'unreviewed', provenance: 'illustrative' });
  });

  it('Accept gives evidence-backed and accepted', () => {
    const d = deriveRelationship(rel('rel-02'), decision('rel-02', 'accept'));
    expect(d.effectiveStatus).toBe('evidence-backed');
    expect(d.reviewState).toBe('accepted');
  });

  it('Reject gives rejected and rejected', () => {
    const d = deriveRelationship(rel('rel-01'), decision('rel-01', 'reject'));
    expect(d.effectiveStatus).toBe('rejected');
    expect(d.reviewState).toBe('rejected');
  });

  it('Accept on a baseline-rejected relationship gives evidence-backed', () => {
    expect(deriveRelationship(rel('rel-10'), decision('rel-10', 'accept')).effectiveStatus).toBe('evidence-backed');
  });

  it('never changes provenance', () => {
    for (const r of MOCK_DATASET.relationships) {
      for (const k of ['accept', 'reject'] as const) {
        expect(deriveRelationship(r, decision(r.id, k)).provenance).toBe(r.evidenceProvenance);
      }
    }
  });

  it('treats null like no decision', () => {
    expect(deriveRelationship(rel('rel-01'), null).reviewState).toBe('unreviewed');
  });
});

describe('labels', () => {
  it('marks evidence-backed as illustrative and keeps other labels plain', () => {
    expect(statusLabel('evidence-backed', 'illustrative')).toBe('Evidence-backed (illustrative)');
    expect(statusLabel('plausible', 'illustrative')).toBe('Plausible');
    expect(statusLabel('rejected', 'illustrative')).toBe('Rejected');
  });
  it('words review state and provenance without claiming verification', () => {
    expect(reviewStateLabel('accepted')).toBe('Accepted by reviewer');
    expect(reviewStateLabel('unreviewed')).toBe('Unreviewed');
    expect(provenanceLabel('illustrative')).toBe('Illustrative, not verified');
  });
});

describe('isCrossProject', () => {
  const byId = new Map(MOCK_DATASET.bugs.map((b) => [b.id, b]));
  it('is true for every mock relationship', () => {
    for (const r of MOCK_DATASET.relationships) expect(isCrossProject(r, byId)).toBe(true);
  });
  it('is false when a bug is missing', () => {
    expect(isCrossProject({ ...rel('rel-01'), bugAId: 'nope' }, byId)).toBe(false);
  });
});