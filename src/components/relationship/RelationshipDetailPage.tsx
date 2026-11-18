'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useReviews } from '@/components/providers/ReviewProvider';
import { DataGate } from '@/components/shell/DataGate';
import { NotFoundMessage } from '@/components/shell/NotFoundMessage';
import { PageHeading } from '@/components/shell/PageHeading';
import { FamilyGlyph } from '@/components/ui/FamilyChip';
import { Icon } from '@/components/ui/Icon';
import { IllustrativeTag } from '@/components/ui/IllustrativeTag';
import { StatusLine } from '@/components/ui/StatusBadge';
import { backHref, withFromRaw } from '@/lib/domain/atlas-query';
import { isCrossProject, statusLabel } from '@/lib/domain/status';
import type { Bug, EvidenceRef, Family, SnippetKind } from '@/lib/domain/types';
import { EvidenceBench, refRange } from './EvidenceBench';
import { ReviewBench } from './ReviewBench';

const rangeText = (r: EvidenceRef) => (r.fromLine === r.toLine ? `${r.fromLine}` : `${r.fromLine} to ${r.toLine}`);
const kindLabel = (k: SnippetKind) => (k === 'buggy' ? 'buggy' : 'fixed');

function PairCard({ bug, family, side, href }: { bug: Bug; family: Family | undefined; side: 'A' | 'B'; href: string }) {
  return (
    <Link href={href} className={`pair-card pair-card--${side.toLowerCase()}`}>
      <span className="side-badge" aria-hidden="true">
        {side}
      </span>
      <span className="pair-card__text">
        <span className="pair-card__project">
          <span className="sr-only">Bug {side}, </span>
          {bug.project.name} · {bug.language}
        </span>
        <span className="pair-card__title">{bug.title}</span>
        <span className="pair-card__meta">
          <FamilyGlyph family={family} /> {family?.name ?? 'Unknown family'}
        </span>
      </span>
      <Icon name="arrowRight" className="pair-card__go" />
    </Link>
  );
}

export function RelationshipDetailPage({ relationshipId }: { relationshipId: string }) {
  const from = useSearchParams().get('from');
  const reviews = useReviews();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const toggle = (id: string) => setSelectedId((cur) => (cur === id ? null : id));

  return (
    <DataGate>
      {(atlas) => {
        const rel = atlas.relationshipsById.get(relationshipId);
        const bugA = rel ? atlas.bugsById.get(rel.bugAId) : undefined;
        const bugB = rel ? atlas.bugsById.get(rel.bugBId) : undefined;
        if (!rel || !bugA || !bugB) return <NotFoundMessage what="Relationship" />;
        const opts = { knownFamilyIds: atlas.data.families.map((f) => f.id) };
        const derived = reviews.derive(rel);
        const selectedIndex = rel.evidence.findIndex((e) => e.id === selectedId);
        const selected = selectedIndex >= 0 ? rel.evidence[selectedIndex]! : null;
        const cross = isCrossProject(rel, atlas.bugsById);
        const hrefA = withFromRaw(`/bugs/${bugA.id}`, from, opts);
        const hrefB = withFromRaw(`/bugs/${bugB.id}`, from, opts);
        const label = (bugId: string) => (bugId === bugA.id ? 'A' : 'B');
        const famA = atlas.familiesById.get(bugA.familyId);
        const famB = atlas.familiesById.get(bugB.familyId);
        const sameFamily = bugA.familyId === bugB.familyId;
        const status = derived.effectiveStatus;
        const heading = rel.negative
          ? 'Similar symptoms, different root causes'
          : sameFamily
            ? (famA?.name ?? 'Unknown family')
            : `${famA?.name ?? 'Unknown family'} and ${famB?.name ?? 'Unknown family'}`;

        return (
          <article className="page page--rel">
            <nav aria-label="Breadcrumb" className="crumbs">
              <Link href={backHref(from, opts)} className="crumbs__link">
                <Icon name="arrowLeft" size={14} />
                Atlas Graph
              </Link>
              <span className="crumbs__sep" aria-hidden="true">
                /
              </span>
              <span className="crumbs__here" aria-current="page">
                Relationship <span className="mono">{rel.id}</span>
              </span>
            </nav>

            <div className="rel-hero">
              <div className="rel-hero__main">
                <p className="eyebrow eyebrow--accent">
                  {rel.negative ? 'Negative example' : sameFamily ? 'Suspected shared mechanism' : 'Proposed relationship'}
                  {cross ? <span className="eyebrow__sep">Crosses projects</span> : null}
                </p>
                <PageHeading title={heading} documentTitle={`Relationship ${rel.id}`} className="page-title--hero" />

                <section className={`explain${rel.negative ? ' explain--negative' : ''}`} aria-labelledby="expl">
                  <h2 id="expl" className="explain__label">
                    {rel.negative ? 'Why these are different' : 'Explanation'} <IllustrativeTag isMock={rel.isMock} />
                  </h2>
                  <p className="explain__text">{rel.explanation}</p>
                  {rel.negative ? (
                    <dl className="negative" aria-label="Different root causes">
                      <div>
                        <dt>
                          <span className="side-badge side-badge--sm" aria-hidden="true">
                            A
                          </span>
                          Root cause of bug A
                        </dt>
                        <dd>{rel.negative.rootCauseA}</dd>
                      </div>
                      <div>
                        <dt>
                          <span className="side-badge side-badge--sm" aria-hidden="true">
                            B
                          </span>
                          Root cause of bug B
                        </dt>
                        <dd>{rel.negative.rootCauseB}</dd>
                      </div>
                    </dl>
                  ) : null}
                  {derived.reviewState === 'unreviewed' ? (
                    <p className="fine">
                      <Icon name="info" size={14} /> A hypothesis until a reviewer decides.
                    </p>
                  ) : null}
                </section>

                <div className={`pair pair--${status}`}>
                  <PairCard bug={bugA} family={famA} side="A" href={hrefA} />
                  <div className="pair__link" aria-label={`${statusLabel(status, derived.provenance)}${cross ? ', different projects' : ''}`}>
                    <span className="pair__wire" aria-hidden="true">
                      <StatusLine status={status} width={56} />
                    </span>
                    <span className="pair__status" aria-hidden="true">
                      {statusLabel(status, derived.provenance)}
                    </span>
                    {cross ? (
                      <span className="pair__cross" aria-hidden="true">
                        crosses projects
                      </span>
                    ) : null}
                  </div>
                  <PairCard bug={bugB} family={famB} side="B" href={hrefB} />
                </div>
              </div>
              <ReviewBench rel={rel} />
            </div>

            <section className="evidence-sec" aria-labelledby="evid">
              <div className="evidence-sec__head">
                <h2 id="evid" className="section-title">
                  <Icon name="link" />
                  Supporting evidence <IllustrativeTag isMock={rel.isMock} />
                </h2>
                <p className="fine">Select an item to highlight the code lines it refers to, in both bugs at once.</p>
              </div>
              <ol className="evidence" data-testid="evidence-list">
                {rel.evidence.map((e, i) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className="evidence__btn"
                      aria-pressed={selectedId === e.id}
                      data-testid={`evidence-${e.id}`}
                      onClick={() => toggle(e.id)}
                    >
                      <span className="evidence__num" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span className="evidence__body">
                        <span className="evidence__text">{e.statement}</span>
                        <span className="evidence__refs">
                          {e.refs.map((r) => (
                            <span
                              key={`${r.bugId}-${r.snippet}-${r.fromLine}`}
                              className={`ref-chip ref-chip--${r.snippet}`}
                              aria-label={`Bug ${label(r.bugId)}, ${kindLabel(r.snippet)} lines ${rangeText(r)}`}
                            >
                              <b>{label(r.bugId)}</b> {kindLabel(r.snippet)} {refRange(r)}
                            </span>
                          ))}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>

            <EvidenceBench
              bugA={bugA}
              bugB={bugB}
              familyA={famA}
              familyB={famB}
              evidence={rel.evidence}
              selected={selected}
              selectedIndex={selectedIndex}
              onSelectEvidence={toggle}
              hrefA={hrefA}
              hrefB={hrefB}
            />
          </article>
        );
      }}
    </DataGate>
  );
}
