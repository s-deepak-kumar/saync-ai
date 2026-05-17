import type { Metadata } from 'next';
import Link from 'next/link';
import { IBM_Plex_Sans, IBM_Plex_Mono, IBM_Plex_Serif } from 'next/font/google';
import './globals.css';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});
const plexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-plex-serif',
  display: 'swap',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Saync — behavioral contracts for React apps',
  description:
    'Inline contracts on every interactive component. A Playwright-driven agent runs your app, verifies every contract, surfaces failures in a local dashboard. Open source, local-first, no SaaS.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable} font-sans antialiased bg-background text-ink min-h-screen`}
      >
        <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-medium text-[15px] tracking-tight">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-terracotta" />
              Saync
              <span className="ml-1 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-muted border border-border rounded-sm">
                v0.1.1
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-[13px]">
              <Link href="/docs" className="px-3 py-1.5 text-muted hover:text-ink transition-colors">
                Docs
              </Link>
              <a
                href="/saync-llm.md"
                download="saync-llm.md"
                className="px-3 py-1.5 text-muted hover:text-ink transition-colors"
                title="Drop into Claude / ChatGPT / Cursor"
              >
                LLM context
              </a>
              <a
                href="https://github.com/s-deepak-kumar/saync-ai"
                className="px-3 py-1.5 text-muted hover:text-ink transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://www.npmjs.com/package/saync-web"
                className="ml-2 px-3 py-1.5 text-white bg-ink hover:bg-[#1E293B] transition-colors rounded-sm font-medium font-mono text-[12px]"
              >
                npm i saync-web
              </a>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-border mt-32">
          <div className="max-w-[1200px] mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-[12.5px]">
            <div>
              <div className="flex items-center gap-2 mb-3 font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-terracotta" />
                Saync
              </div>
              <p className="text-muted leading-relaxed">
                Local-first QA for React apps. MIT licensed. No telemetry.
              </p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-label font-medium mb-3">Product</div>
              <ul className="space-y-1.5 text-muted">
                <li><Link href="/docs" className="hover:text-ink">Docs</Link></li>
                <li><Link href="/docs#install" className="hover:text-ink">Install</Link></li>
                <li><Link href="/docs#contracts" className="hover:text-ink">Contracts</Link></li>
                <li><Link href="/docs#flows" className="hover:text-ink">Flows</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-label font-medium mb-3">Source</div>
              <ul className="space-y-1.5 text-muted">
                <li><a href="https://github.com/s-deepak-kumar/saync-ai" className="hover:text-ink">GitHub</a></li>
                <li><a href="https://github.com/s-deepak-kumar/saync-ai/issues" className="hover:text-ink">Issues</a></li>
                <li><a href="https://www.npmjs.com/package/saync-web" className="hover:text-ink">npm</a></li>
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-label font-medium mb-3">For AI</div>
              <ul className="space-y-1.5 text-muted">
                <li>
                  <a href="/saync-llm.md" download="saync-llm.md" className="hover:text-ink">
                    Download LLM context
                  </a>
                </li>
                <li>
                  <a href="/saync-llm.md" target="_blank" rel="noreferrer" className="hover:text-ink">
                    View as Markdown
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border">
            <div className="max-w-[1200px] mx-auto px-6 h-12 flex items-center justify-between text-[11px] text-muted">
              <span>MIT licensed · Local-first · No telemetry</span>
              <span className="font-mono">© 2026 Saync — Made with love with IBM Bob</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
