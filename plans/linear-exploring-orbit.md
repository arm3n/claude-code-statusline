# Plan: Fix Cars.com timeout after pagination change

## Context

The Cars.com pagination fix (commit `c9d2e2d`) changed page 1 from finding ~22 listings to 41 (page 1: 41 items + page 2: 19 items, deduped to 41 unique). Each detail page fetch takes 3-5s with human-like delays. The detail phase now needs ~41 × 4s = ~164s, plus ~30s for the search phase = ~194s total. The 175s internal timeout and 180s refresh-level timeout are both exceeded.

Evidence from scraper log:
```
Page 1: 22 links → 22 extracted
Page 2 via URL: 19 more (total: 41)
Detail progress: 20/41 (ok=20, fail=0)
→ Timed out after 175s — killed subprocess
→ Timed out after 180s — returning 0 partial results
```

The "0 partial results" is a second bug: the streaming markers emit search-phase items (no VINs), but `parseItem` requires a VIN, so streaming count stays at 0 until detail pages are fetched. The TS wrapper only sees 0 streamed results despite 20 detail pages having been visited.

## Changes

### 1. Increase timeouts (`scripts/refresh.ts`, `src/scraper/cars-com.ts`)
- `refresh.ts:61`: Change from `180_000` to `325_000` (fix: was set to 300_000, bump to 325s for cleanup margin)
- `cars-com.ts:57`: Change internal timeout from `175_000` to `295_000`
- Gap: 30s between inner (295s) and outer (325s) for process tree cleanup

### 2. Fix partial results streaming (`scripts/cars-com-fetch.py`)
Currently, detail-phase results only emitted via final `__CARSCOM_RESULTS_START__` bulk marker. If killed mid-detail, all work lost.

Fix: Emit `__CARSCOM_PAGE_RESULTS__` marker after **each successful detail fetch** (not batched). Per-item emission maximizes data preservation on timeout. The TS marker parser already handles any frequency.

In the detail loop (line ~399-428), after merging detail data into `item`, emit:
```python
if item.get("vin"):
    print("__CARSCOM_PAGE_RESULTS__" + json.dumps([item]) + "__END_PAGE__")
    sys.stdout.flush()
```

### 3. Reduce detail page sleep + add timing variation (`scripts/cars-com-fetch.py:231`)
- Base sleep: `random.uniform(2, 3.5)` (was 3-5) — saves ~30-60s over 41 pages
- Every 10th page: add `random.uniform(5, 8)` longer pause to break timing patterns for bot detection

## Files to modify
- `scripts/refresh.ts:61` — change 300_000 → 325_000
- `src/scraper/cars-com.ts:57` — change 175_000 → 295_000
- `scripts/cars-com-fetch.py:231` — reduce detail sleep, add periodic long pause
- `scripts/cars-com-fetch.py:399-428` — emit per-item streaming markers during detail phase

## Verification
1. Run Cars.com scraper directly: `python scripts/cars-com-fetch.py 2>&1`
2. Check it completes within 295s with all detail pages
3. Trigger a full refresh and verify Cars.com doesn't timeout
4. Verify `Streaming: N listings so far` increments during detail phase
