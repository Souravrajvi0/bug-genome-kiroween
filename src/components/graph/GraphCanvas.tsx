'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { RelationshipStatus } from '@/lib/domain/types';
import { readAtlasSession, writeAtlasSession } from './atlasSession';
import { clusterShape } from './clusterGeometry';
import { GraphController, type HoverInfo, type Selection, type Viewport, type VisibilityState } from './GraphController';
import type { GraphModel } from './graphModel';

declare global {
  interface Window {
    /** Exposed outside production so browser tests can click real canvas coordinates. */
    __atlasGraph?: GraphController;
  }
}

/** Halo radius around each node, in graph units. Covers the node and its two-line title. */
const HALO_RADIUS = 74;
const HALO_OFFSET_Y = 20;

export function GraphCanvas({
  model,
  visibility,
  statuses,
  selection,
  summary,
  overlay,
  topLeft,
  bottomLeft,
  describeHover,
  onSelect,
  onOpen,
  onInitFailure,
}: {
  model: GraphModel;
  visibility: VisibilityState;
  statuses: Readonly<Record<string, RelationshipStatus>>;
  selection: Selection;
  summary: string;
  overlay?: ReactNode;
  topLeft?: ReactNode;
  bottomLeft?: ReactNode;
  describeHover: (hover: HoverInfo) => ReactNode;
  onSelect: (selection: Selection) => void;
  onOpen: (kind: 'bug' | 'relationship', id: string) => void;
  onInitFailure?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<GraphController | null>(null);
  const handlers = useRef({ onSelect, onOpen });
  const [failed, setFailed] = useState(false);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  useEffect(() => {
    handlers.current = { onSelect, onOpen };
  });

  // Create the controller once per model. Camera rules live in the controller.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let controller: GraphController;
    let frame = 0;
    let saveTimer: number | undefined;
    try {
      controller = new GraphController(model, {
        onBugSelect: (id) => handlers.current.onSelect({ kind: 'bug', id }),
        onRelationshipSelect: (id) => handlers.current.onSelect({ kind: 'relationship', id }),
        onBugOpen: (id) => handlers.current.onOpen('bug', id),
        onRelationshipOpen: (id) => handlers.current.onOpen('relationship', id),
        onBackgroundTap: () => handlers.current.onSelect(null),
        onHover: setHover,
        onViewportChange: (v) => {
          // One overlay update per animation frame, one session write per pause.
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => setViewport(v));
          window.clearTimeout(saveTimer);
          saveTimer = window.setTimeout(() => writeAtlasSession({ viewport: v }), 250);
        },
      });
      controller.mount(container);
    } catch {
      setFailed(true);
      onInitFailure?.();
      return;
    }
    controllerRef.current = controller;
    if (process.env.NODE_ENV !== 'production') window.__atlasGraph = controller;

    // Returning from a detail view in the same session restores the camera (R2.8).
    const saved = readAtlasSession().viewport;
    if (saved) controller.setViewport(saved);
    setViewport(controller.getViewport());

    // Size changes only update the canvas. They never refit (except the first non-zero size).
    const observer = new ResizeObserver(() => controller.resize());
    observer.observe(container);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(saveTimer);
      const v = controller.getViewport();
      if (v) writeAtlasSession({ viewport: v });
      controller.destroy();
      controllerRef.current = null;
      if (window.__atlasGraph === controller) delete window.__atlasGraph;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  useEffect(() => {
    controllerRef.current?.applyVisibility(visibility);
  }, [visibility, model]);

  useEffect(() => {
    controllerRef.current?.applyStatuses(statuses);
  }, [statuses, model]);

  useEffect(() => {
    controllerRef.current?.setSelection(selection);
  }, [selection, model, visibility]);

  // Families touched by the selection stay bright; the others dim with their nodes.
  const activeFamilies = useMemo(() => {
    if (!selection) return null;
    const bugFamily = new Map(model.bugs.map((b) => [b.id, b.familyId]));
    const ids = new Set<string>();
    if (selection.kind === 'bug') {
      ids.add(selection.id);
      for (const e of model.edges) {
        if (!visibility.visibleRelationshipIds.has(e.id)) continue;
        if (e.source === selection.id) ids.add(e.target);
        if (e.target === selection.id) ids.add(e.source);
      }
    } else {
      const e = model.edges.find((x) => x.id === selection.id);
      if (e) {
        ids.add(e.source);
        ids.add(e.target);
      }
    }
    return new Set([...ids].map((id) => bugFamily.get(id)).filter((f): f is string => !!f));
  }, [selection, model, visibility]);

  const clusters = useMemo(
    () =>
      model.families
        .map((f) => {
          const members = model.bugs.filter((b) => b.familyId === f.id && visibility.visibleBugIds.has(b.id));
          const shape = clusterShape(
            members.map((b) => b.position),
            HALO_RADIUS,
            HALO_OFFSET_Y,
          );
          return shape ? { family: f, shape } : null;
        })
        .filter((c): c is NonNullable<typeof c> => c !== null),
    [model, visibility],
  );

  if (failed) {
    return (
      <div className="graph graph--failed" role="alert">
        <div className="empty-state">
          <Icon name="graph" size={20} />
          <p className="empty-state__title">The graph canvas could not start</p>
          <p className="empty-state__text">Use the lists below to browse bugs and relationships.</p>
        </div>
      </div>
    );
  }

  const ctl = () => controllerRef.current;
  const toRendered = (x: number, y: number) =>
    viewport ? { x: viewport.pan.x + viewport.zoom * x, y: viewport.pan.y + viewport.zoom * y } : null;

  return (
    <div className="graph" data-selection={selection ? selection.kind : 'none'}>
      <svg className="graph__halos" aria-hidden="true">
        <defs>
          {clusters.map(({ family, shape }) => (
            <radialGradient
              key={family.id}
              id={`halo-${family.id}`}
              gradientUnits="userSpaceOnUse"
              cx={shape.centroid.x}
              cy={shape.centroid.y}
              r={shape.radius}
            >
              <stop offset="0%" stopColor={family.color} stopOpacity="0.16" />
              <stop offset="70%" stopColor={family.color} stopOpacity="0.07" />
              <stop offset="100%" stopColor={family.color} stopOpacity="0.035" />
            </radialGradient>
          ))}
        </defs>
        {viewport ? (
          <g transform={`translate(${viewport.pan.x} ${viewport.pan.y}) scale(${viewport.zoom})`}>
            {clusters.map(({ family, shape }) => (
              <path
                key={family.id}
                d={shape.path}
                className="graph__halo"
                data-dim={activeFamilies !== null && !activeFamilies.has(family.id) ? 'true' : 'false'}
                fill={`url(#halo-${family.id})`}
                stroke={family.color}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        ) : null}
      </svg>

      <div ref={containerRef} className="graph__canvas" role="img" aria-label={summary} data-testid="graph-canvas" />

      <div className="graph__labels" aria-hidden="true">
        {viewport && viewport.zoom > 0.42
          ? clusters.map(({ family, shape }) => {
              const p = toRendered(shape.top.x, shape.top.y)!;
              return (
                <span
                  key={family.id}
                  className="cluster-label"
                  data-dim={activeFamilies !== null && !activeFamilies.has(family.id) ? 'true' : 'false'}
                  style={{ transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`, ['--fam' as string]: family.color }}
                >
                  <span className="cluster-label__glyph">{family.glyph}</span>
                  {family.name}
                </span>
              );
            })
          : null}
      </div>

      {hover ? (
        <div
          className="graph-tip"
          role="presentation"
          style={{ transform: `translate(${hover.x}px, ${hover.y}px)` }}
          data-kind={hover.kind}
        >
          {describeHover(hover)}
        </div>
      ) : null}

      {topLeft ? <div className="graph__top-left">{topLeft}</div> : null}

      <div className="graph-toolbar" role="group" aria-label="Graph view controls">
        <button type="button" className="icon-btn" aria-label="Zoom in" title="Zoom in" onClick={() => ctl()?.zoomBy(1.3)}>
          <Icon name="plus" />
        </button>
        <button type="button" className="icon-btn" aria-label="Zoom out" title="Zoom out" onClick={() => ctl()?.zoomBy(1 / 1.3)}>
          <Icon name="minus" />
        </button>
        <span className="graph-toolbar__sep" aria-hidden="true" />
        <button type="button" className="icon-btn icon-btn--text" title="Fit all visible bugs" onClick={() => ctl()?.fit()}>
          <Icon name="fit" />
          <span>Fit view</span>
        </button>
      </div>

      {bottomLeft ? <div className="graph__bottom-left">{bottomLeft}</div> : null}
      {overlay}
    </div>
  );
}
