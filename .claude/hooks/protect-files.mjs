// PreToolUse (Edit|Write|MultiEdit): require explicit user approval for sensitive files.
import { basename, relative } from 'node:path';
import { projectDir, readHookInput } from './lib.mjs';

const RULES = [
  {
    test: (n) => n === 'package-lock.json',
    why: 'lockfile: change it via npm install, not by hand',
  },
  { test: (n) => n === '.env' || n.startsWith('.env.'), why: 'environment/secrets file' },
  { test: (n) => n === 'angular.json', why: 'workspace build config' },
];

const input = await readHookInput();
const file = input.tool_input?.file_path;
if (!file) process.exit(0);

const rule = RULES.find((r) => r.test(basename(file)));
if (!rule) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: `${relative(projectDir, file)} is protected (${rule.why}). Approve only if you asked for this change.`,
    },
  }),
);
