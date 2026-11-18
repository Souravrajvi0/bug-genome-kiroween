'use client';

import { useId } from 'react';

/** A small segmented control backed by radio inputs, so arrow keys move between options. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className="seg__opt">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="seg__input"
          />
          <span className="seg__face">{o.label}</span>
        </label>
      ))}
    </div>
  );
}

export type CodeMode = 'diff' | 'split';
export const CODE_MODES = [
  { value: 'diff', label: 'Diff' },
  { value: 'split', label: 'Before and after' },
] as const satisfies readonly { value: CodeMode; label: string }[];
