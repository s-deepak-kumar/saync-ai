import { createHash } from 'node:crypto';

/**
 * Deterministic key used for issue de-duplication. Two failed results with
 * the same contractName + errorMessage roll up into one issue. We hash
 * because the raw key can be long (error messages, stack frames) and
 * sqlite indexes on shorter keys are cheaper.
 */
export function generateIssueHash(contractName: string, errorMessage: string): string {
  return createHash('md5')
    .update(`${contractName}::${errorMessage}`)
    .digest('hex');
}
