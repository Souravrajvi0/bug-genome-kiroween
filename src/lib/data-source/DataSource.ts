import type { Bug, Family, Relationship } from '@/lib/domain/types';

/**
 * Read access to bugs, families and relationships.
 * All operations are asynchronous so a network or database implementation can replace the mock.
 */
export interface DataSource {
  listFamilies(): Promise<Family[]>;
  listBugs(): Promise<Bug[]>;
  getBug(id: string): Promise<Bug | null>;
  listRelationships(): Promise<Relationship[]>;
  getRelationship(id: string): Promise<Relationship | null>;
  listRelationshipsForBug(bugId: string): Promise<Relationship[]>;
}