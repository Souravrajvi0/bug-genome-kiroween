/**
 * The single composition point. It is the only file that imports the mock data source
 * and the localStorage-backed review store. Everything else depends on interfaces.
 */
import type { DataSource } from '@/lib/data-source/DataSource';
import { MockDataSource } from '@/lib/data-source/mock/MockDataSource';
import { getBrowserStorage } from '@/lib/review-store/browserStorage';
import { LocalReviewStore } from '@/lib/review-store/LocalReviewStore';
import type { ReviewStore } from '@/lib/review-store/ReviewStore';

export function createDataSource(): DataSource {
  return new MockDataSource();
}

export function createReviewStore(): ReviewStore {
  return new LocalReviewStore(getBrowserStorage());
}