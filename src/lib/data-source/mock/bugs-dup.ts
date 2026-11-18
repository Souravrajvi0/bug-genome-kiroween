import type { Bug } from '@/lib/domain/types';
import { LUMEN, PIGEON, TESSERA } from './projects';
import { code } from './snippet';

export const BUG_01: Bug = {
  id: 'bug-01',
  title: 'Double click creates two orders',
  description:
    'Customers who click the checkout button twice quickly end up with two identical orders. The button is only disabled after the next render, which comes too late.',
  symptoms: ['Two orders with the same items and total', 'Customer charged twice', 'Support tickets about duplicate confirmation emails'],
  suspectedRootCause:
    'The click handler reaches the order request without checking whether a request is already in progress.',
  fixSummary:
    'Adds an early return while a submission is running and sends a per-cart idempotency key. A second click now returns before posting, which closes the missing check that the action already started.',
  familyId: 'fam-dup',
  language: 'TypeScript',
  project: LUMEN,
  buggy: code(24, `
async function onCheckoutClick(cart: Cart) {
  setBusy(true);
  const order = await api.post('/orders', {
    items: cart.items,
    total: cart.total,
  });
  setBusy(false);
  navigate('/orders/' + order.id);
}
`),
  fixed: code(24, `
let submitting = false;

async function onCheckoutClick(cart: Cart) {
  if (submitting) return;
  submitting = true;
  try {
    const order = await api.post('/orders', {
      items: cart.items,
      total: cart.total,
    }, { idempotencyKey: cart.id });
    navigate('/orders/' + order.id);
  } finally {
    submitting = false;
  }
}
`),
  isMock: true,
};

export const BUG_02: Bug = {
  id: 'bug-02',
  title: 'Job runs twice after the visibility timeout',
  description:
    'A slow job handler takes longer than the visibility timeout. The queue hands the same job to a second worker while the first is still running, so the work happens twice.',
  symptoms: ['Same job id appears in two worker logs', 'Emails or exports produced twice', 'Occurs only for slow jobs'],
  suspectedRootCause:
    'The worker runs the handler without checking whether this job id was already processed or is being processed.',
  fixSummary:
    'Checks a ledger of processed job ids before running the handler and records the id afterwards. A redelivered job is acknowledged and skipped, which addresses the missing already-done check.',
  familyId: 'fam-dup',
  language: 'JavaScript',
  project: PIGEON,
  buggy: code(58, `
async function runWorker(queue) {
  const job = await queue.reserve({ visibilityMs: 30000 });
  if (!job) return;
  await handlers[job.type](job.payload);
  await queue.ack(job.id);
}
`),
  fixed: code(58, `
async function runWorker(queue, ledger) {
  const job = await queue.reserve({ visibilityMs: 30000 });
  if (!job) return;
  if (await ledger.has(job.id)) {
    await queue.ack(job.id);
    return;
  }
  await handlers[job.type](job.payload);
  await ledger.add(job.id);
  await queue.ack(job.id);
}
`),
  isMock: true,
};

export const BUG_03: Bug = {
  id: 'bug-03',
  title: 'Retried upload creates a duplicate record',
  description:
    'When an upload times out after the server already stored the record, the client retries and the server stores a second copy.',
  symptoms: ['Duplicate notes after a flaky network', 'Two server records share the same local id', 'Only appears with retries enabled'],
  suspectedRootCause:
    'The retry loop repeats a create request that carries no stable key, so the server cannot tell a repeat from a new record.',
  fixSummary:
    'Derives a stable key from the local id and sends it with every attempt. The server can recognise a repeated request, which addresses the missing repeat detection.',
  familyId: 'fam-dup',
  language: 'TypeScript',
  project: TESSERA,
  buggy: code(112, `
async function uploadRecord(rec: LocalRecord) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await http.post('/records', rec);
      return;
    } catch (err) {
      await sleep(attempt * 500);
    }
  }
  throw new Error('upload failed');
}
`),
  fixed: code(112, `
async function uploadRecord(rec: LocalRecord) {
  const key = 'rec-' + rec.localId;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await http.post('/records', rec, { headers: { 'Idempotency-Key': key } });
      return;
    } catch (err) {
      await sleep(attempt * 500);
    }
  }
  throw new Error('upload failed');
}
`),
  isMock: true,
};