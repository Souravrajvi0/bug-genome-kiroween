'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CodeBlock, type LineRange } from '@/components/ui/CodeBlock';
import { DiffBlock, diffStats } from '@/components/ui/DiffBlock';
import { FamilyGlyph } from '@/components/ui/FamilyChip';
import { Icon } from '@/components/ui/Icon';
import { IllustrativeTag } from '@/components/ui/IllustrativeTag';
import { CODE_MODES, Segmented, type CodeMode } from '@/components/ui/Segmented';
import type { Bug, EvidenceItem, EvidenceRef, Family, SnippetKind } from '@/lib/domain/types';

function rangesFor(selected: EvidenceItem | null, bugId: string, kind: SnippetKind): LineRange[] {
  if (!selected) return [];
  return selected.refs.filter((r) => r.bugId === bugId && r.snippet === kind).map((r) => ({ fromLine: r.fromLine, toLine: r.toLine }));
}

export const refRange = (r: EvidenceRef) => (r.fromLine === r.toLine ? `${r.fromLine}` : `${r.fromLine}–${r.toLine}`);

function ColumnHeader({ bug, family, side, href }: { bug: Bug; family: Family | undefined; side: 'A' | 'B'; href: string }) {
  const stats = diffStats(bug.buggy, bug.fixed);
  return (
    <header className={`bench__head bench__head--${side.toLowerCase()}`}>
      <div className="bench__id">
        <span className="side-badge" aria-hidden="true">
          {side}
        </span>
        <div className="bench__id-text">
          <p className="sr-only">Bug {side}</p>
          <h3 className="bench__title">
            <Link href={href}>{bug.title}</Link>
          </h3>
          <p className="bench__meta">
            <FamilyGlyph family={family} /> {bug.project.name} · {bug.language} · <span className="diff-stat diff-stat--del">−{stats.removed}</span>{' '}
            <span className="diff-stat diff-stat--add">+{stats.added}</span>
          </p>
        </div>
      </div>
      <dl className="bench__facts">
        <div>
          <dt>
            Suspected root cause <span className="hypo">Hypothesis</span>
          </dt>
          <dd>{bug.suspectedRootCause}</dd>
        </div>
        <div>
          <dt>Fix summary</dt>
          <dd>{bug.fixSummary}</dd>
        </div>
      </dl>
    </header>
  );
}

/**
 * Side-by-side comparison. Columns are the two bugs. In diff mode each column shows the change from
 * buggy to fixed code; in before-and-after mode the rows are buggy and fixed code. Lines named by the
 * selected evidence item are highlighted in both columns at the same time, and a connector names them.
 */
export function EvidenceBench({
  bugA,
  bugB,
  familyA,
  familyB,
  evidence,
  selected,
  selectedIndex,
  onSelectEvidence,
  hrefA,
  hrefB,
}: {
  bugA: Bug;
  bugB: Bug;
  familyA: Family | undefined;
  familyB: Family | undefined;
  evidence: readonly EvidenceItem[];
  selected: EvidenceItem | null;
  selectedIndex: number;
  onSelectEvidence: (id: string) => void;
  hrefA: string;
  hrefB: string;
}) {
  const [mode, setMode] = useState<CodeMode>('diff');

  const cell = (bug: Bug, kind: SnippetKind, side: 'a' | 'b') => (
    <div className={`bench__cell bench__cell--${side} bench__cell--${kind}`} key={`${bug.id}-${kind}`}>
      <p className={`code-label code-label--${kind}`}>{kind === 'buggy' ? 'Buggy code' : 'Fixed code'}</p>
      <CodeBlock
        snippet={kind === 'buggy' ? bug.buggy : bug.fixed}
        language={bug.language}
        label={`${bug.title}, ${kind} code`}
        highlight={rangesFor(selected, bug.id, kind)}
        tone={kind}
      />
    </div>
  );

  const diffCell = (bug: Bug, side: 'a' | 'b') => (
    <div className={`bench__cell bench__cell--${side}`} key={`${bug.id}-diff`}>
      <DiffBlock
        before={bug.buggy}
        after={bug.fixed}
        language={bug.language}
        label={`${bug.title}, change from buggy to fixed code`}
        highlightBefore={rangesFor(selected, bug.id, 'buggy')}
        highlightAfter={rangesFor(selected, bug.id, 'fixed')}
      />
    </div>
  );

  const refsFor = (bugId: string) => selected?.refs.filter((r) => r.bugId === bugId) ?? [];
  const refChip = (side: 'A' | 'B', refs: readonly EvidenceRef[]) =>
    refs.map((r) => (
      <span key={`${r.bugId}-${r.snippet}-${r.fromLine}`} className={`ref-chip ref-chip--${r.snippet}`}>
        <b>{side}</b> {r.snippet} {refRange(r)}
      </span>
    ));

  return (
    <section className="bench" aria-labelledby="bench-title" data-testid="evidence-bench" data-mode={mode}>
      <div className="bench__bar">
        <h2 id="bench-title" className="section-title">
          <Icon name="compare" />
          Code comparison <IllustrativeTag isMock={bugA.isMock && bugB.isMock} />
        </h2>
        <div className="bench__tools">
          <div className="stepper" role="group" aria-label="Highlight evidence item">
            <span className="stepper__label" aria-hidden="true">
              Evidence
            </span>
            {evidence.map((e, i) => (
              <button
                key={e.id}
                type="button"
                className="stepper__btn"
                aria-pressed={selected?.id === e.id}
                aria-label={`Evidence ${i + 1}: ${e.statement}`}
                title={e.statement}
                onClick={() => onSelectEvidence(e.id)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <Segmented label="Code view" value={mode} options={CODE_MODES} onChange={setMode} />
        </div>
      </div>

      <div className="bench__grid">
        <ColumnHeader bug={bugA} family={familyA} side="A" href={hrefA} />
        <ColumnHeader bug={bugB} family={familyB} side="B" href={hrefB} />

        <div className={`connector${selected ? ' is-on' : ''}`} aria-live="polite" data-testid="evidence-connector">
          {selected ? (
            <>
              <span className="connector__refs">{refChip('A', refsFor(bugA.id))}</span>
              <span className="connector__line" aria-hidden="true" />
              <span className="connector__text">
                <span className="connector__num">{selectedIndex + 1}</span>
                {selected.statement}
              </span>
              <span className="connector__line" aria-hidden="true" />
              <span className="connector__refs">{refChip('B', refsFor(bugB.id))}</span>
            </>
          ) : (
            <span className="connector__hint">
              <Icon name="cursor" size={14} />
              Select an evidence item to highlight the lines it names in both bugs.
            </span>
          )}
        </div>

        {mode === 'diff' ? (
          <>
            {diffCell(bugA, 'a')}
            {diffCell(bugB, 'b')}
          </>
        ) : (
          <>
            {cell(bugA, 'buggy', 'a')}
            {cell(bugB, 'buggy', 'b')}
            {cell(bugA, 'fixed', 'a')}
            {cell(bugB, 'fixed', 'b')}
          </>
        )}
      </div>
    </section>
  );
}
