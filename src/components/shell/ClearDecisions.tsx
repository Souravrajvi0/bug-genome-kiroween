'use client';

import { useRef } from 'react';
import { useAnnounce } from '@/components/providers/Announcer';
import { useReviews } from '@/components/providers/ReviewProvider';
import { Icon } from '@/components/ui/Icon';

/** Clears all stored decisions after the Reviewer confirms in a modal dialog. */
export function ClearDecisions() {
  const dialog = useRef<HTMLDialogElement>(null);
  const { snapshot, clearAll } = useReviews();
  const announce = useAnnounce();
  const count = snapshot.decisions.size;

  return (
    <>
      <button
        type="button"
        className="btn btn--ghost btn--sm header__clear"
        onClick={() => dialog.current?.showModal()}
        aria-label={`Clear all decisions${count > 0 ? ` (${count})` : ''}`}
      >
        <Icon name="trash" />
        <span className="header__clear-text">Clear all decisions</span>
        {count > 0 ? <span className="count">{count}</span> : null}
      </button>
      <dialog
        ref={dialog}
        className="dialog"
        aria-labelledby="clear-title"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="dialog__body">
          <span className="dialog__icon" aria-hidden="true">
            <Icon name="trash" size={18} />
          </span>
          <h2 id="clear-title" className="dialog__title">
            Clear all review decisions?
          </h2>
          <p>
            This removes every Accept and Reject you stored in this browser. Each relationship goes back to its starting
            status. This cannot be undone.
          </p>
          <div className="dialog__actions">
            <button type="button" className="btn" onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={async () => {
                await clearAll();
                dialog.current?.close();
                announce('All review decisions cleared.');
              }}
            >
              Clear all decisions
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
