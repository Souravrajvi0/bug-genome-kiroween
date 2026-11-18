import type { Snippet } from './types';

/**
 * One row of a line diff between a buggy snippet (old) and a fixed snippet (new).
 * Indexes point into the snippet's `lines`; line numbers are the displayed numbers.
 */
export type DiffLine =
  | { kind: 'same'; oldIndex: number; newIndex: number; oldLine: number; newLine: number }
  | { kind: 'del'; oldIndex: number; oldLine: number }
  | { kind: 'add'; newIndex: number; newLine: number };

export interface SnippetDiff {
  lines: DiffLine[];
  added: number;
  removed: number;
}

/** Lines that differ only in indentation or inner spacing count as unchanged, like "hide whitespace" in a code review tool. */
const normalize = (line: string) => line.trim().replace(/\s+/g, ' ');

/**
 * Longest-common-subsequence line diff. Snippets are short (at most 25 lines), so the
 * quadratic table is cheap. Within a changed block, removals come before additions.
 * Pure and deterministic.
 */
export function diffSnippets(before: Snippet, after: Snippet): SnippetDiff {
  const a = before.lines.map(normalize);
  const b = after.lines.map(normalize);
  const n = a.length;
  const m = b.length;

  // lcs[i][j] = length of the LCS of a[i..] and b[j..].
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const lines: DiffLine[] = [];
  let added = 0;
  let removed = 0;
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      lines.push({ kind: 'same', oldIndex: i, newIndex: j, oldLine: before.startLine + i, newLine: after.startLine + j });
      i++;
      j++;
    } else if (j >= m || (i < n && lcs[i + 1]![j]! >= lcs[i]![j + 1]!)) {
      lines.push({ kind: 'del', oldIndex: i, oldLine: before.startLine + i });
      removed++;
      i++;
    } else {
      lines.push({ kind: 'add', newIndex: j, newLine: after.startLine + j });
      added++;
      j++;
    }
  }
  return { lines, added, removed };
}
