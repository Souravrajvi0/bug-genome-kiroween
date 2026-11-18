import { Suspense } from 'react';
import { AtlasPage } from '@/components/graph/AtlasPage';

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Loading</p>}>
      <AtlasPage />
    </Suspense>
  );
}