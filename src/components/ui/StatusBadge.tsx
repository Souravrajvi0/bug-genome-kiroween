import { provenanceLabel, reviewStateLabel, statusLabel } from '@/lib/domain/status';
import type { EvidenceProvenance, RelationshipStatus, ReviewState } from '@/lib/domain/types';
import { Icon } from './Icon';

const DASH: Record<RelationshipStatus, string | undefined> = {
  'evidence-backed': undefined,
  plausible: '5 3.5',
  rejected: '0.5 4',
};

/** Line sample that repeats the edge style of the graph, so status is not conveyed by color alone. */
export function StatusLine({ status, width = 22 }: { status: RelationshipStatus; width?: number }) {
  return (
    <svg className={`status-line status-line--${status}`} width={width} height="8" viewBox={`0 0 ${width} 8`} aria-hidden="true">
      <line x1="1.5" y1="4" x2={width - 1.5} y2="4" strokeWidth="2.25" strokeLinecap="round" strokeDasharray={DASH[status]} />
    </svg>
  );
}

export function StatusBadge({ status, provenance }: { status: RelationshipStatus; provenance: EvidenceProvenance }) {
  return (
    <span className={`badge badge--status badge--${status}`} data-status={status}>
      <StatusLine status={status} />
      {statusLabel(status, provenance)}
    </span>
  );
}

export function ReviewStateBadge({ state }: { state: ReviewState }) {
  const icon = state === 'accepted' ? 'check' : state === 'rejected' ? 'ban' : null;
  return (
    <span className={`badge badge--review badge--review-${state}`} data-review-state={state}>
      {icon ? <Icon name={icon} size={13} /> : <span className="badge__dot" aria-hidden="true" />}
      {reviewStateLabel(state)}
    </span>
  );
}

export function ProvenanceBadge({ provenance }: { provenance: EvidenceProvenance }) {
  return (
    <span className="badge badge--provenance" data-provenance={provenance}>
      <Icon name="hatch" size={13} />
      {provenanceLabel(provenance)}
    </span>
  );
}

/**
 * Effective status and provenance as one joined pill with two labelled parts, so a list row
 * carries both (R17.3) without two separate badges.
 */
export function StatusPill({ status, provenance }: { status: RelationshipStatus; provenance: EvidenceProvenance }) {
  return (
    <span className={`spill spill--${status}`} data-status={status}>
      <span className="spill__status">
        <StatusLine status={status} width={18} />
        {statusLabel(status, provenance)}
      </span>
      <span className="spill__prov" data-provenance={provenance}>
        {provenanceLabel(provenance)}
      </span>
    </span>
  );
}
