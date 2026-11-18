'use client';

import { useReviews } from '@/components/providers/ReviewProvider';
import { Icon } from '@/components/ui/Icon';
import type { StoreCondition } from '@/lib/review-store/ReviewStore';

function textFor(c: StoreCondition): string {
  switch (c.kind) {
    case 'corrupt-data':
      return 'Stored review decisions could not be read and were ignored. Your decisions may not survive a refresh.';
    case 'partially-recovered':
      return `${c.dropped} stored review ${c.dropped === 1 ? 'record was' : 'records were'} invalid and dropped. The rest were kept. Decisions may not survive a refresh.`;
    case 'unavailable-storage':
      return 'Browser storage is unavailable. Review decisions work for this session only and may not survive a refresh.';
    case 'not-persisted':
      return 'A review decision could not be saved to browser storage. It is kept for this session and may not survive a refresh.';
  }
}

export function StorageNotice() {
  const { snapshot, dismiss } = useReviews();
  if (snapshot.conditions.length === 0) return null;
  return (
    <div className="notices" data-testid="storage-notices">
      {snapshot.conditions.map((c) => (
        <div key={c.kind} className="notice" role="status">
          <Icon name="info" className="notice__icon" />
          <p>{textFor(c)}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => dismiss(c.kind)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
