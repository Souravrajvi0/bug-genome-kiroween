import type { AtlasData, Bug, Family, Relationship } from '@/lib/domain/types';
import type { DataSource } from '../DataSource';
import { MOCK_DATASET } from './index';

/** DataSource backed by the bundled illustrative dataset. */
export class MockDataSource implements DataSource {
  constructor(private readonly data: AtlasData = MOCK_DATASET) {}

  async listFamilies(): Promise<Family[]> {
    return [...this.data.families];
  }

  async listBugs(): Promise<Bug[]> {
    return [...this.data.bugs];
  }

  async getBug(id: string): Promise<Bug | null> {
    return this.data.bugs.find((b) => b.id === id) ?? null;
  }

  async listRelationships(): Promise<Relationship[]> {
    return [...this.data.relationships];
  }

  async getRelationship(id: string): Promise<Relationship | null> {
    return this.data.relationships.find((r) => r.id === id) ?? null;
  }

  async listRelationshipsForBug(bugId: string): Promise<Relationship[]> {
    return this.data.relationships.filter((r) => r.bugAId === bugId || r.bugBId === bugId);
  }
}