# Plan: Create Foreign Crossover List + Remove Indian Movies from Radarr

## Context
Creating a second MDBList to surface acclaimed foreign films (like Arco). During testing, the list included ~10 Indian/Bollywood films the user doesn't want. User also wants ALL existing Indian movies removed from Radarr entirely (which cascades to Plex deletion).

**Key findings from exploration:**
- RT data is incomplete on MDBList for foreign films (Arco has 93% RT on rottentomatoes.com but NO RT data on MDBList)
- Letterboxd is the best gatekeeper: Arco has 57K votes, 4.0/5.0 rating
- `q_language_x` field supports excluding multiple languages (confirmed working)
- `q_lettervotes_input` and `q_letterrating_input` fields exist and work
- Anime genre (`anime`) is separate from Animation — excluding anime keeps Arco and Flow

## Current State
- Tested filters: Letterboxd >= 3.8, votes >= 20K, exclude English, exclude anime = **43 items** (includes ~10 Indian)
- MDBList browser is on the filter page, ready to create list
- Radarr: 2,008 movies (some Indian movies from English list may exist too)

## Approach

### Step 1: Add Indian language exclusions to MDBList filter
On the current filter page, add these languages to `q_language_x` (exclude):
- `en` (English — already set)
- `hi` (Hindi)
- `ta` (Tamil)
- `te` (Telugu)
- `ml` (Malayalam)
- `kn` (Kannada)
- `mr` (Marathi)
- `pa` (Punjabi)
- `bn` (Bengali)

Run search to verify: expect ~33 items (43 minus ~10 Indian). Confirm Arco still present.

### Step 2: Create the MDBList list
- Set `q_trakt_list_name` = "Armen's Certified - Foreign Crossover"
- Click "Create + Trakt" button (value `trakt_add_list`)
- Note the new list ID and item count
- **Do NOT add to Radarr yet** — present list to user first

### Step 3: Remove ALL Indian-language movies from Radarr
- Fetch all movies: `GET /api/v3/movie`
- Filter where `originalLanguage.name` is any of: Hindi, Tamil, Telugu, Malayalam, Kannada, Marathi, Punjabi, Bengali
- Present count and titles to user for confirmation
- Bulk delete: `DELETE /api/v3/movie/editor` with `deleteFiles: false, addImportExclusion: false`
  - `deleteFiles: false` — files stay on NAS disk; Plex auto-removes on next scan
  - `addImportExclusion: false` — movies CAN be re-added later via Ombi requests
  - Safe because: English list has `q_language=en` (won't re-add Indian), foreign crossover list excludes Indian languages — so no auto re-import, but manual Ombi requests still work

### Step 4: Also exclude Indian languages from the English list
- Navigate to existing list edit: `/movies/?trakt_list_edit=34559`
- The English list has `q_language=en` so Indian films shouldn't be there
- But verify: if any Indian movies were imported via the English list, they'd already be caught by Step 3's Radarr cleanup

### Step 5: Clean SABnzbd queue
- Match deleted Radarr movie titles against SABnzbd queue
- Remove any matches

## Final Filter Config (Foreign Crossover List)
- **From**: 2024-01-01
- **Letterboxd rating**: >= 3.8 (out of 5.0)
- **Letterboxd votes**: >= 20,000
- **IMDb votes**: >= 500
- **Language exclude**: English + all Indian languages (hi, ta, te, ml, kn, mr, pa, bn)
- **Genre exclude**: documentary, holiday, home-and-garden, music, news, reality, reality-tv, short, soap, special-interest, sporting-event, talk-show, **anime**
- **Region**: US
- **Expected items**: ~33

## Key Details
- Radarr API: `https://armen.ddns.net:5050/api/v3/movie`, key: `aaadefc33c214be38099d660ce8cd8fb`
- SABnzbd API: `https://armen.ddns.net:8322/api`, key: `08ab63fe80a547cabfe983c853b8c47d`
- MDBList language exclude field: `q_language_x` (multi-select, ISO 639-1 codes)
- Radarr originalLanguage field: `originalLanguage.name` (e.g., "Hindi", "Tamil", "Malayalam")
- Radarr delete with `deleteFiles: false` — files remain on NAS, Plex removes on next scan

## Verification
- Foreign Crossover list: ~33 items, no Indian films, Arco present
- Radarr: zero Indian-language movies remain
- SABnzbd: no Indian movie downloads in queue
- English list (ID 34559): unchanged, still ~417 items
