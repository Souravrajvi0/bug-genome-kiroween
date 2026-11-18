import type { Family } from '@/lib/domain/types';

/** Invented family labels. They are illustrations, not findings. */
export const FAMILIES: readonly Family[] = [
  {
    id: 'fam-dup',
    name: 'Duplicate execution without a guard',
    summary: 'The same action runs twice because nothing checks whether it already ran.',
    color: '#22D3EE',
    glyph: 'A',
  },
  {
    id: 'fam-stale',
    name: 'Stale result applied after an async gap',
    summary: 'State is read before an await and used after it, so a changed value is overwritten.',
    color: '#60A5FA',
    glyph: 'B',
  },
  {
    id: 'fam-swallow',
    name: 'Async failure silently dropped',
    summary: 'An asynchronous operation fails and no code ever observes the failure.',
    color: '#A78BFA',
    glyph: 'C',
  },
  {
    id: 'fam-listener',
    name: 'Listener registered more than once',
    summary: 'A handler is added again and again without being removed.',
    color: '#F0ABFC',
    glyph: 'D',
  },
];