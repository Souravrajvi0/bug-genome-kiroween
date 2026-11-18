import { deriveRelationship, type DerivedRelationship } from '@/lib/domain/status';
import type { DecisionKind, Relationship, ReviewDecision } from '@/lib/domain/types';
import type { ReviewStore, StoreCondition, StoreConditionKind } from './ReviewStore';

export interface ReviewSnapshot {
  loaded: boolean;
  decisions: ReadonlyMap<string, ReviewDecision>;
  /** Active, not yet dismissed conditions. */
  conditions: readonly StoreCondition[];
}

const sameCondition = (a: StoreCondition, b: StoreCondition) =>
  a.kind === b.kind && (a.kind !== 'partially-recovered' || (b.kind === 'partially-recovered' && a.dropped === b.dropped));

/**
 * Framework-free holder of review state. React subscribes to it through useSyncExternalStore.
 * Keeping it outside React lets the review flow be tested without a browser.
 */
export class ReviewController {
  private snap: ReviewSnapshot = { loaded: false, decisions: new Map(), conditions: [] };
  private listeners = new Set<() => void>();
  private loadPromise: Promise<void> | null = null;

  constructor(
    private readonly store: ReviewStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): ReviewSnapshot => this.snap;

  /** Loads stored decisions once. */
  load(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.store.list().then((res) => {
        this.set({
          loaded: true,
          decisions: new Map(res.decisions.map((d) => [d.relationshipId, d])),
          conditions: this.mergeConditions(this.snap.conditions, res.conditions),
        });
      });
    }
    return this.loadPromise;
  }

  /** Decision for a relationship, if any. Unknown ids are never looked up by the UI. */
  getDecision(relationshipId: string): ReviewDecision | undefined {
    return this.snap.decisions.get(relationshipId);
  }

  derive(rel: Relationship): DerivedRelationship {
    return deriveRelationship(rel, this.snap.decisions.get(rel.id));
  }

  /** Stores or replaces a decision. Applying the same decision twice gives the same status. */
  async decide(relationshipId: string, decision: DecisionKind): Promise<ReviewDecision> {
    await this.load();
    const record: ReviewDecision = { relationshipId, decision, decidedAt: this.now().toISOString() };
    const decisions = new Map(this.snap.decisions);
    decisions.set(relationshipId, record);
    this.set({ ...this.snap, decisions });
    const res = await this.store.save(record);
    this.addConditions(res.conditions);
    return record;
  }

  async reset(relationshipId: string): Promise<void> {
    await this.load();
    const decisions = new Map(this.snap.decisions);
    decisions.delete(relationshipId);
    this.set({ ...this.snap, decisions });
    const res = await this.store.remove(relationshipId);
    this.addConditions(res.conditions);
  }

  async clearAll(): Promise<void> {
    await this.load();
    this.set({ ...this.snap, decisions: new Map() });
    const res = await this.store.clear();
    this.addConditions(res.conditions);
  }

  dismiss(kind: StoreConditionKind): void {
    this.set({ ...this.snap, conditions: this.snap.conditions.filter((c) => c.kind !== kind) });
  }

  private addConditions(incoming: readonly StoreCondition[]): void {
    if (incoming.length === 0) return;
    this.set({ ...this.snap, conditions: this.mergeConditions(this.snap.conditions, incoming) });
  }

  private mergeConditions(current: readonly StoreCondition[], incoming: readonly StoreCondition[]): StoreCondition[] {
    const out = [...current];
    for (const c of incoming) if (!out.some((x) => sameCondition(x, c))) out.push(c);
    return out;
  }

  private set(next: ReviewSnapshot): void {
    this.snap = next;
    for (const l of this.listeners) l();
  }
}