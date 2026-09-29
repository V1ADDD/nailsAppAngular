import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

export async function readHookInput() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

/** Runs a package's JS entrypoint with the current Node binary (avoids .cmd shims on Windows). */
export function runBin(relEntry, args, opts = {}) {
  const entry = join(projectDir, 'node_modules', relEntry);
  if (!existsSync(entry)) return { status: 0, output: '', skipped: true };
  const res = spawnSync(process.execPath, [entry, ...args], {
    cwd: projectDir,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', CI: 'true' },
    ...opts,
  });
  // Strip ANSI color codes so failure output fed back to Claude stays readable.
  const output = `${res.stdout ?? ''}${res.stderr ?? ''}`.replace(/\u001b\[[0-9;]*m/g, '');
  return { status: res.status ?? 1, output };
}

export const BIN = {
  prettier: 'prettier/bin/prettier.cjs',
  eslint: 'eslint/bin/eslint.js',
  ngc: '@angular/compiler-cli/bundles/src/bin/ngc.js',
  tsc: 'typescript/bin/tsc',
  jest: 'jest/bin/jest.js',
};
