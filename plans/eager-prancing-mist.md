# API Usage Dashboard — Implementation Plan

## Context
The user has 7 MCP servers (Sequential-thinking, Exa, Tavily, Brave Search, Perplexity, Context7, Firecrawl) connected to Claude Code. They want a single real-time dashboard showing usage metrics across all services plus Claude Code itself. This will be a lightweight local webapp.

## Architecture
- **Backend**: Express.js server with SSE (Server-Sent Events) for real-time push
- **Frontend**: Single HTML page + vanilla CSS/JS + Chart.js (CDN)
- **Dependencies**: Only `express` and `dotenv` (2 packages)
- **No build step**, no framework, no TypeScript

## Data Sources

| Service | Source | Method | Poll Rate |
|---|---|---|---|
| Claude Code | Local files (`.claude.json`, `stats-cache.json`, session `.jsonl`) | File read | 10s |
| Tavily | `GET https://api.tavily.com/usage` | API (Bearer token) | 60s |
| Firecrawl | `GET https://api.firecrawl.dev/v2/team/credit-usage` | API (Bearer token) | 60s |
| Exa | `GET https://api.exa.ai/api-keys/{id}/usage` | API (key discovery first) | 60s |
| Brave Search | Parse JSONL session logs for `mcp__brave-search__*` tool calls | File read | 10s |
| Perplexity | Parse JSONL session logs for `mcp__perplexity__*` tool calls | File read | 10s |
| Context7 | Parse JSONL session logs for `mcp__context7__*` tool calls | File read | 10s |

## File Structure

```
C:\Users\armen\api-dashboard\
├── package.json       # express + dotenv only
├── .env               # All API keys
├── .gitignore         # node_modules, .env
├── server.js          # Express + SSE + polling + file parsing + API fetchers
└── public/
    ├── index.html     # Dashboard shell, Chart.js CDN
    ├── style.css      # Dark theme (GitHub-dark inspired)
    └── app.js         # SSE listener, Chart.js rendering, DOM updates
```

## Server (`server.js`) — Key Sections

1. **State object**: In-memory state for all 7 services, broadcast via SSE on every update
2. **Local file readers**:
   - `readClaudeJson()` — parse `.claude.json` for cost, tokens, model breakdown
   - `readStatsCache()` — parse `stats-cache.json` for daily activity, sessions, messages
3. **JSONL parser** (most complex):
   - Recursively find all `.jsonl` in `~/.claude/projects/C--Users-armen/` (including `subagents/`)
   - Stream-parse with `readline`, track byte offsets for incremental reads
   - Extract MCP tool calls by prefix: `mcp__<service>__<tool>`
   - Count per-service, per-tool, and collect timestamps for timeline
4. **API pollers**: Fetch Tavily, Firecrawl, Exa usage endpoints with error handling and timeout
5. **SSE endpoint**: `/api/events` with heartbeat, auto-cleanup on disconnect
6. **Bind to `127.0.0.1:3456` only** (security)

## Frontend — Dashboard Layout

```
+----------------------------------------------------------+
| API Usage Dashboard              [connected] Updated 5s ago|
+----------------------------------------------------------+
| CLAUDE CODE (hero card, full width)                       |
| [$22.18 total] [392K input] [105K output] [4 sessions]   |
| [Doughnut: cost by model] [Bar: daily activity]           |
| [Table: per-model token breakdown]                        |
+----------------------------------------------------------+
| TAVILY          | FIRECRAWL        | EXA               |
| Credits: X/Y    | Credits: X/Y     | Cost: $X.XX       |
| [progress bar]  | [progress bar]   | [breakdown]       |
| Search: N       | Scrape: N        | Deep: N           |
| Tool calls: 27  | Tool calls: 22   | Tool calls: N     |
+----------------------------------------------------------+
| BRAVE SEARCH    | PERPLEXITY       | CONTEXT7           |
| Tool calls: 31  | Tool calls: 0    | Tool calls: 0     |
| [by tool type]  | [by tool type]   | [by tool type]    |
+----------------------------------------------------------+
```

- Dark theme with color-coded service cards
- CSS Grid layout, responsive
- Real-time updates via SSE (no manual refresh)

## Implementation Order

1. **Scaffold**: Create directory, `package.json`, `.env`, `.gitignore`, `npm install`
2. **Server skeleton**: Express + SSE + empty state broadcast
3. **Claude Code readers**: Parse `.claude.json` and `stats-cache.json`
4. **JSONL parser**: Incremental streaming parser with byte offset tracking
5. **API pollers**: Tavily, Firecrawl, Exa usage endpoints
6. **Frontend shell**: HTML structure + dark CSS theme
7. **Frontend logic**: SSE consumer, Chart.js charts, DOM updaters
8. **Polish**: Error badges, connection indicator, responsive tweaks

## Key Files to Read (existing data)

- `C:\Users\armen\.claude.json` — lines 113-211 (project usage data)
- `C:\Users\armen\.claude\stats-cache.json` — daily activity stats
- `C:\Users\armen\.claude\projects\C--Users-armen\*.jsonl` — session logs with MCP tool calls

## Verification

1. Run `npm install` in `api-dashboard/`
2. Run `node server.js` — should print "Dashboard running at http://localhost:3456"
3. Open browser to `http://localhost:3456`
4. Verify: Claude Code card shows cost ($22.18), token counts, session stats
5. Verify: JSONL tool call counts appear (Brave ~31, Tavily ~27, Firecrawl ~22)
6. Verify: Tavily and Firecrawl API cards show credits/usage (may take up to 60s)
7. Verify: SSE connection indicator shows "connected"
8. Verify: Make a Claude Code query, dashboard updates within 10s
