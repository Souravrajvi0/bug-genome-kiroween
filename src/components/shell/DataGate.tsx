'use client';

import type { ReactNode } from 'react';
import { useAtlas, type ReadyAtlas } from '@/components/providers/DataProvider';
import { useReviews } from '@/components/providers/ReviewProvider';
import { Icon } from '@/components/ui/Icon';

/** Shows loading and error states, and renders children once data and stored decisions are ready. */
export function DataGate({ children }: { children: (atlas: ReadyAtlas) => ReactNode }) {
  const atlas = useAtlas();
  const { snapshot } = useReviews();

  if (atlas.status === 'error') {
    return (
      <div className="state-page" role="alert">
        <div className="empty-state">
          <Icon name="info" size={20} />
          <h1 className="empty-state__title">Could not load the Atlas data</h1>
          <p className="empty-state__text">{atlas.message}</p>
          <button type="button" className="btn btn--primary" onClick={atlas.retry}>
            <Icon name="reset" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (atlas.status === 'loading' || !snapshot.loaded) {
    return (
      <div className="state-page" role="status" aria-live="polite">
        <div className="loading">
          <span className="loading__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>Loading the Atlas</span>
        </div>
      </div>
    );
  }

  return <>{children(atlas)}</>;
}
