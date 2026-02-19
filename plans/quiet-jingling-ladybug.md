# Plan: Close Per-Scraper Upsert as Won't Fix

## Context

Beads issue `tesla-model-x-dashboard-4r4` (P2, in_progress): "Optimize allRaw per-scraper upsert to reduce DB writes"

Original plan was to normalize+upsert each scraper's results incrementally as it finishes, rather than waiting for all 9 scrapers. Gemini 3.1 Pro review (high thinking) identified 3 fatal issues.

## Gemini Review Findings

### Fatal: completenessScore drift
When `normalize()` only sees one scraper's data, completeness is single-source. A scraper with more populated fields (e.g., Autotrader with interior color + dealer info → score 80) gets upserted first. When Tesla arrives with fewer fields (score 60), `NEW_WINS` evaluates FALSE. Tesla never becomes the primary source. The DB's completeness score is never recalculated to reflect merged state — permanently broken.

### Fatal: Not worth the complexity
- normalize+upsert takes ~150ms for ~1000 listings
- Scrapers take 30-180s (network-bound)
- Savings: ~0.08% of total refresh time
- UI waits for full refresh anyway — zero user-visible benefit
- Risk: data integrity issues for negligible gain

### Minor: Scraper log inflation
`dedupedCount` would be inflated since each scraper "wins" against itself without cross-source dedup context.

## Decision: Close as Won't Fix

The optimization trades data integrity for imperceptible time savings. The correct action is to close the beads issue and unblock the SSE migration (which has actual user-facing value).

## Actions

1. Close beads issue: `bd close tesla-model-x-dashboard-4r4 --reason="Won't fix: Gemini review found completenessScore drift breaks NEW_WINS logic. normalize+upsert is ~150ms vs 180s scraper wait — not worth the data integrity risk."`
2. Unblock SSE migration: `bd dep remove tesla-model-x-dashboard-b4t tesla-model-x-dashboard-4r4` (or just close 4r4, which auto-unblocks b4t)
3. Update MEMORY.md: Remove "allRaw per-scraper upsert (medium)" from remaining perf items, note it was evaluated and rejected

## No Code Changes

No files modified. This is purely a beads issue lifecycle change.
