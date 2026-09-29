// Stop: before Claude finishes a turn, typecheck (including templates), lint changed files
// and run the Jest tests related to them. Failures are fed back so Claude fixes them.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { BIN, projectDir, readHookInput, runBin } from './lib.mjs';

const MAX_CONSECUTIVE_BLOCKS = 3;
const CODE_EXT = new Set(['.ts', '.html', '.scss']);
const cacheDir = join(projectDir, '.claude', '.cache');
const stateFile = join(cacheDir, 'quality-gate.json');

const input = await readHookInput();
const sessionId = input.session_id ?? 'unknown';

function loadState() {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    return { passedSignature: null, blocks: {} };
  }
}

function saveState(state) {
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

function changedFiles() {
  let out = '';
  try {
    out = execFileSync('git', ['status', '--porcelain', '-uall'], {
      cwd: projectDir,
      encoding: 'utf8',
    });
  } catch {
    return [];
  }
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).split(' -> ').pop().replace(/^"|"$/g, ''))
    .filter((p) => (p.startsWith('src/') || p === 'setup-jest.ts') && CODE_EXT.has(extname(p)))
    .filter((p) => existsSync(join(projectDir, p)));
}

const files = changedFiles();
if (files.length === 0) process.exit(0);

// Skip re-running when nothing changed since the last passing run.
const signature = createHash('sha1')
  .update(files.map((f) => `${f}:${statSync(join(projectDir, f)).mtimeMs}`).join('|'))
  .digest('hex');
const state = loadState();
if (state.passedSignature === signature) process.exit(0);

const failures = [];
const trim = (s, n = 3500) => (s.length > n ? `${s.slice(0, n)}\n... (truncated)` : s).trim();

const ngc = runBin(BIN.ngc, ['-p', 'tsconfig.app.json', '--noEmit', '--pretty', 'false']);
if (ngc.status !== 0) failures.push(`TYPECHECK (app + templates) failed:\n${trim(ngc.output)}`);

const tscSpec = runBin(BIN.tsc, ['-p', 'tsconfig.spec.json', '--noEmit', '--pretty', 'false']);
if (tscSpec.status !== 0) failures.push(`TYPECHECK (specs) failed:\n${trim(tscSpec.output)}`);

const lintable = files.filter((f) => f.endsWith('.ts') || f.endsWith('.html'));
if (lintable.length) {
  const lint = runBin(BIN.eslint, ['--max-warnings=0', ...lintable]);
  if (lint.status !== 0) failures.push(`ESLINT failed:\n${trim(lint.output)}`);
}

// Map templates/styles to their component .ts so Jest can find the related specs.
const tsTargets = [
  ...new Set(files.map((f) => (f.endsWith('.ts') ? f : f.replace(/\.(html|scss)$/, '.ts')))),
].filter((f) => existsSync(join(projectDir, f)));
if (tsTargets.length) {
  const jest = runBin(BIN.jest, ['--findRelatedTests', ...tsTargets, '--passWithNoTests']);
  if (jest.status !== 0) failures.push(`JEST failed:\n${trim(jest.output, 5000)}`);
}

if (failures.length === 0) {
  saveState({ passedSignature: signature, blocks: {} });
  process.exit(0);
}

const blocks = (state.blocks?.[sessionId] ?? 0) + 1;
saveState({ passedSignature: state.passedSignature, blocks: { [sessionId]: blocks } });

if (blocks > MAX_CONSECUTIVE_BLOCKS) {
  process.stdout.write(
    JSON.stringify({
      systemMessage: `Quality gate still failing after ${MAX_CONSECUTIVE_BLOCKS} attempts; letting Claude stop. Run "npm run check" to see the errors.`,
    }),
  );
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    decision: 'block',
    reason: `Quality gate failed (attempt ${blocks}/${MAX_CONSECUTIVE_BLOCKS}). Fix these before finishing:\n\n${failures.join('\n\n')}`,
  }),
);
