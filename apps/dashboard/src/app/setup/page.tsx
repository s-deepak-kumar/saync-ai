'use client';

import { useState } from 'react';
import { Download, Sparkles } from 'lucide-react';

type Pkg = 'npm' | 'pnpm' | 'yarn' | 'bun';

const INSTALL: Record<Pkg, string> = {
  npm:  'npm install --save-dev saync-web',
  pnpm: 'pnpm add -D saync-web',
  yarn: 'yarn add -D saync-web',
  bun:  'bun add -d saync-web',
};

const SCRIPT_SNIPPET = `{
  "scripts": {
    "saync": "saync start",
    "saync:run": "saync run"
  }
}`;

const SDK_SNIPPET = `import { SayncButton } from 'saync-web/react';

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
}`;

const FLOWS_SNIPPET = `// saync.flows.ts at your repo root
import { defineFlow } from 'saync-web';

export const flows = [
  defineFlow({
    name: 'add-to-cart',
    description: 'Add a product to cart and verify the badge updates.',
    steps: [
      { interact: 'add-to-cart' },
      { interact: 'open-cart' },
      { expect: { text: 'Your cart' } },
    ],
  }),
];`;

const CONFIG_SNIPPET = `// saync.config.ts at your repo root (optional)
export default {
  appUrl: 'http://localhost:3000',  // where your dev server runs
  port: 7000,                       // where Saync's dashboard runs
  watch: ['src/**/*.{ts,tsx}'],     // re-run flows on these file changes
};`;

const LLM_SNIPPET = `# .env at your repo root — choose one provider
WATSONX_API_KEY=...
WATSONX_PROJECT_ID=...
# or
OPENAI_API_KEY=...
# or
ANTHROPIC_API_KEY=...`;

export default function SetupPage() {
  const [pkg, setPkg] = useState<Pkg>('npm');

  return (
    <div className="px-12 py-10 max-w-[820px]">
      <header className="mb-10">
        <h1 className="font-fraunces text-[40px] leading-none tracking-tighter text-ink mb-3">
          Set up Saync
        </h1>
        <p className="text-[14px] text-muted leading-relaxed max-w-[560px]">
          Five steps to wire Saync into your project. Everything runs
          locally — no signup, no cloud, no API keys. Your data lives in
          <code className="font-mono text-[12px] bg-zebra px-1 py-0.5 rounded mx-1">.saync/saync.db</code>
          in your repo.
        </p>
      </header>

      {/* AI-assistant context download */}
      <section className="mb-12 bg-card border border-border rounded-lg p-5 flex items-start gap-4">
        <div
          className="shrink-0 w-10 h-10 rounded-md flex items-center justify-center"
          style={{ backgroundColor: '#FEF3E2', color: '#D4502A' }}
        >
          <Sparkles size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-fraunces text-[18px] tracking-tighter mb-1">
            Setting up with an AI assistant?
          </h2>
          <p className="text-[12.5px] text-muted leading-relaxed mb-3 max-w-[520px]">
            Download the full Saync context as a single Markdown file and paste
            it into Claude, ChatGPT, Cursor, or any other AI assistant. The
            model will know every component, every flow step, every contract
            shape, and every CLI command.
          </p>
          <a
            href="/saync-llm.md"
            download="saync-llm.md"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-ink rounded hover:bg-ink/90 transition-colors"
          >
            <Download size={12} /> Download saync-llm.md
          </a>
          <a
            href="/saync-llm.md"
            target="_blank"
            rel="noreferrer"
            className="ml-2 inline-flex items-center px-3 py-1.5 text-[12px] font-medium text-ink bg-white border border-border rounded hover:bg-rowHover transition-colors"
          >
            View in browser
          </a>
        </div>
      </section>

      <Step number={1} title="Install">
        <div className="flex gap-1 mb-3">
          {(['npm', 'pnpm', 'yarn', 'bun'] as Pkg[]).map((p) => (
            <button
              key={p}
              onClick={() => setPkg(p)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium uppercase tracking-wider transition-colors ${
                pkg === p
                  ? 'bg-ink text-white'
                  : 'bg-white border border-border text-ink hover:bg-rowHover'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <CodeBlock language="bash" code={INSTALL[pkg]} />
      </Step>

      <Step number={2} title="Add a script to package.json">
        <CodeBlock language="json" code={SCRIPT_SNIPPET} />
        <p className="text-[12px] text-muted mt-3 leading-relaxed">
          <code className="font-mono text-[11px] bg-zebra px-1 py-0.5 rounded">saync start</code>
          {' '}boots the dashboard (this page) and watches your code in local mode.
          {' '}<code className="font-mono text-[11px] bg-zebra px-1 py-0.5 rounded">saync run</code>
          {' '}is the one-shot agent — useful for CI or your build hook.
        </p>
      </Step>

      <Step number={3} title="Declare contracts on your components">
        <p className="text-[13px] text-muted mb-3 leading-relaxed">
          Wrap interactive elements with the SDK and say what they should do:
        </p>
        <CodeBlock language="tsx" code={SDK_SNIPPET} />
      </Step>

      <Step number={4} title="(Optional) Add multi-step flows">
        <p className="text-[13px] text-muted mb-3 leading-relaxed">
          Create <code className="font-mono text-[11px] bg-zebra px-1 py-0.5 rounded">saync.flows.ts</code> at your repo root to test journeys end-to-end:
        </p>
        <CodeBlock language="ts" code={FLOWS_SNIPPET} />
      </Step>

      <Step number={5} title="(Optional) Connect an LLM for AI reports">
        <p className="text-[13px] text-muted mb-3 leading-relaxed">
          Bring your own key. Saync reads from your project's
          <code className="font-mono text-[11px] bg-zebra px-1 py-0.5 rounded mx-1">.env</code>
          and never logs or transmits it anywhere except the LLM provider you choose.
        </p>
        <CodeBlock language="env" code={LLM_SNIPPET} />
      </Step>

      <div className="mt-10 mb-12 bg-zebra border border-border rounded p-5">
        <h3 className="font-fraunces text-[16px] tracking-tighter text-ink mb-2">
          Configuration (optional)
        </h3>
        <CodeBlock language="ts" code={CONFIG_SNIPPET} />
      </div>

      <div className="mt-12 pt-8 border-t border-border text-[12px] text-muted">
        Run <code className="font-mono text-[11px] bg-zebra px-1 py-0.5 rounded">{pkg} run saync</code> from your project root.
      </div>
    </div>
  );
}

function Step({
  number, title, children,
}: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14 flex gap-6">
      <div className="shrink-0 w-9 h-9 rounded-full bg-white border border-border flex items-center justify-center mt-0.5">
        <span className="font-fraunces text-[16px] tracking-tighter text-ink">
          {number}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="font-fraunces text-[22px] leading-tight tracking-tighter text-ink mb-4">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1400); },
      () => {},
    );
  }
  return (
    <div className="bg-[#0F172A] rounded-md overflow-hidden">
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <span className="font-mono text-[10px] text-white/40 uppercase tracking-[0.08em]">
          {language}
        </span>
        <button
          type="button"
          onClick={copy}
          className="uppercase tracking-[0.08em] font-medium text-[10px] text-white/40 hover:text-white/80 transition-colors"
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto">
        <code className="font-mono text-[12.5px] leading-relaxed text-white/90 block whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}
