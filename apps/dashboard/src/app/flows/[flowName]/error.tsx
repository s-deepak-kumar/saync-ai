'use client';

import ErrorBlock from '@/components/ErrorBlock';

export default function FlowDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBlock
      title="Couldn't load flow"
      error={error}
      reset={reset}
      homeHref="/flows"
      homeLabel="Back to flows"
    />
  );
}
