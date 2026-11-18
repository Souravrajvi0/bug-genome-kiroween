import type { ReviewDecision } from '@/lib/domain/types';

/** A problem the UI must tell the Reviewer about. */
export type StoreCondition =
  | { kind: 'corrupt-data' }
  | { kind: 'partially-recovered'; dropped: number }
  | { kind: 'unavailable-storage' }
  | { kind: 'not-persisted' };

export type StoreConditionKind = StoreCondition['kind'];

export interface LoadResult {
  decisions: ReviewDecision[];
  conditions: StoreCondition[];
}

export interface SaveResult {
  conditions: StoreCondition[];
}

/**
 * Read and write access to review decisions.
 * Asynchronous so a network or database implementation can replace the local one.
 */
export interface ReviewStore {
  list(): Promise<LoadResult>;
  get(relationshipId: string): Promise<ReviewDecision | null>;
  save(decision: ReviewDecision): Promise<SaveResult>;
  remove(relationshipId: string): Promise<SaveResult>;
  clear(): Promise<SaveResult>;
}