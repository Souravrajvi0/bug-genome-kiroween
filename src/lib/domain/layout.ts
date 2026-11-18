import type { Bug, Family } from './types';

export interface Point {
  x: number;
  y: number;
}

export interface Layout {
  positions: Readonly<Record<string, Point>>;
  /** Center of each family cluster, by family id. */
  centers: Readonly<Record<string, Point>>;
}

/** Distance between neighbouring cluster centers. Sized so clusters and their labels never overlap. */
const CELL_X = 460;
const CELL_Y = 400;
const MIN_INNER_RADIUS = 92;
const PER_BUG_ARC = 110;

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Deterministic cluster layout. No randomness and no dependence on input order.
 * Family clusters sit on a near-square grid ordered by family id (a 2 by 2 grid for 4 families),
 * which suits a wide or square canvas better than a ring. The last row is centred when it is short.
 * Bugs sit on a ring per family ordered by bug id, the first one at the top, so a cluster always
 * has the same, upright shape.
 */
export function computeLayout(families: readonly Family[], bugs: readonly Bug[]): Layout {
  const groupIds = [...new Set([...families.map((f) => f.id), ...bugs.map((b) => b.familyId)])].sort();
  const positions: Record<string, Point> = {};
  const centers: Record<string, Point> = {};

  const count = groupIds.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));

  groupIds.forEach((groupId, gi) => {
    const row = Math.floor(gi / cols);
    const inRow = row === rows - 1 ? count - row * cols : cols;
    const col = gi % cols;
    const center: Point = {
      x: (col - (inRow - 1) / 2) * CELL_X,
      y: (row - (rows - 1) / 2) * CELL_Y,
    };
    centers[groupId] = { x: round(center.x), y: round(center.y) };

    const members = bugs.filter((b) => b.familyId === groupId).sort((a, b) => a.id.localeCompare(b.id));
    const radius = Math.max(MIN_INNER_RADIUS, (members.length * PER_BUG_ARC) / (2 * Math.PI));
    members.forEach((bug, mi) => {
      if (members.length === 1) {
        positions[bug.id] = { x: round(center.x), y: round(center.y) };
        return;
      }
      const a = -Math.PI / 2 + (2 * Math.PI * mi) / members.length;
      positions[bug.id] = { x: round(center.x + radius * Math.cos(a)), y: round(center.y + radius * Math.sin(a)) };
    });
  });

  return { positions, centers };
}
