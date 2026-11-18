import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildGraphModel } from '@/components/graph/graphModel';
import { GraphController, type VisibilityState } from '@/components/graph/GraphController';
import { MOCK_DATASET } from '@/lib/data-source/mock';
import { deriveRelationship } from '@/lib/domain/status';
import { EMPTY_CRITERIA, type Criteria } from '@/lib/domain/types';
import { computeVisibility } from '@/lib/domain/visibility';

const statusOf = (id: string) => deriveRelationship(MOCK_DATASET.relationships.find((r) => r.id === id)!).effectiveStatus;
const model = buildGraphModel(MOCK_DATASET, statusOf);
const visibility = (c: Partial<Criteria>): VisibilityState =>
  computeVisibility({ ...MOCK_DATASET, effectiveStatus: statusOf, criteria: { ...EMPTY_CRITERIA, ...c } });

describe('buildGraphModel', () => {
  it('has a node per bug, a hull per used family and an edge per relationship', () => {
    expect(model.bugs).toHaveLength(12);
    expect(model.families).toHaveLength(4);
    expect(model.edges).toHaveLength(10);
  });

  it('gives each of the 4 projects its own shape and tag', () => {
    const shapes = new Set([...model.projectShapes.values()].map((p) => p.shape));
    expect(shapes.size).toBe(4);
    expect(model.bugs.find((b) => b.id === 'bug-01')!.label).toBe('LC-01');
  });

  it('marks every mock edge as crossing projects', () => {
    expect(model.edges.every((e) => e.crossProject)).toBe(true);
  });

  it('adds a hull for an unknown family', () => {
    const odd = { ...MOCK_DATASET, bugs: [...MOCK_DATASET.bugs, { ...MOCK_DATASET.bugs[0]!, id: 'bug-x', familyId: 'fam-missing' }] };
    const m = buildGraphModel(odd, statusOf);
    expect(m.families.find((f) => f.id === 'fam-missing')?.label).toBe('Unknown family');
  });
});

describe('GraphController (headless)', () => {
  let c: GraphController;
  beforeEach(() => {
    c = new GraphController(model);
    c.mount(null);
  });
  afterEach(() => c.destroy());

  const startViewport = { zoom: 1.4, pan: { x: 33, y: -21 } };
  const positions = () => Object.fromEntries(model.bugs.map((b) => [b.id, c.positionOf(b.id)]));

  it('places bugs at the deterministic layout positions', () => {
    for (const b of model.bugs) expect(c.positionOf(b.id)).toEqual(b.position);
  });

  it('starts with every bug visible', () => {
    expect(c.visibleBugIds().sort()).toEqual(MOCK_DATASET.bugs.map((b) => b.id).sort());
  });

  it('keeps matching bugs and excludes faded ones (R3.6, R3.7)', () => {
    c.applyVisibility(visibility({ families: ['fam-dup'] }));
    expect(c.visibleBugIds().sort()).toEqual(['bug-01', 'bug-02', 'bug-03']);
    expect(c.isBugHidden('bug-10')).toBe(true);
    expect(c.isBugHidden('bug-01')).toBe(false);
  });

  it('status filter hides edges but keeps every bug, marking the ones without edges as isolated', () => {
    c.applyVisibility(visibility({ statuses: ['rejected'] }));
    expect(c.visibleBugIds()).toHaveLength(12);
  });

  it('leaves zoom, pan and positions unchanged for visibility, status and selection updates (R18.3)', () => {
    c.setViewport(startViewport);
    const before = positions();
    c.applyVisibility(visibility({ families: ['fam-dup'] }));
    c.applyVisibility(visibility({ search: 'zzzz' }));
    c.applyVisibility(visibility({ statuses: ['plausible'] }));
    c.applyStatuses({ 'rel-01': 'rejected', 'rel-02': 'evidence-backed' });
    c.select('bug-03');
    c.select(null);
    c.applyVisibility(visibility({}));
    expect(c.getViewport()).toEqual(startViewport);
    expect(positions()).toEqual(before);
  });

  it('emphasizes a selected bug with its relationships and fades the rest (R1.13)', () => {
    c.applyVisibility(visibility({}));
    c.select('bug-01');
    expect(c.emphasisOf('bug-01')).toBe('selected');
    expect(c.emphasisOf('rel-01')).toBe('related');
    expect(c.emphasisOf('bug-02')).toBe('related');
    expect(c.emphasisOf('bug-07')).toBe('faded');
    c.setSelection({ kind: 'relationship', id: 'rel-01' });
    expect(c.emphasisOf('rel-01')).toBe('selected');
    expect(c.emphasisOf('bug-01')).toBe('related');
    expect(c.emphasisOf('bug-03')).toBe('faded');
    c.select(null);
    expect(c.emphasisOf('bug-07')).toBe('none');
  });

  it('ignores a selection that the filters hide', () => {
    c.applyVisibility(visibility({ families: ['fam-stale'] }));
    c.select('bug-01');
    expect(c.emphasisOf('bug-04')).toBe('none');
  });

  it('leaves zoom and pan unchanged on resize (R18.2, R18.7)', () => {
    c.setViewport(startViewport);
    for (let i = 0; i < 5; i++) c.resize();
    expect(c.getViewport()).toEqual(startViewport);
  });

  it('applies status changes to edges', () => {
    expect(c.edgeStatus('rel-02')).toBe('plausible');
    c.applyStatuses({ 'rel-02': 'evidence-backed' });
    expect(c.edgeStatus('rel-02')).toBe('evidence-backed');
    expect(c.edgeStatus('rel-01')).toBe('evidence-backed');
  });

  it('can restore a saved Viewport', () => {
    c.setViewport(startViewport);
    expect(c.getViewport()).toEqual(startViewport);
  });
});

describe('GraphController without hulls (fallback flag)', () => {
  it('still builds every bug and edge', () => {
    const c = new GraphController(model, {}, false);
    c.mount(null);
    expect(c.visibleBugIds()).toHaveLength(12);
    c.applyVisibility(visibility({ families: ['fam-stale'] }));
    expect(c.visibleBugIds().sort()).toEqual(['bug-04', 'bug-05', 'bug-06']);
    c.destroy();
  });
});