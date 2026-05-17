/**
 * Tiny .env loader. Looks at `${cwd}/.env` and, if present, parses it
 * into the returned record. Does NOT mutate process.env directly — the
 * CLI merges the result into the child process's env when spawning
 * Next, so dashboard route handlers see WATSONX_*, OPENAI_API_KEY,
 * ANTHROPIC_API_KEY, and any other secrets the user wrote in their
 * project's .env without having to export them in the shell first.
 *
 * Format supported:
 *   - KEY=value
 *   - KEY="value with spaces"
 *   - KEY='single quoted'
 *   - # comment lines
 *   - blank lines ignored
 *   - export KEY=value (the leading `export` is stripped)
 *
 * Not supported (out of scope):
 *   - variable interpolation (${OTHER})
 *   - multiline values
 *   - YAML-style quirks
 *
 * Existing process.env values take precedence — a value set explicitly
 * in the shell wins over the .env file, matching dotenv's standard
 * behavior.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * @param {string} cwd
 * @returns {Record<string, string>}
 */
export function loadDotenv(cwd) {
  const path = resolve(cwd, '.env');
  if (!existsSync(path)) return {};
  const out = {};
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.replace(/^\s*export\s+/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    // Strip matching surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) out[key] = val;
  }
  return out;
}
