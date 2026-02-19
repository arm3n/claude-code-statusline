# Fix stale context-pct-cache after compaction

## Context

After `/compact`, `context-pct-cache.json` retains the pre-compact context percentage (e.g. 83%) until the status line refreshes. The context-guard hook reads this stale value and injects false warnings, misleading Claude into refusing work or suggesting /handover at ~31% actual usage.

**Root cause**: `post-compact.js` re-injects pre-compact context but never resets the cache file. The 2-min TTL in context-guard hasn't expired yet, so the stale high % triggers false warnings.

## Changes

### 1. `~/.claude/hooks/post-compact.js` — add cache reset (3 lines)

After the existing `additionalContext` output (line 31), before the catch block, add:

```javascript
    // Reset context cache so context-guard doesn't use stale pre-compact %
    const CACHE = path.join(HOME, '.claude', 'context-pct-cache.json');
    try { fs.writeFileSync(CACHE, JSON.stringify({ ts: Date.now(), pct: 5 })); } catch {}
```

Write `pct: 5` (not 0) — post-compact context is typically ~5%. The status line will overwrite with the real value on its next refresh cycle.

### 2. Create bead

From `~/tesla-model-x-dashboard`:
```
bd add --priority P1 --type bug "Fix stale context-pct-cache after compaction"
```

## Verification

1. Check `~/.claude/context-pct-cache.json` before compact — note the high %
2. Run `/compact`
3. Immediately check cache — should show `pct: 5` with fresh timestamp
4. Verify context-guard does NOT inject stale warnings in the post-compact session
