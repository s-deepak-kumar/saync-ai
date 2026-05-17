#!/usr/bin/env node
/**
 * Flatten Next's standalone monorepo layout into a publish-friendly shape.
 *
 *   .next/standalone/apps/dashboard/.next/   → .next/standalone/.next/
 *   .next/standalone/apps/dashboard/server.js → .next/standalone/server.js
 *
 * Also copies the static assets + public + drizzle alongside so the
 * standalone server can find them at runtime without us having to point
 * SAYNC_MIGRATIONS_FOLDER at a different prefix in the bin script.
 */
import { cpSync, mkdirSync, renameSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const standalone = resolve(root, '.next/standalone');
const nested = resolve(standalone, 'apps/dashboard');

if (!existsSync(nested)) {
  console.log('[saync] no monorepo nesting detected in standalone — nothing to flatten');
} else {
  console.log('[saync] flattening standalone output…');
  // Move every file from nested up one level, replacing on collision.
  for (const entry of readdirSync(nested)) {
    const from = resolve(nested, entry);
    const to = resolve(standalone, entry);
    if (existsSync(to)) rmSync(to, { recursive: true, force: true });
    renameSync(from, to);
  }
  rmSync(resolve(standalone, 'apps'), { recursive: true, force: true });
}

// .next/static lives outside .next/standalone by design; copy it in.
const staticSrc = resolve(root, '.next/static');
const staticDst = resolve(standalone, '.next/static');
if (existsSync(staticSrc)) {
  mkdirSync(dirname(staticDst), { recursive: true });
  cpSync(staticSrc, staticDst, { recursive: true });
}

// drizzle migrations need to be sibling of server.js so getDb() can find them.
const drizzleSrc = resolve(root, 'drizzle');
const drizzleDst = resolve(standalone, 'drizzle');
if (existsSync(drizzleSrc) && !existsSync(drizzleDst)) {
  cpSync(drizzleSrc, drizzleDst, { recursive: true });
}

// public/, if present, alongside.
const publicSrc = resolve(root, 'public');
const publicDst = resolve(standalone, 'public');
if (existsSync(publicSrc) && !existsSync(publicDst)) {
  cpSync(publicSrc, publicDst, { recursive: true });
}

console.log('[saync] standalone ready at .next/standalone');
