'use client';

import { useEffect, useState } from 'react';

type Mode = 'local' | 'dev' | 'prod';

const STYLES: Record<Mode, { bg: string; fg: string; dot: string }> = {
  local: { bg: '#1E293B', fg: '#7DD3FC', dot: '#0EA5E9' },
  dev:   { bg: '#1E293B', fg: '#FCD34D', dot: '#F59E0B' },
  prod:  { bg: '#1E293B', fg: '#FCA5A5', dot: '#DC2626' },
};

export default function ModeBadge() {
  const [mode, setMode] = useState<Mode>('local');

  useEffect(() => {
    fetch('/api/system')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.mode) setMode(d.mode); })
      .catch(() => { /* keep default */ });
  }, []);

  const s = STYLES[mode];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {mode}
    </span>
  );
}
