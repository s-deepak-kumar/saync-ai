import Link from 'next/link';
import { CodeMockup } from './_components/CodeMockup';

export default function Landing() {
  return (
    <>
      <Hero />
      <Capabilities />
      <Anatomy />
      <Why />
      <Install />
    </>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  HERO                                                        */
/* ──────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-start">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-muted mb-5 font-mono">
            <span className="inline-block w-1 h-1 rounded-full bg-terracotta" />
            For React developers
            <span className="text-rule">/</span>
            Open source · MIT
            <span className="text-rule">/</span>
            v0.1.1
          </div>
          <h1 className="font-serif font-medium text-[52px] leading-[1.02] tracking-tight text-ink mb-5">
            Inline contracts for your UI.{' '}
            <span className="text-terracotta">Verified on every save.</span>
          </h1>
          <p className="text-[15px] leading-[1.6] text-muted max-w-[560px] mb-3">
            Wrap a <code className="font-mono text-[13.5px] text-ink bg-zebra px-1 py-0.5 rounded">{`<button>`}</code> — declare the API it should call.
            Wrap a <code className="font-mono text-[13.5px] text-ink bg-zebra px-1 py-0.5 rounded">{`<form>`}</code> — declare what it submits and where it redirects.
            Wrap an <code className="font-mono text-[13.5px] text-ink bg-zebra px-1 py-0.5 rounded">{`<input>`}</code> — declare its validation rules.
          </p>
          <p className="text-[15px] leading-[1.6] text-muted max-w-[560px] mb-7">
            A Playwright-driven agent boots your app on every save, drives every contract, and
            reports every drift between expected and observed — in a dashboard at
            <span className="font-mono text-ink"> localhost:3777</span>, inside your repo. No SaaS,
            no signup, no test files.
          </p>
          <div className="font-mono text-[13px] bg-codeBg text-white/90 rounded inline-flex items-center px-4 py-2.5">
            <span className="text-white/40 mr-2 select-none">$</span>
            npm install --save-dev saync-web
          </div>
          <div className="flex items-center gap-5 mt-5 text-[13px]">
            <Link href="/docs" className="text-ink font-medium hover:underline">
              Documentation →
            </Link>
            <a
              href="https://github.com/s-deepak-kumar/saync-ai"
              className="text-muted hover:text-ink transition-colors"
            >
              View source
            </a>
            <a
              href="/saync-llm.md"
              download="saync-llm.md"
              className="text-muted hover:text-ink transition-colors"
            >
              LLM context (.md)
            </a>
          </div>
        </div>

        <CodeMockup />
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  WHAT SAYNC VERIFIES — dense capability table                */
/* ──────────────────────────────────────────────────────────── */

function Capabilities() {
  const rows = [
    {
      contract: 'apiCall',
      applies:  'Button, Form, Input, Select, Checkbox, …',
      asserts:  'method, URL, expectedStatus, maxDuration',
      example:  `{ method: 'POST', url: '/api/cart', expectedStatus: 200, maxDuration: 500 }`,
    },
    {
      contract: 'responseShape',
      applies:  'any contract with apiCall',
      asserts:  'JSON field types match the declared shape',
      example:  `{ orderId: 'string', total: 'number' }`,
    },
    {
      contract: 'validation',
      applies:  'Input, Textarea, Select, Slider, FileInput',
      asserts:  'required, pattern, minLength, maxLength, message',
      example:  `{ required: true, minLength: 8, pattern: /^[a-z]+$/ }`,
    },
    {
      contract: 'onSubmit',
      applies:  'Form',
      asserts:  'submit fires the API, response matches, optional reset',
      example:  `{ apiCall: { method: 'POST', url: '/login' }, resetAfterSubmit: true }`,
    },
    {
      contract: 'navigation',
      applies:  'Link, NavLink',
      asserts:  'click lands at the declared URL',
      example:  `{ to: '/dashboard', preventDefault: true }`,
    },
    {
      contract: 'disclosure',
      applies:  'Modal, Dialog, Drawer, Popover, Menu',
      asserts:  'open/close on Escape, outside-click, backdrop',
      example:  `{ closesOnEscape: true, hasBackdrop: true }`,
    },
    {
      contract: 'flow',
      applies:  'multi-step user journeys',
      asserts:  'every step reaches the declared end state',
      example:  `[{ interact: 'add' }, { fill: 'email', with: 'a@b.co' }, { expect: { url: '/done' } }]`,
    },
  ];
  return (
    <section className="border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10">
          <div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-label font-mono mb-2">01</div>
            <h2 className="font-serif text-[28px] leading-[1.15] tracking-tight mb-3">
              What the agent verifies
            </h2>
            <p className="text-[13.5px] text-muted leading-[1.6]">
              Every contract you declare on a component is a real assertion. The agent drives the
              app via Playwright, observes the resulting DOM and network activity, and reports
              precise <span className="font-mono text-ink">expected vs observed</span> diffs.
            </p>
          </div>
          <div className="border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[140px_minmax(0,1fr)_1.2fr] bg-zebra border-b border-border text-[10px] uppercase tracking-[0.1em] text-label font-mono px-4 py-2">
              <div>Contract</div>
              <div>Applies to</div>
              <div>Asserts</div>
            </div>
            <ul>
              {rows.map((r) => (
                <li key={r.contract} className="border-b border-border last:border-b-0 group">
                  <div className="grid grid-cols-[140px_minmax(0,1fr)_1.2fr] px-4 py-3 gap-3 items-baseline">
                    <code className="font-mono text-[13px] text-terracotta font-medium">{r.contract}</code>
                    <span className="text-[12.5px] text-muted truncate" title={r.applies}>{r.applies}</span>
                    <span className="text-[12.5px] text-ink">{r.asserts}</span>
                  </div>
                  <pre className="hidden group-hover:block px-4 pb-3 pt-0 font-mono text-[11.5px] text-muted overflow-x-auto">
                    {r.example}
                  </pre>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  ANATOMY OF A VERIFICATION — three real panels               */
/* ──────────────────────────────────────────────────────────── */

function Anatomy() {
  return (
    <section className="border-b border-border bg-canvas">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10 mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-label font-mono mb-2">02</div>
            <h2 className="font-serif text-[28px] leading-[1.15] tracking-tight mb-3">
              Anatomy of a verification
            </h2>
            <p className="text-[13.5px] text-muted leading-[1.6]">
              One contract. Three artifacts. Source, agent action, dashboard issue — all linked.
            </p>
          </div>
          <div />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-rule border border-rule">
          {/* Panel 1: source */}
          <div className="bg-card p-5">
            <div className="text-[10px] uppercase tracking-[0.1em] text-label font-mono mb-3">Source</div>
            <pre className="font-mono text-[11.5px] leading-[1.65] text-ink overflow-x-auto whitespace-pre">
{`<SayncButton
  name="checkout"
  expects={{
    onClick: {
      apiCall: {
        method: 'POST',
        url: '/api/orders',
        expectedStatus: 200,
        maxDuration: 400,
      },
    },
  }}
>
  Place order
</SayncButton>`}
            </pre>
          </div>

          {/* Panel 2: agent action */}
          <div className="bg-card p-5">
            <div className="text-[10px] uppercase tracking-[0.1em] text-label font-mono mb-3">Agent</div>
            <ol className="text-[12px] font-mono text-muted leading-[1.65] space-y-1">
              <li><span className="text-ink">[01]</span> register data-saync-name="checkout"</li>
              <li><span className="text-ink">[02]</span> navigate http://localhost:3000</li>
              <li><span className="text-ink">[03]</span> playwright.click('checkout')</li>
              <li><span className="text-ink">[04]</span> capture network: POST /api/orders</li>
              <li><span className="text-sevFail">[05]</span> observed status 500</li>
              <li><span className="text-sevFail">[06]</span> observed duration 1.2s</li>
              <li><span className="text-sevFail">[07]</span> screenshot.png · 18 KB</li>
              <li><span className="text-ink">[08]</span> post to /api/runs/:id/results</li>
            </ol>
          </div>

          {/* Panel 3: dashboard issue */}
          <div className="bg-card p-5">
            <div className="text-[10px] uppercase tracking-[0.1em] text-label font-mono mb-3">Issue</div>
            <div className="border-l-2 border-sevFail pl-3 mb-3">
              <div className="text-[11px] font-mono text-sevFail uppercase tracking-[0.1em]">high</div>
              <div className="text-[13px] font-medium text-ink mt-0.5">Place order · onClick</div>
              <div className="text-[11px] font-mono text-muted mt-0.5">3× seen · first 4m ago</div>
            </div>
            <div className="space-y-2.5">
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] px-2.5 py-1.5 rounded-sm">
                <div className="text-[10px] uppercase tracking-[0.1em] text-[#166534] font-mono mb-0.5">Expected</div>
                <code className="font-mono text-[11.5px] text-[#166534]">200 · &lt;400ms</code>
              </div>
              <div className="bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1.5 rounded-sm">
                <div className="text-[10px] uppercase tracking-[0.1em] text-[#991B1B] font-mono mb-0.5">Observed</div>
                <code className="font-mono text-[11.5px] text-[#991B1B]">500 · 1.2s</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  WHY — Q&A                                                   */
/* ──────────────────────────────────────────────────────────── */

function Why() {
  const qs = [
    {
      q: 'How is this different from a Playwright test suite?',
      a: `Playwright tests live in a separate directory and describe scenarios. Saync contracts live next to the component and describe behavior. The agent generates the scenario — you only declare what should happen, not how to test it. A typical React app of ~200 components needs zero test files; the contracts in the components are enough.`,
    },
    {
      q: 'Where does my data go?',
      a: `Into .saync/saync.db inside your repo. Saync runs as a Next.js server on localhost — nothing leaves your machine. The only outbound HTTP is the optional "Generate AI report" call, and even that uses your own LLM key (WatsonX / OpenAI / Anthropic).`,
    },
    {
      q: 'Can I run this in CI?',
      a: `Yes. saync run is a one-shot command: boot your app, run the agent, exit with the right status code. Drop it into any GitHub Actions / GitLab / CircleCI workflow. The SQLite DB also serves as a structured artifact you can upload.`,
    },
    {
      q: 'What about production traffic?',
      a: `Set mode="report" on <Saync.Provider> and the SDK observes real user interactions, batches violations, and POSTs them to a Saync instance running alongside your app. Production violations appear next to your local runs in the same dashboard.`,
    },
  ];
  return (
    <section className="border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10">
          <div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-label font-mono mb-2">03</div>
            <h2 className="font-serif text-[28px] leading-[1.15] tracking-tight mb-3">
              The honest Q&amp;A
            </h2>
            <p className="text-[13.5px] text-muted leading-[1.6]">
              Hard questions, terse answers. No marketing.
            </p>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {qs.map((row) => (
              <details key={row.q} className="group">
                <summary className="px-4 py-4 flex items-center justify-between cursor-pointer hover:bg-zebra transition-colors text-[14px] font-medium text-ink list-none">
                  <span>{row.q}</span>
                  <span className="font-mono text-[16px] text-muted group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="px-4 pb-4 text-[13.5px] text-muted leading-[1.7] max-w-[680px]">
                  {row.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  INSTALL block                                               */
/* ──────────────────────────────────────────────────────────── */

function Install() {
  return (
    <section>
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-10">
          <div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-label font-mono mb-2">04</div>
            <h2 className="font-serif text-[28px] leading-[1.15] tracking-tight mb-3">
              60-second install
            </h2>
            <p className="text-[13.5px] text-muted leading-[1.6]">
              Four lines. No config file required. Add a Provider, wrap a component, you're done.
            </p>
          </div>
          <ol className="space-y-4 max-w-[760px]">
            <Step n={1} label="Install">
              <Code lang="bash">npm install --save-dev saync-web</Code>
            </Step>
            <Step n={2} label="Script">
              <Code lang="json">{`{ "scripts": { "saync": "saync start" } }`}</Code>
            </Step>
            <Step n={3} label="Wrap">
              <Code lang="tsx">{`import { Saync } from 'saync-web/react';
<Saync.Provider mode="log">{children}</Saync.Provider>`}</Code>
            </Step>
            <Step n={4} label="Boot">
              <Code lang="bash">npm run saync</Code>
              <p className="mt-2 text-[12px] text-muted">
                Open <a href="http://localhost:3777" className="text-terracotta hover:underline font-mono">localhost:3777</a>. Your data lives at <span className="font-mono">.saync/saync.db</span> in your repo.
              </p>
            </Step>
          </ol>
        </div>
      </div>
    </section>
  );
}

function Step({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[40px_120px_1fr] gap-4 items-start py-3 border-b border-border last:border-b-0">
      <span className="font-mono text-[11px] text-label pt-1.5 tabular-nums">[0{n}]</span>
      <span className="text-[13px] text-ink font-medium pt-1.5">{label}</span>
      <div>{children}</div>
    </li>
  );
}

function Code({ lang, children }: { lang: string; children: React.ReactNode }) {
  return (
    <div className="bg-codeBg rounded-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#1B2536] px-3 py-1.5">
        <span className="font-mono text-[10px] text-white/40 uppercase tracking-[0.1em]">{lang}</span>
      </div>
      <pre className="px-3 py-2.5 font-mono text-[12.5px] leading-[1.6] text-white/90 overflow-x-auto whitespace-pre">
        {children}
      </pre>
    </div>
  );
}
