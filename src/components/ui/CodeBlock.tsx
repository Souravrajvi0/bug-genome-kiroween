'use client';

import { Highlight, type PrismTheme } from 'prism-react-renderer';
import { useEffect, useRef } from 'react';
import type { Language, Snippet } from '@/lib/domain/types';

export interface LineRange {
  fromLine: number;
  toLine: number;
}

/** A calm syntax theme tuned to the app's surfaces: cool neutrals, teal and violet accents, warm literals. */
export const CODE_THEME: PrismTheme = {
  plain: { color: '#D3DBE8', backgroundColor: 'transparent' },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: '#6B778C', fontStyle: 'italic' } },
    { types: ['punctuation'], style: { color: '#8B96A8' } },
    { types: ['operator'], style: { color: '#9AA6B8' } },
    { types: ['keyword', 'control-flow', 'module', 'boolean'], style: { color: '#C4A7FF' } },
    { types: ['function', 'function-variable', 'method'], style: { color: '#7DD3FC' } },
    { types: ['class-name', 'maybe-class-name', 'builtin'], style: { color: '#5EEAD4' } },
    { types: ['string', 'template-string', 'char', 'attr-value', 'regex'], style: { color: '#F5C38B' } },
    { types: ['number', 'constant', 'symbol'], style: { color: '#F59E8B' } },
    { types: ['property', 'property-access', 'attr-name'], style: { color: '#BBD3F0' } },
    { types: ['tag'], style: { color: '#7DD3FC' } },
    { types: ['parameter'], style: { color: '#E5E9F0' } },
  ],
};

/**
 * Syntax-highlighted, monospaced code with line numbers. Lines inside `highlight` ranges are marked.
 * The panel is a focusable, scrollable region so keyboard users can read long snippets.
 */
export function CodeBlock({
  snippet,
  language,
  label,
  highlight = [],
  tone,
}: {
  snippet: Snippet;
  language: Language;
  label: string;
  highlight?: readonly LineRange[];
  tone?: 'buggy' | 'fixed';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isHighlighted = (n: number) => highlight.some((r) => n >= r.fromLine && n <= r.toLine);
  const firstHighlighted = highlight.length > 0 ? Math.min(...highlight.map((r) => r.fromLine)) : null;

  // Bring the highlighted range into view inside the panel only (never scrolls the page).
  useEffect(() => {
    const panel = ref.current;
    if (!panel || firstHighlighted === null) return;
    const line = panel.querySelector<HTMLElement>(`[data-line="${firstHighlighted}"]`);
    if (!line) return;
    const top = line.offsetTop - 8;
    const bottom = line.offsetTop + line.offsetHeight + 8;
    if (top < panel.scrollTop) panel.scrollTop = top;
    else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight;
  }, [firstHighlighted]);

  return (
    <div
      ref={ref}
      className={`code${tone ? ` code--${tone}` : ''}`}
      role="region"
      tabIndex={0}
      aria-label={label}
      data-testid="code-panel"
    >
      <Highlight theme={CODE_THEME} code={snippet.lines.join('\n')} language={language === 'TypeScript' ? 'tsx' : 'jsx'}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre className="code__pre">
            {tokens.map((line, i) => {
              const n = snippet.startLine + i;
              const on = isHighlighted(n);
              const { key: _lineKey, ...lineProps } = getLineProps({ line });
              void _lineKey;
              return (
                <div
                  key={i}
                  {...lineProps}
                  className={`code__line${on ? ' is-hl' : ''}`}
                  data-line={n}
                  data-highlighted={on ? 'true' : 'false'}
                >
                  <span className="code__ln" aria-hidden="true">
                    {n}
                  </span>
                  <span className="code__text">
                    {line.map((token, k) => {
                      const { key: _tokenKey, ...tokenProps } = getTokenProps({ token });
                      void _tokenKey;
                      return <span key={k} {...tokenProps} />;
                    })}
                    {line.length === 0 || (line.length === 1 && line[0]?.content === '') ? '\u200B' : null}
                  </span>
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
