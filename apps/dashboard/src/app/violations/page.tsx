import Link from 'next/link';
import { Radio } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ViolationsPage() {
  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <header className="mb-5">
        <div className="text-[11px] text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Radio size={11} /> Production
        </div>
        <h1 className="font-fraunces text-[28px] leading-none tracking-tighter text-ink">
          Violations
        </h1>
      </header>

      <div className="bg-card border border-border rounded px-6 py-10 text-center">
        <p className="text-[14px] font-medium text-ink mb-2">
          No production violations yet
        </p>
        <p className="text-[12px] text-muted max-w-[560px] mx-auto leading-relaxed mb-5">
          When you build with{' '}
          <code className="font-mono text-[11px] bg-zebra px-1.5 py-0.5 rounded">SAYNC_MODE=dev</code>
          {' '}or{' '}
          <code className="font-mono text-[11px] bg-zebra px-1.5 py-0.5 rounded">prod</code>,
          the SDK observes real-user interactions, captures contract violations, and POSTs batches to{' '}
          <code className="font-mono text-[11px] bg-zebra px-1.5 py-0.5 rounded">/api/violations</code>{' '}
          on this Saync instance. They'll be clustered and displayed here.
        </p>
        <Link
          href="/setup"
          className="text-[12px] font-medium text-terracotta hover:underline"
        >
          See install instructions →
        </Link>
      </div>
    </div>
  );
}
