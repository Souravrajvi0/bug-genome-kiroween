'use client';

import { useAnnounce } from '@/components/providers/Announcer';
import { useReviews } from '@/components/providers/ReviewProvider';
import { Icon } from '@/components/ui/Icon';
import { reviewStateLabel, statusLabel } from '@/lib/domain/status';
import type { DecisionKind, Relationship } from '@/lib/domain/types';
import { StatusLedger } from './StatusLedger';

/** Accept and Reject record the Reviewer's judgment only. They never verify the evidence. */
export function ReviewBench({ rel }: { rel: Relationship }) {
  const reviews = useReviews();
  const announce = useAnnounce();
  const decision = reviews.snapshot.decisions.get(rel.id);
  const derived = reviews.derive(rel);

  const say = () => {
    const d = reviews.derive(rel);
    announce(`Status is now ${statusLabel(d.effectiveStatus, d.provenance)}. Review: ${reviewStateLabel(d.reviewState)}.`);
  };

  const decide = async (kind: DecisionKind) => {
    await reviews.decide(rel.id, kind);
    say();
  };

  const reset = async () => {
    await reviews.reset(rel.id);
    say();
  };

  return (
    <section className="review-card" aria-labelledby="review-title" data-testid="review-bench" data-review={derived.reviewState}>
      <div className="review-card__head">
        <h2 id="review-title" className="review-card__title">
          Review
        </h2>
        <span className="review-card__hint">Your judgment</span>
      </div>

      <StatusLedger rel={rel} derived={derived} />

      <div className="review-card__actions" role="group" aria-label="Decision">
        <button
          type="button"
          className="btn btn--accept btn--lg"
          aria-pressed={decision?.decision === 'accept'}
          onClick={() => decide('accept')}
        >
          <Icon name="check" />
          Accept as reviewer judgment
        </button>
        <button
          type="button"
          className="btn btn--reject btn--lg"
          aria-pressed={decision?.decision === 'reject'}
          onClick={() => decide('reject')}
        >
          <Icon name="ban" />
          Reject
        </button>
      </div>

      <div className="review-card__foot">
        {decision ? (
          <>
            <p className="review-card__stamp" data-testid="decision-stamp">
              Decision: <strong>{decision.decision === 'accept' ? 'Accepted' : 'Rejected'}</strong> at{' '}
              <time dateTime={decision.decidedAt}>{new Date(decision.decidedAt).toLocaleString()}</time>
            </p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>
              <Icon name="reset" />
              Reset to baseline
            </button>
          </>
        ) : (
          <p className="review-card__stamp">No decision stored. The baseline status applies.</p>
        )}
      </div>
      <p className="review-card__note">
        <Icon name="info" size={14} />
        <span>Records your judgment. Does not verify the evidence, which stays illustrative.</span>
      </p>
    </section>
  );
}
