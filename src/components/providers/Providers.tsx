'use client';

import type { ReactNode } from 'react';
import { AnnouncerProvider } from './Announcer';
import { DataProvider } from './DataProvider';
import { ReviewProvider } from './ReviewProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AnnouncerProvider>
      <DataProvider>
        <ReviewProvider>{children}</ReviewProvider>
      </DataProvider>
    </AnnouncerProvider>
  );
}