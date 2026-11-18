import type { AtlasData } from '@/lib/domain/types';
import { BUG_01, BUG_02, BUG_03 } from './bugs-dup';
import { BUG_10, BUG_11, BUG_12 } from './bugs-listener';
import { BUG_04, BUG_05, BUG_06 } from './bugs-stale';
import { BUG_07, BUG_08, BUG_09 } from './bugs-swallow';
import { FAMILIES } from './families';
import { RELATIONSHIPS } from './relationships';

/** The illustrative dataset. All content is invented. It is not a dataset finding. */
export const MOCK_DATASET: AtlasData = {
  families: FAMILIES,
  bugs: [BUG_01, BUG_02, BUG_03, BUG_04, BUG_05, BUG_06, BUG_07, BUG_08, BUG_09, BUG_10, BUG_11, BUG_12],
  relationships: RELATIONSHIPS,
};