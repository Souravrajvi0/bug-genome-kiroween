import { ProvenanceBadge, ReviewStateBadge, StatusBadge } from '@/components/ui/StatusBadge';
import type { DerivedRelationship } from '@/lib/domain/status';
import type { Relationship } from '@/lib/domain/types';

/**
 * Status, review state, provenance and baseline as four separate, labelled items (R5.2, R17.1).
 * The review rows (who judged) and the evidence rows (where the evidence came from) are grouped apart.
 */
export function StatusLedger({ rel, derived }: { rel: Relationship; derived: DerivedRelationship }) {
  return (
    <dl className="ledger" aria-label="Relationship status ledger" data-testid="status-ledger">
      <div className="ledger__item ledger__item--lead">
        <dt>Status</dt>
        <dd data-testid="ledger-status">
          <StatusBadge status={derived.effectiveStatus} provenance={derived.provenance} />
        </dd>
      </div>
      <div className="ledger__item">
        <dt>Review</dt>
        <dd data-testid="ledger-review">
          <ReviewStateBadge state={derived.reviewState} />
        </dd>
      </div>
      <div className="ledger__item">
        <dt>Evidence provenance</dt>
        <dd>
          <ProvenanceBadge provenance={derived.provenance} />
        </dd>
      </div>
      <div className="ledger__item">
        <dt>Baseline</dt>
        <dd>
          <StatusBadge status={rel.baselineStatus} provenance={rel.evidenceProvenance} />
        </dd>
      </div>
    </dl>
  );
}
