# Used Car Listing Site Scraping: Technical Feasibility Research

**Date**: 2026-02-15
**Sources consulted**: 40+ across Brave, Exa, Tavily search engines
**Confidence scale**: HIGH (3+ independent sources), MEDIUM (2 sources), LOW (1 source or inferred)

---

## 1. SITE-BY-SITE ANALYSIS

---

### 1.1 CarGurus (cargurus.com)

#### Public API
- **No official public API exists for consumers or developers.** [HIGH confidence]
- CarGurus has a Partner Metrics API for dealerships only (tracks analytics on dealer websites). It is not a listings API.
  - Source: https://www.cargurus.com/Cars/webhosts/docs/PartnerMetrics.html
- Third-party scraping APIs exist via **Carapis** (`api.carapis.com/v1/parsers/cargurus`), **ScrapingBee**, **Rebrowser**, and **Apify** actors -- these are all reverse-engineered/scraped, not official.
  - Source: https://carapis.com/parsers/cargurus.com/intro
  - Source: https://www.scrapingbee.com/scrapers/cargurus-api/

#### Page Structure
- **Uses Remix (React-based SSR framework).** CarGurus migrated from a legacy monolith to Remix for their front-end. [HIGH confidence]
  - Source: https://www.infoq.com/presentations/cargurus-front-end/ (InfoQ talk by Alex Shopov, CarGurus principal engineer)
  - Source: https://www.cargurus.dev/remix-data-loading-patterns/ (CarGurus engineering blog)
- Pages are **server-side rendered initially**, then hydrated client-side. This means initial HTML contains listing data, but dynamic content loads via JavaScript after hydration.
- Backend uses **MongoDB Atlas** for data storage, Java/Kotlin microservices.
  - Source: https://www.mongodb.com/solutions/customer-case-studies/cargurus

#### VIN Exposure
- **VINs are available** in listing detail pages and through scraping APIs. [HIGH confidence]
  - Rebrowser sample schema shows `vin` as a data point: https://rebrowser.net/products/web-scraper-api/carguruscom
  - GitHub project confirms scraping VIN from CarGurus: https://github.com/murads994/WebScraping-Database-Design-CarGurus
- VINs appear in the vehicle detail page, not necessarily in search result lists. A two-step scrape (search results -> detail page) is likely needed.

#### Anti-Scraping Measures
- **Moderate to heavy protection.** [HIGH confidence]
- Uses bot detection and blocking mechanisms (IP tracking, CAPTCHA challenges).
  - Source: https://www.scrapingbee.com/scrapers/cargurus-api/ ("blocking mechanisms, bot detection, and frequent structural changes")
  - Source: https://rebrowser.net/products/web-scraper-api/cargurus ("handle even the most protected websites like CarGurus")
- Does NOT appear to use Cloudflare specifically, but has custom bot detection.
  - Source: https://carapis.com/blog/web-scraping-anti-detection-architecture (mentions "CloudFlare, PerimeterX, DataDome, and custom ML-based solutions" across automotive sites generally)
- Heavy JavaScript rendering makes simple HTTP requests insufficient -- a headless browser is typically required.

#### Tesla Model X URL Filter
- **Yes, Tesla Model X can be filtered via URL parameters.** [HIGH confidence]
- URL pattern: `https://www.cargurus.com/Cars/l-Used-Tesla-Model-X-d2132`
  - `d2132` is CarGurus' internal entity ID for Tesla Model X
  - Year-specific: `https://www.cargurus.com/Cars/l-Used-2023-Tesla-Model-X-c32596`
  - Location-specific: `https://www.cargurus.com/Cars/l-Used-Tesla-Model-X-Los-Angeles-d2132_L2163`
  - Trim-specific: `https://www.cargurus.com/Cars/l-Used-2023-Tesla-Model-X-AWD-t105083`
- Directly observed in search results.

#### Interior Color & Seating Configuration
- **Exterior color is shown in listings. Interior color availability varies.** [MEDIUM confidence]
- Rebrowser data schema includes `exterior_color` but does not list `interior_color` or seating configuration in their sample response.
- CarGurus listing detail pages may show interior details in the vehicle description/seller comments, but it is not a structured, reliably parseable field.
- **Seating configuration (5/6/7 seat) is NOT a standard structured field on CarGurus.** [MEDIUM confidence]

---

### 1.2 Cars.com

#### Public API
- **No official public API for general developer use.** [HIGH confidence]
- Cars.com does have a REST API under the hood for its own front-end, which returns JSON data.
  - Source: Reddit r/webscraping: "It's behind a REST API GET request" (https://www.reddit.com/r/webscraping/comments/1mya0y7/)
- Third-party scraping options: Apify actors (Cars Com Scraper at $50/1000 results), ScrapingBee, Carapis parser.
  - Source: https://apify.com/jgleesti/cars-com-scraper
  - Source: https://docs.carapis.com/parsers/cars.com/intro

#### Page Structure
- **This is a gold mine for scraping.** Cars.com embeds rich JSON data directly in the HTML page source. [HIGH confidence]
- Individual listing pages contain inline JSON with structured fields including:
  - `listing_id`, `vin`, `trim`, `make`, `model`, `year`, `price`, `mileage`
  - `exterior_color`, `interior_color`, `fuel_type`, `drivetrain`
  - `dealer_name`, `dealer_zip`, `seller_type`, `bodystyle`
  - `certified_preowned`, `badges` (deal ratings like "great_deal", "fair_deal")
  - Even battery health badges for EVs
- **Directly observed** in Brave search result snippets showing raw JSON from Cars.com pages. This is structured data embedded in the page HTML (likely in a `<script>` tag or data attribute).
- Search results pages also serve HTML with embedded data, though detail pages have richer data.

#### VIN Exposure
- **VINs are exposed in both search results AND detail pages.** [HIGH confidence]
  - Observed in inline JSON: `"vin":"7SAXCDE5XPF372445"` directly in page source
  - Reddit confirms: "The VIN is also separated on the individual vehicles page, so you would need to make a 2 request per car script to get the full data" -- though VIN may also appear in search results.
  - Source: Reddit r/webscraping discussion

#### Anti-Scraping Measures
- **Moderate protection.** [MEDIUM confidence]
- Returns 403 errors for suspicious requests. Dynamic content loading.
  - Source: Reddit: "I'm hitting roadblocks like 403s or dynamic content"
- ScrapingHero tutorial uses simple Python `requests` + `BeautifulSoup` successfully, suggesting the SSR content is accessible without a headless browser for basic scraping.
  - Source: https://scrapehero.com/scrape-car-data-from-cars-com
- For scale scraping, proxy rotation and rate limiting are necessary.

#### Tesla Model X URL Filter
- **Yes.** [HIGH confidence]
- URL pattern: `https://www.cars.com/shopping/tesla-model_x/`
  - Year-specific: `https://www.cars.com/shopping/tesla-model_x-2023/`
  - With price filter: `https://www.cars.com/shopping/tesla-model_x/price-under-202211/`
  - Body style filter: `https://www.cars.com/shopping/tesla-model_x/suv/`
- Clean, predictable URL structure.

#### Interior Color & Seating Configuration
- **Interior color IS a structured field in the JSON data.** [HIGH confidence]
  - Observed: `"interior_color":"Black"`, `"interior_color":"Cream"`, `"interior_color":"Black w/ Carbon Fiber"`, `"interior_color":"Ultra White"`
- **Seating count appears in specs pages** (e.g., "6 seats" for Tesla Model X) but may not be in every listing's JSON. [MEDIUM confidence]
  - Source: https://www.cars.com/research/tesla-model_x-2023/specs/ shows "6 seats"
- Cars.com specs pages list seating features like "Third Row Seating", "Memory Seat", "Leather Seats".

---

### 1.3 AutoTrader (autotrader.com)

#### Public API
- **AutoTrader US (autotrader.com) does NOT have a public API for listing consumption.** [HIGH confidence]
- AutoTrader has a bulk upload/file feed process for dealers to POST listings, not for consumers to GET them.
  - Source: https://stackoverflow.com/questions/3556576/does-autotrader-com-vehicle-marketplace-offer-an-api-for-posting-vehicles
- **AutoTrader UK (autotrader.co.uk) DOES have a developer API** called "AutoTrader Connect" with stock data, valuations, and retail metrics -- but this is for UK dealers/partners only.
  - Source: https://www.autotrader.co.uk/partners/retailer/platform/autotrader-connect
  - A third-party wrapper exists: https://www.oneautoapi.com/solution/autotrader-api/
- Third-party scraping: Apify (Autotrader Data Extractor, $15/mo + usage, 501 total users), ScrapingBee, Carapis parser.
  - Source: https://apify.com/epctex/autotrader-scraper

#### Page Structure
- **Heavy JavaScript rendering.** AutoTrader uses React/Next.js for its front-end. [MEDIUM confidence]
- HAR file technique (recording browser network requests) reveals internal JSON API endpoints that return structured listing data.
  - Source: https://stevesie.com/apps/autotrader-api ("Please note you'll only get back the basic data that appears on the search results page")
- The internal API returns make, model, year, price data but detailed specs require visiting individual listing pages.
- BeautifulSoup-based scrapers exist on GitHub and reportedly work.
  - Source: https://github.com/Muneeb1030/Autotrader_Web_Scapper (Python + BeautifulSoup)
  - Source: https://github.com/kurt213/scraper-auto-trader (Python + Scrapy)

#### VIN Exposure
- **VINs are available on individual listing detail pages.** [MEDIUM confidence]
- Not typically returned in search result summary data.
- Apify actors extract "descriptions, images, prices, mileage, addresses, names, engine information, transmission, contact details" -- VIN is not explicitly listed but may be in detail pages.

#### Anti-Scraping Measures
- **Moderate to heavy protection.** [MEDIUM confidence]
- ScrapingBee advertises "Bypass bot blocks by loading the page in a real browser environment" specifically for AutoTrader.
- Headless browser rendering likely required for JavaScript content.
- Rate limiting and IP blocking are reported.

#### Tesla Model X URL Filter
- **Yes.** [HIGH confidence]
- URL pattern: `https://www.autotrader.com/cars-for-sale/used-cars/tesla/model-x`
  - Parameters can be added: year, price range, mileage, location (zip code + radius)
  - Example: `https://www.autotrader.com/cars-for-sale/tesla/model-x/springfield-va-22150?requestId=...&makeCodeList=TESLA&modelCodeList=TESMODX`
- Uses query parameters: `makeCodeList=TESLA`, `modelCodeList=TESMODX`

#### Interior Color & Seating Configuration
- **AutoTrader shows interior color on detail pages.** [MEDIUM confidence]
- Individual listings show "Interior Color" as a spec field.
- Seating configuration may appear in features/options section but is not a primary filter or structured field in search results.

---

### 1.4 Other Notable Sites

#### AutoTempest (autotempest.com) -- META-AGGREGATOR
- **Aggregates from 10+ sites**: Cars.com, CarGurus, AutoTrader, eBay Motors, CarMax, Carvana, TrueCar, Edmunds, CarsDirect, Hemmings, Craigslist, and more.
  - Source: https://www.autotempest.com/how-autotempest-works
- Supports filtering by fuel type, interior color, and location.
- Does NOT have a public API. Scraping AutoTempest would be a meta-scraping approach.
- An Apify actor exists for AutoTempest: https://apify.com/ecomscrape/autotempest-cars-search-scraper
- **Recommendation**: AutoTempest is a potentially valuable scraping target as a single entry point to multiple sources, but it links out to original sites for details. [MEDIUM confidence for scraping feasibility]

#### Edmunds (edmunds.com)
- **Has a developer API** with vehicle specs, pricing (TMV), photos, dealer data.
  - Source: https://developer.edmunds.com/api-documentation/overview/
  - Covers data back to 1990 model year.
  - Datasets: Vehicle Specs, Vehicle Pricing, Vehicle Service, Vehicle Content, Vehicle Media, Dealership Content.
- **Requires registration for API key.** API access may be limited or deprecated for new signups (historically free tier existed).

#### TrueCar / CarMax / Carvana
- Covered by the Apify "Automobile Scraper" multi-source actor (5 marketplaces: Cars.com, Autotrader, Edmunds, TrueCar, CarMax).
  - Source: https://apify.com/alizarin_refrigerator-owner/automobile-scraper
- CarMax has a well-structured site that has been scraped (Apify actor exists).
- Carvana also has structured listing data.

---

## 2. AGGREGATOR APIs & DATA PROVIDERS

### 2.1 MarketCheck API (RECOMMENDED)
- **The most comprehensive legitimate automotive data API available.** [HIGH confidence]
- **Coverage**: 5+ billion vehicle listings, 45,000+ dealers in US, 8,200+ in Canada, 10,000+ in UK
- **Data updated daily** with new, used, certified, private seller, and auction listings
- **Key endpoints**:
  - Inventory Search API: $0.002/call
  - VIN History API: $0.006/call
  - Dealer API: $0.0025/call
  - Basic VIN Decoder: $0.0015/call
  - Enhanced VIN Decoder (NeoVIN): $0.08/call
  - MarketCheck Price prediction: $0.07-0.13/call
  - Cached Images API: $0.001/call
- **Search filters**: 100+ parameters including VIN, make, model, year, price, mileage, and many more
- **Python SDK available**: https://github.com/MarketcheckCarsInc/marketcheck_api_sdk_python
- **Documentation**: https://docs.marketcheck.com/docs
- **API Base URL**: `https://api.marketcheck.com/v2/`
  - Sources: https://docs.marketcheck.com/docs/get-started/api/introduction, https://www.marketcheck.com/apis/pricing/

### 2.2 VinAudit
- Aggregates millions of vehicle market value and listing records monthly from 70,000+ dealerships. [HIGH confidence]
- **APIs available**:
  - Vehicle Market Value API: estimates based on aggregated listing data
  - Car Listing API: real-time listing data
  - Vehicle History/Specs APIs
- 40 billion vehicle records from thousands of sources.
- Offers bulk data feeds in addition to APIs.
  - Source: https://www.vinaudit.com/vehicle-market-value-api, https://www.vinaudit.com/car-listing-api

### 2.3 Carapis
- Third-party parsing service for multiple automotive sites including CarGurus, Cars.com, AutoTrader. [MEDIUM confidence]
- Provides unified API that wraps scraping of individual sites.
- Claims 99.9% success rate with anti-detection technology.
- Covers 25+ markets globally.
  - Source: https://carapis.com/parsers/cargurus.com/intro

### 2.4 CarsXE
- Vehicle data API with VIN decoding, specifications, license plate decoding, images, history, and market value.
  - Source: https://publicapis.dev/category/vehicle

### 2.5 Carketa
- Automotive data APIs: VIN Decode, Dealer Inventory, Appraisals/Pricing.
- 2B+ VIN lookups/year, 60,000+ dealer rooftops.
  - Source: https://carketa.com/api/

### 2.6 NHTSA (Free Government API)
- Free vehicle information API from the National Highway Traffic Safety Administration.
- VIN decoding, recalls, complaints, and more.
- No authentication required.
  - Source: https://publicapis.dev/category/vehicle

---

## 3. EXISTING SCRAPING TOOLS & LIBRARIES

### Python Libraries / GitHub Projects
| Tool | Target | Method | Link |
|------|--------|--------|------|
| binDebug3/Casper | AutoTrader, CarGurus, Carvana, CarsDirect | Selenium | https://github.com/binDebug3/Casper |
| kurt213/scraper-auto-trader | AutoTrader (UK) | Scrapy | https://github.com/kurt213/scraper-auto-trader |
| Muneeb1030/Autotrader_Web_Scapper | AutoTrader | BeautifulSoup | https://github.com/Muneeb1030/Autotrader_Web_Scapper |
| mboles01/Cars | AutoTrader | Requests + Pandas | https://github.com/mboles01/Cars |
| murads994/WebScraping-Database-Design-CarGurus | CarGurus | Web scraping to MongoDB | https://github.com/murads994/WebScraping-Database-Design-CarGurus |
| ScrapeHero tutorial | Cars.com | Requests + BeautifulSoup | https://scrapehero.com/scrape-car-data-from-cars-com |
| AdrielC/autotradeR | AutoTrader | R (rvest + Selenium) | https://github.com/AdrielC/autotradeR |
| GitHub Gist | CarGurus | BeautifulSoup | https://gist.github.com/357ea1ecb86455a0618655fafff34c3f |

### Apify Actors (Cloud-based, pay-per-result)
| Actor | Target | Price | Users | Link |
|-------|--------|-------|-------|------|
| lexis-solutions/cargurus-com | CarGurus | $29/mo + usage | 77 | https://apify.com/lexis-solutions/cargurus-com |
| jgleesti/cars-com-scraper | Cars.com | $50/1000 results | 39 | https://apify.com/jgleesti/cars-com-scraper |
| voyn/cars-scraper | Cars.com | Per-result | 75 | (Apify store) |
| epctex/autotrader-scraper | AutoTrader | $15/mo + usage | 501 | https://apify.com/epctex/autotrader-scraper |
| automobile-scraper | Cars.com, AutoTrader, Edmunds, TrueCar, CarMax | $0.01/1000 results | 15 | https://apify.com/alizarin_refrigerator-owner/automobile-scraper |
| fortuitous_pirate/cargurus-scraper | CarGurus | $2/1000 results | 4 | https://apify.com/fortuitous_pirate/cargurus-scraper |

### Scraping-as-a-Service
- **ScrapingBee**: Dedicated CarGurus and AutoTrader scraper APIs with proxy rotation and CAPTCHA handling.
- **Bright Data**: CarGurus datasets, managed data collection.
- **Rebrowser**: CarGurus scraper API with full browser rendering.
- **Grepsr**: Managed CarGurus scraping service.

### No dedicated npm packages found
- No standalone npm packages specifically for CarGurus/Cars.com/AutoTrader scraping. [HIGH confidence]
- The Apify ecosystem uses Node.js actors that can be called via `apify-client` npm package.
- General scraping tools (Puppeteer, Playwright, Cheerio) are used with custom code.

---

## 4. LEGAL CONSIDERATIONS

### CFAA Precedent (hiQ v. LinkedIn)
- **Scraping publicly available data does NOT violate the Computer Fraud and Abuse Act (CFAA).** [HIGH confidence]
  - The Ninth Circuit held in hiQ Labs v. LinkedIn (2022) that accessing publicly available data with automated tools does not constitute "unauthorized access" under the CFAA.
  - The Supreme Court's Van Buren v. United States (2021) narrowed CFAA scope: "exceeds authorized access" applies only to accessing data behind an authorization gate.
  - Sources: https://blog.apify.com/hiq-v-linkedin/, https://iswebscrapinglegal.com/blog/web-scraping-case-law/

### BUT: Terms of Service Violations
- **While not criminal under CFAA, scraping CAN violate contractual terms (ToS).** [HIGH confidence]
  - hiQ was ultimately found liable for breaching LinkedIn's Terms of Service under contract law, resulting in $500,000 in damages.
  - Source: https://www.zwillgen.com/alternative-data/hiq-v-linkedin-wrapped-up-web-scraping-lessons-learned/
- Each car site has ToS that typically prohibit automated scraping:
  - CarGurus, Cars.com, and AutoTrader all include provisions against automated data collection in their ToS.
  - Violation can result in account termination, IP blocking, and potential civil liability for breach of contract.

### Practical Risk Assessment
- **Low risk for personal/small-scale research use** (finding a car to buy). [MEDIUM confidence]
- **Higher risk for commercial use** (building a competing product, reselling data).
- **Using a legitimate aggregator API** (MarketCheck, VinAudit) eliminates legal risk entirely since they handle data licensing.

### Other Legal Considerations
- **Copyright**: Listing descriptions and photos may be copyrighted. Factual data (price, mileage, VIN) is generally not copyrightable.
- **GDPR/CCPA**: Dealer contact info and location data may have privacy implications.
- **Robots.txt**: Should be respected as a best practice.
  - Source: https://www.quinnemanuel.com/the-firm/publications/the-legal-landscape-of-web-scraping/

---

## 5. RECOMMENDATIONS

### For Personal Tesla Model X Search (Best Approach)

**Option A: MarketCheck API (BEST)** -- $0.002/call for inventory search
- Legitimate, legal, comprehensive data
- Covers all dealer inventory in US/Canada
- VIN, specs, pricing, dealer info all included
- Python SDK available
- Filter by make=Tesla, model=Model X easily
- Cost: ~$2 for 1,000 listings searched

**Option B: Scrape Cars.com (Most Data-Rich for DIY)**
- Best page structure for scraping (embedded JSON with VIN, interior color, pricing)
- Python + BeautifulSoup likely sufficient (SSR pages)
- URL filtering for Tesla Model X is clean and predictable
- Interior color is a structured field in the data
- Moderate anti-scraping, manageable with proxies

**Option C: Multi-site via AutoTempest**
- Single search across all major sites
- Good for finding listings, but links out for details
- An Apify actor exists for automated scraping

### For Interior Color + Seating Data
- **Cars.com** is the best source -- interior_color is a structured JSON field
- **MarketCheck API** with NeoVIN decoder can provide seating configuration from VIN decoding
- **NHTSA VIN decoder** (free) can provide some build data including seating configuration
- Seating configuration (5/6/7 seats) is NOT reliably available as a filter on any listing site -- you would need to:
  1. Get VIN from listing
  2. Decode VIN via NHTSA or MarketCheck NeoVIN to get seat count
  3. Cross-reference

### Architecture Recommendation
1. Use **MarketCheck Inventory Search API** to find Tesla Model X listings (gets VIN, price, mileage, dealer, exterior/interior color)
2. Use **MarketCheck Basic VIN Decoder** or **NHTSA free API** on each VIN to get seating configuration and detailed build specs
3. Supplement with **Cars.com scraping** for additional data points (deal ratings, battery health badges for EVs)
4. Total cost estimate: ~$5-20 for a comprehensive nationwide search

---

## 6. SUMMARY TABLE

| Feature | CarGurus | Cars.com | AutoTrader | MarketCheck API |
|---------|----------|----------|------------|-----------------|
| Public API | No | No | No (US) | Yes |
| Page Rendering | SSR (Remix) | SSR + embedded JSON | Heavy JS (React) | N/A (REST API) |
| VIN Exposed | Detail pages | Search + Detail JSON | Detail pages | Yes (all listings) |
| Anti-Scraping | Heavy (custom bot detection) | Moderate (403s, rate limits) | Moderate-Heavy | N/A (legitimate) |
| Tesla Model X URL Filter | Yes (`d2132`) | Yes (`tesla-model_x`) | Yes (`TESMODX`) | Yes (make/model params) |
| Interior Color | Limited/unstructured | Yes (structured JSON field) | Detail pages only | Yes (via VIN decode) |
| Seating Config | No | Specs pages only | No | Yes (via VIN decode) |
| Scraping Difficulty | Hard | Easy-Medium | Medium-Hard | N/A |
| Legal Risk | Medium | Medium | Medium | None |

---

## 7. CONTRADICTIONS & GAPS

### Contradictions
- One Reddit source says Cars.com VIN is "in the search results list" while another says it requires visiting individual pages. **Resolution**: From direct observation of page JSON, VIN IS in the inline JSON on both search and detail pages, but the structured REST API may separate them.

### Gaps Identified
- Exact anti-scraping technology used by each site (Cloudflare vs. custom vs. PerimeterX) could not be definitively confirmed per-site without direct testing.
- Whether Cars.com's embedded JSON is accessible via simple HTTP GET or requires JavaScript execution was not fully verified -- ScrapeHero tutorial suggests requests+BeautifulSoup works, implying SSR.
- MarketCheck API's exact coverage of Tesla Model X interior colors and seating configurations needs verification with a test API call.
- AutoTempest's internal API structure and scrapability need hands-on investigation.
- npm/Node.js ecosystem has very few dedicated automotive scraping packages -- this is a gap in the ecosystem (Python dominates).
