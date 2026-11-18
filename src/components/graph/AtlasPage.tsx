'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAnnounce } from '@/components/providers/Announcer';
import { useReviews } from '@/components/providers/ReviewProvider';
import { DataGate } from '@/components/shell/DataGate';
import { PageHeading } from '@/components/shell/PageHeading';
import { FamilyGlyph } from '@/components/ui/FamilyChip';
import { Icon } from '@/components/ui/Icon';
import { StatusLine } from '@/components/ui/StatusBadge';
import { withFrom } from '@/lib/domain/atlas-query';
import { statusLabel } from '@/lib/domain/status';
import { EMPTY_CRITERIA, type RelationshipStatus } from '@/lib/domain/types';
import { computeVisibility, describeCriteria } from '@/lib/domain/visibility';
import type { ReadyAtlas } from '@/components/providers/DataProvider';
import { readAtlasSession, writeAtlasSession } from './atlasSession';
import { CountsBar } from './CountsBar';
import { FilterPanel } from './FilterPanel';
import { GraphCanvas } from './GraphCanvas';
import type { HoverInfo, Selection } from './GraphController';
import { buildGraphModel } from './graphModel';
import { StatusKey } from './GraphLegend';
import { GraphList } from './GraphList';
import { Inspector } from './Inspector';
import { useAtlasCriteria } from './useAtlasCriteria';

function AtlasView({ atlas }: { atlas: ReadyAtlas }) {
  const { data, bugsById, familiesById, relationshipsById } = atlas;
  const router = useRouter();
  const reviews = useReviews();
  const announce = useAnnounce();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selection, setSelectionState] = useState<Selection>(null);
  const familyIds = useMemo(() => data.families.map((f) => f.id), [data.families]);
  const { criteria, setCriteria } = useAtlasCriteria(familyIds);
  const criteriaRef = useRef(criteria);
  criteriaRef.current = criteria;

  // Restore the selection from this browser session (R2.8). Runs once, after hydration.
  useEffect(() => {
    const saved = readAtlasSession().selection;
    if (saved && (saved.kind === 'bug' ? bugsById.has(saved.id) : relationshipsById.has(saved.id))) setSelectionState(saved);
  }, [bugsById, relationshipsById]);

  const setSelection = useCallback((next: Selection) => {
    setSelectionState(next);
    writeAtlasSession({ selection: next });
  }, []);

  // Effective status of every relationship, from the baseline and the stored decisions.
  const statuses = useMemo(() => {
    const out: Record<string, RelationshipStatus> = {};
    for (const r of data.relationships) out[r.id] = reviews.derive(r).effectiveStatus;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.relationships, reviews.snapshot]);
  const statusOf = useCallback((id: string) => statuses[id] ?? 'plausible', [statuses]);

  // The graph model uses baseline statuses once. Live statuses are applied to the canvas separately,
  // so a review decision never rebuilds the graph.
  const model = useMemo(
    () => buildGraphModel(data, (id) => data.relationships.find((r) => r.id === id)!.baselineStatus),
    [data],
  );

  const visibility = useMemo(
    () =>
      computeVisibility({
        bugs: data.bugs,
        families: data.families,
        relationships: data.relationships,
        effectiveStatus: (id) => statuses[id] ?? 'plausible',
        criteria,
      }),
    [data, statuses, criteria],
  );

  // A selection that the filters hide is dropped, so the inspector never describes something invisible.
  const effectiveSelection: Selection = useMemo(() => {
    if (!selection) return null;
    const shown = selection.kind === 'bug' ? visibility.visibleBugIds.has(selection.id) : visibility.visibleRelationshipIds.has(selection.id);
    return shown ? selection : null;
  }, [selection, visibility]);

  // Esc clears the selection, unless focus is in a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (document.querySelector('dialog[open]')) return;
      setSelection(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSelection]);

  // Speak the result count after a filter change (R14.11). Skips the first render.
  const { counts } = visibility;
  const [shownBugs, totalBugs] = counts.bugs;
  const [shownRels, totalRels] = counts.relationships;
  const firstCount = useRef(true);
  useEffect(() => {
    if (firstCount.current) {
      firstCount.current = false;
      return;
    }
    announce(`${shownBugs} of ${totalBugs} bugs and ${shownRels} of ${totalRels} relationships shown.`);
  }, [shownBugs, totalBugs, shownRels, totalRels, announce]);

  const noBugs = data.bugs.length === 0;
  const noMatch = !noBugs && counts.bugs[0] === 0;
  const noEdges = !noBugs && !noMatch && counts.relationships[0] === 0 && data.relationships.length > 0;
  const summary =
    `Graph of ${counts.bugs[0]} of ${counts.bugs[1]} bugs and ${counts.relationships[0]} of ${counts.relationships[1]} relationships. ` +
    'All content is illustrative. Use the lists below the graph to browse with a keyboard.';

  const bugHref = (id: string) => withFrom(`/bugs/${id}`, criteriaRef.current);
  const relationshipHref = (id: string) => withFrom(`/relationships/${id}`, criteriaRef.current);

  const describeHover = (h: HoverInfo) => {
    if (h.kind === 'bug') {
      const b = bugsById.get(h.id);
      if (!b) return null;
      const f = familiesById.get(b.familyId);
      return (
        <>
          <span className="graph-tip__title">{b.title}</span>
          <span className="graph-tip__meta">
            <FamilyGlyph family={f} /> {f?.name ?? 'Unknown family'}
          </span>
          <span className="graph-tip__meta">{b.project.name} · illustrative</span>
        </>
      );
    }
    const r = relationshipsById.get(h.id);
    if (!r) return null;
    const a = bugsById.get(r.bugAId);
    const b = bugsById.get(r.bugBId);
    const s = statusOf(r.id);
    return (
      <>
        <span className="graph-tip__title">
          {a?.title} <span className="graph-tip__and">⇄</span> {b?.title}
        </span>
        <span className={`graph-tip__meta graph-tip__status--${s}`}>
          <StatusLine status={s} width={16} /> {statusLabel(s, r.evidenceProvenance)}
        </span>
        <span className="graph-tip__meta">
          {a && b && a.project.id !== b.project.id ? 'Crosses projects' : 'Same project'} · illustrative
        </span>
      </>
    );
  };

  return (
    <div className="atlas">
      <FilterPanel
        criteria={criteria}
        families={data.families}
        bugs={data.bugs}
        onChange={setCriteria}
        open={filtersOpen}
        onToggleOpen={() => setFiltersOpen((o) => !o)}
      />

      <section className="atlas__stage" aria-labelledby="atlas-h1">
        <header className="stage-bar">
          <div className="stage-bar__title">
            <PageHeading title="Genome Atlas" id="atlas-h1" />
            <p className="stage-bar__sub">Bugs from unrelated projects that may share a failure mechanism.</p>
          </div>
          <CountsBar counts={counts} />
        </header>

        {noBugs ? (
          <div className="graph graph--empty" role="status">
            <div className="empty-state">
              <Icon name="graph" size={20} />
              <p className="empty-state__title">No bugs are loaded.</p>
            </div>
          </div>
        ) : (
          <GraphCanvas
            model={model}
            visibility={visibility}
            statuses={statuses}
            selection={effectiveSelection}
            summary={summary}
            describeHover={describeHover}
            onSelect={setSelection}
            onOpen={(kind, id) => router.push(kind === 'bug' ? bugHref(id) : relationshipHref(id))}
            topLeft={
              noEdges ? (
                <p className="graph-note" role="status">
                  <Icon name="info" size={14} />
                  No relationships match the active filters. The bugs that match are still shown.
                </p>
              ) : (
                <p className="graph-note graph-note--quiet">
                  <Icon name="hatch" size={14} />
                  Illustrative graph: every node and line is invented
                </p>
              )
            }
            bottomLeft={<StatusKey />}
            overlay={
              noMatch ? (
                <div className="graph-overlay" role="status">
                  <div className="empty-state">
                    <Icon name="search" size={20} />
                    <p className="empty-state__title">No bugs match</p>
                    <p className="empty-state__text">{describeCriteria(criteria, data.families).join(', ')}</p>
                    <button type="button" className="btn btn--primary" onClick={() => setCriteria(EMPTY_CRITERIA)}>
                      Clear search and filters
                    </button>
                  </div>
                </div>
              ) : null
            }
          />
        )}
      </section>

      <Inspector
        selection={effectiveSelection}
        bugs={data.bugs}
        families={data.families}
        relationships={data.relationships}
        bugsById={bugsById}
        familiesById={familiesById}
        relationshipsById={relationshipsById}
        projects={model.projectShapes}
        visibility={visibility}
        criteria={criteria}
        statusOf={statusOf}
        derive={reviews.derive}
        bugHref={bugHref}
        relationshipHref={relationshipHref}
        onSelect={setSelection}
        onToggleFamily={(id) =>
          setCriteria({
            ...criteria,
            families: criteria.families.includes(id) ? criteria.families.filter((f) => f !== id) : [...criteria.families, id],
          })
        }
      />

      <div className="atlas__lists">
        <GraphList
          bugs={data.bugs}
          families={data.families}
          relationships={data.relationships}
          visibility={visibility}
          statusOf={statusOf}
          criteria={criteria}
        />
      </div>
    </div>
  );
}

export function AtlasPage() {
  return <DataGate>{(atlas) => <AtlasView atlas={atlas} />}</DataGate>;
}
