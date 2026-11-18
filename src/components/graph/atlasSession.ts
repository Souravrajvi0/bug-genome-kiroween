import { z } from 'zod';
import type { Selection, Viewport } from './GraphController';

/**
 * Remembers the graph camera and selection for the current browser session (R2.8), so returning
 * from a detail view puts the Reviewer back where they were. sessionStorage only; review decisions
 * never go here. Every failure is silent: the graph then simply starts fresh.
 */
const KEY = 'bug-genome:atlas-view:v1';

const schema = z.object({
  viewport: z
    .object({ zoom: z.number().positive().finite(), pan: z.object({ x: z.number().finite(), y: z.number().finite() }) })
    .nullable(),
  selection: z
    .object({ kind: z.enum(['bug', 'relationship']), id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/) })
    .nullable(),
});

export interface AtlasSession {
  viewport: Viewport | null;
  selection: Selection;
}

const EMPTY: AtlasSession = { viewport: null, selection: null };

export function readAtlasSession(): AtlasSession {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as AtlasSession) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function writeAtlasSession(patch: Partial<AtlasSession>): void {
  try {
    const next = { ...readAtlasSession(), ...patch };
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable or full: restoring is a convenience, so ignore.
  }
}
