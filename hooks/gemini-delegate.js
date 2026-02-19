#!/usr/bin/env node
// PreToolUse hook: suggests Gemini delegation when about to ingest content
// that would consume a substantial portion of remaining Claude context.
//
// Fires on: Read (checks file size on disk)
// Advisory only — never blocks, just injects guidance via additionalContext.
//
// Dynamic threshold: warns when estimated tokens > 25% of REMAINING context.
// Absolute floor: never warns for files under 40KB (~10K tokens).

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONTEXT_CACHE = path.join(os.homedir(), '.claude', 'context-pct-cache.json');
const CACHE_MAX_AGE_MS = 2 * 60 * 1000;
const TOTAL_CONTEXT_TOKENS = 200_000; // Opus 4.6 context window
const CHARS_PER_TOKEN = 4;
const MIN_FILE_BYTES = 40_000; // never warn below 40KB (~10K tokens)
const REMAINING_PCT_THRESHOLD = 0.25; // warn if file > 25% of remaining context

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(input);
    handleEvent(event);
  } catch {
    process.exit(0);
  }
});

function getContextPct() {
  try {
    const data = JSON.parse(fs.readFileSync(CONTEXT_CACHE, 'utf8'));
    if (data.ts && (Date.now() - data.ts < CACHE_MAX_AGE_MS)) return data.pct;
  } catch {}
  return null;
}

function handleEvent(event) {
  const toolName = event.tool_name || '';
  const toolInput = event.tool_input || {};

  if (toolName !== 'Read') {
    process.exit(0);
  }

  const filePath = toolInput.file_path;
  if (!filePath) process.exit(0);

  // If a line limit is set and it's small, the read is bounded — skip
  const limit = toolInput.limit;
  if (limit && limit <= 500) process.exit(0);

  let fileSize;
  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) process.exit(0);
    fileSize = stats.size;
  } catch {
    process.exit(0);
  }

  // Absolute floor — don't nag for small files
  if (fileSize < MIN_FILE_BYTES) process.exit(0);

  const estTokens = Math.round(fileSize / CHARS_PER_TOKEN);
  const ctxPct = getContextPct();

  // If we can't read context %, use a static 50K token threshold
  if (ctxPct === null) {
    if (estTokens < 50_000) process.exit(0);
  } else {
    const remainingTokens = TOTAL_CONTEXT_TOKENS * (1 - ctxPct / 100);
    const threshold = remainingTokens * REMAINING_PCT_THRESHOLD;
    if (estTokens < threshold) process.exit(0);
  }

  const estK = Math.round(estTokens / 1000);
  const fileSizeKB = Math.round(fileSize / 1024);
  const basename = path.basename(filePath);
  const ctxInfo = ctxPct !== null ? ` Context is at ${ctxPct}%.` : '';
  const remainInfo = ctxPct !== null
    ? ` That is ~${Math.round(estTokens / (TOTAL_CONTEXT_TOKENS * (1 - ctxPct / 100)) * 100)}% of your remaining context.`
    : '';

  const msg =
    `[GEMINI DELEGATE] "${basename}" is ~${estK}K tokens (${fileSizeKB}KB).${ctxInfo}${remainInfo} ` +
    `Consider delegating to Gemini instead of reading into Claude's context. Options:\n` +
    `  1. Use mcp__gemini__gemini-create-cache with filePath="${filePath}" to cache it in Gemini, ` +
    `then query with mcp__gemini__gemini-query-cache (content stays out of Claude's context).\n` +
    `  2. Use a Task subagent to read and summarize the file, returning only the relevant parts.\n` +
    `  3. Use Read with a targeted offset/limit to read only the section you need.\n` +
    `If you must read the full file (e.g., to edit it), proceed — this is advisory only.`;

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      additionalContext: msg
    }
  }));
  process.exit(0);
}
