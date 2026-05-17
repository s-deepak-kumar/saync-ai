/**
 * In-process pub/sub for SSE. Singleton kept across Route Handler
 * invocations via globalThis so HMR in dev doesn't reset subscriptions.
 */

type StreamCallback = (event: string, data: unknown) => void;

class PubSub {
  private subs = new Map<string, Set<StreamCallback>>();

  subscribe(runId: string, cb: StreamCallback): () => void {
    let set = this.subs.get(runId);
    if (!set) {
      set = new Set();
      this.subs.set(runId, set);
    }
    set.add(cb);
    return () => {
      const s = this.subs.get(runId);
      if (!s) return;
      s.delete(cb);
      if (s.size === 0) this.subs.delete(runId);
    };
  }

  publish(runId: string, event: string, data: unknown): void {
    const set = this.subs.get(runId);
    if (!set) return;
    for (const cb of set) {
      try { cb(event, data); } catch { set.delete(cb); }
    }
  }
}

const g = globalThis as unknown as { __saync_pubsub?: PubSub };
export const pubsub: PubSub = g.__saync_pubsub ?? (g.__saync_pubsub = new PubSub());
