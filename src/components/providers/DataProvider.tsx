'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createDataSource } from '@/lib/composition';
import type { DataSource } from '@/lib/data-source/DataSource';
import type { AtlasData, Bug, Family, Relationship } from '@/lib/domain/types';

export interface ReadyAtlas {
  status: 'ready';
  data: AtlasData;
  bugsById: ReadonlyMap<string, Bug>;
  familiesById: ReadonlyMap<string, Family>;
  relationshipsById: ReadonlyMap<string, Relationship>;
}

export type AtlasState = { status: 'loading' } | { status: 'error'; message: string; retry: () => void } | ReadyAtlas;

const AtlasContext = createContext<AtlasState>({ status: 'loading' });

/** Loads bugs, families and relationships through the DataSource interface. */
export function DataProvider({ children, source }: { children: ReactNode; source?: DataSource }) {
  const [ds] = useState(() => source ?? createDataSource());
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: AtlasData }
  >({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    Promise.all([ds.listFamilies(), ds.listBugs(), ds.listRelationships()])
      .then(([families, bugs, relationships]) => {
        if (!cancelled) setState({ status: 'ready', data: { families, bugs, relationships } });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
      });
    return () => {
      cancelled = true;
    };
  }, [ds, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo<AtlasState>(() => {
    if (state.status === 'loading') return { status: 'loading' };
    if (state.status === 'error') return { status: 'error', message: state.message, retry };
    const { data } = state;
    return {
      status: 'ready',
      data,
      bugsById: new Map(data.bugs.map((b) => [b.id, b])),
      familiesById: new Map(data.families.map((f) => [f.id, f])),
      relationshipsById: new Map(data.relationships.map((r) => [r.id, r])),
    };
  }, [state, retry]);

  return <AtlasContext.Provider value={value}>{children}</AtlasContext.Provider>;
}

export function useAtlas(): AtlasState {
  return useContext(AtlasContext);
}