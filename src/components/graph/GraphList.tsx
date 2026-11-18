'use client';

import Link from 'next/link';
import { FamilyGlyph } from '@/components/ui/FamilyChip';
import { Icon } from '@/components/ui/Icon';
import { StatusPill } from '@/components/ui/StatusBadge';
import { withFrom } from '@/lib/domain/atlas-query';
import { familyNameOf } from '@/lib/domain/search';
import type { Bug, Criteria, Family, Relationship, RelationshipStatus } from '@/lib/domain/types';
import type { Visibility } from '@/lib/domain/visibility';

/**
 * The keyboard and screen-reader path through the graph. It offers the same open-detail
 * actions as activating nodes and edges, and lists only what currently matches.
 */
export function GraphList({
  bugs,
  families,
  relationships,
  visibility,
  statusOf,
  criteria,
}: {
  bugs: readonly Bug[];
  families: readonly Family[];
  relationships: readonly Relationship[];
  visibility: Visibility;
  statusOf: (relationshipId: string) => RelationshipStatus;
  criteria: Criteria;
}) {
  const familiesById = new Map(families.map((f) => [f.id, f]));
  const bugsById = new Map(bugs.map((b) => [b.id, b]));
  const shownBugs = bugs.filter((b) => visibility.visibleBugIds.has(b.id));
  const shownRels = relationships.filter((r) => visibility.visibleRelationshipIds.has(r.id));

  return (
    <section className="browse" aria-labelledby="browse-title">
      <div className="browse__head">
        <h2 id="browse-title" className="section-title">
          Browse as lists
        </h2>
        <p className="browse__sub">The same bugs and relationships as the graph, filtered the same way. Every item is illustrative.</p>
      </div>
      <div className="browse__cols">
        <div>
          <h3 className="browse__title">
            Bugs <span className="count">{shownBugs.length}</span>
          </h3>
          {shownBugs.length === 0 ? (
            <p className="muted">No bugs match.</p>
          ) : (
            <ul className="rows" data-testid="bug-list">
              {shownBugs.map((b) => (
                <li key={b.id}>
                  <Link href={withFrom(`/bugs/${b.id}`, criteria)} className="row" data-testid={`bug-link-${b.id}`}>
                    <FamilyGlyph family={familiesById.get(b.familyId)} />
                    <span className="row__main">
                      <span className="row__title">{b.title}</span>
                      <span className="row__meta">
                        {b.project.name} · {familyNameOf(b, familiesById)}
                        {visibility.isolatedBugIds.has(b.id) ? (
                          <span className="row__flag"> · no matching relationships</span>
                        ) : null}
                      </span>
                    </span>
                    <span className="row__id mono">{b.id}</span>
                    <Icon name="chevronRight" className="row__chev" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="browse__title">
            Relationships <span className="count">{shownRels.length}</span>
          </h3>
          {shownRels.length === 0 ? (
            <p className="muted">No relationships match.</p>
          ) : (
            <ul className="rows" data-testid="relationship-list">
              {shownRels.map((r) => {
                const a = bugsById.get(r.bugAId);
                const b = bugsById.get(r.bugBId);
                return (
                  <li key={r.id}>
                    <Link
                      href={withFrom(`/relationships/${r.id}`, criteria)}
                      className="row row--rel"
                      data-testid={`relationship-link-${r.id}`}
                    >
                      <span className="row__main">
                        <span className="row__title">
                          {a?.title} <span className="row__and" aria-label="and">⇄</span> {b?.title}
                        </span>
                        <span className="row__meta">
                          {a?.project.name} and {b?.project.name}
                          {a && b && a.project.id !== b.project.id ? ' (different projects)' : ''}
                        </span>
                      </span>
                      <StatusPill status={statusOf(r.id)} provenance={r.evidenceProvenance} />
                      <Icon name="chevronRight" className="row__chev" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
