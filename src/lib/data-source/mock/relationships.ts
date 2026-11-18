import type { EvidenceRef, Relationship, SnippetKind } from '@/lib/domain/types';

/** Shorthand for an evidence reference. Line numbers are the displayed line numbers. */
const ref = (bugId: string, snippet: SnippetKind, fromLine: number, toLine: number): EvidenceRef => ({
  bugId,
  snippet,
  fromLine,
  toLine,
});

const ev = (id: string, statement: string, a: EvidenceRef, b: EvidenceRef) => ({
  id,
  statement,
  refs: [a, b] as const,
  provenance: 'illustrative' as const,
});

/**
 * Invented relationships. All are cross-project. They are illustrations, not findings.
 */
export const RELATIONSHIPS: readonly Relationship[] = [
  {
    id: 'rel-01',
    bugAId: 'bug-01',
    bugBId: 'bug-02',
    explanation:
      'A checkout click and a redelivered job look unrelated, but both reach an action that must happen once without asking whether it already happened. Both fixes add that question and remember the answer.',
    baselineStatus: 'evidence-backed',
    evidenceProvenance: 'illustrative',
    evidence: [
      ev('ev-01-1', 'Both buggy versions run the action with no check that it already ran or is running.', ref('bug-01', 'buggy', 24, 26), ref('bug-02', 'buggy', 60, 61)),
      ev('ev-01-2', 'Both fixes return early when the work was already started or done.', ref('bug-01', 'fixed', 27, 27), ref('bug-02', 'fixed', 61, 64)),
      ev('ev-01-3', 'Both fixes record the work under a stable identity so a repeat can be recognised.', ref('bug-01', 'fixed', 33, 33), ref('bug-02', 'fixed', 66, 66)),
    ],
    isMock: true,
  },
  {
    id: 'rel-02',
    bugAId: 'bug-01',
    bugBId: 'bug-03',
    explanation:
      'A double click and a network retry both repeat a create request. The shared idea is that the receiver cannot tell a repeat from a new request. The mechanisms are not identical: one guards on the client, the other relies on a key the server must honour, so this link is plausible but not settled.',
    baselineStatus: 'plausible',
    evidenceProvenance: 'illustrative',
    evidence: [
      ev('ev-02-1', 'Both buggy versions send a create request that is only safe to repeat if it can be recognised, and neither sends a stable key.', ref('bug-01', 'buggy', 26, 29), ref('bug-03', 'buggy', 115, 115)),
      ev('ev-02-2', 'Both fixes attach a stable key to the request.', ref('bug-01', 'fixed', 33, 33), ref('bug-03', 'fixed', 116, 116)),
    ],
    isMock: true,
  },
  {
    id: 'rel-03',
    bugAId: 'bug-04',
    bugBId: 'bug-05',
    explanation:
      'Both functions read a value, wait for a response and then write using the value they read before the wait. Anything that changed during the wait is lost. Both fixes look at the current state after the wait.',
    baselineStatus: 'evidence-backed',
    evidenceProvenance: 'illustrative',
    evidence: [
      ev('ev-03-1', 'Both read state before an await and use that value after it.', ref('bug-04', 'buggy', 78, 80), ref('bug-05', 'buggy', 204, 206)),
      ev('ev-03-2', 'Both fixes look at the current state after the await instead of trusting the earlier read.', ref('bug-04', 'fixed', 78, 79), ref('bug-05', 'fixed', 206, 208)),
    ],
    isMock: true,
  },
  {
    id: 'rel-04',
    bugAId: 'bug-05',
    bugBId: 'bug-06',
    explanation:
      'Both apply the result of an async call to state without checking that the result still belongs to the current state. The fixes differ: one compares the stored value, the other numbers requests. That difference keeps the link at plausible.',
    baselineStatus: 'plausible',
    evidenceProvenance: 'illustrative',
    evidence: [
      ev('ev-04-1', 'Both write an async result into state without checking that it is still current.', ref('bug-05', 'buggy', 205, 206), ref('bug-06', 'buggy', 32, 33)),
      ev('ev-04-2', 'Both fixes compare against something captured at request time, one a value and the other a request number.', ref('bug-05', 'fixed', 206, 208), ref('bug-06', 'fixed', 33, 35)),
    ],
    isMock: true,
  },
  {
    id: 'rel-05',
    bugAId: 'bug-04',
    bugBId: 'bug-06',
    explanation:
      'In both cases a result arrives after the state changed and is applied as if nothing changed. The trigger differs (a captured value versus out-of-order responses), so this link is weaker than the others in the family.',
    baselineStatus: 'plausible',
    evidenceProvenance: 'illustrative',
    evidence: [
      ev('ev-05-1', 'A result computed before a change is applied after the change in both buggy versions.', ref('bug-04', 'buggy', 79, 80), ref('bug-06', 'buggy', 32, 33)),
      ev('ev-05-2', 'The fixes differ: one re-reads the state, the other discards late responses.', ref('bug-04', 'fixed', 78, 79), ref('bug-06', 'fixed', 35, 35)),
    ],
    isMock: true,
  },
  {
    id: 'rel-06',
    bugAId: 'bug-07',
    bugBId: 'bug-09',
    explanation:
      'Both start asynchronous work and carry on as if it succeeded. A rejection is never handled, so the failure is silent. Both fixes attach failure handling to the work.',
    baselineStatus: 'evidence-backed',
    evidenceProvenance: 'illustrative',
    evidence: [
      ev('ev-06-1', 'Both start asynchronous work whose failure is never observed.', ref('bug-07', 'buggy', 15, 18), ref('bug-09', 'buggy', 54, 57)),
      ev('ev-06-2', 'Both buggy versions continue as if the work succeeded.', ref('bug-07', 'buggy', 19, 19), ref('bug-09', 'buggy', 55, 56)),
      ev('ev-06-3', 'Both fixes attach failure handling to the async work.', ref('bug-07', 'fixed', 19, 20), ref('bug-09', 'fixed', 56, 56)),
    ],
    isMock: true,
  },
  {
    id: 'rel-07',
    bugAId: 'bug-08',
    bugBId: 'bug-09',
    explanation:
      'Both ignore the outcome of a promise. One never awaits it, the other chains without a catch. The shared idea is a missing failure path, but the code shapes differ, so the link is plausible.',
    baselineStatus: 'plausible',
    evidenceProvenance: 'illustrative',
    evidence: [
      ev('ev-07-1', 'Both buggy versions ignore the outcome of a promise.', ref('bug-08', 'buggy', 92, 92), ref('bug-09', 'buggy', 54, 54)),
      ev('ev-07-2', 'Both fixes add an explicit failure path.', ref('bug-08', 'fixed', 92, 96), ref('bug-09', 'fixed', 56, 56)),
    ],
    isMock: true,
  },
  {
    id: 'rel-08',
    bugAId: 'bug-10',
    bugBId: 'bug-11',
    explanation:
      'Both effects register a listener on every render and never remove it. Both fixes name the handler, remove it in the cleanup and run the effect once.',
    baselineStatus: 'evidence-backed',
    evidenceProvenance: 'illustrative',
    evidence: [
      ev('ev-08-1', 'Both effects register a listener on every render, with no dependency list.', ref('bug-10', 'buggy', 10, 12), ref('bug-11', 'buggy', 122, 126)),
      ev('ev-08-2', 'Both fixes remove the listener in the effect cleanup and run once.', ref('bug-10', 'fixed', 13, 14), ref('bug-11', 'fixed', 127, 128)),
      ev('ev-08-3', 'Both fixes keep a named reference so the same handler can be removed.', ref('bug-10', 'fixed', 11, 12), ref('bug-11', 'fixed', 123, 126)),
    ],
    isMock: true,
  },
  {
    id: 'rel-09',
    bugAId: 'bug-11',
    bugBId: 'bug-12',
    explanation:
      'Both add a handler that outlives the code that added it. The repetition comes from re-rendering in one and reconnecting in the other, and the fixes remove at different moments, so the link is plausible.',
    baselineStatus: 'plausible',
    evidenceProvenance: 'illustrative',
    evidence: [
      ev('ev-09-1', 'Both add a handler that outlives the code that added it.', ref('bug-11', 'buggy', 123, 125), ref('bug-12', 'buggy', 74, 74)),
      ev('ev-09-2', 'The fixes differ: one removes on cleanup, the other removes right before adding.', ref('bug-11', 'fixed', 127, 127), ref('bug-12', 'fixed', 74, 75)),
    ],
    isMock: true,
  },
  {
    id: 'rel-10',
    bugAId: 'bug-01',
    bugBId: 'bug-10',
    explanation:
      'Negative example. Both bugs show the same symptom, an action that appears twice, and a reader could file them together. The causes differ. In the checkout bug the action itself is requested twice because nothing checks whether it already started. In the toast bug the action runs once and the reaction to it is registered twice. A guard would not fix the toast, and a listener cleanup would not fix the order.',
    baselineStatus: 'rejected',
    evidenceProvenance: 'illustrative',
    negative: {
      rootCauseA: 'Nothing checks whether the checkout action is already running, so the order request is sent twice.',
      rootCauseB: 'The effect adds a new listener on each render and never removes it, so a single save triggers several toasts.',
    },
    evidence: [
      ev('ev-10-1', 'In the first bug the action is requested twice. In the second the action runs once and the reaction is registered twice.', ref('bug-01', 'buggy', 25, 26), ref('bug-10', 'buggy', 10, 11)),
      ev('ev-10-2', 'The fixes act on different things: an entry check in one, a listener cleanup in the other.', ref('bug-01', 'fixed', 27, 28), ref('bug-10', 'fixed', 13, 13)),
    ],
    isMock: true,
  },
];