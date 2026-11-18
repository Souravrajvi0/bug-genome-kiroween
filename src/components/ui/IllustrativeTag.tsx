import { Icon } from './Icon';

/** Renders the Illustrative_Label only when the item carries the mock-data flag. */
export function IllustrativeTag({ isMock, className = '', label = 'Illustrative' }: { isMock: boolean; className?: string; label?: string }) {
  if (!isMock) return null;
  return (
    <span className={`tag-illustrative ${className}`}>
      <Icon name="hatch" size={12} />
      {label}
    </span>
  );
}
