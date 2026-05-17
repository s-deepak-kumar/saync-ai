'use client';

import ErrorBlock from '@/components/ErrorBlock';

export default function FlowsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBlock
      title="Couldn't load flows"
      error={error}
      reset={reset}
      homeHref="/"
    />
  );
}
