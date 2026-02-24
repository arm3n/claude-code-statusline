# Claude Code Status Line & Hooks

A custom status line and hook system for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that surfaces real-time rate limit data, context window usage, and automated context management.

```
armen@host MINGW64 ~/project (main) ctx:32% 5h:49%(1h52m) 7d:10%(6d)
                                     ~~~~~~ ~~~~~~~~~~~~~ ~~~~~~~~~~
                                       |         |            |
                                   context    5h limit     7d limit
                                   window     + reset      + reset
                                              countdown    countdown
```

## What it shows

| Segment | Source | Color coding |
|---|---|---|
| `user@host` | `os.userInfo()` / `os.hostname()` | green |
| `MINGW64` | `$MSYSTEM` env var | purple |
| `~/project` | workspace dir from Claude | yellow |
| `(main)` | `git symbolic-ref` | cyan |
| `ctx:32%` | context window usage | green <50%, yellow 50-69%, red 70%+ |
| `5h:49%(1h52m)` | 5-hour rolling limit + reset countdown | green <50%, yellow 50-79%, red 80%+ |
| `7d:10%(6d)` | 7-day rolling limit + reset countdown | same as above |

### Rate limit countdowns

The reset countdowns come directly from Anthropic's API response headers (`anthropic-ratelimit-unified-5h-reset` and `anthropic-ratelimit-unified-7d-reset`), not estimates. Countdowns format as `Xm`, `XhYm`, or `XdYh` depending on the time remaining.

### How the probe works

A lightweight 1-token Haiku request is sent to `api.anthropic.com` every 5 minutes. The response headers contain utilization fractions and reset timestamps for each rate limit window. Results are cached to `~/.claude/plan-usage-cache.json` so the status line renders instantly between probes.

Authentication uses the OAuth token from `~/.claude/.credentials.json` (written by `claude login`).

## Hooks

### Context Guard (`hooks/context-guard.js`)

A `PreToolUse` hook that monitors context window usage via a cache file written by the status line on every refresh.

- **80%** — warns Claude to start wrapping up
- **90%** — tells Claude to stop and suggest `/handover`

Uses `additionalContext` injection so it's advisory, not blocking.

### Gemini Delegate (`hooks/gemini-delegate.js`)

A `PreToolUse` hook on `Read` operations that suggests delegating large file reads to Gemini MCP (1M context) when the file would consume >25% of remaining context. Never warns for files under 40KB.

### Pre-Compact (`hooks/pre-compact.js`)

Backs up the conversation transcript and extracts recent context before compaction runs, so critical details survive.

### Post-Compact (`hooks/post-compact.js`)

Re-injects the saved context after auto-compact via `SessionStart[compact]`, restoring awareness of recent work.

## Setup

### 1. Status line

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/statusline-command.js"
  }
}
```

### 2. Hooks

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "node /path/to/hooks/context-guard.js" }]
      },
      {
        "matcher": "Read",
        "hooks": [{ "type": "command", "command": "node /path/to/hooks/gemini-delegate.js" }]
      }
    ],
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "node /path/to/hooks/pre-compact.js" }]
      }
    ],
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [{ "type": "command", "command": "node /path/to/hooks/post-compact.js" }]
      }
    ]
  }
}
```

## Requirements

- Node.js (reads from stdin, no dependencies)
- Claude Code with `statusLine` support
- Active Claude subscription (OAuth token for rate limit probing)

## Platform notes

Written in pure Node.js specifically to avoid bash/MSYS2 fork failures on Windows. Works on macOS/Linux too.
