import { Suspense } from 'react';
import { RelationshipDetailPage } from '@/components/relationship/RelationshipDetailPage';

export default async function Page({ params }: { params: Promise<{ relationshipId: string }> }) {
  const { relationshipId } = await params;
  return (
    <Suspense fallback={<p role="status">Loading</p>}>
      <RelationshipDetailPage relationshipId={relationshipId} />
    </Suspense>
  );
}