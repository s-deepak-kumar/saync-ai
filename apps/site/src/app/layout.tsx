import type { Metadata } from 'next';
import Link from 'next/link';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], weight: ['500'], variable: '--font-fraunces', display: 'swap' });
const inter    = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono     = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Saync — verify what your app should do',
  description: 'Local-first QA platform. Declare contracts on your UI components, verify them automatically, see failures in a dashboard. Open source.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${inter.variable} ${mono.variable} font-inter antialiased bg-background text-ink min-h-screen`}>
        <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
          <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-fraunces text-[20px] tracking-tighter">
              <span className="inline-block w-2 h-2 rounded-full bg-terracotta" />
              Saync
            </Link>
            <nav className="flex items-center gap-5 text-[13px] text-muted">
              <Link href="/docs" className="hover:text-ink transition-colors">Docs</Link>
              <a href="https://github.com/saync-ai/saync-web" className="hover:text-ink transition-colors">GitHub</a>
              <a
                href="https://www.npmjs.com/package/saync-web"
                className="px-2.5 py-1 rounded text-white bg-ink hover:bg-ink/90 transition-colors text-[12px] font-medium"
              >
                Install
              </a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-border mt-24">
          <div className="max-w-[1100px] mx-auto px-6 py-8 text-[12px] text-muted flex items-center justify-between">
            <span>MIT licensed · Local-first · No telemetry</span>
            <span>© 2026 Saync</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
