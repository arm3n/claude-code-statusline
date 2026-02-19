# Plan: Debug rescrape timeout + commit pending changes

## Context

User is seeing a rescrape timeout (599s, Edmunds VDP timing out after 120s). Need to verify server is running latest code and commit all pending changes.

## Steps

1. Restart server with latest code (all uncommitted changes from: possiblySold feature, zero-results detection, auto-enrich scraper logs)
2. Commit and push all pending changes
3. Investigate the Edmunds VDP timeout (120s timeout is by design in the nodriver subprocess — may need to be extended or the rescrape was just slow due to multiple VINs across multiple sources)
