import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers/Providers';
import { Header } from '@/components/shell/Header';
import { StorageNotice } from '@/components/shell/StorageNotice';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-ui', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-code', display: 'swap' });

export const metadata: Metadata = {
  title: 'Bug Genome Atlas',
  description: 'Explore how bugs from unrelated projects can share a failure mechanism. All data shown is illustrative.',
};

export const viewport: Viewport = {
  themeColor: '#07090D',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <Providers>
          <Header />
          <StorageNotice />
          <main id="main" tabIndex={-1} className="main">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
