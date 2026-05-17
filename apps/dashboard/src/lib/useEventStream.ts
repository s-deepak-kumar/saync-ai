'use client';

import { useEffect, useRef, useState } from 'react';
import type { ContractResult, RunStatus } from './api';

export interface RunProgress {
  passed: number;
  failed: number;
  total: number;
}

export interface StreamState {
  results: ContractResult[];
  progress: RunProgress | null;
  status: RunStatus | null;
  connected: boolean;
}

const INITIAL: StreamState = {
  results: [],
  progress: null,
  status: null,
  connected: false,
};

/**
 * Subscribe to a live run's SSE stream.
 *
 * The backend emits three event types:
 *   - 'result':   one contractResult row appended
 *   - 'progress': {passed, failed, total} after each result
 *   - 'complete': {status: 'completed'|'failed'} terminates the run
 *
 * On any non-graceful disconnect (network blip, server restart) the
 * browser's EventSource will retry on its own, BUT only with the
 * default 3s backoff and no jitter. We let it do its thing and just
 * track `connected` so the UI can show a "reconnecting…" state.
 *
 * Pass `null` for runId to keep the hook idle (useful before a run
 * has been selected).
 */
export function useEventStream(runId: string | null): StreamState {
  const [state, setState] = useState<StreamState>(INITIAL);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!runId) {
      setState(INITIAL);
      return;
    }

    const url = `/api/runs/${runId}/stream`;
    const es = new EventSource(url);
    sourceRef.current = es;

    es.addEventListener('open', () => {
      setState((s) => ({ ...s, connected: true }));
    });

    es.addEventListener('error', () => {
      // EventSource auto-reconnects; just surface state.
      setState((s) => ({ ...s, connected: false }));
    });

    es.addEventListener('result', (ev: MessageEvent) => {
      try {
        const { contractResult } = JSON.parse(ev.data) as {
          contractResult: ContractResult;
        };
        setState((s) => {
          // Idempotent insert — if we already have this result id
          // (e.g. SSE replayed historical rows), skip.
          if (s.results.some((r) => r.id === contractResult.id)) return s;
          return { ...s, results: [...s.results, contractResult] };
        });
      } catch (err) {
        console.warn('[saync] failed to parse result event', err);
      }
    });

    es.addEventListener('progress', (ev: MessageEvent) => {
      try {
        const progress = JSON.parse(ev.data) as RunProgress;
        setState((s) => ({ ...s, progress }));
      } catch (err) {
        console.warn('[saync] failed to parse progress event', err);
      }
    });

    es.addEventListener('complete', (ev: MessageEvent) => {
      try {
        const { status } = JSON.parse(ev.data) as { status: RunStatus };
        setState((s) => ({ ...s, status }));
      } catch (err) {
        console.warn('[saync] failed to parse complete event', err);
      }
      // Server closes the stream after 'complete'; releasing here
      // prevents EventSource from auto-reconnecting to a dead run.
      es.close();
    });

    return () => {
      es.close();
      sourceRef.current = null;
    };
  }, [runId]);

  return state;
}
