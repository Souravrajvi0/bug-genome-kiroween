import { describe, expect, it } from 'vitest';
import { MockDataSource } from '@/lib/data-source/mock/MockDataSource';
import { MOCK_DATASET } from '@/lib/data-source/mock';
import { isCrossProject } from '@/lib/domain/status';
import type { Bug, EvidenceRef, Snippet } from '@/lib/domain/types';

const { families, bugs, relationships } = MOCK_DATASET;
const bugsById = new Map(bugs.map((b) => [b.id, b]));
const snippetOf = (ref: EvidenceRef): Snippet => {
  const bug = bugsById.get(ref.bugId)!;
  return ref.snippet === 'buggy' ? bug.buggy : bug.fixed;
};
const projectsOf = (list: readonly Bug[]) => new Set(list.map((b) => b.project.id));

describe('mock dataset (R9)', () => {
  it('has 10 to 12 bugs and 3 to 4 families (R9.1, R9.2)', () => {
    expect(bugs.length).toBeGreaterThanOrEqual(10);
    expect(bugs.length).toBeLessThanOrEqual(12);
    expect(families.length).toBeGreaterThanOrEqual(3);
    expect(families.length).toBeLessThanOrEqual(4);
  });

  it('uses only JavaScript or TypeScript (R9.3)', () => {
    for (const b of bugs) expect(['JavaScript', 'TypeScript']).toContain(b.language);
  });

  it('gives each bug the required fields and short snippets (R9.4)', () => {
    for (const b of bugs) {
      expect(b.description.length).toBeGreaterThan(0);
      expect(b.symptoms.length).toBeGreaterThan(0);
      expect(b.suspectedRootCause.length).toBeGreaterThan(0);
      expect(b.project.name.length).toBeGreaterThan(0);
      expect(b.buggy.lines.length).toBeGreaterThan(0);
      expect(b.buggy.lines.length).toBeLessThanOrEqual(25);
      expect(b.fixed.lines.length).toBeGreaterThan(0);
      expect(b.fixed.lines.length).toBeLessThanOrEqual(25);
      expect(b.isMock).toBe(true);
    }
  });

  it('gives each relationship an explanation, evidence, baseline and provenance (R9.5)', () => {
    for (const r of relationships) {
      expect(r.explanation.length).toBeGreaterThan(0);
      expect(r.evidence.length).toBeGreaterThanOrEqual(1);
      expect(['evidence-backed', 'plausible', 'rejected']).toContain(r.baselineStatus);
      expect(r.evidenceProvenance).toBe('illustrative');
      for (const e of r.evidence) expect(e.provenance).toBe('illustrative');
      expect(r.isMock).toBe(true);
    }
  });

  it('includes every baseline status (R9.6)', () => {
    const set = new Set(relationships.map((r) => r.baselineStatus));
    expect(set).toEqual(new Set(['evidence-backed', 'plausible', 'rejected']));
  });

  it('has at least 8 cross-project relationships (R9.7)', () => {
    expect(relationships.length).toBeGreaterThanOrEqual(8);
    expect(relationships.filter((r) => isCrossProject(r, bugsById)).length).toBeGreaterThanOrEqual(8);
  });

  it('has at least 4 projects and family project spread (R9.8)', () => {
    expect(projectsOf(bugs).size).toBeGreaterThanOrEqual(4);
    for (const f of families) {
      const members = bugs.filter((b) => b.familyId === f.id);
      expect(projectsOf(members).size).toBeGreaterThanOrEqual(members.length >= 3 ? 3 : 2);
    }
  });

  it('gives each family at least 2 cross-project relationships among its bugs (R9.9)', () => {
    for (const f of families) {
      const ids = new Set(bugs.filter((b) => b.familyId === f.id).map((b) => b.id));
      const n = relationships.filter(
        (r) => ids.has(r.bugAId) && ids.has(r.bugBId) && isCrossProject(r, bugsById),
      ).length;
      expect(n, f.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('includes a negative example that names both root causes (R9.10)', () => {
    const neg = relationships.filter((r) => r.negative);
    expect(neg.length).toBeGreaterThanOrEqual(1);
    for (const r of neg) {
      expect(r.baselineStatus).toBe('rejected');
      expect(isCrossProject(r, bugsById)).toBe(true);
      expect(r.negative!.rootCauseA.length).toBeGreaterThan(0);
      expect(r.negative!.rootCauseB.length).toBeGreaterThan(0);
      expect(r.negative!.rootCauseA).not.toBe(r.negative!.rootCauseB);
    }
  });

  it('gives each bug at least one relationship (R9.11)', () => {
    for (const b of bugs) {
      expect(relationships.some((r) => r.bugAId === b.id || r.bugBId === b.id), b.id).toBe(true);
    }
  });

  it('uses unique ids (R9.13)', () => {
    const all = [
      ...bugs.map((b) => b.id),
      ...families.map((f) => f.id),
      ...relationships.map((r) => r.id),
      ...relationships.flatMap((r) => r.evidence.map((e) => e.id)),
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  it('references only existing bugs, families and line ranges (R9.14)', () => {
    const familyIds = new Set(families.map((f) => f.id));
    for (const b of bugs) expect(familyIds.has(b.familyId), b.id).toBe(true);
    for (const r of relationships) {
      expect(bugsById.has(r.bugAId)).toBe(true);
      expect(bugsById.has(r.bugBId)).toBe(true);
      expect(r.bugAId).not.toBe(r.bugBId);
      for (const e of r.evidence) {
        expect(e.refs.length).toBeGreaterThan(0);
        for (const ref of e.refs) {
          expect([r.bugAId, r.bugBId]).toContain(ref.bugId);
          const s = snippetOf(ref);
          expect(ref.fromLine, e.id).toBeGreaterThanOrEqual(s.startLine);
          expect(ref.toLine, e.id).toBeLessThanOrEqual(s.startLine + s.lines.length - 1);
          expect(ref.fromLine, e.id).toBeLessThanOrEqual(ref.toLine);
        }
        // one reference per side of the relationship
        expect(new Set(e.refs.map((x) => x.bugId))).toEqual(new Set([r.bugAId, r.bugBId]));
      }
    }
  });

  it('gives each bug a fix summary that is separate from the root cause (R9.16)', () => {
    for (const b of bugs) {
      expect(b.fixSummary.trim().length, b.id).toBeGreaterThan(0);
      expect(b.fixSummary.length, b.id).toBeLessThanOrEqual(400);
      expect(b.fixSummary, b.id).not.toBe(b.suspectedRootCause);
    }
  });

  it('does not describe mock items as verified, confirmed or real (R10.6)', () => {
    const texts: string[] = [
      ...families.flatMap((f) => [f.name, f.summary]),
      ...bugs.flatMap((b) => [b.title, b.description, ...b.symptoms, b.suspectedRootCause, b.fixSummary, b.project.name, b.project.type, b.project.description]),
      ...relationships.flatMap((r) => [
        r.explanation,
        r.negative?.rootCauseA ?? '',
        r.negative?.rootCauseB ?? '',
        ...r.evidence.map((e) => e.statement),
      ]),
    ];
    for (const t of texts) {
      const cleaned = t.replace(/not verified/gi, '');
      expect(cleaned, t).not.toMatch(/\b(verified|confirmed|real)\b/i);
    }
  });

  it('names no real organizations (R9.12): project names are the invented set', () => {
    expect([...projectsOf(bugs)].sort()).toEqual(['proj-harbor', 'proj-lumen', 'proj-pigeon', 'proj-tessera']);
  });
});

describe('MockDataSource (R11.3)', () => {
  const ds = new MockDataSource();
  it('lists everything', async () => {
    expect((await ds.listBugs()).length).toBe(bugs.length);
    expect((await ds.listFamilies()).length).toBe(families.length);
    expect((await ds.listRelationships()).length).toBe(relationships.length);
  });
  it('gets by id and returns null when missing', async () => {
    expect((await ds.getBug('bug-01'))?.id).toBe('bug-01');
    expect(await ds.getBug('nope')).toBeNull();
    expect((await ds.getRelationship('rel-10'))?.negative).toBeDefined();
    expect(await ds.getRelationship('nope')).toBeNull();
  });
  it('lists relationships for a bug', async () => {
    const ids = (await ds.listRelationshipsForBug('bug-01')).map((r) => r.id).sort();
    expect(ids).toEqual(['rel-01', 'rel-02', 'rel-10']);
    expect(await ds.listRelationshipsForBug('nope')).toEqual([]);
  });
});