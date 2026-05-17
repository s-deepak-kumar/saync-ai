'use client';

import ErrorBlock from '@/components/ErrorBlock';

export default function IssuesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBlock
      title="Couldn't load issues"
      error={error}
      reset={reset}
      homeHref="/"
    />
  );
}
