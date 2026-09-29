// PostToolUse (Edit|Write|MultiEdit): format the touched file with Prettier.
import { existsSync } from 'node:fs';
import { extname, relative } from 'node:path';
import { BIN, projectDir, readHookInput, runBin } from './lib.mjs';

const FORMATTABLE = new Set([
  '.ts',
  '.js',
  '.mjs',
  '.cjs',
  '.html',
  '.scss',
  '.css',
  '.json',
  '.md',
]);

const input = await readHookInput();
const file = input.tool_input?.file_path;
if (!file || !existsSync(file)) process.exit(0);

const rel = relative(projectDir, file);
if (rel.startsWith('..') || rel.includes('node_modules') || !FORMATTABLE.has(extname(file))) {
  process.exit(0);
}

const res = runBin(BIN.prettier, ['--write', '--log-level=warn', file]);
if (res.status !== 0) {
  // Exit 2 feeds this back to Claude, so a syntax error gets noticed right away.
  console.error(`Prettier could not format ${rel}:\n${res.output.slice(0, 2000)}`);
  process.exit(2);
}
