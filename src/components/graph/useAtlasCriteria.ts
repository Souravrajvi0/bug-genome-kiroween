'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { atlasHref, parseAtlasQuery } from '@/lib/domain/atlas-query';
import type { Criteria } from '@/lib/domain/types';

/**
 * Criteria live in the URL query. The URL is the single source of truth, so refresh and
 * back or forward show exactly what the entry's URL says. Updates replace the current
 * history entry, so changing a filter never adds a history entry.
 */
export function useAtlasCriteria(knownFamilyIds: readonly string[]) {
  const params = useSearchParams();
  const key = params.toString();
  const familyKey = knownFamilyIds.join('|');

  const criteria = useMemo<Criteria>(
    () => parseAtlasQuery(new URLSearchParams(key), { knownFamilyIds: familyKey === '' ? [] : familyKey.split('|') }),
    [key, familyKey],
  );

  const setCriteria = useCallback((next: Criteria) => {
    // Next.js integrates replaceState with useSearchParams, so this updates without a server round trip.
    window.history.replaceState(null, '', atlasHref(next));
  }, []);

  return { criteria, setCriteria };
}