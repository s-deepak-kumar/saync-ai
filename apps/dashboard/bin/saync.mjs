#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Bin shim. Hands off to cli/index.mjs which holds all the actual logic.
const __dirname = dirname(fileURLToPath(import.meta.url));
await import(resolve(__dirname, '../cli/index.mjs'));
