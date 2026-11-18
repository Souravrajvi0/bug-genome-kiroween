import { StatusLine } from '@/components/ui/StatusBadge';
import type { Family, RelationshipStatus } from '@/lib/domain/types';
import type { NodeShape } from './graphModel';

const STATUSES: { status: RelationshipStatus; label: string; short: string }[] = [
  { status: 'evidence-backed', label: 'Evidence-backed (illustrative)', short: 'Evidence-backed' },
  { status: 'plausible', label: 'Plausible', short: 'Plausible' },
  { status: 'rejected', label: 'Rejected', short: 'Rejected' },
];

function NodeSample({ color = '#7DD3FC', dashed = true }: { color?: string; dashed?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="legend__node">
      <circle cx="10" cy="10" r="5.5" fill="#0C111B" stroke={color} strokeWidth="1.6" />
      {dashed ? <circle cx="10" cy="10" r="8.6" fill="none" stroke={color} strokeOpacity=".6" strokeWidth="1" strokeDasharray="2 2" /> : null}
    </svg>
  );
}

function DiamondSample() {
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" aria-hidden="true" className="legend__diamond">
      <line x1="1" y1="5" x2="21" y2="5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11 1.5 14.5 5 11 8.5 7.5 5Z" fill="currentColor" />
    </svg>
  );
}

/** Always-visible, single-row key for line styles, drawn over the canvas. */
export function StatusKey() {
  return (
    <ul className="status-key" aria-label="Line styles">
      {STATUSES.map((s) => (
        <li key={s.status} className={`status-key__item status-key__item--${s.status}`}>
          <StatusLine status={s.status} width={20} />
          <span>{s.status === 'evidence-backed' ? s.label : s.short}</span>
        </li>
      ))}
    </ul>
  );
}

/** Full legend: families, line styles, markers and project tags. */
export function GraphLegend({
  families,
  projects,
}: {
  families: readonly Family[];
  projects: ReadonlyMap<string, { name: string; shape: NodeShape; tag: string }>;
}) {
  return (
    <section className="legend" aria-labelledby="legend-title">
      <h3 id="legend-title" className="eyebrow">
        Reading the graph
      </h3>
      <dl className="legend__grid">
        <dt className="legend__term">Families</dt>
        <dd>
          <ul className="legend__list">
            {families.map((f) => (
              <li key={f.id}>
                <span className="legend__swatch" style={{ background: f.color }} aria-hidden="true" />
                <strong className="legend__glyph">{f.glyph}</strong> {f.name}
              </li>
            ))}
          </ul>
        </dd>
        <dt className="legend__term">Lines</dt>
        <dd>
          <ul className="legend__list">
            {STATUSES.map((s) => (
              <li key={s.status} className={`legend__status legend__status--${s.status}`}>
                <StatusLine status={s.status} /> {s.label}
              </li>
            ))}
            <li>
              <DiamondSample /> Diamond on a line: the bugs are in different projects
            </li>
          </ul>
        </dd>
        <dt className="legend__term">Nodes</dt>
        <dd>
          <ul className="legend__list">
            <li>
              <NodeSample /> Dashed ring: illustrative (invented) bug
            </li>
            {[...projects.entries()].map(([id, p]) => (
              <li key={id}>
                <span className="legend__tag">{p.tag}</span> {p.name}
              </li>
            ))}
          </ul>
        </dd>
      </dl>
    </section>
  );
}
