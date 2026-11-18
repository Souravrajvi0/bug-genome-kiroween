import type { Bug, Family } from './types';

export const UNKNOWN_FAMILY_NAME = 'Unknown family';

export function familyNameOf(bug: Bug, familiesById: ReadonlyMap<string, Family>): string {
  return familiesById.get(bug.familyId)?.name ?? UNKNOWN_FAMILY_NAME;
}

/** Lowercased text that search matches against (R3.1). */
export function bugSearchText(bug: Bug, familiesById: ReadonlyMap<string, Family>): string {
  return [
    bug.title,
    bug.description,
    ...bug.symptoms,
    bug.suspectedRootCause,
    bug.project.name,
    familyNameOf(bug, familiesById),
  ]
    .join('\n')
    .toLowerCase();
}

/** Empty or whitespace-only search matches everything. */
export function matchesSearch(searchText: string, search: string): boolean {
  const needle = search.trim().toLowerCase();
  return needle === '' || searchText.includes(needle);
}