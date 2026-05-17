/**
 * In-memory pub/sub for SSE live updates
 * Maps runId to Set of callback functions
 */

type StreamCallback = (event: string, data: any) => Promise<void>;

class PubSub {
  private subscribers: Map<string, Set<StreamCallback>> = new Map();

  /**
   * Subscribe to updates for a specific run
   */
  subscribe(runId: string, callback: StreamCallback): () => void {
    if (!this.subscribers.has(runId)) {
      this.subscribers.set(runId, new Set());
    }
    
    this.subscribers.get(runId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(runId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(runId);
        }
      }
    };
  }

  /**
   * Publish an event to all subscribers of a run
   */
  async publish(runId: string, event: string, data: any): Promise<void> {
    const subs = this.subscribers.get(runId);
    if (!subs || subs.size === 0) return;

    // Send to all subscribers
    const promises = Array.from(subs).map(async (callback) => {
      try {
        await callback(event, data);
      } catch (error) {
        // Remove failed callback
        subs.delete(callback);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get subscriber count for a run
   */
  getSubscriberCount(runId: string): number {
    return this.subscribers.get(runId)?.size || 0;
  }
}

// Singleton instance
export const pubsub = new PubSub();

// Made with Bob
