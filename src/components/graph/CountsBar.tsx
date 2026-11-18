import type { Visibility } from '@/lib/domain/visibility';

function Stat({ label, value, total, tone }: { label: string; value: number; total?: number; tone?: 'warn' }) {
  const filtered = total !== undefined && value !== total;
  return (
    <div className="stat" data-filtered={filtered} data-tone={tone}>
      <dt className="stat__label">{label}</dt>
      <dd className="stat__value">
        <span className="stat__num">{value}</span>
        {total !== undefined ? <span className="stat__total"> of {total}</span> : null}
      </dd>
    </div>
  );
}

/** Counts are "visible of total". Isolated bugs are shown only when there is at least one. */
export function CountsBar({ counts }: { counts: Visibility['counts'] }) {
  return (
    <dl className="counts" aria-label="Visible counts" data-testid="counts">
      <Stat label="Bugs" value={counts.bugs[0]} total={counts.bugs[1]} />
      <Stat label="Relationships" value={counts.relationships[0]} total={counts.relationships[1]} />
      <Stat label="Families" value={counts.families[0]} total={counts.families[1]} />
      {counts.isolated > 0 ? <Stat label="Isolated bugs" value={counts.isolated} tone="warn" /> : null}
    </dl>
  );
}
