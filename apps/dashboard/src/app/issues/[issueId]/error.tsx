'use client';

import ErrorBlock from '@/components/ErrorBlock';

export default function IssueDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBlock
      title="Couldn't load issue"
      error={error}
      reset={reset}
      homeHref="/issues"
      homeLabel="Back to issues"
    />
  );
}
