import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Force the standalone output to live at .next/standalone/server.js
  // (not .next/standalone/apps/dashboard/server.js) — we ship the
  // dashboard as its own npm package, not a workspace fragment.
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    '/**': ['./drizzle/**/*'],
  },
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

export default nextConfig;
