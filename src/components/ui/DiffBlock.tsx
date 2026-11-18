'use client';

import { Highlight, type Token } from 'prism-react-renderer';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { diffSnippets } from '@/lib/domain/diff';
import type { Language, Snippet } from '@/lib/domain/types';
import { CODE_THEME, type LineRange } from './CodeBlock';

const inRanges = (n: number, ranges: readonly LineRange[]) => ranges.some((r) => n >= r.fromLine && n <= r.toLine);

type TokenProps = (input: { token: Token }) => { className: string; style?: React.CSSProperties; children?: ReactNode };
interface Tokenized {
  lines: Token[][];
  props: TokenProps;
}

/** Tokenizes one snippet with Prism and hands the token lines to a render function. */
function Tokens({ snippet, language, children }: { snippet: Snippet; language: Language; children: (t: Tokenized) => ReactNode }) {
  return (
    <Highlight theme={CODE_THEME} code={snippet.lines.join('\n')} language={language === 'TypeScript' ? 'tsx' : 'jsx'}>
      {({ tokens, getTokenProps }) => <>{children({ lines: tokens, props: getTokenProps as unknown as TokenProps })}</>}
    </Highlight>
  );
}

function Line({ tokens, props }: { tokens: Token[] | undefined; props: TokenProps }) {
  if (!tokens || tokens.length === 0 || (tokens.length === 1 && tokens[0]?.content === '')) return <>{'\u200B'}</>;
  return (
    <>
      {tokens.map((token, k) => {
        const { className, style, children } = props({ token });
        return (
          <span key={k} className={className} style={style}>
            {children}
          </span>
        );
      })}
    </>
  );
}

/**
 * Unified diff of a buggy snippet against its fixed snippet: removed, added and unchanged lines,
 * with both line numbers. Evidence ranges on the buggy snippet mark old line numbers; ranges on the
 * fixed snippet mark new line numbers. Indentation-only changes count as unchanged.
 */
export function DiffBlock({
  before,
  after,
  language,
  label,
  highlightBefore = [],
  highlightAfter = [],
}: {
  before: Snippet;
  after: Snippet;
  language: Language;
  label: string;
  highlightBefore?: readonly LineRange[];
  highlightAfter?: readonly LineRange[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const diff = useMemo(() => diffSnippets(before, after), [before, after]);

  const marks = diff.lines.map((l) =>
    l.kind === 'del'
      ? inRanges(l.oldLine, highlightBefore)
      : l.kind === 'add'
        ? inRanges(l.newLine, highlightAfter)
        : inRanges(l.oldLine, highlightBefore) || inRanges(l.newLine, highlightAfter),
  );
  const firstMark = marks.indexOf(true);

  // Bring the first highlighted row into view inside the panel only (never scrolls the page).
  useEffect(() => {
    const panel = ref.current;
    if (!panel || firstMark < 0) return;
    const row = panel.querySelector<HTMLElement>(`[data-row="${firstMark}"]`);
    if (!row) return;
    const top = row.offsetTop - 8;
    const bottom = row.offsetTop + row.offsetHeight + 8;
    if (top < panel.scrollTop) panel.scrollTop = top;
    else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight;
  }, [firstMark, highlightBefore, highlightAfter]);

  return (
    <div ref={ref} className="code code--diff" role="region" tabIndex={0} aria-label={label} data-testid="code-panel">
      <Tokens snippet={before} language={language}>
        {(oldTokens) => (
          <Tokens snippet={after} language={language}>
            {(newTokens) => (
              <div className="diff" role="table" aria-label={`${label}: ${diff.removed} removed, ${diff.added} added`}>
                {diff.lines.map((l, i) => {
                  const on = marks[i];
                  const sign = l.kind === 'add' ? '+' : l.kind === 'del' ? '−' : ' ';
                  const kindText = l.kind === 'add' ? 'added' : l.kind === 'del' ? 'removed' : 'unchanged';
                  return (
                    <div
                      key={i}
                      role="row"
                      className={`diff__row diff__row--${l.kind}${on ? ' is-hl' : ''}`}
                      data-row={i}
                      data-kind={l.kind}
                      data-highlighted={on ? 'true' : 'false'}
                    >
                      <span role="cell" className="diff__ln" aria-label={l.kind === 'add' ? undefined : `buggy line ${l.oldLine}`}>
                        {l.kind === 'add' ? '' : l.oldLine}
                      </span>
                      <span role="cell" className="diff__ln" aria-label={l.kind === 'del' ? undefined : `fixed line ${l.newLine}`}>
                        {l.kind === 'del' ? '' : l.newLine}
                      </span>
                      <span role="cell" className="diff__sign" aria-label={kindText}>
                        {sign}
                      </span>
                      <span role="cell" className="diff__code">
                        {l.kind === 'add' ? (
                          <Line tokens={newTokens.lines[l.newIndex]} props={newTokens.props} />
                        ) : (
                          <Line tokens={oldTokens.lines[l.oldIndex]} props={oldTokens.props} />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Tokens>
        )}
      </Tokens>
    </div>
  );
}

export function diffStats(before: Snippet, after: Snippet) {
  const d = diffSnippets(before, after);
  return { added: d.added, removed: d.removed };
}
