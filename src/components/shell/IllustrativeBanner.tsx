import { Icon } from '@/components/ui/Icon';

/** The one persistent, always-visible disclosure that every item in the Atlas is invented (R10.1). */
export function IllustrativeBanner() {
  return (
    <div className="banner" role="note" data-testid="illustrative-banner">
      <Icon name="hatch" size={14} className="banner__icon" />
      <p>
        <strong>Illustrative data.</strong> All bugs, code and relationships are invented. They are not verified findings.
      </p>
    </div>
  );
}
