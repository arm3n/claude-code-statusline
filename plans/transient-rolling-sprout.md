# Plan: Completeness-Based Tie-Breaker for VIN Deduplication

## Context
Currently when multiple sources report the same VIN, the winner is chosen by a fixed source priority map (tesla=0 best, cargurus=9 worst). This means a sparse Tesla listing always beats a fully-populated MarketCheck listing. The user wants the source with the **most complete data and a verified working URL** to win, with source priority as a final tiebreaker only when completeness scores are equal.

## Changes

### 1. New file: `src/completeness.ts`
Pure scoring function, 0-14 scale. Each populated field = 1 point:
- price > 0, mileage > 0, year > 0, trim non-empty, exteriorColor non-empty, interiorColor non-empty, seatCount not null, dealerName non-empty, dealerLocation non-empty, imageUrl present, listedDate present, titleStatus present, accidentHistory not "unknown", urlVerified (injected boolean param)

### 2. New file: `src/verify-urls.ts`
HTTP link checker for duplicate-only listings:
- Only checks URLs for VINs appearing in 2+ sources (skips single-source VINs entirely)
- HEAD first, GET fallback if HEAD returns 405/403
- Concurrency limit of 5, 8s timeout per request
- 30-minute in-memory cache to avoid re-checking across quick refreshes

### 3. Modify: `src/normalize.ts`
- Import `computeCompleteness` and `verifyDuplicateUrls`
- Make `normalize()` async (returns `Promise<Listing[]>`)
- Before the per-VIN loop: identify VINs with 2+ sources, call `verifyDuplicateUrls` on those listings
- Replace sort comparator: sort by completeness score DESC, then source priority ASC as tiebreaker
- Attach `completenessScore` and `urlVerified` to each output Listing
- Merge logic (fill blanks from alternates) stays unchanged

### 4. Modify: `src/scraper/types.ts`
Add two optional fields to the `Listing` interface:
- `completenessScore?: number`
- `urlVerified?: boolean`

### 5. Modify: `src/db.ts`
- Add migration: `completeness_score INTEGER NOT NULL DEFAULT 0` and `url_verified INTEGER NOT NULL DEFAULT 0`
- Add those columns to the CREATE TABLE for fresh DBs
- Change UPSERT "who wins" condition from pure source priority to: `$completenessScore > listings.completeness_score OR ($completenessScore = listings.completeness_score AND source_priority_is_better)`
- Bind `$completenessScore` and `$urlVerified` in the upsert call
- Fill-blank logic for colors/nullable fields stays the same

### 6. Modify: `scripts/refresh.ts` (line 150)
- Add `await` to the `normalize()` call (function is already inside an async context)

## Verification
1. Run `bun run refresh` — should complete without errors, log completeness scores
2. Check DB: `SELECT vin, source, completeness_score, url_verified FROM listings LIMIT 20` — scores should be populated
3. Verify a known duplicate VIN picks the more complete source rather than the highest-priority one
4. Dashboard at localhost:3000 should display listings with working URLs
