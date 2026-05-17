'use client';

import { useEffect, useState } from 'react';

export default function ConnectedDot() {
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      fetch('/api/system')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive && d) setConnected(Boolean(d.appConnected)); })
        .catch(() => { if (alive) setConnected(false); });
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const color =
    connected === null ? '#64748B' :
    connected ? '#059669' : '#DC2626';
  const label =
    connected === null ? 'checking' :
    connected ? 'app connected' : 'app offline';

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] text-sidebarMuted"
      title={label}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: connected ? `0 0 4px ${color}` : undefined,
        }}
      />
      <span className="uppercase tracking-wider">
        {connected === null ? '…' : connected ? 'live' : 'idle'}
      </span>
    </span>
  );
}
