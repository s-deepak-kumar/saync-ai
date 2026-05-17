import Link from 'next/link';
import { Activity, Terminal, ShieldCheck, Workflow, Wifi, Database } from 'lucide-react';

export default function Landing() {
  return (
    <div className="max-w-[1100px] mx-auto px-6">
      {/* Hero */}
      <section className="pt-24 pb-20 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-12 items-center">
        <div>
          <h1 className="font-fraunces text-[64px] leading-[1.02] tracking-tighter text-ink mb-5">
            Verify what your app{' '}
            <em className="italic text-terracotta">should</em> do.
          </h1>
          <p className="text-[16px] leading-relaxed text-muted mb-6 max-w-[540px]">
            Declare contracts on your UI components. Saync drives them, watches your dev server, and surfaces every regression in a local dashboard. No SaaS. No signup. Your code, your data, your machine.
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/docs"
              className="px-4 py-2.5 text-[14px] font-medium text-white bg-ink rounded hover:bg-ink/90 transition-colors"
            >
              Read the docs
            </Link>
            <a
              href="https://github.com/saync-ai/saync-web"
              className="px-4 py-2.5 text-[14px] font-medium text-ink bg-white border border-border rounded hover:bg-zebra transition-colors"
            >
              Source on GitHub
            </a>
          </div>
          <p className="mt-4 text-[12px] text-muted font-mono">
            $ npm install --save-dev saync-web
          </p>
        </div>

        <div className="bg-[#0F172A] rounded-xl overflow-hidden shadow-[0_8px_40px_rgba(15,23,42,0.12)]">
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
            <span className="ml-3 text-[10px] text-white/40 font-mono uppercase tracking-wider">terminal</span>
          </div>
          <pre className="px-4 py-4 font-mono text-[12.5px] text-white/90 leading-relaxed whitespace-pre">
{`$ npm run saync

[saync] mode=local port=3777
[saync] db=.saync/saync.db
  ▲ Next.js 14
  - Local: http://localhost:3777

✓ Ready in 156ms
✓ App connected: http://localhost:3000
… watching for file changes …`}
          </pre>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-16 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-8">
        <Pillar
          icon={<Activity size={18} />}
          title="Inline contracts"
          body="Wrap interactive elements and declare what they should do. The agent runs the app, drives them all, surfaces every gap."
        />
        <Pillar
          icon={<Workflow size={18} />}
          title="Multi-step flows"
          body="Add a saync.flows.ts. Saync drives the journey end-to-end via Playwright, screenshots on failure, retries on flake."
        />
        <Pillar
          icon={<ShieldCheck size={18} />}
          title="Production reporter"
          body={`Mode "dev" or "prod" instruments your live app — real users' contract violations show up next to your local runs.`}
        />
      </section>

      {/* How it works */}
      <section className="py-16 border-t border-border">
        <h2 className="font-fraunces text-[28px] tracking-tighter mb-8">How it works</h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Step n={1} title="Install + script">
            One npm install. One line in package.json.
          </Step>
          <Step n={2} title="Declare contracts">
            Wrap a button. Say what it does. Optionally add a flow.
          </Step>
          <Step n={3} title="Run + watch">
            <code className="font-mono text-[12px] bg-zebra px-1 rounded">saync start</code> boots a dashboard at{' '}
            <code className="font-mono text-[12px] bg-zebra px-1 rounded">localhost:3777</code> and watches for changes.
          </Step>
        </ol>
      </section>

      {/* Promises */}
      <section className="py-16 border-t border-border">
        <h2 className="font-fraunces text-[28px] tracking-tighter mb-6">What we promise</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Promise icon={<Database size={14} />} text="Your SQLite DB lives in your repo. We never see it." />
          <Promise icon={<Wifi size={14} />} text="No telemetry. No phone-home. No analytics SDK." />
          <Promise icon={<Terminal size={14} />} text="Bring your own LLM. Saync ships no API keys." />
          <Promise icon={<ShieldCheck size={14} />} text="MIT licensed. Source on GitHub. PRs welcome." />
        </ul>
      </section>
    </div>
  );
}

function Pillar({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-terracotta">{icon}</div>
      <h3 className="font-fraunces text-[20px] tracking-tighter mb-1.5">{title}</h3>
      <p className="text-[13px] text-muted leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="font-fraunces text-[28px] tracking-tighter text-terracotta leading-none shrink-0">{n}</span>
      <div>
        <h3 className="font-medium text-[14px] mb-1">{title}</h3>
        <p className="text-[12.5px] text-muted leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

function Promise({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2.5 bg-card border border-border rounded px-4 py-3 text-[13px]">
      <span className="text-terracotta">{icon}</span>
      <span>{text}</span>
    </li>
  );
}
