import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export function NotFoundMessage({ what }: { what: string }) {
  return (
    <div className="state-page" role="alert">
      <div className="empty-state">
        <span className="empty-state__code mono">404</span>
        <h1 className="empty-state__title">{what} not found</h1>
        <p className="empty-state__text">No {what.toLowerCase()} matches this address.</p>
        <Link className="btn btn--primary" href="/">
          <Icon name="arrowLeft" /> Back to the Atlas Graph
        </Link>
      </div>
    </div>
  );
}
