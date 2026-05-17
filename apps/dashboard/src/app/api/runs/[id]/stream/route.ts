import { eq, asc } from 'drizzle-orm';
import { getDb } from '@/lib/db/connection';
import { runs, contractResults } from '@/lib/db/schema';
import { pubsub } from '@/lib/pubsub';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const runId = params.id;
  const db = getDb();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const existing = await db.query.contractResults.findMany({
        where: eq(contractResults.runId, runId),
        orderBy: [asc(contractResults.createdAt)],
      });
      for (const r of existing) send('result', { contractResult: r });

      const run = await db.query.runs.findFirst({ where: eq(runs.id, runId) });
      if (run) {
        send('progress', {
          passed: run.passedContracts,
          failed: run.failedContracts,
          total: run.totalContracts,
        });
        if (run.status === 'completed' || run.status === 'failed') {
          send('complete', { status: run.status });
          controller.close();
          return;
        }
      }

      const unsubscribe = pubsub.subscribe(runId, (event, data) => {
        send(event, data);
        if (event === 'complete') {
          unsubscribe();
          clearInterval(heartbeat);
          controller.close();
        }
      });

      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(': heartbeat\n\n')); }
        catch { clearInterval(heartbeat); unsubscribe(); }
      }, 15000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
