'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { ClearDecisions } from './ClearDecisions';
import { IllustrativeBanner } from './IllustrativeBanner';

export function Header() {
  const path = usePathname();
  const onAtlas = path === '/';
  return (
    <header className="header">
      <div className="header__row">
        <Link href="/" className="brand" aria-label="Bug Genome Atlas, home">
          <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true">
            <defs>
              <linearGradient id="brand-a" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#5EEAD4" />
                <stop offset="1" stopColor="#22D3EE" />
              </linearGradient>
            </defs>
            <rect x="1" y="1" width="30" height="30" rx="8" fill="#0E1520" stroke="rgba(148,163,184,.22)" />
            <path d="M11 7c0 6 10 6 10 9s-10 3-10 9" fill="none" stroke="url(#brand-a)" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M21 7c0 6-10 6-10 9s10 3 10 9" fill="none" stroke="#A78BFA" strokeWidth="2.2" strokeLinecap="round" opacity=".9" />
            <path d="M13 11h6M13 21h6" stroke="#E6EDF7" strokeOpacity=".45" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="brand__name">Bug Genome</span>
        </Link>
        <span className="header__slash" aria-hidden="true">
          /
        </span>
        <nav aria-label="Main" className="header__nav">
          <Link href="/" className="nav-link" aria-current={onAtlas ? 'page' : undefined}>
            <Icon name="graph" />
            Atlas Graph
          </Link>
        </nav>
        <div className="header__end">
          <IllustrativeBanner />
          <ClearDecisions />
        </div>
      </div>
    </header>
  );
}
