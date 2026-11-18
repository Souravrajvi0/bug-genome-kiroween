import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MOCK_DATASET } from '@/lib/data-source/mock';
import { diffSnippets } from '@/lib/domain/diff';
import type { Snippet } from '@/lib/domain/types';

const snip = (lines: string[], startLine = 1): Snippet => ({ lines, startLine });

describe('diffSnippets', () => {
  it('marks identical snippets as unchanged', () => {
    const d = diffSnippets(snip(['a', 'b']), snip(['a', 'b'], 10));
    expect(d.added).toBe(0);
    expect(d.removed).toBe(0);
    expect(d.lines.map((l) => l.kind)).toEqual(['same', 'same']);
    expect(d.lines[1]).toMatchObject({ oldLine: 2, newLine: 11 });
  });

  it('handles empty snippets', () => {
    expect(diffSnippets(snip([]), snip([])).lines).toEqual([]);
    expect(diffSnippets(snip([]), snip(['x'])).added).toBe(1);
    expect(diffSnippets(snip(['x']), snip([])).removed).toBe(1);
  });

  it('ignores indentation-only changes', () => {
    const d = diffSnippets(snip(['  call();']), snip(['    call();']));
    expect(d.lines.map((l) => l.kind)).toEqual(['same']);
  });

  it('puts removals before additions in a changed block', () => {
    const d = diffSnippets(snip(['a', 'old', 'c']), snip(['a', 'new', 'c']));
    expect(d.lines.map((l) => l.kind)).toEqual(['same', 'del', 'add', 'same']);
  });

  it('reconstructs both sides for every mock bug', () => {
    for (const bug of MOCK_DATASET.bugs) {
      const d = diffSnippets(bug.buggy, bug.fixed);
      const oldIdx = d.lines.flatMap((l) => (l.kind === 'add' ? [] : [l.oldIndex]));
      const newIdx = d.lines.flatMap((l) => (l.kind === 'del' ? [] : [l.newIndex]));
      expect(oldIdx).toEqual(bug.buggy.lines.map((_, i) => i));
      expect(newIdx).toEqual(bug.fixed.lines.map((_, i) => i));
    }
  });

  it('property: old lines come from same and del rows, new lines from same and add rows, in order', () => {
    const line = fc.constantFrom('a', 'b', 'c', '  a', 'd', '');
    fc.assert(
      fc.property(fc.array(line, { maxLength: 12 }), fc.array(line, { maxLength: 12 }), (x, y) => {
        const d = diffSnippets(snip(x, 5), snip(y, 40));
        const oldIdx = d.lines.flatMap((l) => (l.kind === 'add' ? [] : [l.oldIndex]));
        const newIdx = d.lines.flatMap((l) => (l.kind === 'del' ? [] : [l.newIndex]));
        expect(oldIdx).toEqual(x.map((_, i) => i));
        expect(newIdx).toEqual(y.map((_, i) => i));
        expect(d.added + d.removed + d.lines.filter((l) => l.kind === 'same').length).toBe(d.lines.length);
      }),
    );
  });
});
