'use client';

import Link from 'next/link';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface Props {
  title?: string;
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
  homeLabel?: string;
}

export default function ErrorBlock({
  title = 'Something went wrong',
  error,
  reset,
  homeHref,
  homeLabel = 'Back to project',
}: Props) {
  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <div className="bg-card border border-sevCriticalBg rounded p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-sevCritical">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-fraunces text-[20px] leading-tight tracking-tighter text-ink mb-1">
              {title}
            </h2>
            <p className="font-mono text-[12px] text-[#991B1B] break-words mb-4">
              {error.message || 'Unknown error'}
            </p>
            {error.digest && (
              <p className="font-mono text-[10px] text-muted mb-4">
                digest {error.digest}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-ink rounded hover:bg-[#1E293B] transition-colors"
              >
                <RotateCw size={12} /> Try again
              </button>
              {homeHref && (
                <Link
                  href={homeHref}
                  className="px-3 py-1.5 text-[12px] font-medium text-ink bg-white border border-border rounded hover:bg-rowHover transition-colors"
                >
                  {homeLabel}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
