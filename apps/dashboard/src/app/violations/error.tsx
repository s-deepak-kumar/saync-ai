'use client';

import ErrorBlock from '@/components/ErrorBlock';

export default function ViolationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBlock
      title="Couldn't load violations"
      error={error}
      reset={reset}
      homeHref="/"
    />
  );
}
