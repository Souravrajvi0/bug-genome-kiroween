import { z } from 'zod';
import { LANGUAGES, RELATIONSHIP_STATUSES, type Criteria, type Language, type RelationshipStatus } from './types';

/** Longest search text kept from a URL. */
export const MAX_SEARCH_LENGTH = 200;

type ParamValue = string | readonly string[] | undefined | null;
export type ParamsLike = URLSearchParams | Readonly<Record<string, ParamValue>>;

export interface ParseOptions {
  /** When given, family ids outside this list are dropped. */
  knownFamilyIds?: readonly string[];
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const idSchema = z.string().regex(ID_PATTERN);

function readParam(params: ParamsLike, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const v = params[key];
  if (v === undefined || v === null) return undefined;
  return typeof v === 'string' ? v : v[0];
}

function splitList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter((s) => s !== '');
}

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort();
}

/**
 * Parses URL parameters into Criteria. Never throws.
 * Unknown parameters and invalid values are ignored without an error (R3.16).
 */
export function parseAtlasQuery(params: ParamsLike, options: ParseOptions = {}): Criteria {
  const search = (readParam(params, 'q') ?? '').trim().slice(0, MAX_SEARCH_LENGTH);

  const known = options.knownFamilyIds ? new Set(options.knownFamilyIds) : null;
  const families = uniqueSorted(
    splitList(readParam(params, 'family')).filter(
      (id) => idSchema.safeParse(id).success && (known === null || known.has(id)),
    ),
  );

  const languages = uniqueSorted(
    splitList(readParam(params, 'lang')).filter((l): l is Language => (LANGUAGES as readonly string[]).includes(l)),
  );

  const statuses = uniqueSorted(
    splitList(readParam(params, 'status')).filter((s): s is RelationshipStatus =>
      (RELATIONSHIP_STATUSES as readonly string[]).includes(s),
    ),
  );

  return { search, families, languages, statuses };
}

function listParam(key: string, values: readonly string[]): string | null {
  if (values.length === 0) return null;
  return `${key}=${values.map((v) => encodeURIComponent(v)).join(',')}`;
}

/** Canonical query string without the leading "?". Empty criteria give an empty string. */
export function serializeAtlasQuery(criteria: Criteria): string {
  const search = criteria.search.trim().slice(0, MAX_SEARCH_LENGTH);
  const parts = [
    search === '' ? null : `q=${encodeURIComponent(search)}`,
    listParam('family', uniqueSorted(criteria.families)),
    listParam('lang', uniqueSorted(criteria.languages)),
    listParam('status', uniqueSorted(criteria.statuses)),
  ];
  return parts.filter((p): p is string => p !== null).join('&');
}

/** Path for the Atlas Graph with the given criteria. */
export function atlasHref(criteria: Criteria): string {
  const q = serializeAtlasQuery(criteria);
  return q === '' ? '/' : `/?${q}`;
}

/**
 * Builds the back link for a detail page from its `from` parameter.
 * The value is re-parsed and re-serialized, never used as a raw URL.
 */
export function backHref(from: ParamValue, options: ParseOptions = {}): string {
  const raw = typeof from === 'string' ? from : from?.[0];
  if (!raw) return '/';
  return atlasHref(parseAtlasQuery(new URLSearchParams(raw), options));
}

/** Appends the `from` parameter to a detail path. */
export function withFrom(path: string, criteria: Criteria): string {
  const q = serializeAtlasQuery(criteria);
  return q === '' ? path : `${path}?from=${encodeURIComponent(q)}`;
}
/** Appends a sanitized `from` value (already present in the current URL) to a detail path. */
export function withFromRaw(path: string, from: string | null | undefined, options: ParseOptions = {}): string {
  if (!from) return path;
  const q = serializeAtlasQuery(parseAtlasQuery(new URLSearchParams(from), options));
  return q === '' ? path : `${path}?from=${encodeURIComponent(q)}`;
}