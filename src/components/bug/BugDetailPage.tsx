'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useReviews } from '@/components/providers/ReviewProvider';
import { DataGate } from '@/components/shell/DataGate';
import { NotFoundMessage } from '@/components/shell/NotFoundMessage';
import { PageHeading } from '@/components/shell/PageHeading';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { DiffBlock, diffStats } from '@/components/ui/DiffBlock';
import { FamilyChip, FamilyGlyph } from '@/components/ui/FamilyChip';
import { Icon } from '@/components/ui/Icon';
import { IllustrativeTag } from '@/components/ui/IllustrativeTag';
import { CODE_MODES, Segmented, type CodeMode } from '@/components/ui/Segmented';
import { StatusPill } from '@/components/ui/StatusBadge';
import { backHref, withFromRaw } from '@/lib/domain/atlas-query';
import { isCrossProject } from '@/lib/domain/status';

export function BugDetailPage({ bugId }: { bugId: string }) {
  const from = useSearchParams().get('from');
  const reviews = useReviews();
  const [mode, setMode] = useState<CodeMode>('diff');

  return (
    <DataGate>
      {(atlas) => {
        const bug = atlas.bugsById.get(bugId);
        if (!bug) return <NotFoundMessage what="Bug" />;
        const opts = { knownFamilyIds: atlas.data.families.map((f) => f.id) };
        const family = atlas.familiesById.get(bug.familyId);
        const stats = diffStats(bug.buggy, bug.fixed);
        const related = atlas.data.relationships
          .filter((r) => r.bugAId === bug.id || r.bugBId === bug.id)
          .map((r) => ({ rel: r, other: atlas.bugsById.get(r.bugAId === bug.id ? r.bugBId : r.bugAId)! }))
          .sort(
            (a, b) =>
              Number(isCrossProject(b.rel, atlas.bugsById)) - Number(isCrossProject(a.rel, atlas.bugsById)) ||
              a.rel.id.localeCompare(b.rel.id),
          );

        return (
          <article className="page page--bug">
            <nav aria-label="Breadcrumb" className="crumbs">
              <Link href={backHref(from, opts)} className="crumbs__link">
                <Icon name="arrowLeft" size={14} />
                Atlas Graph
              </Link>
              <span className="crumbs__sep" aria-hidden="true">
                /
              </span>
              <span className="crumbs__here" aria-current="page">
                Bug <span className="mono">{bug.id}</span>
              </span>
            </nav>

            <header className="bug-hero">
              <div className="bug-hero__meta">
                <FamilyChip family={family} />
                <span className="meta-item">
                  <Icon name="layers" size={14} />
                  {bug.project.name}
                </span>
                <span className="meta-item">
                  <Icon name="code" size={14} />
                  {bug.language}
                </span>
              </div>
              <PageHeading title={bug.title} documentTitle={`Bug: ${bug.title}`} className="page-title--hero" />
              <section className="bug-hero__desc" aria-labelledby="desc">
                <h2 id="desc" className="sr-only">
                  Description
                </h2>
                <p className="lede">{bug.description}</p>
                <IllustrativeTag isMock={bug.isMock} label="Illustrative description" />
              </section>
            </header>

            <div className="bug-grid">
              <div className="bug-grid__main">
                <ol className="flow" aria-label="From symptom to fix">
                  <li className="flow__step flow__step--symptom">
                    <section aria-labelledby="sym">
                      <p className="flow__index" aria-hidden="true">
                        01
                      </p>
                      <h2 id="sym" className="flow__title">
                        Symptoms
                      </h2>
                      <ul className="dash-list">
                        {bug.symptoms.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </section>
                  </li>
                  <li className="flow__step flow__step--root">
                    <section aria-labelledby="root">
                      <p className="flow__index" aria-hidden="true">
                        02
                      </p>
                      <h2 id="root" className="flow__title">
                        Suspected root cause <span className="hypo">Hypothesis</span>
                      </h2>
                      <p>{bug.suspectedRootCause}</p>
                      <p className="fine">A hypothesis for review. It is not a settled fact.</p>
                    </section>
                  </li>
                  <li className="flow__step flow__step--fix">
                    <section aria-labelledby="fix">
                      <p className="flow__index" aria-hidden="true">
                        03
                      </p>
                      <h2 id="fix" className="flow__title">
                        Fix summary <IllustrativeTag isMock={bug.isMock} />
                      </h2>
                      <p>{bug.fixSummary}</p>
                    </section>
                  </li>
                </ol>

                <section className="code-sec" aria-labelledby="code">
                  <div className="code-sec__bar">
                    <h2 id="code" className="section-title">
                      <Icon name="code" />
                      Code change <IllustrativeTag isMock={bug.isMock} label="Illustrative code" />
                    </h2>
                    <div className="code-sec__tools">
                      <span className="diff-stats" aria-label={`${stats.removed} lines removed, ${stats.added} lines added`}>
                        <span className="diff-stat diff-stat--del">−{stats.removed}</span>
                        <span className="diff-stat diff-stat--add">+{stats.added}</span>
                      </span>
                      <Segmented label="Code view" value={mode} options={CODE_MODES} onChange={setMode} />
                    </div>
                  </div>
                  {mode === 'diff' ? (
                    <DiffBlock
                      before={bug.buggy}
                      after={bug.fixed}
                      language={bug.language}
                      label={`${bug.title}, change from buggy to fixed code`}
                    />
                  ) : (
                    <div className="split">
                      <div>
                        <p className="code-label code-label--buggy">Buggy code</p>
                        <CodeBlock snippet={bug.buggy} language={bug.language} label={`${bug.title}, buggy code`} tone="buggy" />
                      </div>
                      <div>
                        <p className="code-label code-label--fixed">Fixed code</p>
                        <CodeBlock snippet={bug.fixed} language={bug.language} label={`${bug.title}, fixed code`} tone="fixed" />
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <aside className="bug-grid__side">
                <section className="side-sec" aria-labelledby="related">
                  <h2 id="related" className="section-title">
                    Related bugs <span className="count">{related.length}</span>
                  </h2>
                  {related.length === 0 ? (
                    <p className="muted">No relationships are proposed for this bug.</p>
                  ) : (
                    <ul className="related" data-testid="related-list">
                      {related.map(({ rel, other }) => {
                        const d = reviews.derive(rel);
                        const otherFamily = atlas.familiesById.get(other.familyId);
                        return (
                          <li key={rel.id} className="related__item">
                            <Link href={withFromRaw(`/relationships/${rel.id}`, from, opts)} className="related__rel">
                              <span className="related__title">{other.title}</span>
                              <span className="related__meta">
                                <FamilyGlyph family={otherFamily} /> {other.project.name}
                                {isCrossProject(rel, atlas.bugsById) ? ' (different project)' : ''}
                              </span>
                              <span className="sr-only">. Open the relationship.</span>
                            </Link>
                            <div className="related__foot">
                              <StatusPill status={d.effectiveStatus} provenance={d.provenance} />
                              <Link href={withFromRaw(`/bugs/${other.id}`, from, opts)} className="related__bug">
                                Open {other.id}
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section className="side-sec" aria-labelledby="proj">
                  <h2 id="proj" className="section-title">
                    Project
                  </h2>
                  <dl className="kv">
                    <div>
                      <dt>Name</dt>
                      <dd>{bug.project.name}</dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>{bug.project.type}</dd>
                    </div>
                    <div>
                      <dt>About</dt>
                      <dd>{bug.project.description}</dd>
                    </div>
                  </dl>
                </section>
              </aside>
            </div>
          </article>
        );
      }}
    </DataGate>
  );
}
