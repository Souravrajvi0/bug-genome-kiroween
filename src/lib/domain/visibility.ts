import { bugSearchText, matchesSearch } from './search';
import type { Bug, Criteria, Family, Relationship, RelationshipStatus } from './types';

export type Count = readonly [visible: number, total: number];

export interface Visibility {
  visibleBugIds: ReadonlySet<string>;
  visibleRelationshipIds: ReadonlySet<string>;
  /** Visible bugs with no visible relationship. */
  isolatedBugIds: ReadonlySet<string>;
  counts: {
    bugs: Count;
    relationships: Count;
    families: Count;
    isolated: number;
  };
}

export interface VisibilityInput {
  bugs: readonly Bug[];
  families: readonly Family[];
  relationships: readonly Relationship[];
  effectiveStatus: (relationshipId: string) => RelationshipStatus;
  criteria: Criteria;
}

/**
 * Node_Criteria (search, family, language) decide which bugs are visible.
 * Edge_Criteria (status) decide which relationships are visible among visible bugs.
 * The status filter never hides a bug. Within one filter values are OR, across filters AND.
 */
export function computeVisibility(input: VisibilityInput): Visibility {
  const { bugs, families, relationships, effectiveStatus, criteria } = input;
  const familiesById = new Map(families.map((f) => [f.id, f]));
  const familySet = new Set(criteria.families);
  const languageSet = new Set(criteria.languages);
  const statusSet = new Set(criteria.statuses);

  const visibleBugIds = new Set<string>();
  const visibleFamilyIds = new Set<string>();
  for (const bug of bugs) {
    const okSearch = matchesSearch(bugSearchText(bug, familiesById), criteria.search);
    const okFamily = familySet.size === 0 || familySet.has(bug.familyId);
    const okLanguage = languageSet.size === 0 || languageSet.has(bug.language);
    if (okSearch && okFamily && okLanguage) {
      visibleBugIds.add(bug.id);
      visibleFamilyIds.add(bug.familyId);
    }
  }

  const visibleRelationshipIds = new Set<string>();
  const touched = new Set<string>();
  for (const rel of relationships) {
    if (!visibleBugIds.has(rel.bugAId) || !visibleBugIds.has(rel.bugBId)) continue;
    if (statusSet.size > 0 && !statusSet.has(effectiveStatus(rel.id))) continue;
    visibleRelationshipIds.add(rel.id);
    touched.add(rel.bugAId);
    touched.add(rel.bugBId);
  }

  const isolatedBugIds = new Set<string>();
  for (const id of visibleBugIds) if (!touched.has(id)) isolatedBugIds.add(id);

  return {
    visibleBugIds,
    visibleRelationshipIds,
    isolatedBugIds,
    counts: {
      bugs: [visibleBugIds.size, bugs.length],
      relationships: [visibleRelationshipIds.size, relationships.length],
      families: [visibleFamilyIds.size, families.length],
      isolated: isolatedBugIds.size,
    },
  };
}

/** True when any criterion is active. */
export function hasActiveCriteria(c: Criteria): boolean {
  return c.search.trim() !== '' || c.families.length > 0 || c.languages.length > 0 || c.statuses.length > 0;
}

/** Human-readable list of active criteria, for the no-results message. */
export function describeCriteria(c: Criteria, families: readonly Family[]): string[] {
  const names = new Map(families.map((f) => [f.id, f.name]));
  const out: string[] = [];
  if (c.search.trim() !== '') out.push(`search "${c.search.trim()}"`);
  if (c.families.length > 0) out.push(`family: ${c.families.map((id) => names.get(id) ?? id).join(', ')}`);
  if (c.languages.length > 0) out.push(`language: ${c.languages.join(', ')}`);
  if (c.statuses.length > 0) out.push(`status: ${c.statuses.join(', ')}`);
  return out;
}