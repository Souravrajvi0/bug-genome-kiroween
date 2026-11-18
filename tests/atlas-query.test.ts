import { describe, expect, it } from 'vitest';
import { atlasHref, backHref, parseAtlasQuery, serializeAtlasQuery, withFrom } from '@/lib/domain/atlas-query';
import { EMPTY_CRITERIA } from '@/lib/domain/types';

const parse = (qs: string, known?: string[]) =>
  parseAtlasQuery(new URLSearchParams(qs), known ? { knownFamilyIds: known } : {});

describe('parseAtlasQuery', () => {
  it('parses a valid query', () => {
    expect(parse('q=timeout&family=fam-dup,fam-stale&lang=TypeScript&status=plausible,rejected')).toEqual({
      search: 'timeout',
      families: ['fam-dup', 'fam-stale'],
      languages: ['TypeScript'],
      statuses: ['plausible', 'rejected'],
    });
  });

  it('ignores unknown parameters', () => {
    expect(parse('x=1&utm=2')).toEqual(EMPTY_CRITERIA);
  });

  it('drops invalid languages and statuses without throwing', () => {
    const c = parse('lang=Rust,JavaScript&status=bogus,plausible');
    expect(c.languages).toEqual(['JavaScript']);
    expect(c.statuses).toEqual(['plausible']);
  });

  it('drops family ids that are unknown or malformed', () => {
    expect(parse('family=fam-dup,nope,<script>', ['fam-dup']).families).toEqual(['fam-dup']);
    expect(parse('family=fam-dup,a b,<x>').families).toEqual(['fam-dup']);
  });

  it('handles empty values and duplicates', () => {
    expect(parse('q=&family=,,fam-dup,fam-dup&lang=')).toEqual({ ...EMPTY_CRITERIA, families: ['fam-dup'] });
  });

  it('trims and caps the search text', () => {
    expect(parse('q=%20%20hello%20').search).toBe('hello');
    expect(parse('q=' + 'a'.repeat(500)).search.length).toBe(200);
  });

  it('accepts a plain record (Next search params)', () => {
    expect(parseAtlasQuery({ q: 'a', status: ['plausible', 'rejected'] }).statuses).toEqual(['plausible']);
  });
});

describe('serializeAtlasQuery', () => {
  it('gives an empty string for empty criteria', () => {
    expect(serializeAtlasQuery(EMPTY_CRITERIA)).toBe('');
    expect(atlasHref(EMPTY_CRITERIA)).toBe('/');
  });

  it('is canonical: sorted, deduplicated, search encoded', () => {
    expect(
      serializeAtlasQuery({ search: 'a b&c', families: ['fam-stale', 'fam-dup'], languages: [], statuses: ['rejected', 'plausible'] }),
    ).toBe('q=a%20b%26c&family=fam-dup,fam-stale&status=plausible,rejected');
  });

  it('round-trips through parse', () => {
    const c = { search: 'a b&c=d', families: ['fam-dup'], languages: ['TypeScript'] as const, statuses: ['plausible'] as const };
    expect(parse(serializeAtlasQuery(c))).toEqual({ ...c, languages: ['TypeScript'], statuses: ['plausible'] });
  });
});

describe('detail links', () => {
  it('adds and reads the from parameter', () => {
    const c = { ...EMPTY_CRITERIA, families: ['fam-dup'] };
    const link = withFrom('/bugs/bug-01', c);
    expect(link).toBe('/bugs/bug-01?from=family%3Dfam-dup');
    const from = new URL('http://x' + link).searchParams.get('from');
    expect(backHref(from)).toBe('/?family=fam-dup');
  });

  it('adds nothing for empty criteria', () => {
    expect(withFrom('/bugs/bug-01', EMPTY_CRITERIA)).toBe('/bugs/bug-01');
  });

  it('never turns a hostile from value into another destination', () => {
    expect(backHref('https://evil.example/x')).toBe('/');
    expect(backHref('//evil.example')).toBe('/');
    expect(backHref(undefined)).toBe('/');
    expect(backHref('q=a&redirect=https://evil.example')).toBe('/?q=a');
  });
});