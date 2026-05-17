'use client';

import ErrorBlock from '@/components/ErrorBlock';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBlock
      title="Couldn't load dashboard"
      error={error}
      reset={reset}
      homeHref="/"
    />
  );
}
