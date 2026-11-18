import { describe, expect, it } from 'vitest';
import { MOCK_DATASET } from '@/lib/data-source/mock';
import { computeLayout } from '@/lib/domain/layout';

describe('computeLayout', () => {
  const { families, bugs } = MOCK_DATASET;

  it('is deterministic and independent of input order', () => {
    const a = computeLayout(families, bugs);
    const b = computeLayout([...families].reverse(), [...bugs].reverse());
    expect(b).toEqual(a);
    expect(computeLayout(families, bugs)).toEqual(a);
  });

  it('places every bug exactly once', () => {
    const { positions } = computeLayout(families, bugs);
    expect(Object.keys(positions).sort()).toEqual(bugs.map((b) => b.id).sort());
  });

  it('keeps bugs apart', () => {
    const { positions } = computeLayout(families, bugs);
    const pts = Object.values(positions);
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        expect(Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y)).toBeGreaterThan(60);
      }
    }
  });

  it('keeps each family near its center', () => {
    const { positions, centers } = computeLayout(families, bugs);
    for (const bug of bugs) {
      const c = centers[bug.familyId]!;
      const p = positions[bug.id]!;
      expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeLessThan(200);
    }
  });

  it('handles a bug whose family is unknown', () => {
    const odd = { ...bugs[0]!, id: 'bug-x', familyId: 'fam-missing' };
    const { positions } = computeLayout(families, [...bugs, odd]);
    expect(positions['bug-x']).toBeDefined();
  });

  it('handles an empty dataset', () => {
    expect(computeLayout([], [])).toEqual({ positions: {}, centers: {} });
  });
});