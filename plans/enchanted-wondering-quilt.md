# Plan: Dashboard UX Improvements (3 Features)

## Context
The VIN enrichment system is complete and working (20% hit rate). Three UX gaps remain:
1. No way to see which cell values came from enrichment vs scrapers
2. Filter/sort state resets on every page refresh
3. No way to select specific listings for re-scraping or re-enrichment

## Feature 1: Enrichment Indicators with Hover Tooltips

**Goal**: Show which fields were filled by enrichment, with hover showing the source dealer URL.

### Backend

**`src/db.ts`** — Add `getEnrichmentMap()`:
- Queries `enrichment_cache`, returns `Map<vin, { fields: string[], dealerUrl, searchedAt }>`
- `fields` = list of non-null/non-zero columns (price, mileage, interiorColor, exteriorColor)

**`src/server.ts`** — Modify `GET /api/listings`:
- Import `getEnrichmentMap`, call it alongside listings query
- Attach `_enriched` property to each listing: `null` if not enriched, or `{ fields, dealerUrl, searchedAt }`

### Frontend (`public/index.html`)

**CSS**: `.cell-enriched { border-left: 2px solid #58a6ff !important; }` — blue left border (distinct from yellow `.overridden`)

**AG Grid columns** — Add to price, mileage, exteriorColor, interiorColor columns:
- `cellClassRules`: apply `.cell-enriched` when `_enriched.fields` includes that field AND no manual override exists
- `tooltipValueGetter`: return `"Enriched from {dealerUrl}"` for enriched fields

**Grid options**: Add `tooltipShowDelay: 300`

## Feature 2: Persist Filter/Sort State (localStorage)

**Goal**: Save AG Grid state so filters, sort, column widths, page size, and "Show all" checkbox survive page refresh.

**Pure frontend change — no backend modifications.**

### Implementation (`public/index.html`)

1. **Debounce helper** + `STORAGE_KEY = 'tesla-dashboard-state'`

2. **`saveState()`** (debounced 500ms): Serializes to localStorage:
   - `gridApi.getFilterModel()` — all active column filters
   - `gridApi.getColumnState()` — sort order, column widths, column order, pinning
   - `showAll` checkbox state
   - `gridApi.paginationGetPageSize()`

3. **`restoreState()`**: Called after data loads. Reads localStorage, applies:
   - `gridApi.setFilterModel()`, `gridApi.applyColumnState()`, checkbox, page size
   - Wrapped in try/catch — clears corrupted localStorage

4. **Event wiring**:
   - AG Grid `onFilterChanged`, `onSortChanged`, `onColumnResized`, `onColumnMoved`, `onPaginationChanged` → all call `saveState`
   - "Show all" checkbox → `saveState` + `loadListings`

5. **Load sequence change**: Move initial load into `onGridReady` callback:
   - `onGridReady` → load overrides → load listings → `restoreState()`
   - Remove the standalone `Promise.all(...).then(loadListings)` at line 1480

## Feature 3: Select Listings for Re-scraping / Re-enrichment

**Goal**: Checkbox selection on rows with two actions: re-scrape (refresh sources) and re-enrich (targeted VIN enrichment).

### Frontend (`public/index.html`)

**AG Grid config**:
- Add `rowSelection: { mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: false }`
- First column becomes the auto-generated checkbox column

**Header buttons** — Two new buttons between "Excluded" and "Refresh Now":
- `Re-scrape (0)` — disabled when nothing selected, shows count
- `Re-enrich (0)` — disabled when nothing selected, shows count

**Selection change handler** (`onSelectionChanged`): Updates button text with selection count, toggles disabled state.

**`rescrapeSelected()`**:
- Gets unique `source` values from selected rows
- Calls `POST /api/refresh` with `{ sources: [...] }` (existing endpoint)
- Shows progress panel, starts polling
- Clears selection

**`reenrichSelected()`**:
- Gets VINs from selected rows
- Calls `POST /api/enrich-vins` with `{ vins: [...] }` (new endpoint)
- Shows progress in progress panel
- Reloads listings on completion, clears selection

### Backend

**`src/db.ts`** — Add two functions:
- `clearEnrichmentCache(vins: string[])`: deletes rows from `enrichment_cache` for given VINs
- `getListingsByVins(vins: string[])`: returns listing data for given VINs (vin, price, mileage, interiorColor, dealerName, dealerLocation)

**`src/scraper/enrich.ts`** — Refactor + new export:
- Extract per-VIN enrichment loop body into `enrichSingleVin(candidate, dealerDomainCache, log)` helper
- Both `runEnrichment()` and new `runEnrichmentForVins()` call this helper
- `runEnrichmentForVins(vins, onProgress)`: clears cache for those VINs, looks up their listing data, enriches each one

**`src/server.ts`** — Add `POST /api/enrich-vins`:
- Accepts `{ vins: string[] }`
- Validates non-empty array
- Checks `refreshInProgress`, runs synchronously (targeted enrichment is fast)
- Calls `runEnrichmentForVins(vins, logProgress)`
- Returns `{ success, enriched, searched, candidates }`

## Files to Modify

| File | Changes |
|------|---------|
| `src/db.ts` | Add `getEnrichmentMap()`, `clearEnrichmentCache()`, `getListingsByVins()` |
| `src/server.ts` | Modify `/api/listings` to include enrichment data; add `POST /api/enrich-vins` |
| `src/scraper/enrich.ts` | Extract `enrichSingleVin()` helper; add `runEnrichmentForVins()` export |
| `public/index.html` | CSS for enriched cells; AG Grid tooltips + cellClassRules on 4 columns; localStorage save/restore; row selection + 2 action buttons; load sequence refactor |

## Verification
1. Restart server, load dashboard — filter/sort state should persist across refresh
2. Run enrichment via existing `POST /api/enrich` — enriched cells should show blue border with tooltip
3. Select rows, click "Re-scrape" — should trigger refresh for matching sources
4. Select rows, click "Re-enrich" — should clear cache, re-enrich, show updated indicators
5. Manual edit on an enriched field — should show yellow override border, NOT blue enriched border
