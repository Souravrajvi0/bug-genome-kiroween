'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Announce = (message: string) => void;
const AnnounceContext = createContext<Announce>(() => {});

/** Owns the polite live region. Components call `useAnnounce()` to speak a message. */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState({ text: '', n: 0 });
  const announce = useCallback<Announce>((text) => setMsg((m) => ({ text, n: m.n + 1 })), []);
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="live-region">
        {msg.text}
        {msg.n % 2 === 0 ? '' : '\u200B'}
      </div>
    </AnnounceContext.Provider>
  );
}

export function useAnnounce(): Announce {
  return useContext(AnnounceContext);
}

export function useStableAnnounce() {
  const a = useAnnounce();
  return useMemo(() => a, [a]);
}