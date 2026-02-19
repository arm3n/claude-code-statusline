#!/usr/bin/env node
// PreCompact hook: saves transcript backup + extracts recent context before compaction
const fs = require('fs');
const path = require('path');

const HOME = process.env.HOME || process.env.USERPROFILE;
const HANDOVER_DIR = path.join(HOME, '.claude', 'handovers');
const TRANSCRIPT_DIR = path.join(HANDOVER_DIR, 'transcripts');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const hook = JSON.parse(input);
    const transcriptPath = hook.transcript_path;
    const trigger = hook.trigger; // "manual" or "auto"
    const cwd = hook.cwd;

    if (!transcriptPath || !fs.existsSync(transcriptPath)) {
      process.exit(0);
    }

    // Ensure directories exist
    fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });

    // Read and parse transcript JSONL
    const raw = fs.readFileSync(transcriptPath, 'utf8');
    const lines = raw.trim().split('\n');
    const messages = [];
    for (const line of lines) {
      try { messages.push(JSON.parse(line)); } catch (_) {}
    }

    // Extract recent user messages (last 10)
    // Transcript JSONL wraps API messages: entry.type = "user"|"assistant", entry.message = {role, content}
    const userMsgs = [];
    const assistantMsgs = [];
    const files = new Set();

    for (let i = messages.length - 1; i >= 0; i--) {
      const entry = messages[i];
      const inner = entry.message;
      if (!inner) continue;

      const text = extractText(inner);

      if (entry.type === 'user' && text && userMsgs.length < 10) {
        userMsgs.unshift(text.substring(0, 300));
      }
      if (entry.type === 'assistant') {
        if (text && assistantMsgs.length < 5) {
          assistantMsgs.unshift(text.substring(0, 400));
        }
        extractFilePaths(inner, files);
      }
    }

    // Build summary
    const ts = new Date().toISOString();
    const stamp = ts.replace(/[:.]/g, '-').substring(0, 19);

    const summary = [
      `# Pre-Compact Context Snapshot`,
      `> Generated: ${ts}`,
      `> Trigger: ${trigger}`,
      `> Working directory: ${cwd}`,
      `> Messages in transcript: ${messages.length}`,
      ``,
      `## Recent User Requests`,
      ...userMsgs.map((m, i) => `${i + 1}. ${oneline(m)}`),
      ``,
      `## Recent Assistant Output`,
      ...assistantMsgs.map(m => `- ${oneline(m)}`),
      ``,
      `## Files Referenced`,
      ...([...files].slice(0, 30).map(f => `- \`${f}\``) || ['- None detected']),
      ``,
      `## Transcript Backup`,
      `- \`~/.claude/handovers/transcripts/transcript-${stamp}.jsonl\``,
    ].join('\n');

    // Save latest (for re-injection) and timestamped copy
    fs.writeFileSync(path.join(HANDOVER_DIR, 'pre-compact-latest.md'), summary);
    fs.writeFileSync(path.join(HANDOVER_DIR, `pre-compact-${stamp}.md`), summary);

    // Backup raw transcript
    fs.copyFileSync(transcriptPath, path.join(TRANSCRIPT_DIR, `transcript-${stamp}.jsonl`));

  } catch (e) {
    process.stderr.write(`PreCompact hook error: ${e.message}\n`);
  }
  process.exit(0);
});

function extractText(msg) {
  if (!msg || !msg.content) return '';
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');
  }
  return '';
}

function extractFilePaths(msg, fileSet) {
  if (!msg || !Array.isArray(msg.content)) return;
  for (const block of msg.content) {
    if (block.type === 'tool_use' && block.input) {
      const fp = block.input.file_path || block.input.path || block.input.notebook_path;
      if (fp && typeof fp === 'string') fileSet.add(fp);
      // Also grab glob/grep paths
      if (block.input.pattern && block.input.path) fileSet.add(block.input.path);
    }
  }
}

function oneline(s) {
  return s.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
}
