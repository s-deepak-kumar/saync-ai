'use client';

import { useState } from 'react';
import { Sparkles, RotateCw, Download, AlertTriangle } from 'lucide-react';

type Body =
  | { kind: 'issue'; issueId: string }
  | { kind: 'run'; runId: string }
  | { kind: 'violation-cluster'; contractName: string; componentName: string; errorMessage: string };

interface Props {
  body: Body;
  /** Filename for the markdown download (without .md). */
  downloadName: string;
  /** Compact mode skips the header — useful when embedding inside another section. */
  compact?: boolean;
}

interface SuccessState {
  status: 'success';
  markdown: string;
  provider: string;
  model: string;
}
interface ErrorState {
  status: 'error';
  error: string;
  configHint?: boolean;
}
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | SuccessState
  | ErrorState;

export default function AiReport({ body, downloadName, compact }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' });

  async function run() {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/llm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setState({
          status: 'error',
          error: json?.error ?? `HTTP ${res.status}`,
          configHint: res.status === 503,
        });
        return;
      }
      setState({
        status: 'success',
        markdown: json.markdown,
        provider: json.provider,
        model: json.model,
      });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return (
    <section className="bg-card border border-dashed border-border rounded p-5">
      {!compact && (
        <div className="flex items-center gap-2 mb-3">
          <div className="text-[10px] uppercase tracking-wider text-label font-medium">
            AI analysis
          </div>
          {state.status === 'success' && (
            <>
              <span className="text-[10px] text-label">·</span>
              <span className="text-[10px] text-label font-mono">
                {state.provider} · {state.model}
              </span>
            </>
          )}
        </div>
      )}

      {state.status === 'idle' && (
        <div>
          <p className="text-[12px] text-muted leading-relaxed mb-3">
            Generate a root-cause + suggested-fix report using whichever LLM
            provider is configured in your <code className="font-mono text-[11px] bg-zebra px-1 py-0.5 rounded">.env</code>{' '}
            (WatsonX, OpenAI, or Anthropic). Saync only sends the contract details
            below to your provider; nothing else leaves your machine.
          </p>
          <button
            type="button"
            onClick={run}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-ink rounded hover:bg-[#1E293B] transition-colors"
          >
            <Sparkles size={13} /> Generate report
          </button>
        </div>
      )}

      {state.status === 'loading' && (
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <Sparkles size={14} className="animate-pulse-dot text-terracotta" />
          Calling the model… this can take 5–30 seconds.
        </div>
      )}

      {state.status === 'error' && (
        <div>
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle size={14} className="text-sevCritical mt-0.5 shrink-0" />
            <div className="font-mono text-[12px] text-[#991B1B] leading-relaxed break-words">
              {state.error}
            </div>
          </div>
          {state.configHint && (
            <p className="text-[11.5px] text-muted leading-relaxed mb-3">
              Set one of these in your project's <code className="font-mono text-[11px] bg-zebra px-1 py-0.5 rounded">.env</code> and restart{' '}
              <code className="font-mono text-[11px] bg-zebra px-1 py-0.5 rounded">saync start</code>:
              <br />
              <span className="font-mono text-[11px]">WATSONX_API_KEY + WATSONX_PROJECT_ID</span>, or{' '}
              <span className="font-mono text-[11px]">OPENAI_API_KEY</span>, or{' '}
              <span className="font-mono text-[11px]">ANTHROPIC_API_KEY</span>.
            </p>
          )}
          <button
            type="button"
            onClick={run}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-ink bg-white border border-border rounded hover:bg-rowHover transition-colors"
          >
            <RotateCw size={12} /> Try again
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={run}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-ink bg-white border border-border rounded hover:bg-rowHover transition-colors"
            >
              <RotateCw size={11} /> Regenerate
            </button>
            <button
              type="button"
              onClick={() => downloadMarkdown(state.markdown, downloadName)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-ink bg-white border border-border rounded hover:bg-rowHover transition-colors"
            >
              <Download size={11} /> Download .md
            </button>
          </div>
          <MarkdownView markdown={state.markdown} />
        </div>
      )}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────── */

/**
 * Minimal markdown renderer for `## h2`, `### h3`, ```code blocks```,
 * `**bold**`, `- list items`, and paragraphs. Avoids pulling in
 * react-markdown for one section of one page.
 */
function MarkdownView({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);
  return (
    <div className="text-[13px] text-ink leading-relaxed space-y-3">
      {blocks.map((b, i) => {
        if (b.kind === 'h2') return (
          <h3 key={i} className="font-fraunces text-[17px] tracking-tight text-ink mt-4 first:mt-0">
            {b.text}
          </h3>
        );
        if (b.kind === 'h3') return (
          <h4 key={i} className="text-[13px] font-medium text-ink uppercase tracking-wider mt-3">
            {b.text}
          </h4>
        );
        if (b.kind === 'code') return (
          <pre key={i} className="bg-[#0F172A] text-white/90 rounded p-3 overflow-x-auto">
            <code className="font-mono text-[12px] leading-relaxed">{b.text}</code>
          </pre>
        );
        if (b.kind === 'list') return (
          <ul key={i} className="list-disc pl-5 space-y-1">
            {b.items.map((it, j) => (
              <li key={j} dangerouslySetInnerHTML={{ __html: inlineMarkup(it) }} />
            ))}
          </ul>
        );
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: inlineMarkup(b.text) }} />
        );
      })}
    </div>
  );
}

type Block =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'p'; text: string };

function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      blocks.push({ kind: 'h2', text: line.slice(3).trim() });
      i++;
    } else if (line.startsWith('### ')) {
      blocks.push({ kind: 'h3', text: line.slice(4).trim() });
      i++;
    } else if (line.startsWith('```')) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        body.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ kind: 'code', text: body.join('\n') });
    } else if (line.match(/^[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ kind: 'list', items });
    } else if (line.trim() === '') {
      i++;
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('```') && !lines[i].match(/^[-*]\s+/)) {
        para.push(lines[i]);
        i++;
      }
      blocks.push({ kind: 'p', text: para.join(' ') });
    }
  }
  return blocks;
}

function inlineMarkup(s: string): string {
  // Order matters: escape HTML first, then re-introduce <strong>/<code>.
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="font-mono text-[12px] bg-zebra px-1 py-0.5 rounded">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-ink font-medium">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function downloadMarkdown(markdown: string, filename: string) {
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
