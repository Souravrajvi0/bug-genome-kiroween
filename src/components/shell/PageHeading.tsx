'use client';

import { useEffect, useRef } from 'react';

/** Title of the first heading mounted. In-app navigation to a different title moves focus. */
let seenTitle: string | null = null;

/**
 * The single level-one heading of a view. It sets the document title and, after in-app
 * navigation, moves focus to itself so assistive technology announces the new view.
 */
export function PageHeading({
  title,
  documentTitle,
  id,
  className = '',
  children,
}: {
  title: string;
  documentTitle?: string;
  id?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${documentTitle ?? title} | Bug Genome Atlas`;
    const previous = seenTitle;
    seenTitle = title;
    // No focus on the first load, and none on a StrictMode re-run of the same heading.
    if (previous === null || previous === title) return;
    ref.current?.focus({ preventScroll: true });
  }, [title, documentTitle]);

  return (
    <h1 ref={ref} id={id} tabIndex={-1} className={`page-title ${className}`}>
      {children ?? title}
    </h1>
  );
}
