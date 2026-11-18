import { Suspense } from 'react';
import { BugDetailPage } from '@/components/bug/BugDetailPage';

export default async function Page({ params }: { params: Promise<{ bugId: string }> }) {
  const { bugId } = await params;
  return (
    <Suspense fallback={<p role="status">Loading</p>}>
      <BugDetailPage bugId={bugId} />
    </Suspense>
  );
}