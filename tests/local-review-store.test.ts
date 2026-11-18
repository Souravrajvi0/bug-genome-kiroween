import { describe, expect, it } from 'vitest';
import { LocalReviewStore, type StorageLike } from '@/lib/review-store/LocalReviewStore';
import { parseStoredValue, serializeDecisions, STORAGE_KEY } from '@/lib/review-store/schema';
import type { ReviewDecision } from '@/lib/domain/types';

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  failRead = false;
  failWrite = false;
  writes = 0;
  getItem(key: string) {
    if (this.failRead) throw new Error('blocked');
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrite) throw new DOMException('quota', 'QuotaExceededError');
    this.writes += 1;
    this.data.set(key, value);
  }
  removeItem(key: string) {
    if (this.failWrite) throw new Error('blocked');
    this.data.delete(key);
  }
}

const d = (id: string, decision: 'accept' | 'reject' = 'accept', at = '2026-01-05T10:00:00.000Z'): ReviewDecision => ({
  relationshipId: id,
  decision,
  decidedAt: at,
});
const envelope = (decisions: Record<string, unknown>) => JSON.stringify({ schemaVersion: 1, decisions });

describe('LocalReviewStore basic operations', () => {
  it('starts empty with no condition', async () => {
    const s = new LocalReviewStore(new FakeStorage());
    expect(await s.list()).toEqual({ decisions: [], conditions: [] });
  });

  it('saves, gets, replaces, removes and clears', async () => {
    const fake = new FakeStorage();
    const s = new LocalReviewStore(fake);
    await s.save(d('rel-01', 'accept'));
    await s.save(d('rel-02', 'reject'));
    expect((await s.get('rel-01'))?.decision).toBe('accept');
    await s.save(d('rel-01', 'reject', '2026-01-06T10:00:00.000Z'));
    expect((await s.get('rel-01'))?.decision).toBe('reject');
    expect((await s.list()).decisions).toHaveLength(2);
    await s.remove('rel-01');
    expect(await s.get('rel-01')).toBeNull();
    await s.clear();
    expect((await s.list()).decisions).toHaveLength(0);
    expect(fake.data.has(STORAGE_KEY)).toBe(false);
  });

  it('persists across store instances (a refresh)', async () => {
    const fake = new FakeStorage();
    await new LocalReviewStore(fake).save(d('rel-03', 'accept'));
    const reloaded = await new LocalReviewStore(fake).list();
    expect(reloaded.decisions).toEqual([d('rel-03', 'accept')]);
    expect(reloaded.conditions).toEqual([]);
  });

  it('writes only decisions and the schema version under one namespaced key', async () => {
    const fake = new FakeStorage();
    await new LocalReviewStore(fake).save(d('rel-01'));
    expect([...fake.data.keys()]).toEqual([STORAGE_KEY]);
    const stored = JSON.parse(fake.data.get(STORAGE_KEY)!);
    expect(Object.keys(stored).sort()).toEqual(['decisions', 'schemaVersion']);
    expect(Object.keys(stored.decisions['rel-01']).sort()).toEqual(['decidedAt', 'decision', 'relationshipId']);
  });
});

describe('envelope validation (R8.1, R8.2)', () => {
  const cases: Record<string, string> = {
    'unparseable JSON': '{not json',
    'a JSON array': '[]',
    'a JSON string': '"hello"',
    'null JSON': 'null',
    'wrong schema version': JSON.stringify({ schemaVersion: 2, decisions: {} }),
    'missing schema version': JSON.stringify({ decisions: {} }),
    'missing decisions': JSON.stringify({ schemaVersion: 1 }),
    'decisions is an array': JSON.stringify({ schemaVersion: 1, decisions: [] }),
    'decisions is a string': JSON.stringify({ schemaVersion: 1, decisions: 'x' }),
  };
  for (const [name, raw] of Object.entries(cases)) {
    it('treats ' + name + ' as corrupt, uses an empty set and leaves storage untouched', async () => {
      const fake = new FakeStorage();
      fake.data.set(STORAGE_KEY, raw);
      const res = await new LocalReviewStore(fake).list();
      expect(res.decisions).toEqual([]);
      expect(res.conditions).toEqual([{ kind: 'corrupt-data' }]);
      expect(fake.data.get(STORAGE_KEY)).toBe(raw);
      expect(fake.writes).toBe(0);
    });
  }

  it('overwrites a corrupt value on the next save', async () => {
    const fake = new FakeStorage();
    fake.data.set(STORAGE_KEY, '{not json');
    const s = new LocalReviewStore(fake);
    await s.list();
    await s.save(d('rel-01'));
    expect(parseStoredValue(fake.data.get(STORAGE_KEY)!).decisions.size).toBe(1);
  });
});

describe('record validation (R8.3, R8.4)', () => {
  it('keeps valid records and drops only invalid ones', async () => {
    const fake = new FakeStorage();
    fake.data.set(
      STORAGE_KEY,
      envelope({
        'rel-01': d('rel-01', 'accept'),
        'rel-02': { relationshipId: 'rel-02', decision: 'maybe', decidedAt: '2026-01-05T10:00:00.000Z' },
        'rel-03': { relationshipId: 'rel-03', decision: 'reject', decidedAt: 'yesterday' },
        'rel-04': { relationshipId: 'rel-99', decision: 'reject', decidedAt: '2026-01-05T10:00:00.000Z' },
        'rel-05': 'garbage',
        'rel-06': d('rel-06', 'reject'),
      }),
    );
    const res = await new LocalReviewStore(fake).list();
    expect(res.decisions.map((x) => x.relationshipId).sort()).toEqual(['rel-01', 'rel-06']);
    expect(res.conditions).toEqual([{ kind: 'partially-recovered', dropped: 4 }]);
    expect(fake.writes).toBe(0);
  });

  it('accepts timestamps with an offset', () => {
    const p = parseStoredValue(envelope({ 'rel-01': d('rel-01', 'accept', '2026-01-05T10:00:00+02:00') }));
    expect(p.decisions.size).toBe(1);
  });

  it('keeps and re-saves records for unknown relationship ids (R7.7)', async () => {
    const fake = new FakeStorage();
    fake.data.set(STORAGE_KEY, envelope({ 'rel-unknown': d('rel-unknown') }));
    const s = new LocalReviewStore(fake);
    await s.save(d('rel-01'));
    const p = parseStoredValue(fake.data.get(STORAGE_KEY)!);
    expect([...p.decisions.keys()].sort()).toEqual(['rel-01', 'rel-unknown']);
  });

  it('read never writes (valid, partial or corrupt)', async () => {
    for (const raw of [envelope({}), envelope({ x: 1 }), 'bad']) {
      const fake = new FakeStorage();
      fake.data.set(STORAGE_KEY, raw);
      await new LocalReviewStore(fake).list();
      expect(fake.writes).toBe(0);
    }
  });

  it('a later save rewrites the value from the valid set only', async () => {
    const fake = new FakeStorage();
    fake.data.set(STORAGE_KEY, envelope({ 'rel-01': d('rel-01'), 'rel-02': 'garbage' }));
    const s = new LocalReviewStore(fake);
    await s.list();
    await s.save(d('rel-03'));
    expect([...parseStoredValue(fake.data.get(STORAGE_KEY)!).decisions.keys()].sort()).toEqual(['rel-01', 'rel-03']);
  });
});

describe('unavailable and failing storage (R8.5, R8.6)', () => {
  it('reports unavailable-storage when reads throw and still works in memory', async () => {
    const fake = new FakeStorage();
    fake.failRead = true;
    const s = new LocalReviewStore(fake);
    expect(await s.list()).toEqual({ decisions: [], conditions: [{ kind: 'unavailable-storage' }] });
    const res = await s.save(d('rel-01'));
    expect(res.conditions).toEqual([]);
    expect((await s.get('rel-01'))?.decision).toBe('accept');
  });

  it('reports unavailable-storage when there is no storage object', async () => {
    const s = new LocalReviewStore(null);
    expect((await s.list()).conditions).toEqual([{ kind: 'unavailable-storage' }]);
    expect((await s.save(d('rel-01'))).conditions).toEqual([{ kind: 'not-persisted' }]);
    expect((await s.get('rel-01'))?.decision).toBe('accept');
  });

  it('keeps the decision in memory and reports not-persisted on a quota error', async () => {
    const fake = new FakeStorage();
    const s = new LocalReviewStore(fake);
    await s.list();
    fake.failWrite = true;
    const res = await s.save(d('rel-01', 'reject'));
    expect(res.conditions).toEqual([{ kind: 'not-persisted' }]);
    expect((await s.get('rel-01'))?.decision).toBe('reject');
    expect((await s.list()).decisions).toHaveLength(1);
  });

  it('reports not-persisted when remove or clear cannot write', async () => {
    const fake = new FakeStorage();
    const s = new LocalReviewStore(fake);
    await s.save(d('rel-01'));
    fake.failWrite = true;
    expect((await s.remove('rel-01')).conditions).toEqual([{ kind: 'not-persisted' }]);
    expect((await s.clear()).conditions).toEqual([{ kind: 'not-persisted' }]);
  });
});

describe('serialization', () => {
  it('round-trips a set of decisions', () => {
    const set = [d('rel-01', 'accept'), d('rel-02', 'reject', '2026-02-01T00:00:00.000Z')];
    const parsed = parseStoredValue(serializeDecisions(set));
    expect([...parsed.decisions.values()]).toEqual(set);
    expect(parsed.conditions).toEqual([]);
  });
});