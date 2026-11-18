import { describe, expect, it } from 'vitest';
import { MOCK_DATASET } from '@/lib/data-source/mock';
import { deriveRelationship } from '@/lib/domain/status';
import { EMPTY_CRITERIA, type Criteria } from '@/lib/domain/types';
import { computeVisibility, describeCriteria, hasActiveCriteria } from '@/lib/domain/visibility';

const run = (criteria: Partial<Criteria>) =>
  computeVisibility({
    ...MOCK_DATASET,
    effectiveStatus: (id) => {
      const r = MOCK_DATASET.relationships.find((x) => x.id === id)!;
      return deriveRelationship(r).effectiveStatus;
    },
    criteria: { ...EMPTY_CRITERIA, ...criteria },
  });

describe('computeVisibility', () => {
  it('shows everything for empty criteria', () => {
    const v = run({});
    expect(v.counts.bugs).toEqual([12, 12]);
    expect(v.counts.relationships).toEqual([10, 10]);
    expect(v.counts.families).toEqual([4, 4]);
    expect(v.counts.isolated).toBe(0);
  });

  it('status filter hides only edges and leaves isolated bugs (worked example)', () => {
    const v = run({ statuses: ['rejected'] });
    expect(v.counts.bugs).toEqual([12, 12]);
    expect(v.counts.relationships).toEqual([1, 10]);
    expect(v.counts.families).toEqual([4, 4]);
    expect(v.counts.isolated).toBe(10);
    expect([...v.visibleRelationshipIds]).toEqual(['rel-10']);
    expect(v.isolatedBugIds.has('bug-01')).toBe(false);
    expect(v.isolatedBugIds.has('bug-10')).toBe(false);
  });

  it('family filter hides bugs and the edges that touch them (worked example)', () => {
    const v = run({ families: ['fam-dup'] });
    expect(v.counts.bugs).toEqual([3, 12]);
    expect(v.counts.relationships).toEqual([2, 10]);
    expect(v.counts.families).toEqual([1, 4]);
    expect(v.counts.isolated).toBe(0);
    expect(v.visibleRelationshipIds.has('rel-10')).toBe(false);
  });

  it('combines values inside one filter with OR and across filters with AND', () => {
    expect(run({ families: ['fam-dup', 'fam-stale'] }).counts.bugs[0]).toBe(6);
    expect(run({ families: ['fam-dup', 'fam-stale'], languages: ['JavaScript'] }).counts.bugs[0]).toBe(2);
  });

  it('search is case-insensitive over title, project and family name', () => {
    expect(run({ search: 'DOUBLE CLICK' }).visibleBugIds.has('bug-01')).toBe(true);
    expect(run({ search: 'pigeon queue' }).counts.bugs[0]).toBe(3);
    expect(run({ search: 'stale result' }).counts.bugs[0]).toBe(3);
  });

  it('treats whitespace-only search as inactive', () => {
    expect(run({ search: '   ' }).counts.bugs).toEqual([12, 12]);
  });

  it('returns no bugs and no relationships when nothing matches', () => {
    const v = run({ search: 'zzzz-no-match' });
    expect(v.counts.bugs[0]).toBe(0);
    expect(v.counts.relationships[0]).toBe(0);
    expect(v.counts.isolated).toBe(0);
  });

  it('status and node filters together: isolated bugs come from visible bugs only', () => {
    const v = run({ families: ['fam-dup'], statuses: ['plausible'] });
    expect(v.counts.bugs[0]).toBe(3);
    expect([...v.visibleRelationshipIds]).toEqual(['rel-02']);
    expect([...v.isolatedBugIds]).toEqual(['bug-02']);
  });
});

describe('criteria helpers', () => {
  it('detects active criteria', () => {
    expect(hasActiveCriteria(EMPTY_CRITERIA)).toBe(false);
    expect(hasActiveCriteria({ ...EMPTY_CRITERIA, search: 'x' })).toBe(true);
  });
  it('describes active criteria for the no-results message', () => {
    const d = describeCriteria({ ...EMPTY_CRITERIA, search: 'x', families: ['fam-dup'], statuses: ['plausible'] }, MOCK_DATASET.families);
    expect(d).toEqual(['search "x"', 'family: Duplicate execution without a guard', 'status: plausible']);
  });
});