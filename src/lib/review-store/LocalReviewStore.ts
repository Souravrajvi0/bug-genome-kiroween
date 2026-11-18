import type { ReviewDecision } from '@/lib/domain/types';
import type { LoadResult, ReviewStore, SaveResult, StoreCondition } from './ReviewStore';
import { parseStoredValue, serializeDecisions, STORAGE_KEY } from './schema';

/** The part of localStorage the store needs. Injected so tests run without a browser. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Review store backed by a StorageLike (browser localStorage in the app).
 * The first call to `list` loads and validates the stored value. After that the
 * in-memory set is the source of truth, so a failed write still keeps the decision
 * for the current session.
 */
export class LocalReviewStore implements ReviewStore {
  private decisions = new Map<string, ReviewDecision>();
  private loaded = false;

  constructor(private readonly storage: StorageLike | null) {}

  async list(): Promise<LoadResult> {
    if (this.loaded) return { decisions: [...this.decisions.values()], conditions: [] };
    this.loaded = true;

    let raw: string | null;
    try {
      if (!this.storage) throw new Error('no storage');
      raw = this.storage.getItem(STORAGE_KEY);
    } catch {
      return { decisions: [], conditions: [{ kind: 'unavailable-storage' }] };
    }

    const parsed = parseStoredValue(raw);
    this.decisions = parsed.decisions;
    return { decisions: [...this.decisions.values()], conditions: parsed.conditions };
  }

  async get(relationshipId: string): Promise<ReviewDecision | null> {
    await this.ensureLoaded();
    return this.decisions.get(relationshipId) ?? null;
  }

  async save(decision: ReviewDecision): Promise<SaveResult> {
    await this.ensureLoaded();
    this.decisions.set(decision.relationshipId, decision);
    return { conditions: this.persist() };
  }

  async remove(relationshipId: string): Promise<SaveResult> {
    await this.ensureLoaded();
    this.decisions.delete(relationshipId);
    return { conditions: this.persist() };
  }

  async clear(): Promise<SaveResult> {
    await this.ensureLoaded();
    this.decisions.clear();
    try {
      if (!this.storage) throw new Error('no storage');
      this.storage.removeItem(STORAGE_KEY);
      return { conditions: [] };
    } catch {
      return { conditions: [{ kind: 'not-persisted' }] };
    }
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) await this.list();
  }

  /** Rewrites the stored value from the validated in-memory set. */
  private persist(): StoreCondition[] {
    try {
      if (!this.storage) throw new Error('no storage');
      this.storage.setItem(STORAGE_KEY, serializeDecisions(this.decisions.values()));
      return [];
    } catch {
      return [{ kind: 'not-persisted' }];
    }
  }
}