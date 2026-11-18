import type { Bug } from '@/lib/domain/types';
import { HARBOR, LUMEN, PIGEON } from './projects';
import { code } from './snippet';

export const BUG_07: Bug = {
  id: 'bug-07',
  title: 'Rejection inside forEach callback is lost',
  description:
    'A flush function sends queued jobs from an async callback inside forEach. Sends can fail, but the function logs success and nobody sees the failure.',
  symptoms: ['Log says flush done while jobs were never sent', 'No error anywhere for failed sends', 'Unhandled rejection warnings only in some runtimes'],
  suspectedRootCause:
    'forEach does not wait for or observe the promises returned by its async callback, so rejections are never handled.',
  fixSummary:
    'Collects the promises with Promise.allSettled and reports the failed ones. Failures are now observed, which removes the unobserved rejections.',
  familyId: 'fam-swallow',
  language: 'JavaScript',
  project: PIGEON,
  buggy: code(14, `
function flushAll(jobs) {
  jobs.forEach(async (job) => {
    await send(job);
    markSent(job.id);
  });
  log('flush done');
}
`),
  fixed: code(14, `
async function flushAll(jobs) {
  const results = await Promise.allSettled(jobs.map(async (job) => {
    await send(job);
    markSent(job.id);
  }));
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) log('flush failed: ' + failed.length);
  else log('flush done');
}
`),
  isMock: true,
};

export const BUG_08: Bug = {
  id: 'bug-08',
  title: 'Fire-and-forget email failure never reported',
  description:
    'Completing an order sends a receipt email without waiting for it. When the mail service is down, the failure disappears and customers never get a receipt.',
  symptoms: ['Orders complete but receipts are missing', 'No error in application logs', 'Only during mail service outages'],
  suspectedRootCause:
    'The promise from the receipt call is neither awaited nor given a failure handler.',
  fixSummary:
    'Awaits the receipt call inside a try block and reports a failure. The error reaches monitoring, which addresses the missing failure handling.',
  familyId: 'fam-swallow',
  language: 'TypeScript',
  project: LUMEN,
  buggy: code(90, `
async function completeOrder(order: Order) {
  await db.orders.markPaid(order.id);
  sendReceipt(order.email, order.id);
  return { ok: true };
}
`),
  fixed: code(90, `
async function completeOrder(order: Order) {
  await db.orders.markPaid(order.id);
  try {
    await sendReceipt(order.email, order.id);
  } catch (err) {
    reportError('receipt-failed', err);
  }
  return { ok: true };
}
`),
  isMock: true,
};

export const BUG_09: Bug = {
  id: 'bug-09',
  title: 'Promise without catch leaves the spinner on',
  description:
    'When a form submission fails, the spinner stays visible forever because only the success path hides it.',
  symptoms: ['Endless spinner after a server error', 'No error message shown', 'Form cannot be submitted again'],
  suspectedRootCause:
    'The promise chain has a success handler but no failure handler, so a rejection skips the cleanup.',
  fixSummary:
    'Adds a catch that shows the error and moves the spinner cleanup to finally. The spinner is hidden on both outcomes, which closes the unhandled failure path.',
  familyId: 'fam-swallow',
  language: 'JavaScript',
  project: HARBOR,
  buggy: code(52, `
function submitForm(form) {
  showSpinner(form);
  post(form.action, serialize(form)).then((res) => {
    hideSpinner(form);
    showSuccess(form, res);
  });
}
`),
  fixed: code(52, `
function submitForm(form) {
  showSpinner(form);
  post(form.action, serialize(form))
    .then((res) => showSuccess(form, res))
    .catch((err) => showError(form, err))
    .finally(() => hideSpinner(form));
}
`),
  isMock: true,
};