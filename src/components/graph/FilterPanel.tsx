'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { StatusLine } from '@/components/ui/StatusBadge';
import { EMPTY_CRITERIA, LANGUAGES, RELATIONSHIP_STATUSES, type Bug, type Criteria, type Family, type Language, type RelationshipStatus } from '@/lib/domain/types';
import { hasActiveCriteria } from '@/lib/domain/visibility';

const DEBOUNCE_MS = 300;

const STATUS_TEXT: Record<RelationshipStatus, string> = {
  'evidence-backed': 'Evidence-backed',
  plausible: 'Plausible',
  rejected: 'Rejected',
};

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <fieldset className="fsec" data-open={open}>
      <legend className="sr-only">{title}</legend>
      <button type="button" className="fsec__head" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <Icon name="chevronDown" className="fsec__chev" />
        <span>{title}</span>
        {count > 0 ? <span className="fsec__count">{count}</span> : null}
      </button>
      <div id={id} className="fsec__body" hidden={!open}>
        {children}
      </div>
    </fieldset>
  );
}

export function FilterPanel({
  criteria,
  families,
  bugs,
  onChange,
  open,
  onToggleOpen,
}: {
  criteria: Criteria;
  families: readonly Family[];
  bugs: readonly Bug[];
  onChange: (next: Criteria) => void;
  open: boolean;
  onToggleOpen: () => void;
}) {
  const baseId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(criteria.search);
  const lastCommitted = useRef(criteria.search);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(criteria);
  latest.current = criteria;

  // When the URL changes from outside (back, forward, clear), reset the draft from it.
  useEffect(() => {
    if (criteria.search !== lastCommitted.current) {
      lastCommitted.current = criteria.search;
      setDraft(criteria.search);
    }
  }, [criteria.search]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // "/" focuses search from anywhere on the Atlas, like most developer tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const commit = (value: string) => {
    lastCommitted.current = value.trim();
    onChange({ ...latest.current, search: value });
  };

  const onSearch = (value: string) => {
    setDraft(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => commit(value), DEBOUNCE_MS);
  };

  const clearSearch = () => {
    window.clearTimeout(timer.current);
    setDraft('');
    commit('');
    inputRef.current?.focus();
  };

  const clear = () => {
    window.clearTimeout(timer.current);
    lastCommitted.current = '';
    setDraft('');
    onChange(EMPTY_CRITERIA);
  };

  const active = hasActiveCriteria(criteria) || draft.trim() !== '';
  const activeCount =
    criteria.families.length + criteria.languages.length + criteria.statuses.length + (criteria.search.trim() ? 1 : 0);
  const panelId = `${baseId}-panel`;

  return (
    <aside className="filters" aria-label="Search and filters">
      <button
        type="button"
        className="filters__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggleOpen}
      >
        <Icon name="filter" />
        <span>Search and filters{active ? ' (active)' : ''}</span>
        {activeCount > 0 ? <span className="fsec__count">{activeCount}</span> : null}
        <Icon name="chevronDown" className="filters__toggle-chev" />
      </button>
      <div id={panelId} className="filters__panel" data-open={open}>
        <div className="search">
          <label htmlFor={`${baseId}-q`} className="sr-only">
            Search bugs
          </label>
          <Icon name="search" className="search__icon" />
          <input
            ref={inputRef}
            id={`${baseId}-q`}
            type="search"
            className="search__input"
            value={draft}
            placeholder="Search bugs"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${baseId}-qhint`}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && draft) {
                e.stopPropagation();
                clearSearch();
              }
            }}
          />
          {draft ? (
            <button type="button" className="search__clear" aria-label="Clear search" onClick={clearSearch}>
              <Icon name="x" size={14} />
            </button>
          ) : (
            <kbd className="search__kbd" aria-hidden="true">
              /
            </kbd>
          )}
          <span id={`${baseId}-qhint`} className="sr-only">
            Matches title, description, symptoms, root cause, project and family.
          </span>
        </div>

        <Section title="Family" count={criteria.families.length}>
          {families.map((f) => {
            const n = bugs.filter((b) => b.familyId === f.id).length;
            return (
              <label key={f.id} className="opt" style={{ ['--fam' as string]: f.color }}>
                <input
                  type="checkbox"
                  className="opt__input"
                  checked={criteria.families.includes(f.id)}
                  onChange={() => onChange({ ...criteria, families: toggle(criteria.families, f.id) })}
                />
                <span className="opt__box" aria-hidden="true">
                  <Icon name="check" size={12} />
                </span>
                <span className="opt__glyph" aria-hidden="true">
                  {f.glyph}
                </span>
                <span className="opt__label">{f.name}</span>
                <span className="opt__count" aria-hidden="true">
                  {n}
                </span>
              </label>
            );
          })}
        </Section>

        <Section title="Language" count={criteria.languages.length}>
          <div className="chips-row">
            {LANGUAGES.map((l: Language) => (
              <label key={l} className="chip-opt">
                <input
                  type="checkbox"
                  className="opt__input"
                  checked={criteria.languages.includes(l)}
                  onChange={() => onChange({ ...criteria, languages: toggle(criteria.languages, l) })}
                />
                <span className="chip-opt__face">{l}</span>
              </label>
            ))}
          </div>
        </Section>

        <Section title="Relationship status" count={criteria.statuses.length}>
          {RELATIONSHIP_STATUSES.map((s: RelationshipStatus) => (
            <label key={s} className={`opt opt--status opt--${s}`}>
              <input
                type="checkbox"
                className="opt__input"
                checked={criteria.statuses.includes(s)}
                onChange={() => onChange({ ...criteria, statuses: toggle(criteria.statuses, s) })}
              />
              <span className="opt__box" aria-hidden="true">
                <Icon name="check" size={12} />
              </span>
              <StatusLine status={s} width={20} />
              <span className="opt__label">{STATUS_TEXT[s]}</span>
            </label>
          ))}
          <p className="fsec__hint">Status filters hide lines only. Bugs stay visible.</p>
        </Section>

        <button type="button" className="btn btn--ghost btn--block filters__clear" onClick={clear} disabled={!active}>
          <Icon name="reset" />
          Clear search and filters
        </button>
      </div>
    </aside>
  );
}
