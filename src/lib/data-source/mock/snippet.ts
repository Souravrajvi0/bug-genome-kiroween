import type { Snippet } from '@/lib/domain/types';

/** Builds a snippet from source text. The first line is displayed as `startLine`. */
export function code(startLine: number, text: string): Snippet {
  const lines = text.replace(/^\n/, '').replace(/\n$/, '').split('\n');
  return { startLine, lines };
}