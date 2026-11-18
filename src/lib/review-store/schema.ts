import { z } from 'zod';
import type { ReviewDecision } from '@/lib/domain/types';
import type { StoreCondition } from './ReviewStore';

/** One namespaced key. The schema version is also stored inside the value. */
export const STORAGE_KEY = 'bug-genome:review-decisions:v1';
export const SCHEMA_VERSION = 1;

/** Level 1: the overall structure. If this fails the whole value is unusable. */
const envelopeSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  decisions: z.record(z.string(), z.unknown()),
});

/** Level 2: one record. A failure here drops only that record. */
const recordSchema = z.object({
  relationshipId: z.string().min(1),
  decision: z.enum(['accept', 'reject']),
  decidedAt: z.iso.datetime({ offset: true }),
});

export interface ParsedStore {
  decisions: Map<string, ReviewDecision>;
  conditions: StoreCondition[];
  /** Number of records in a valid envelope. Equals kept + dropped (partition property). */
  recordCount: number;
  dropped: number;
}

/**
 * Parses a raw stored string. Never throws.
 * - null: nothing stored, no condition.
 * - invalid envelope: empty set and a corrupt-data condition.
 * - valid envelope: keeps valid records, drops invalid ones, reports partially-recovered.
 */
export function parseStoredValue(raw: string | null): ParsedStore {
  const empty: ParsedStore = { decisions: new Map(), conditions: [], recordCount: 0, dropped: 0 };
  if (raw === null) return empty;

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ...empty, conditions: [{ kind: 'corrupt-data' }] };
  }

  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) return { ...empty, conditions: [{ kind: 'corrupt-data' }] };

  const decisions = new Map<string, ReviewDecision>();
  const entries = Object.entries(envelope.data.decisions);
  let dropped = 0;
  for (const [key, value] of entries) {
    const rec = recordSchema.safeParse(value);
    if (rec.success && rec.data.relationshipId === key) {
      decisions.set(key, {
        relationshipId: rec.data.relationshipId,
        decision: rec.data.decision,
        decidedAt: rec.data.decidedAt,
      });
    } else {
      dropped += 1;
    }
  }

  const conditions: StoreCondition[] = dropped > 0 ? [{ kind: 'partially-recovered', dropped }] : [];
  return { decisions, conditions, recordCount: entries.length, dropped };
}

/** Serializes decisions to the stored format. Contains only decisions and the schema version. */
export function serializeDecisions(decisions: Iterable<ReviewDecision>): string {
  const map: Record<string, ReviewDecision> = {};
  for (const d of decisions) {
    map[d.relationshipId] = { relationshipId: d.relationshipId, decision: d.decision, decidedAt: d.decidedAt };
  }
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, decisions: map });
}