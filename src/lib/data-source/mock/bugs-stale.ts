import type { Bug } from '@/lib/domain/types';
import { HARBOR, LUMEN, TESSERA } from './projects';
import { code } from './snippet';

export const BUG_04: Bug = {
  id: 'bug-04',
  title: 'Old price applied after coupon request',
  description:
    'If a shopper changes the quantity while a coupon request is in flight, the cart total is computed from the old subtotal and ignores the change.',
  symptoms: ['Total does not match the items in the cart', 'Discount applied to a stale subtotal', 'Depends on request timing'],
  suspectedRootCause:
    'The subtotal is read before the await and used after it, so changes made during the request are overwritten.',
  fixSummary:
    'Reads the subtotal again after the request returns. The total now uses the current value, which removes the dependence on a value captured before the wait.',
  familyId: 'fam-stale',
  language: 'TypeScript',
  project: LUMEN,
  buggy: code(77, `
async function applyCoupon(code: string) {
  const subtotal = state.subtotal;
  const { discount } = await api.get('/coupons/' + code);
  state.total = subtotal - discount;
}
`),
  fixed: code(77, `
async function applyCoupon(code: string) {
  const { discount } = await api.get('/coupons/' + code);
  state.total = state.subtotal - discount;
}
`),
  isMock: true,
};

export const BUG_05: Bug = {
  id: 'bug-05',
  title: 'Slow response overwrites a newer local edit',
  description:
    'A note is merged on the server while the user keeps typing. When the merge response arrives, it replaces the newer text on the device.',
  symptoms: ['Recently typed text disappears', 'Note reverts to an earlier version', 'More likely on slow connections'],
  suspectedRootCause:
    'The base value is read before the await and the merged result is written after it without checking that the note still has that base.',
  fixSummary:
    'Compares the note with the captured base after the response and starts another save if it changed. The newer edit is kept, which addresses the unchecked write after the wait.',
  familyId: 'fam-stale',
  language: 'TypeScript',
  project: TESSERA,
  buggy: code(203, `
async function saveNote(id: string, text: string) {
  const base = store.notes[id];
  const merged = await http.post('/notes/' + id + '/merge', { base, text });
  store.notes[id] = merged;
}
`),
  fixed: code(203, `
async function saveNote(id: string, text: string) {
  const base = store.notes[id];
  const merged = await http.post('/notes/' + id + '/merge', { base, text });
  if (store.notes[id] !== base) {
    return saveNote(id, store.notes[id].text);
  }
  store.notes[id] = merged;
}
`),
  isMock: true,
};

export const BUG_06: Bug = {
  id: 'bug-06',
  title: 'Older validation result replaces a newer one',
  description:
    'Remote validation is requested on every keystroke. Responses can arrive out of order, so an error for an old value can replace the result for the current value.',
  symptoms: ['Error message shown for a value that is now valid', 'Flickering validation state', 'Depends on server response order'],
  suspectedRootCause:
    'Each response is applied to the field without checking that it belongs to the latest request.',
  fixSummary:
    'Numbers each request and ignores a response whose number is not the latest. Only the answer to the newest input is shown, which removes the unordered overwrite.',
  familyId: 'fam-stale',
  language: 'JavaScript',
  project: HARBOR,
  buggy: code(31, `
async function onInput(field, value) {
  const result = await validateRemote(field.name, value);
  field.error = result.ok ? null : result.message;
  render(field);
}
`),
  fixed: code(31, `
let latest = 0;
async function onInput(field, value) {
  const ticket = ++latest;
  const result = await validateRemote(field.name, value);
  if (ticket !== latest) return;
  field.error = result.ok ? null : result.message;
  render(field);
}
`),
  isMock: true,
};