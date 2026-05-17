'use client';

import { useEffect, useState } from 'react';
import { Trash2, Cpu, Wifi, Database } from 'lucide-react';

interface SystemInfo {
  mode: 'local' | 'dev' | 'prod';
  appConnected: boolean | null;
  appUrl: string | null;
  appStatusCode: number | null;
  dbPath: string;
  checkedAt: string | null;
}

interface LlmStatus {
  configured: boolean;
  provider: 'watsonx' | 'openai' | 'anthropic' | null;
  model: string | null;
}

export default function SettingsPage() {
  const [sys, setSys] = useState<SystemInfo | null>(null);
  const [llm, setLlm] = useState<LlmStatus | null>(null);
  const [clearing, setClearing] = useState<'idle' | 'confirm' | 'busy' | 'done'>('idle');

  useEffect(() => {
    fetch('/api/system').then((r) => r.json()).then(setSys).catch(() => setSys(null));
    fetch('/api/llm/status').then((r) => r.json()).then(setLlm).catch(() => setLlm(null));
  }, []);

  async function doClear() {
    setClearing('busy');
    try {
      await fetch('/api/clear', { method: 'POST' });
      setClearing('done');
      setTimeout(() => location.reload(), 600);
    } catch {
      setClearing('idle');
    }
  }

  return (
    <div className="px-8 py-6 max-w-[820px]">
      <header className="mb-6 pb-5 border-b border-border">
        <h1 className="font-fraunces text-[28px] leading-none tracking-tighter text-ink mb-1">
          Settings
        </h1>
        <p className="text-[12px] text-muted">
          Local-only configuration. None of this leaves your machine.
        </p>
      </header>

      <Section icon={<Wifi size={14} />} title="Mode & connectivity">
        {sys ? (
          <KvList
            items={[
              { k: 'Mode', v: sys.mode },
              { k: 'App URL', v: sys.appUrl ?? '—' },
              { k: 'App reachable', v: sys.appConnected === null ? 'unknown' : sys.appConnected ? 'yes' : 'no' },
              { k: 'Last checked', v: sys.checkedAt ? new Date(sys.checkedAt).toLocaleTimeString() : '—' },
            ]}
          />
        ) : (
          <p className="text-[12px] text-muted">Loading…</p>
        )}
      </Section>

      <Section icon={<Database size={14} />} title="Data">
        {sys && (
          <KvList items={[{ k: 'DB path', v: sys.dbPath }]} />
        )}
        <div className="mt-3">
          {clearing === 'idle' && (
            <button
              type="button"
              onClick={() => setClearing('confirm')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-ink bg-white border border-border rounded hover:bg-rowHover transition-colors"
            >
              <Trash2 size={12} /> Clear all data
            </button>
          )}
          {clearing === 'confirm' && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted">Delete every run, issue, flow, and violation?</span>
              <button
                onClick={doClear}
                className="px-3 py-1.5 text-[12px] font-medium text-white bg-sevCritical rounded hover:opacity-90 transition-opacity"
              >
                Yes, clear
              </button>
              <button
                onClick={() => setClearing('idle')}
                className="px-3 py-1.5 text-[12px] font-medium text-ink bg-white border border-border rounded hover:bg-rowHover transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          {clearing === 'busy' && (
            <span className="text-[12px] text-muted">Clearing…</span>
          )}
          {clearing === 'done' && (
            <span className="text-[12px] text-statusPass">Cleared. Reloading…</span>
          )}
        </div>
      </Section>

      <Section icon={<Cpu size={14} />} title="LLM (Bring Your Own Key)">
        {llm ? (
          llm.configured ? (
            <KvList
              items={[
                { k: 'Provider', v: llm.provider ?? '—' },
                { k: 'Model', v: llm.model ?? '—' },
              ]}
            />
          ) : (
            <div className="bg-zebra border border-border rounded p-4">
              <p className="text-[12px] text-ink mb-2">No LLM provider configured.</p>
              <p className="text-[11px] text-muted leading-relaxed mb-3">
                Add one of the following to your project's <code className="font-mono bg-white px-1 py-0.5 rounded">.env</code> and restart{' '}
                <code className="font-mono bg-white px-1 py-0.5 rounded">saync start</code>:
              </p>
              <pre className="bg-[#0F172A] text-white/90 font-mono text-[11px] rounded px-3 py-2 leading-relaxed overflow-x-auto">
{`WATSONX_API_KEY=...
WATSONX_PROJECT_ID=...
# or
OPENAI_API_KEY=...
# or
ANTHROPIC_API_KEY=...`}
              </pre>
            </div>
          )
        ) : (
          <p className="text-[12px] text-muted">Loading…</p>
        )}
      </Section>
    </div>
  );
}

function Section({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-1.5 mb-3 text-[11px] text-label uppercase tracking-wider font-medium">
        {icon}{title}
      </div>
      {children}
    </section>
  );
}

function KvList({ items }: { items: Array<{ k: string; v: string }> }) {
  return (
    <ul className="divide-y divide-border border border-border rounded bg-card">
      {items.map((row) => (
        <li key={row.k} className="grid grid-cols-[140px_1fr] px-4 py-2.5 gap-3 text-[12px]">
          <span className="text-label uppercase tracking-wider text-[10px] font-medium self-center">{row.k}</span>
          <span className="font-mono text-ink truncate" title={row.v}>{row.v}</span>
        </li>
      ))}
    </ul>
  );
}
