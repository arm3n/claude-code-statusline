# Used Car Listings Dashboard: Tech Stack Research & Recommendation

## Research Summary

Researched across Brave Search, Exa, and Tavily covering: lightweight local dashboard frameworks, data grid/table libraries with filtering, Bun.serve capabilities, existing open-source car listing monitors, and scraping APIs/tools for used car sites.

---

## Recommendation: Bun.serve() + Static HTML/JS + AG Grid Community + JSON Data File

### Why This Stack Wins

This is the simplest, most maintainable option that meets all five requirements. It uses tools already installed on your system, requires zero framework overhead, and can be up and running in under an hour.

### Architecture (3 files + 1 data file)

```
car-dashboard/
  server.ts          # Bun.serve() - serves HTML + API endpoint for data
  public/
    index.html       # Single HTML page with AG Grid
    style.css        # Minimal styling (optional)
  data/
    listings.json    # Car listings data (updated by scraper)
  scraper/
    scrape.ts        # Bun script to fetch/scrape listings, writes to listings.json
```

### Component Breakdown

#### 1. Server: Bun.serve() (zero dependencies)

**Why Bun over Node.js/Express:**
- Already installed on your system
- `Bun.serve()` is a built-in HTTP server -- no Express, no Fastify, no npm install needed
- `Bun.file()` automatically sets correct Content-Type headers for static files
- Hot reload with `bun --hot server.ts` during development
- Bun 1.3 (Oct 2025) added built-in routing, HTML imports, and HMR -- mature and stable
- Serves static files 1.8x faster than nginx per Bun benchmarks
- Built-in SQLite if you later want to upgrade from JSON to a database

**Server code (~25 lines):**
```typescript
const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // API endpoint - serve fresh JSON data
    if (url.pathname === "/api/listings") {
      const file = Bun.file("./data/listings.json");
      return new Response(file, {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Static files
    const filePath = url.pathname === "/"
      ? "./public/index.html"
      : `./public${url.pathname}`;
    const file = Bun.file(filePath);
    if (await file.exists()) return new Response(file);

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Dashboard running at http://localhost:${server.port}`);
```

#### 2. Frontend: Vanilla HTML + AG Grid Community Edition (free, MIT license)

**Why AG Grid over alternatives:**
- **Free community edition** has everything needed: sorting, filtering, pagination, custom cell renderers (for images)
- Works with **vanilla JavaScript** -- no React, no Vue, no build step
- Built-in column filters (text, number, date, set filters) work out of the box
- Supports image rendering in cells via custom cellRenderer
- Handles 10,000+ rows without performance issues
- Most popular JS data grid (74k+ GitHub stars)
- CDN-loadable -- no npm install required on the frontend

**Alternatives considered:**
| Library | Verdict |
|---------|---------|
| AG Grid Community | **Winner** -- full filtering/sorting, images, free, works with vanilla JS |
| Grid.js | Simpler but lacks native image cell support, no set filters |
| Tabulator | Good alternative but smaller community, less documentation |
| Handsontable | Overkill (spreadsheet-focused), commercial license for most features |
| Custom HTML table | Too much work to implement filtering/sorting/pagination properly |

#### 3. Auto-Refresh: setInterval + fetch()

Simple client-side polling -- no WebSocket complexity needed:
```javascript
// Poll every 60 seconds for new data
setInterval(async () => {
  const res = await fetch("/api/listings");
  const data = await res.json();
  gridApi.setGridOption("rowData", data);
}, 60000);
```

This is simpler and more reliable than WebSockets for this use case. The data changes infrequently (when the scraper runs), so polling every 30-60 seconds is perfectly adequate.

#### 4. Scraper: Separate Bun script (runs on a schedule)

A standalone `scrape.ts` that:
- Fetches listings from target sites (see scraping section below)
- Normalizes data into a consistent JSON schema
- Writes to `data/listings.json`
- Can be run manually (`bun run scraper/scrape.ts`) or on a schedule via Windows Task Scheduler

---

## Why NOT the Other Options

### Node.js + Express + HTML/JS
- Requires `npm install express` + boilerplate setup
- Express adds unnecessary middleware abstraction for serving static files
- Bun.serve() does everything Express does here with zero dependencies
- **Verdict: Bun is strictly better for this use case since it is already installed**

### Python Flask/FastAPI + HTML
- Requires Python environment setup, pip install, virtual envs
- No advantage over Bun for serving JSON + static HTML
- Python scraping libraries (Beautiful Soup, Scrapy) ARE excellent, but Bun's built-in fetch + DOM parsing (via linkedom or cheerio) work fine too
- **Verdict: Adds complexity with no benefit given Bun is already available**

### Next.js or React Framework
- Massively over-engineered for a local data dashboard
- Requires build step, React, node_modules bloat
- Server-side rendering is pointless for a local single-user dashboard
- **Verdict: Rejected -- violates the "keep it minimal" requirement**

### Electron App
- Ships an entire Chromium browser (~150MB+)
- Complex packaging, updates, IPC between processes
- A browser tab pointed at localhost:3000 does the same thing
- **Verdict: Rejected -- maximum complexity for zero benefit**

### Static HTML + JSON file (no server)
- Possible using `file://` protocol, but:
  - CORS issues loading JSON via fetch from file://
  - No auto-refresh mechanism without a server
  - Cannot serve images from external URLs reliably
- **Verdict: Close to optimal but the lack of a server creates unnecessary friction. Adding Bun.serve() (15 lines) solves all these problems.**

---

## Existing Open-Source Car Listing Projects

### Projects Found (sorted by relevance)

| Project | What It Does | Status | Useful? |
|---------|-------------|--------|---------|
| [style77/dealscan](https://github.com/style77/dealscan) | Car deals aggregator, analyser and notifier | **Archived Nov 2024** | Concepts only |
| [gudimz/polovni-auto-alert](https://github.com/gudimz/polovni-auto-alert) | Alerts on new car listings (Serbian market) | Active (Go-based) | Architecture reference |
| [caelinsutch/marketplace-watcher](https://github.com/caelinsutch/marketplace-watcher) | Facebook Marketplace alerts with Supabase | Active | Good architecture model but overkill (Supabase, Turbo) |
| [binDebug3/Casper](https://github.com/binDebug3/Casper) | Scrapes AutoTrader, CarGurus, CarsDirect + scores deals | Active (Python/Selenium) | **Best scraper reference** |
| [lorenzilipe/Cars_Web_Scraping](https://github.com/lorenzilipe/Cars_Web_Scraping) | Daily Cars.com scraping with price tracking | Active (Python) | Good for price history concept |
| [buddylindsey/vehicle-listing-scraper](https://github.com/buddylindsey/vehicle-listing-scraper) | AutoTrader scraper (Python) | Stale | Scraper patterns useful |
| [SiddarthaKoppaka/car_deals_search_mcp](https://github.com/SiddarthaKoppaka/car_deals_search_mcp) | MCP server for car deal search | New (Dec 2025) | Interesting but different purpose |

### Commercial Alternatives
- **Swoopa** (getswoopa.com): Paid service ($7-30/mo) for marketplace alerts across FB Marketplace, Craigslist, OfferUp. 7-day free trial.
- **Market Alerts** (marketalerts.app): Paid multi-platform monitoring for dealers.
- **Piloterr / ScrapingBee**: Paid APIs for AutoTrader scraping.

### Verdict on Existing Projects
**None are directly usable as-is.** They are either:
- Archived/stale
- Built for non-US markets
- Python/Selenium-based (heavy, slow)
- Over-engineered with Docker/Supabase/etc.

However, the **scraping patterns from Casper and Cars_Web_Scraping are valuable references** for building the scraper component. The dashboard itself should be built fresh -- it is simple enough that adapting someone else's code would take longer than writing it.

---

## Scraping Feasibility Assessment

### Sites and Their Scrapability

| Site | API Available? | Scraping Difficulty | Notes |
|------|---------------|-------------------|-------|
| **Facebook Marketplace** | No public API | **Hard** -- requires auth, aggressive bot detection | Use Swoopa or similar service instead |
| **Craigslist** | No API | **Medium** -- simple HTML but rate-limited | RSS feeds still work for some regions |
| **Cars.com** | No public API | **Medium** -- structured HTML, pagination | Changes layout periodically |
| **AutoTrader** | No public API | **Hard** -- heavy JS rendering, bot detection, user-agent filtering | Consider paid scraping APIs |
| **CarGurus** | No public API | **Medium** -- JSON embedded in page source | Data available in script tags |
| **Facebook Marketplace** | No public API | **Hard** -- login required, rotating detection | Avoid direct scraping |

### Recommended Scraping Strategy
1. **Start with Craigslist RSS** -- easiest, no scraping needed (just parse RSS/Atom feeds)
2. **Add Cars.com** -- straightforward HTML scraping with Bun's fetch + cheerio
3. **Consider paid APIs** (ScrapingBee, Piloterr) for AutoTrader if needed
4. **Skip Facebook Marketplace** direct scraping -- use Swoopa or manual monitoring

---

## Implementation Plan

### Phase 1: Core Dashboard (1-2 hours)
1. Create project directory structure
2. Write `server.ts` with Bun.serve() (~25 lines)
3. Create `index.html` with AG Grid Community loaded from CDN
4. Create sample `listings.json` with test data
5. Implement filtering (make, model, year, price range, mileage)
6. Implement sorting on all columns
7. Add image thumbnail column with custom cellRenderer
8. Add auto-refresh polling (setInterval)

### Phase 2: Scraper (2-3 hours)
1. Write `scrape.ts` targeting Craigslist RSS feeds first
2. Add Cars.com HTML scraping with cheerio
3. Normalize data to a common schema:
   ```json
   {
     "id": "unique-id",
     "source": "craigslist",
     "title": "2019 Honda Civic EX",
     "make": "Honda",
     "model": "Civic",
     "year": 2019,
     "price": 18500,
     "mileage": 45000,
     "location": "Los Angeles, CA",
     "imageUrl": "https://...",
     "listingUrl": "https://...",
     "datePosted": "2026-02-14",
     "dateScraped": "2026-02-15"
   }
   ```
4. Set up Windows Task Scheduler to run scraper every 30 min

### Phase 3: Enhancements (optional, as needed)
- Add price history tracking (append to a history JSON/SQLite)
- Add "new listing" badge for items scraped in last hour
- Add desktop notifications for listings matching saved searches
- Upgrade from JSON to Bun's built-in SQLite for better querying

---

## Confidence Levels

| Finding | Confidence | Basis |
|---------|-----------|-------|
| Bun.serve() is the best server choice for this use case | **High** | Already installed, zero deps, mature (v1.3+), confirmed by docs and benchmarks |
| AG Grid Community is the best table/grid library | **High** | MIT license, vanilla JS support, 74k+ stars, filtering/sorting/images built-in, confirmed across multiple review sites |
| No existing OSS project is directly reusable | **High** | Surveyed 15+ GitHub projects; all are stale, wrong market, or wrong architecture |
| Craigslist RSS is the easiest starting point for scraping | **Medium** | RSS feeds confirmed to still exist, but coverage varies by region |
| Cars.com is scrapable with moderate effort | **Medium** | Multiple projects confirm it works, but layout changes can break scrapers |
| AutoTrader requires paid API or Selenium | **High** | Multiple sources confirm aggressive bot detection, user-agent filtering |
| Facebook Marketplace should not be scraped directly | **High** | Requires auth, aggressive detection; commercial services (Swoopa) exist for this |

## Contradictions Between Sources
- Some GitHub projects claim easy AutoTrader scraping, but more recent sources (2025+) indicate increased bot detection. **Assessment: Bot detection has gotten stricter over time; older projects' approaches likely no longer work.**
- Bun's HTML imports feature has some open bugs around caching (GitHub issue #19198), but these only affect production mode (`development: false`). For a local dashboard, `development: true` (default) works fine.

## Gaps for Further Research
- Which specific Craigslist regions have active RSS feeds for cars (need to test)
- Whether Cars.com has tightened scraping protections recently (last confirmed working: mid-2025)
- CarGurus embedded JSON structure (promising but needs hands-on verification)
- Whether the user wants to target specific car makes/models or broad monitoring

---

## Final Answer: Start Here

```
bun init car-dashboard
```

Then create three files:
1. **server.ts** -- Bun.serve() with one API route and static file serving
2. **public/index.html** -- AG Grid Community (loaded from CDN), fetch from /api/listings, setInterval for auto-refresh
3. **data/listings.json** -- sample data to start, later populated by scraper

Total dependencies: **zero** (AG Grid loaded from CDN, Bun is the server). Total files: **3 + 1 data file**. Time to first working dashboard: **under 1 hour**.
