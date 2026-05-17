'use client';

import ErrorBlock from '@/components/ErrorBlock';

export default function RunDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBlock
      title="Couldn't load run"
      error={error}
      reset={reset}
      homeHref="/runs"
      homeLabel="Back to runs"
    />
  );
}
