import type { Family } from '@/lib/domain/types';
import { UNKNOWN_FAMILY_NAME } from '@/lib/domain/search';

export function FamilyChip({ family, size = 'md' }: { family: Family | undefined; size?: 'sm' | 'md' }) {
  const color = family?.color ?? '#64748B';
  return (
    <span className={`family-chip family-chip--${size}`} style={{ ['--fam' as string]: color }}>
      <span className="family-chip__glyph" aria-hidden="true">
        {family?.glyph ?? '?'}
      </span>
      {family?.name ?? UNKNOWN_FAMILY_NAME}
    </span>
  );
}

/** The family letter alone, in its color. Decorative: always pair it with the family name nearby. */
export function FamilyGlyph({ family }: { family: Family | undefined }) {
  return (
    <span className="family-glyph" style={{ ['--fam' as string]: family?.color ?? '#64748B' }} aria-hidden="true">
      {family?.glyph ?? '?'}
    </span>
  );
}
