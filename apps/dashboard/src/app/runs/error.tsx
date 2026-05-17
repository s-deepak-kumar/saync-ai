'use client';

import ErrorBlock from '@/components/ErrorBlock';

export default function RunsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBlock
      title="Couldn't load runs"
      error={error}
      reset={reset}
      homeHref="/"
    />
  );
}
