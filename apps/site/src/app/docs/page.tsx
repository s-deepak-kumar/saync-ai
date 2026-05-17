import Link from 'next/link';

export const metadata = { title: 'Saync — Docs' };

export default function Docs() {
  return (
    <div className="max-w-[820px] mx-auto px-6 py-16">
      <h1 className="font-fraunces text-[44px] leading-none tracking-tighter mb-6">Documentation</h1>
      <p className="text-[14px] text-muted leading-relaxed mb-10">
        Saync is one npm package that ships an SDK, a Playwright-driven agent, a SQLite store, and a dashboard — all running locally inside your project. Everything below assumes Node 18+ and any package manager (npm / pnpm / yarn / bun).
      </p>

      <Section id="install" title="1. Install">
        <CodeBlock language="bash" code={`npm install --save-dev saync-web`} />
        <p className="text-[13px] text-muted leading-relaxed mt-3">
          Add a script to your <code className="font-mono text-[12px] bg-zebra px-1 rounded">package.json</code>:
        </p>
        <CodeBlock language="json" code={`{
  "scripts": {
    "saync": "saync start"
  }
}`} />
        <p className="text-[13px] text-muted leading-relaxed mt-3">
          Boot it with <code className="font-mono text-[12px] bg-zebra px-1 rounded">npm run saync</code> and open{' '}
          <Link href="http://localhost:3777" className="text-terracotta hover:underline">localhost:3777</Link>.
        </p>
      </Section>

      <Section id="contracts" title="2. Declare contracts">
        <p className="text-[13px] text-muted leading-relaxed mb-3">
          Wrap interactive elements with the SDK and say what they should do:
        </p>
        <CodeBlock
          language="tsx"
          code={`import { SayncButton } from 'saync-web/react';

export function AddToCartButton({ onClick }) {
  return (
    <SayncButton
      onClick={onClick}
      expect={{
        onClick: {
          apiCall: {
            method: 'POST',
            url: '/api/cart',
            expectedStatus: 200,
            maxDuration: 500,
          },
        },
      }}
    >
      Add to cart
    </SayncButton>
  );
}`}
        />
      </Section>

      <Section id="flows" title="3. Multi-step flows (optional)">
        <p className="text-[13px] text-muted leading-relaxed mb-3">
          For journeys — login, checkout, share — drop a <code className="font-mono text-[12px] bg-zebra px-1 rounded">saync.flows.ts</code> at your repo root:
        </p>
        <CodeBlock
          language="ts"
          code={`import { defineFlow } from 'saync-web';

export default [
  defineFlow({
    name: 'add-to-cart',
    url: '/products/1',
    steps: [
      { kind: 'interact', target: 'add-to-cart-button' },
      { kind: 'expect',   target: 'cart-count', text: '1' },
    ],
  }),
];`}
        />
      </Section>

      <Section id="modes" title="4. Modes">
        <p className="text-[13px] text-muted leading-relaxed mb-3">
          The <code className="font-mono text-[12px] bg-zebra px-1 rounded">SAYNC_MODE</code> env var (or the <code className="font-mono text-[12px] bg-zebra px-1 rounded">mode</code> field in <code className="font-mono text-[12px] bg-zebra px-1 rounded">saync.config.ts</code>) decides behavior:
        </p>
        <ul className="text-[13px] text-muted leading-relaxed space-y-2 list-disc pl-5 mb-2">
          <li><strong className="text-ink">local</strong> — the watcher re-runs the agent on every file save.</li>
          <li><strong className="text-ink">dev</strong> — one-shot agent run at build time, plus the production reporter for real-user traffic.</li>
          <li><strong className="text-ink">prod</strong> — production reporter only; slower polling, retention tuned for live traffic.</li>
        </ul>
      </Section>

      <Section id="config" title="5. Configuration">
        <CodeBlock
          language="ts"
          code={`// saync.config.ts at your repo root
export default {
  appUrl: 'http://localhost:3000',  // your dev server
  port: 3777,                       // dashboard port
  watch: ['src/**/*.{ts,tsx}'],     // local-mode watch globs
  mode: 'local',
};`}
        />
        <p className="text-[13px] text-muted leading-relaxed mt-3">Equivalent env vars: <code className="font-mono text-[12px] bg-zebra px-1 rounded">SAYNC_MODE</code>, <code className="font-mono text-[12px] bg-zebra px-1 rounded">SAYNC_PORT</code>, <code className="font-mono text-[12px] bg-zebra px-1 rounded">SAYNC_APP_URL</code>, <code className="font-mono text-[12px] bg-zebra px-1 rounded">SAYNC_DB_PATH</code>. Env wins over config file wins over defaults.</p>
      </Section>

      <Section id="llm" title="6. AI reports (bring your own LLM)">
        <p className="text-[13px] text-muted leading-relaxed mb-3">
          Saync never ships an LLM key. Set one of these in your project's <code className="font-mono text-[12px] bg-zebra px-1 rounded">.env</code> and the dashboard's "Generate report" buttons start working:
        </p>
        <CodeBlock language="env" code={`WATSONX_API_KEY=...
WATSONX_PROJECT_ID=...
# or
OPENAI_API_KEY=...
# or
ANTHROPIC_API_KEY=...`} />
      </Section>

      <Section id="commands" title="7. CLI">
        <ul className="text-[13px] leading-relaxed space-y-2 list-disc pl-5">
          <li><code className="font-mono text-[12px] bg-zebra px-1 rounded">saync start</code> — boot the dashboard, the app probe, and (in local mode) the file watcher.</li>
          <li><code className="font-mono text-[12px] bg-zebra px-1 rounded">saync run</code> — one-shot agent invocation. Used by CI / build hooks.</li>
          <li><code className="font-mono text-[12px] bg-zebra px-1 rounded">saync clear</code> — wipe all locally-stored data (confirms first).</li>
        </ul>
      </Section>

      <Section id="data" title="8. Your data">
        <p className="text-[13px] text-muted leading-relaxed">
          Everything lives in <code className="font-mono text-[12px] bg-zebra px-1 rounded">.saync/saync.db</code> inside your repo. Add it to <code className="font-mono text-[12px] bg-zebra px-1 rounded">.gitignore</code>. Nothing leaves your machine unless you explicitly configure an LLM (in which case only the prompt context goes to the provider you chose).
        </p>
      </Section>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-12">
      <h2 className="font-fraunces text-[24px] tracking-tighter mb-3 scroll-mt-20">
        <a href={`#${id}`} className="hover:text-terracotta transition-colors">{title}</a>
      </h2>
      {children}
    </section>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div className="bg-[#0F172A] rounded overflow-hidden">
      <div className="px-3 py-1.5 border-b border-white/10">
        <span className="font-mono text-[10px] text-white/40 uppercase tracking-wider">{language}</span>
      </div>
      <pre className="px-4 py-3 overflow-x-auto">
        <code className="font-mono text-[12.5px] leading-relaxed text-white/90 whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}
