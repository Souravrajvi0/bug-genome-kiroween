'use client';

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createReviewStore } from '@/lib/composition';
import type { DerivedRelationship } from '@/lib/domain/status';
import type { DecisionKind, Relationship, ReviewDecision } from '@/lib/domain/types';
import { ReviewController, type ReviewSnapshot } from '@/lib/review-store/ReviewController';
import type { ReviewStore, StoreConditionKind } from '@/lib/review-store/ReviewStore';

interface ReviewApi {
  snapshot: ReviewSnapshot;
  derive: (rel: Relationship) => DerivedRelationship;
  decide: (relationshipId: string, decision: DecisionKind) => Promise<ReviewDecision>;
  reset: (relationshipId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  dismiss: (kind: StoreConditionKind) => void;
}

const ReviewContext = createContext<ReviewApi | null>(null);

/** Gives every view the same review decisions, so a change shows up everywhere without reload. */
export function ReviewProvider({ children, store }: { children: ReactNode; store?: ReviewStore }) {
  const [controller] = useState(() => new ReviewController(store ?? createReviewStore()));
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => {
    void controller.load();
  }, [controller]);

  const api = useMemo<ReviewApi>(
    () => ({
      snapshot,
      derive: (rel) => controller.derive(rel),
      decide: (id, d) => controller.decide(id, d),
      reset: (id) => controller.reset(id),
      clearAll: () => controller.clearAll(),
      dismiss: (k) => controller.dismiss(k),
    }),
    [controller, snapshot],
  );

  return <ReviewContext.Provider value={api}>{children}</ReviewContext.Provider>;
}

export function useReviews(): ReviewApi {
  const v = useContext(ReviewContext);
  if (!v) throw new Error('useReviews must be used inside ReviewProvider');
  return v;
}