import { createHash } from 'crypto';

/**
 * Generate MD5 hash for issue deduplication
 * Hash is based on: project_id + contract_name + first 100 chars of error_message
 */
export function generateIssueHash(
  projectId: string,
  contractName: string,
  errorMessage: string
): string {
  const truncatedError = errorMessage.substring(0, 100);
  const input = `${projectId}:${contractName}:${truncatedError}`;
  return createHash('md5').update(input).digest('hex');
}

// Made with Bob
