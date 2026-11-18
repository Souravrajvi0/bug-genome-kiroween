import type { StorageLike } from './LocalReviewStore';

/**
 * Returns window.localStorage, or null when it is missing or access throws
 * (private mode, blocked cookies, server rendering).
 */
export function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}