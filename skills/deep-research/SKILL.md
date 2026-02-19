---
name: deep-research
description: >
  Conduct deep multi-source research with citation tracking and verification.
  Triggers on: "deep research", "comprehensive analysis", "research report",
  "investigate", "saturated search", "deep dive".
  Do NOT use for simple lookups or single-source questions.
---

## Deep Research Protocol

Minimum requirement: **100 unique sources** per research task. This is non-negotiable. Track source count throughout all phases and continue searching until the minimum is met.

When invoked:

### Phase 1: Scope Definition
- Clarify the research question with the user
- Identify 5-8 key subtopics to investigate (more subtopics = more sources)
- Plan query distribution: aim for 15-20 unique sources per subtopic

### Phase 2: Parallel Discovery (Target: 60+ sources)
Launch 5+ parallel subagents, each searching a different angle:
- Agent 1: Brave web search (5+ keyword variations per subtopic)
- Agent 2: Brave news search (recent coverage, different queries than Agent 1)
- Agent 3: Exa semantic search (natural language queries per subtopic)
- Agent 4: Tavily structured search (fact-focused with domain filtering)
- Agent 5: Tavily research mode (comprehensive investigation per subtopic)
- Additional agents as needed to reach source targets

Deduplicate URLs across agents. Each unique domain/article counts as one source.

### Phase 3: Synthesis & Gap Analysis (Target: 80+ sources)
- Use Perplexity reasoning to analyze collected findings
- Identify contradictions, gaps, and areas needing deeper investigation
- Score source credibility (0-100) based on authority, recency, methodology
- If below 80 unique sources, launch additional search rounds targeting gaps

### Phase 4: Deep Extraction (Target: 100+ sources)
- Use Firecrawl to scrape top 15-20 most relevant URLs for full content
- Use Context7 for any library/API documentation claims
- Use paper-search for academic sources if the topic warrants it
- Use YouTube transcript for relevant video content
- Use Wayback Machine for historical context if needed
- Each extracted source counts toward the 100 minimum

### Phase 5: Verification
- Cross-reference every major claim against 2+ independent sources
- Flag unverifiable claims explicitly
- Note where sources disagree and assess which is more authoritative

### Phase 6: Report Generation
Produce structured report with:
- Executive summary (3-5 sentences)
- Total unique source count (MUST be >= 100)
- Detailed findings organized by subtopic
- Citations with URLs inline throughout the report
- Confidence scores per major claim (high/medium/low)
- Identified gaps and suggested follow-up research
- Complete source list at the end with numbered URLs
- Save to reports/{topic}-{YYYY-MM-DD}.md

### Source Counting Rules
- Each unique URL = 1 source
- Multiple pages from the same domain count separately if they are distinct articles
- Search engine result pages do NOT count as sources
- Only pages whose content was actually read/analyzed count
- If final count < 100, go back to Phase 2 and search more
