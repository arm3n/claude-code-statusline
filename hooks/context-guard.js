#!/usr/bin/env node
// PreToolUse hook: injects context warnings when context window is getting full.
// Reads context % from cache written by statusline-command.js.
const fs = require('fs');
const path = require('path');
const os = require('os');

const CACHE = path.join(os.homedir(), '.claude', 'context-pct-cache.json');
const WARN_PCT = 80;
const STOP_PCT = 90;
const CACHE_MAX_AGE_MS = 2 * 60 * 1000; // ignore cache older than 2 min

// Read cached context percentage
let pct = null;
try {
  const data = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  if (data.ts && (Date.now() - data.ts < CACHE_MAX_AGE_MS)) {
    pct = data.pct;
  }
} catch {
  process.exit(0);
}

if (pct == null || pct < WARN_PCT) {
  process.exit(0);
}

let msg;
if (pct >= STOP_PCT) {
  msg =
    `[CONTEXT GUARD] Context window is at ${pct}%. ` +
    `STOP what you are doing after this tool call completes. ` +
    `Do not start any new work. Tell the user to run /handover immediately.`;
} else {
  msg =
    `[CONTEXT GUARD] Context window is at ${pct}%. ` +
    `Start wrapping up your current task. Finish your current step and suggest the user run /handover soon.`;
}

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'allow',
    additionalContext: msg
  }
}));
process.exit(0);
