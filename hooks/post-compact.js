#!/usr/bin/env node
// SessionStart (compact) hook: re-injects saved context after compaction
const fs = require('fs');
const path = require('path');

const HOME = process.env.HOME || process.env.USERPROFILE;
const LATEST = path.join(HOME, '.claude', 'handovers', 'pre-compact-latest.md');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const hook = JSON.parse(input);

    // Only act when session restarts after compaction
    if (hook.source !== 'compact') {
      process.exit(0);
    }

    if (fs.existsSync(LATEST)) {
      const context = fs.readFileSync(LATEST, 'utf8');
      // Return additionalContext so Claude sees it in the fresh post-compact session
      process.stdout.write(JSON.stringify({
        additionalContext: [
          '[Context preserved from before compaction]',
          context,
          '[End pre-compact context — use this to recall recent work]'
        ].join('\n')
      }));
    }
    // Reset context cache so context-guard doesn't use stale pre-compact %
    const CACHE = path.join(HOME, '.claude', 'context-pct-cache.json');
    try { fs.writeFileSync(CACHE, JSON.stringify({ ts: Date.now(), pct: 5 })); } catch {}
  } catch (e) {
    process.stderr.write(`PostCompact hook error: ${e.message}\n`);
  }
  process.exit(0);
});
