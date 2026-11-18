import { computeLayout, type Point } from '@/lib/domain/layout';
import { UNKNOWN_FAMILY_NAME } from '@/lib/domain/search';
import type { AtlasData, RelationshipStatus } from '@/lib/domain/types';

export type NodeShape = 'ellipse' | 'round-rectangle' | 'diamond' | 'hexagon';
const SHAPES: readonly NodeShape[] = ['ellipse', 'round-rectangle', 'diamond', 'hexagon'];
const UNKNOWN_COLOR = '#64748B';

export interface GraphBugNode {
  id: string;
  label: string;
  title: string;
  /** Two-letter project tag, drawn inside the node. */
  tag: string;
  familyName: string;
  familyId: string;
  color: string;
  shape: NodeShape;
  projectId: string;
  projectName: string;
  position: Point;
}

export interface GraphFamilyNode {
  id: string;
  /** Cytoscape id of the compound parent. */
  nodeId: string;
  label: string;
  name: string;
  glyph: string;
  color: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  status: RelationshipStatus;
  crossProject: boolean;
}

/** Plain data describing the graph. No Cytoscape types, so it is easy to test. */
export interface GraphModel {
  bugs: GraphBugNode[];
  families: GraphFamilyNode[];
  edges: GraphEdge[];
  projectShapes: ReadonlyMap<string, { name: string; shape: NodeShape; tag: string }>;
}

export const familyNodeId = (familyId: string) => `fam:${familyId}`;

/** Two-letter tag from a project name, for example "Lumen Cart" gives "LC". */
export function projectTag(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.length >= 2 ? words.slice(0, 2).map((w) => w[0]) : [name.slice(0, 2)];
  return letters.join('').toUpperCase();
}

export function buildGraphModel(data: AtlasData, statusOf: (relationshipId: string) => RelationshipStatus): GraphModel {
  const layout = computeLayout(data.families, data.bugs);
  const familiesById = new Map(data.families.map((f) => [f.id, f]));

  const projects = new Map<string, string>();
  for (const b of data.bugs) projects.set(b.project.id, b.project.name);
  const projectShapes = new Map(
    [...projects.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, name], i) => [id, { name, shape: SHAPES[i % SHAPES.length]!, tag: projectTag(name) }] as const),
  );

  const bugs: GraphBugNode[] = data.bugs.map((b) => {
    const family = familiesById.get(b.familyId);
    const ps = projectShapes.get(b.project.id)!;
    return {
      id: b.id,
      label: `${ps.tag}-${b.id.replace(/^bug-/, '')}`,
      title: b.title,
      tag: ps.tag,
      familyName: family?.name ?? UNKNOWN_FAMILY_NAME,
      familyId: b.familyId,
      color: family?.color ?? UNKNOWN_COLOR,
      shape: ps.shape,
      projectId: b.project.id,
      projectName: b.project.name,
      position: layout.positions[b.id] ?? { x: 0, y: 0 },
    };
  });

  const usedFamilyIds = [...new Set(data.bugs.map((b) => b.familyId))].sort();
  const families: GraphFamilyNode[] = usedFamilyIds.map((id) => {
    const f = familiesById.get(id);
    return {
      id,
      nodeId: familyNodeId(id),
      label: f ? `${f.glyph}  ${f.name}` : UNKNOWN_FAMILY_NAME,
      name: f?.name ?? UNKNOWN_FAMILY_NAME,
      glyph: f?.glyph ?? '?',
      color: f?.color ?? UNKNOWN_COLOR,
    };
  });

  const bugsById = new Map(data.bugs.map((b) => [b.id, b]));
  const edges: GraphEdge[] = data.relationships.map((r) => ({
    id: r.id,
    source: r.bugAId,
    target: r.bugBId,
    status: statusOf(r.id),
    crossProject: bugsById.get(r.bugAId)?.project.id !== bugsById.get(r.bugBId)?.project.id,
  }));

  return { bugs, families, edges, projectShapes };
}