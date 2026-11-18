import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { clusterShape, convexHull } from '@/components/graph/clusterGeometry';

describe('convexHull', () => {
  it('drops interior points', () => {
    const hull = convexHull([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 2, y: 2 },
    ]);
    expect(hull).toHaveLength(4);
    expect(hull).not.toContainEqual({ x: 2, y: 2 });
  });
});

describe('clusterShape', () => {
  it('returns null for no members', () => {
    expect(clusterShape([], 50)).toBeNull();
  });

  it('property: every member center lies inside the radius of the shape', () => {
    const pt = fc.record({ x: fc.integer({ min: -500, max: 500 }), y: fc.integer({ min: -500, max: 500 }) });
    fc.assert(
      fc.property(fc.array(pt, { minLength: 1, maxLength: 6 }), (centers) => {
        const s = clusterShape(centers, 60)!;
        for (const c of centers) {
          expect(Math.hypot(c.x - s.centroid.x, c.y - s.centroid.y)).toBeLessThanOrEqual(s.radius);
        }
        expect(s.top.y).toBeLessThanOrEqual(Math.min(...centers.map((c) => c.y)) - 59);
        expect(s.path.startsWith('M')).toBe(true);
      }),
    );
  });
});
