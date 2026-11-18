'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { FamilyChip, FamilyGlyph } from '@/components/ui/FamilyChip';
import { Icon } from '@/components/ui/Icon';
import { IllustrativeTag } from '@/components/ui/IllustrativeTag';
import { ReviewStateBadge, StatusLine, StatusPill } from '@/components/ui/StatusBadge';
import type { DerivedRelationship } from '@/lib/domain/status';
import { statusLabel } from '@/lib/domain/status';
import type { Bug, Criteria, Family, Relationship, RelationshipStatus } from '@/lib/domain/types';
import type { Visibility } from '@/lib/domain/visibility';
import type { Selection } from './GraphController';
import { GraphLegend } from './GraphLegend';
import type { NodeShape } from './graphModel';

interface InspectorProps {
  selection: Selection;
  bugs: readonly Bug[];
  families: readonly Family[];
  relationships: readonly Relationship[];
  bugsById: ReadonlyMap<string, Bug>;
  familiesById: ReadonlyMap<string, Family>;
  relationshipsById: ReadonlyMap<string, Relationship>;
  projects: ReadonlyMap<string, { name: string; shape: NodeShape; tag: string }>;
  visibility: Visibility;
  criteria: Criteria;
  statusOf: (relationshipId: string) => RelationshipStatus;
  derive: (rel: Relationship) => DerivedRelationship;
  bugHref: (bugId: string) => string;
  relationshipHref: (relationshipId: string) => string;
  onSelect: (selection: Selection) => void;
  onToggleFamily: (familyId: string) => void;
}

/**
 * Contextual panel beside the graph. It summarizes the selected bug or relationship and links to the
 * full view. Reviewing happens only on the relationship page, next to the code.
 */
export function Inspector(props: InspectorProps) {
  const { selection } = props;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const key = selection ? `${selection.kind}:${selection.id}` : 'none';

  // Keep the panel scrolled to the top when the subject changes.
  useEffect(() => {
    headingRef.current?.closest('.inspector')?.scrollTo({ top: 0 });
  }, [key]);

  const bug = selection?.kind === 'bug' ? props.bugsById.get(selection.id) : undefined;
  const rel = selection?.kind === 'relationship' ? props.relationshipsById.get(selection.id) : undefined;

  return (
    <aside className="inspector" aria-labelledby="inspector-title" data-testid="inspector">
      <div className="inspector__body" key={key}>
        {bug ? (
          <BugInspector {...props} bug={bug} headingRef={headingRef} />
        ) : rel ? (
          <RelationshipInspector {...props} rel={rel} headingRef={headingRef} />
        ) : (
          <EmptyInspector {...props} headingRef={headingRef} />
        )}
      </div>
    </aside>
  );
}

type Ref = { headingRef: React.RefObject<HTMLHeadingElement | null> };

function InspectorHead({ eyebrow, onClear }: { eyebrow: React.ReactNode; onClear?: () => void }) {
  return (
    <div className="inspector__head">
      <div className="inspector__eyebrow">{eyebrow}</div>
      {onClear ? (
        <button type="button" className="icon-btn icon-btn--ghost" aria-label="Clear selection" title="Clear selection (Esc)" onClick={onClear}>
          <Icon name="x" />
        </button>
      ) : null}
    </div>
  );
}

function EmptyInspector({ families, bugs, visibility, criteria, projects, onToggleFamily, headingRef }: InspectorProps & Ref) {
  return (
    <>
      <InspectorHead eyebrow={<span className="eyebrow">Inspector</span>} />
      <h2 id="inspector-title" ref={headingRef} tabIndex={-1} className="inspector__title">
        Select a bug or a line
      </h2>
      <p className="inspector__lede">
        A node is one fixed bug. A line is a proposed relationship between two bugs from different projects.
      </p>
      <ul className="hints" aria-label="Graph controls">
        <li>
          <kbd>Click</kbd> inspect
        </li>
        <li>
          <kbd>Double-click</kbd> open
        </li>
        <li>
          <kbd>Esc</kbd> clear
        </li>
      </ul>

      <section className="inspector__section" aria-labelledby="fam-title">
        <h3 id="fam-title" className="eyebrow">
          Families
        </h3>
        <ul className="family-list">
          {families.map((f) => {
            const total = bugs.filter((b) => b.familyId === f.id).length;
            const shown = bugs.filter((b) => b.familyId === f.id && visibility.visibleBugIds.has(b.id)).length;
            const on = criteria.families.includes(f.id);
            return (
              <li key={f.id}>
                <button
                  type="button"
                  className="family-row"
                  aria-pressed={on}
                  onClick={() => onToggleFamily(f.id)}
                  style={{ ['--fam' as string]: f.color }}
                >
                  <FamilyGlyph family={f} />
                  <span className="family-row__text">
                    <span className="family-row__name">{f.name}</span>
                    <span className="family-row__summary">{f.summary}</span>
                  </span>
                  <span className="family-row__count" aria-label={`${shown} of ${total} bugs shown`}>
                    {shown}/{total}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="inspector__fine">Select a family to filter the graph to it. Families are illustrative groupings.</p>
      </section>

      <GraphLegend families={families} projects={projects} />
    </>
  );
}

function BugInspector({
  bug,
  familiesById,
  relationships,
  bugsById,
  visibility,
  statusOf,
  derive,
  bugHref,
  onSelect,
  headingRef,
}: InspectorProps & Ref & { bug: Bug }) {
  const family = familiesById.get(bug.familyId);
  const rels = relationships.filter((r) => r.bugAId === bug.id || r.bugBId === bug.id);
  const shown = rels.filter((r) => visibility.visibleRelationshipIds.has(r.id));
  const hidden = rels.length - shown.length;
  return (
    <>
      <InspectorHead eyebrow={<FamilyChip family={family} size="sm" />} onClear={() => onSelect(null)} />
      <h2 id="inspector-title" ref={headingRef} tabIndex={-1} className="inspector__title">
        {bug.title}
      </h2>
      <p className="inspector__meta">
        <span>{bug.project.name}</span>
        <span aria-hidden="true">·</span>
        <span>{bug.language}</span>
        <span aria-hidden="true">·</span>
        <span className="mono">{bug.id}</span>
      </p>

      <section className="inspector__section" aria-labelledby="i-sym">
        <h3 id="i-sym" className="eyebrow">
          Symptoms
        </h3>
        <ul className="dash-list">
          {bug.symptoms.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="inspector__section" aria-labelledby="i-root">
        <h3 id="i-root" className="eyebrow">
          Suspected root cause <span className="hypo">Hypothesis</span>
        </h3>
        <p className="inspector__text">{bug.suspectedRootCause}</p>
      </section>

      <section className="inspector__section" aria-labelledby="i-rel">
        <h3 id="i-rel" className="eyebrow">
          Relationships <span className="count">{shown.length}</span>
        </h3>
        {shown.length === 0 ? (
          <p className="inspector__fine">No relationships match the active filters.</p>
        ) : (
          <ul className="rel-rows">
            {shown.map((r) => {
              const other = bugsById.get(r.bugAId === bug.id ? r.bugBId : r.bugAId);
              const s = statusOf(r.id);
              const d = derive(r);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    className={`rel-row rel-row--${s}`}
                    onClick={() => onSelect({ kind: 'relationship', id: r.id })}
                    aria-label={`${other?.title ?? 'Unknown bug'}, ${other?.project.name ?? ''}. ${statusLabel(s, d.provenance)}. Inspect relationship.`}
                  >
                    <StatusLine status={s} width={18} />
                    <span className="rel-row__text">
                      <span className="rel-row__title">{other?.title}</span>
                      <span className="rel-row__meta">
                        {other?.project.name} · {statusLabel(s, d.provenance)}
                      </span>
                    </span>
                    <Icon name="chevronRight" className="rel-row__chev" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {hidden > 0 ? (
          <p className="inspector__fine">
            {hidden} more hidden by the active filters.
          </p>
        ) : null}
      </section>

      <div className="inspector__actions">
        <Link href={bugHref(bug.id)} className="btn btn--primary btn--block" data-testid="inspector-open">
          Open bug detail <Icon name="arrowRight" />
        </Link>
        <IllustrativeTag isMock={bug.isMock} label="Illustrative bug, not a real report" />
      </div>
    </>
  );
}

function RelationshipInspector({
  rel,
  bugsById,
  familiesById,
  statusOf,
  derive,
  relationshipHref,
  onSelect,
  headingRef,
}: InspectorProps & Ref & { rel: Relationship }) {
  const a = bugsById.get(rel.bugAId);
  const b = bugsById.get(rel.bugBId);
  const d = derive(rel);
  const status = statusOf(rel.id);
  const cross = a && b && a.project.id !== b.project.id;
  const side = (bug: Bug | undefined, letter: 'A' | 'B') =>
    bug ? (
      <button type="button" className="pair-row" onClick={() => onSelect({ kind: 'bug', id: bug.id })}>
        <span className="pair-row__side">{letter}</span>
        <span className="pair-row__text">
          <span className="pair-row__title">{bug.title}</span>
          <span className="pair-row__meta">
            <FamilyGlyph family={familiesById.get(bug.familyId)} /> {bug.project.name}
          </span>
        </span>
      </button>
    ) : null;

  return (
    <>
      <InspectorHead
        eyebrow={
          <span className="eyebrow">
            Relationship <span className="mono">{rel.id}</span>
          </span>
        }
        onClear={() => onSelect(null)}
      />
      <h2 id="inspector-title" ref={headingRef} tabIndex={-1} className="inspector__title inspector__title--sm">
        {rel.negative ? 'Similar symptoms, different root causes' : 'Possible shared failure mechanism'}
      </h2>

      <div className={`pair-stack pair-stack--${status}`}>
        {side(a, 'A')}
        <div className="pair-stack__link" aria-hidden="true">
          <StatusLine status={status} width={28} />
          {cross ? <span>crosses projects</span> : null}
        </div>
        {side(b, 'B')}
      </div>

      <div className="inspector__status">
        <StatusPill status={d.effectiveStatus} provenance={d.provenance} />
        <ReviewStateBadge state={d.reviewState} />
      </div>

      <section className="inspector__section" aria-labelledby="i-why">
        <h3 id="i-why" className="eyebrow">
          {rel.negative ? 'Why they differ' : 'Why they may be related'}
          <IllustrativeTag isMock={rel.isMock} />
        </h3>
        <p className="inspector__text">{rel.explanation}</p>
        {d.reviewState === 'unreviewed' ? <p className="inspector__fine">A hypothesis until a reviewer decides.</p> : null}
      </section>

      <div className="inspector__actions">
        <Link href={relationshipHref(rel.id)} className="btn btn--primary btn--block" data-testid="inspector-open">
          Inspect {rel.evidence.length} evidence {rel.evidence.length === 1 ? 'item' : 'items'} <Icon name="arrowRight" />
        </Link>
        <p className="inspector__fine">Accept and Reject are on the evidence page, next to the code.</p>
      </div>
    </>
  );
}
