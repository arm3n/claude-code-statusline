# Plan: Fix stale context-pct-cache after compaction

## Context
After `/compact`, `context-pct-cache.json` retains the pre-compact context percentage (e.g. 83%) until the status line refreshes. The context-guard hook reads this stale value and injects false warnings ("context at 83%"), misleading Claude and subagents. This caused a subagent to refuse work and me to incorrectly warn the user to handover at 31% actual usage.

## Root Cause
- `statusline-command.js` writes `~/.claude/context-pct-cache.json` with `{ ts, pct }` on each refresh
- `context-guard.js` reads it, ignores if >2min old, injects warnings at 80%/90%
- `post-compact.js` (SessionStart compact hook) re-injects pre-compact context but does NOT reset the cache
- After compact, cache still holds the old high %, and the 2-min TTL hasn't expired yet

## Fix
Add 3 lines to `~/.claude/hooks/post-compact.js` to reset the cache after compaction:

```javascript
// After the existing context re-injection logic, reset the context cache
const CACHE = path.join(HOME, '.claude', 'context-pct-cache.json');
try { fs.writeFileSync(CACHE, JSON.stringify({ ts: Date.now(), pct: 5 })); } catch {}
```

Write `pct: 5` (not 0) since post-compact is ~5% typically. The status line will overwrite with the real value on its next refresh.

## Files to Modify
- `~/.claude/hooks/post-compact.js` — add cache reset after line 31

## Verification
1. Run `/compact` in a session with high context
2. Check that `context-pct-cache.json` shows `pct: 5` immediately after
3. Verify context-guard does NOT inject stale warnings in the post-compact session
