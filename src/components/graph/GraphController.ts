import cytoscape, { type Core, type ElementDefinition, type EventObject, type StylesheetJson } from 'cytoscape';
import type { RelationshipStatus } from '@/lib/domain/types';
import { familyNodeId, type GraphModel } from './graphModel';

/**
 * Family clusters are Cytoscape compound parents. They are drawn invisible: they only give
 * the fit and bounding-box logic one element per family. The soft cluster halo is drawn by
 * GraphOverlay. Set this to false to drop the compound parents entirely; nothing else changes.
 */
export const USE_FAMILY_HULLS = true;

export interface Viewport {
  zoom: number;
  pan: { x: number; y: number };
}

export type Selection = { kind: 'bug'; id: string } | { kind: 'relationship'; id: string } | null;

export interface HoverInfo {
  kind: 'bug' | 'relationship';
  id: string;
  /** Rendered position inside the canvas container, in CSS pixels. */
  x: number;
  y: number;
}

export interface GraphHandlers {
  /** Single tap or click on a bug node. */
  onBugSelect?: (bugId: string) => void;
  /** Single tap or click on a relationship edge. */
  onRelationshipSelect?: (relationshipId: string) => void;
  /** Double tap or double click: open the detail view. */
  onBugOpen?: (bugId: string) => void;
  onRelationshipOpen?: (relationshipId: string) => void;
  /** Tap on empty canvas. */
  onBackgroundTap?: () => void;
  onHover?: (info: HoverInfo | null) => void;
  /** Fires after any pan, zoom or resize, so overlays can follow the camera. */
  onViewportChange?: (v: Viewport) => void;
}

export interface VisibilityState {
  visibleBugIds: ReadonlySet<string>;
  visibleRelationshipIds: ReadonlySet<string>;
  isolatedBugIds: ReadonlySet<string>;
}

export const STATUS_COLORS: Record<RelationshipStatus, string> = {
  'evidence-backed': '#34D399',
  plausible: '#FBBF24',
  rejected: '#FB7185',
};

const CODE_FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const NODE_SIZE = 50;
const FIT_PADDING = 56;
const ANIMATION_MS = 360;

/** The project tag drawn inside a node, as an SVG image at 4x for crisp zooming. */
function tagImage(tag: string, color: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='184' height='184' viewBox='0 0 46 46'>` +
    `<text x='23' y='27.4' text-anchor='middle' font-family='${CODE_FONT}' font-size='12.5' font-weight='700' letter-spacing='0.6' fill='${color}'>${tag}</text>` +
    `</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function buildStyle(uiFont: string, reducedMotion: boolean): StylesheetJson {
  const t = reducedMotion ? '0ms' : '200ms';
  // Cytoscape's typings do not cover every style property, hence the cast.
  return [
    {
      selector: 'node.family',
      style: {
        'background-opacity': 0,
        'border-width': 0,
        padding: '64px',
        label: '',
        events: 'no',
      },
    },
    {
      selector: 'node.bug',
      style: {
        shape: 'ellipse',
        width: NODE_SIZE,
        height: NODE_SIZE,
        'background-color': '#0C111B',
        'background-image': 'data(icon)',
        'background-width': '100%',
        'background-height': '100%',
        'background-clip': 'node',
        'border-width': 2,
        'border-color': 'data(color)',
        'border-opacity': 0.95,
        // Dashed outer ring: the graph's marker for an illustrative (invented) bug. See the legend.
        'outline-width': 1.25,
        'outline-style': 'dashed',
        'outline-color': 'data(color)',
        'outline-opacity': 0.5,
        'outline-offset': 3.5,
        'underlay-color': 'data(color)',
        'underlay-opacity': 0.08,
        'underlay-padding': 9,
        'underlay-shape': 'ellipse',
        label: 'data(title)',
        color: '#C9D2E0',
        'font-family': uiFont,
        'font-size': 14.5,
        'font-weight': 500,
        'line-height': 1.3,
        'text-wrap': 'wrap',
        'text-max-width': '150px',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 11,
        'text-outline-color': '#080B11',
        'text-outline-width': 2.5,
        'text-outline-opacity': 0.85,
        'min-zoomed-font-size': 7,
        'overlay-opacity': 0,
        'z-index': 10,
        'transition-property': 'opacity, underlay-opacity, underlay-padding, border-width, background-color, color',
        'transition-duration': t,
      },
    },
    { selector: 'node.bug.hover', style: { 'underlay-opacity': 0.2, 'underlay-padding': 11, color: '#F1F5FB' } },
    { selector: 'node.bug.isolated', style: { opacity: 0.4 } },
    { selector: 'node.bug.related', style: { 'underlay-opacity': 0.16, color: '#E8EDF5' } },
    {
      selector: 'node.bug.selected',
      style: {
        'border-width': 3,
        'background-color': '#111A28',
        'underlay-opacity': 0.32,
        'underlay-padding': 13,
        color: '#FFFFFF',
        'font-weight': 600,
        'z-index': 20,
      },
    },
    { selector: 'node.bug.faded', style: { opacity: 0.2 } },
    {
      selector: 'edge',
      style: {
        width: 2,
        'curve-style': 'unbundled-bezier',
        'control-point-distances': 26,
        'control-point-weights': 0.5,
        'line-color': '#64748B',
        'line-cap': 'round',
        opacity: 0.82,
        'mid-target-arrow-shape': 'none',
        'mid-target-arrow-color': '#64748B',
        'mid-target-arrow-fill': 'filled',
        'arrow-scale': 0.75,
        'underlay-color': '#64748B',
        'underlay-opacity': 0,
        'underlay-padding': 3,
        'overlay-opacity': 0,
        'overlay-padding': 7,
        'z-index': 5,
        'transition-property': 'opacity, width, underlay-opacity',
        'transition-duration': t,
      },
    },
    {
      selector: 'edge[status = "evidence-backed"]',
      style: {
        'line-color': STATUS_COLORS['evidence-backed'],
        'mid-target-arrow-color': STATUS_COLORS['evidence-backed'],
        'underlay-color': STATUS_COLORS['evidence-backed'],
        'underlay-opacity': 0.14,
        'line-style': 'solid',
        width: 2.5,
      },
    },
    {
      selector: 'edge[status = "plausible"]',
      style: {
        'line-color': STATUS_COLORS.plausible,
        'mid-target-arrow-color': STATUS_COLORS.plausible,
        'underlay-color': STATUS_COLORS.plausible,
        'underlay-opacity': 0.07,
        'line-style': 'dashed',
        'line-dash-pattern': [8, 6],
      },
    },
    {
      selector: 'edge[status = "rejected"]',
      style: {
        'line-color': STATUS_COLORS.rejected,
        'mid-target-arrow-color': STATUS_COLORS.rejected,
        'line-style': 'dotted',
        'line-dash-pattern': [1, 5],
        opacity: 0.72,
      },
    },
    // A small diamond at the midpoint marks a relationship that crosses projects.
    { selector: 'edge[?crossProject]', style: { 'mid-target-arrow-shape': 'diamond' } },
    { selector: 'edge.hover', style: { width: 3.5, opacity: 1, 'underlay-opacity': 0.22 } },
    { selector: 'edge.related', style: { opacity: 1, width: 3 } },
    { selector: 'edge.selected', style: { opacity: 1, width: 4, 'underlay-opacity': 0.3, 'underlay-padding': 5, 'z-index': 15 } },
    { selector: 'edge.faded', style: { opacity: 0.1 } },
    // Hidden means not matching: not drawn, not hit-testable.
    { selector: 'node.bug.hidden', style: { opacity: 0, events: 'no', label: '' } },
    { selector: 'node.family.hidden', style: { events: 'no' } },
    { selector: 'edge.hidden', style: { display: 'none' } },
  ] as unknown as StylesheetJson;
}

/**
 * The only code that talks to Cytoscape. It owns the camera rules:
 * the Viewport changes only on first render, an explicit fit or zoom control, a user gesture or an explicit restore.
 * Visibility, status and selection updates never fit, never pan, never zoom and never move nodes.
 */
export class GraphController {
  private cy: Core | null = null;
  private container: HTMLElement | null = null;
  private initialFitDone = false;
  private selection: Selection = null;
  private visibility: VisibilityState | null = null;
  private reducedMotion = false;

  constructor(
    private readonly model: GraphModel,
    private readonly handlers: GraphHandlers = {},
    private readonly useHulls: boolean = USE_FAMILY_HULLS,
  ) {}

  /** Pass null to create a headless instance (tests). */
  mount(container: HTMLElement | null): void {
    this.destroy();
    this.container = container;
    this.initialFitDone = false;
    this.reducedMotion = prefersReducedMotion();

    const uiFont = container ? getComputedStyle(container).fontFamily || 'system-ui, sans-serif' : 'sans-serif';
    const cy = cytoscape({
      container: container ?? undefined,
      headless: container === null,
      elements: this.buildElements(),
      style: container ? buildStyle(uiFont, this.reducedMotion) : undefined,
      layout: { name: 'preset' },
      minZoom: 0.3,
      maxZoom: 2.75,
      boxSelectionEnabled: false,
      autoungrabify: true,
      autounselectify: true,
    });
    this.cy = cy;

    cy.on('tap', 'node.bug', (e) => this.handlers.onBugSelect?.(e.target.id()));
    cy.on('tap', 'edge', (e) => this.handlers.onRelationshipSelect?.(e.target.id()));
    cy.on('dbltap', 'node.bug', (e) => this.handlers.onBugOpen?.(e.target.id()));
    cy.on('dbltap', 'edge', (e) => this.handlers.onRelationshipOpen?.(e.target.id()));
    cy.on('tap', (e) => {
      if (e.target === cy) this.handlers.onBackgroundTap?.();
    });

    if (container) {
      const over = (kind: HoverInfo['kind']) => (e: EventObject) => {
        const el = e.target;
        el.addClass('hover');
        container.style.cursor = 'pointer';
        const p = kind === 'bug' ? el.renderedPosition() : el.renderedMidpoint();
        this.handlers.onHover?.({ kind, id: el.id(), x: p.x, y: p.y });
      };
      const out = (e: EventObject) => {
        e.target.removeClass('hover');
        container.style.cursor = '';
        this.handlers.onHover?.(null);
      };
      cy.on('mouseover', 'node.bug', over('bug'));
      cy.on('mouseover', 'edge', over('relationship'));
      cy.on('mouseout', 'node.bug, edge', out);
      cy.on('viewport', () => {
        this.handlers.onHover?.(null);
        this.emitViewport();
      });
    }

    // Initial fit waits for a non-zero canvas (see resize).
    this.resize();
  }

  private emitViewport(): void {
    const v = this.getViewport();
    if (v) this.handlers.onViewportChange?.(v);
  }

  private buildElements(): ElementDefinition[] {
    const els: ElementDefinition[] = [];
    if (this.useHulls) {
      for (const f of this.model.families) {
        els.push({ group: 'nodes', classes: 'family', data: { id: f.nodeId, label: f.label, color: f.color } });
      }
    }
    for (const b of this.model.bugs) {
      els.push({
        group: 'nodes',
        classes: 'bug',
        data: {
          id: b.id,
          label: b.label,
          title: b.title,
          color: b.color,
          icon: tagImage(b.tag, b.color),
          ...(this.useHulls ? { parent: familyNodeId(b.familyId) } : {}),
        },
        position: { ...b.position },
      });
    }
    for (const e of this.model.edges) {
      els.push({
        group: 'edges',
        data: { id: e.id, source: e.source, target: e.target, status: e.status, crossProject: e.crossProject },
      });
    }
    return els;
  }

  /** Shows and hides nodes and edges. Never touches the Viewport or positions. */
  applyVisibility(v: VisibilityState): void {
    this.visibility = v;
    const cy = this.cy;
    if (!cy) return;
    cy.batch(() => {
      cy.nodes('.bug').forEach((n) => {
        n.toggleClass('hidden', !v.visibleBugIds.has(n.id()));
        n.toggleClass('isolated', v.isolatedBugIds.has(n.id()));
      });
      cy.nodes('.family').forEach((p) => {
        p.toggleClass('hidden', p.children().not('.hidden').length === 0);
      });
      cy.edges().forEach((e) => {
        e.toggleClass('hidden', !v.visibleRelationshipIds.has(e.id()));
      });
    });
    this.applyEmphasis();
  }

  /** Updates the status of each edge. Never touches the Viewport. */
  applyStatuses(statuses: Readonly<Record<string, RelationshipStatus>>): void {
    const cy = this.cy;
    if (!cy) return;
    cy.batch(() => {
      cy.edges().forEach((e) => {
        const s = statuses[e.id()];
        if (s && e.data('status') !== s) e.data('status', s);
      });
    });
  }

  /** Selects a bug, or clears the selection with null. Kept for callers that only select bugs. */
  select(bugId: string | null): void {
    this.setSelection(bugId ? { kind: 'bug', id: bugId } : null);
  }

  /**
   * Emphasizes the selection and what it touches (R1.13): a bug with its visible relationships and their
   * other bugs, or a relationship with its two bugs. Everything else is faded. Never touches the Viewport.
   */
  setSelection(selection: Selection): void {
    this.selection = selection;
    this.applyEmphasis();
  }

  private applyEmphasis(): void {
    const cy = this.cy;
    if (!cy) return;
    const sel = this.selection;
    cy.batch(() => {
      cy.elements().removeClass('selected related faded');
      if (!sel) return;
      const target = cy.getElementById(sel.id);
      if (target.empty() || target.hasClass('hidden')) return;
      const visibleEdges = (n: cytoscape.NodeSingular) => n.connectedEdges().not('.hidden');
      let keep: cytoscape.CollectionReturnValue;
      if (sel.kind === 'bug' && target.isNode()) {
        const edges = visibleEdges(target);
        keep = target.union(edges).union(edges.connectedNodes());
      } else if (sel.kind === 'relationship' && target.isEdge()) {
        keep = target.union(target.connectedNodes());
      } else {
        return;
      }
      target.addClass('selected');
      keep.not(target).addClass('related');
      cy.nodes('.bug').not(keep).addClass('faded');
      cy.edges().not(keep).addClass('faded');
    });
  }

  /** Re-reads the container size. Keeps zoom and pan. The first non-zero size triggers the one initial fit. */
  resize(): void {
    const cy = this.cy;
    if (!cy) return;
    cy.resize();
    if (!this.initialFitDone && this.container && this.container.clientWidth > 0 && this.container.clientHeight > 0) {
      this.initialFitDone = true;
      this.fit(false);
    }
    this.emitViewport();
  }

  /** Explicit fit of all visible bugs and their clusters. Animated unless reduced motion is preferred. */
  fit(animate = true): void {
    const cy = this.cy;
    if (!cy) return;
    const targets = cy.nodes('.bug').not('.hidden').union(cy.nodes('.family').not('.hidden'));
    if (targets.length === 0) return;
    if (animate && this.container && !this.reducedMotion) {
      cy.stop();
      cy.animate({ fit: { eles: targets, padding: FIT_PADDING } }, { duration: ANIMATION_MS, easing: 'ease-in-out-cubic' });
    } else {
      cy.fit(targets, FIT_PADDING);
    }
  }

  zoomBy(factor: number): void {
    const cy = this.cy;
    if (!cy || !this.container) return;
    const level = Math.min(cy.maxZoom(), Math.max(cy.minZoom(), cy.zoom() * factor));
    const renderedPosition = { x: this.container.clientWidth / 2, y: this.container.clientHeight / 2 };
    if (this.reducedMotion) {
      cy.zoom({ level, renderedPosition });
      return;
    }
    const pan = cy.pan();
    const zoom = cy.zoom();
    const position = { x: (renderedPosition.x - pan.x) / zoom, y: (renderedPosition.y - pan.y) / zoom };
    cy.stop();
    cy.animate({ zoom: { level, position } }, { duration: 220, easing: 'ease-out-cubic' });
  }

  getViewport(): Viewport | null {
    const cy = this.cy;
    return cy ? { zoom: cy.zoom(), pan: { ...cy.pan() } } : null;
  }

  setViewport(v: Viewport): void {
    const cy = this.cy;
    if (!cy) return;
    cy.viewport({ zoom: v.zoom, pan: v.pan });
    this.initialFitDone = true;
  }

  /** Ids of bugs that currently match (not hidden). */
  visibleBugIds(): string[] {
    return this.cy ? this.cy.nodes('.bug').not('.hidden').map((n) => n.id()) : [];
  }

  edgeStatus(edgeId: string): string | null {
    const e = this.cy?.getElementById(edgeId);
    return e && e.nonempty() ? (e.data('status') as string) : null;
  }

  isBugHidden(bugId: string): boolean {
    return this.cy?.getElementById(bugId).hasClass('hidden') ?? true;
  }

  /** Classes that describe the emphasis of an element. Used by tests. */
  emphasisOf(id: string): 'selected' | 'related' | 'faded' | 'none' {
    const el = this.cy?.getElementById(id);
    if (!el || el.empty()) return 'none';
    if (el.hasClass('selected')) return 'selected';
    if (el.hasClass('related')) return 'related';
    if (el.hasClass('faded')) return 'faded';
    return 'none';
  }

  positionOf(bugId: string): { x: number; y: number } | null {
    const n = this.cy?.getElementById(bugId);
    return n && n.nonempty() ? { ...n.position() } : null;
  }

  /** Page coordinates of a bug node center. Used by browser tests to click the canvas. */
  pagePointOfBug(bugId: string): { x: number; y: number } | null {
    return this.pagePoint(this.cy?.getElementById(bugId)?.renderedPosition() ?? null);
  }

  /** Page coordinates of an edge midpoint. Used by browser tests to click the canvas. */
  pagePointOfEdge(edgeId: string): { x: number; y: number } | null {
    const e = this.cy?.getElementById(edgeId);
    return e && e.nonempty() ? this.pagePoint(e.renderedMidpoint()) : null;
  }

  private pagePoint(p: { x: number; y: number } | null): { x: number; y: number } | null {
    if (!p || !this.container) return null;
    const r = this.container.getBoundingClientRect();
    return { x: r.left + p.x, y: r.top + p.y };
  }

  /** Bounding box of a family cluster, in graph coordinates. Used by browser tests for cluster stability. */
  hullBoundingBox(familyId: string): { x1: number; y1: number; x2: number; y2: number } | null {
    const n = this.cy?.getElementById(familyNodeId(familyId));
    if (!n || n.empty()) return null;
    const b = n.boundingBox({ includeLabels: false, includeOverlays: false });
    return { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2 };
  }

  destroy(): void {
    this.cy?.stop();
    this.cy?.destroy();
    this.cy = null;
  }
}
