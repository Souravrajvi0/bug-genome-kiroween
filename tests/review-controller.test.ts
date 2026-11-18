import { describe, expect, it } from 'vitest';
import { MOCK_DATASET } from '@/lib/data-source/mock';
import { LocalReviewStore, type StorageLike } from '@/lib/review-store/LocalReviewStore';
import { ReviewController } from '@/lib/review-store/ReviewController';

class MemStorage implements StorageLike {
  data = new Map<string, string>();
  failWrite = false;
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.failWrite) throw new Error('quota'); this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

const rel = (id: string) => MOCK_DATASET.relationships.find((r) => r.id === id)!;
const make = (storage: StorageLike, at = '2026-01-05T10:00:00.000Z') =>
  new ReviewController(new LocalReviewStore(storage), () => new Date(at));

describe('ReviewController review flow (R6)', () => {
  it('accept, reject, replace and reset', async () => {
    const c = make(new MemStorage());
    await c.load();
    expect(c.derive(rel('rel-02')).reviewState).toBe('unreviewed');

    await c.decide('rel-02', 'accept');
    expect(c.derive(rel('rel-02'))).toMatchObject({ effectiveStatus: 'evidence-backed', reviewState: 'accepted' });

    await c.decide('rel-02', 'reject');
    expect(c.derive(rel('rel-02'))).toMatchObject({ effectiveStatus: 'rejected', reviewState: 'rejected' });
    expect(c.getSnapshot().decisions.size).toBe(1);

    await c.reset('rel-02');
    expect(c.derive(rel('rel-02'))).toMatchObject({ effectiveStatus: 'plausible', reviewState: 'unreviewed' });
  });

  it('applying the same decision twice gives the same status', async () => {
    const c = make(new MemStorage());
    await c.decide('rel-01', 'reject');
    const once = c.derive(rel('rel-01'));
    await c.decide('rel-01', 'reject');
    expect(c.derive(rel('rel-01'))).toEqual(once);
  });

  it('stores a timestamp and never touches provenance', async () => {
    const c = make(new MemStorage());
    const rec = await c.decide('rel-01', 'accept');
    expect(rec.decidedAt).toBe('2026-01-05T10:00:00.000Z');
    expect(Object.keys(rec).sort()).toEqual(['decidedAt', 'decision', 'relationshipId']);
    expect(c.derive(rel('rel-01')).provenance).toBe('illustrative');
  });

  it('decisions survive a new controller on the same storage (a refresh)', async () => {
    const storage = new MemStorage();
    await make(storage).decide('rel-03', 'accept');
    const after = make(storage);
    await after.load();
    expect(after.derive(rel('rel-03')).reviewState).toBe('accepted');
    expect(after.derive(rel('rel-04')).reviewState).toBe('unreviewed');
  });

  it('notifies subscribers on every change', async () => {
    const c = make(new MemStorage());
    let calls = 0;
    c.subscribe(() => { calls += 1; });
    await c.decide('rel-01', 'accept');
    expect(calls).toBeGreaterThanOrEqual(1);
  });

  it('clearAll removes every decision', async () => {
    const c = make(new MemStorage());
    await c.decide('rel-01', 'accept');
    await c.decide('rel-02', 'reject');
    await c.clearAll();
    expect(c.getSnapshot().decisions.size).toBe(0);
  });

  it('reports not-persisted and keeps the decision, and conditions can be dismissed', async () => {
    const storage = new MemStorage();
    const c = make(storage);
    await c.load();
    storage.failWrite = true;
    await c.decide('rel-01', 'accept');
    expect(c.derive(rel('rel-01')).reviewState).toBe('accepted');
    expect(c.getSnapshot().conditions).toEqual([{ kind: 'not-persisted' }]);
    c.dismiss('not-persisted');
    expect(c.getSnapshot().conditions).toEqual([]);
  });

  it('ignores stored decisions for unknown relationships when deriving', async () => {
    const storage = new MemStorage();
    await make(storage).decide('rel-unknown', 'accept');
    const c = make(storage);
    await c.load();
    for (const r of MOCK_DATASET.relationships) expect(c.derive(r).reviewState).toBe('unreviewed');
  });
});