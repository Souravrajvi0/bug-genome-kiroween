import type { Point } from '@/lib/domain/layout';

/** Convex hull (monotone chain), counter-clockwise, without repeated end point. */
export function convexHull(points: readonly Point[]): Point[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length <= 2) return pts;
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

export interface ClusterShape {
  /** SVG path in graph coordinates. */
  path: string;
  centroid: Point;
  /** Top-center of the shape, where the family label sits. */
  top: Point;
  /** Radius that covers the shape from the centroid, for the gradient. */
  radius: number;
}

const SAMPLES = 28;

/**
 * A rounded blob around a set of node centers: the convex hull of a circle around each node.
 * `offsetY` pushes each circle down so the hull also covers the title label under the node.
 * Corners are smoothed with quadratic curves through edge midpoints.
 */
export function clusterShape(centers: readonly Point[], radius: number, offsetY = 0): ClusterShape | null {
  if (centers.length === 0) return null;
  const samples: Point[] = [];
  for (const c of centers) {
    for (let i = 0; i < SAMPLES; i++) {
      const a = (2 * Math.PI * i) / SAMPLES;
      samples.push({ x: c.x + radius * Math.cos(a), y: c.y + offsetY + radius * Math.sin(a) });
    }
  }
  const hull = convexHull(samples);
  const n = hull.length;
  const mid = (p: Point, q: Point) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const f = (v: number) => v.toFixed(1);
  const start = mid(hull[n - 1]!, hull[0]!);
  let d = `M${f(start.x)} ${f(start.y)}`;
  for (let i = 0; i < n; i++) {
    const p = hull[i]!;
    const m = mid(p, hull[(i + 1) % n]!);
    d += ` Q${f(p.x)} ${f(p.y)} ${f(m.x)} ${f(m.y)}`;
  }
  d += ' Z';

  const centroid = {
    x: centers.reduce((s, p) => s + p.x, 0) / centers.length,
    y: centers.reduce((s, p) => s + p.y, 0) / centers.length + offsetY,
  };
  const minY = Math.min(...hull.map((p) => p.y));
  const r = Math.max(...hull.map((p) => Math.hypot(p.x - centroid.x, p.y - centroid.y)));
  return { path: d, centroid, top: { x: centroid.x, y: minY }, radius: r };
}
