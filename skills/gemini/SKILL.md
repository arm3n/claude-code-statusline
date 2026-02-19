---
name: gemini
description: >
  Delegate large-context analysis to Gemini via MCP, then continue implementation in Claude.
  Triggers on: "gemini", "analyze codebase", "large context", "spec first", "gemini review".
  Do NOT use for tasks where Claude's context window is sufficient (<100K tokens).
---

## Gemini Delegation Protocol

Core principle: **Gemini reads, Claude writes.** Use Gemini's 1M context for ingestion and analysis of large codebases/documents. Use Claude for reasoning, implementation, and debugging.

### When to Delegate to Gemini

- Analyzing a codebase or document set exceeding ~100K tokens
- Generating an architectural spec from a full project
- Cross-file dependency analysis or refactoring planning
- Reviewing all changes across a large PR or branch diff
- Processing large documents (PDFs, logs, transcripts) for extraction

### When to Keep in Claude

- Code implementation and debugging
- Precise reasoning on edge cases
- Tasks within Claude's context window (<100K tokens)
- Interactive development with the user

### Execution Steps

**Quick delegation** (single question about large context):
1. Use `mcp__gemini__gemini-query` with model `pro` for the analysis
2. Include the full context (file contents, codebase dump) in the prompt
3. Parse Gemini's response and continue working in Claude

**Spec-first workflow** (full codebase understanding):
1. Gather the relevant code using Read/Glob tools
2. Send the full content to `mcp__gemini__gemini-query` with a structured prompt asking for:
   - Architecture overview
   - Key patterns and conventions
   - File dependency graph
   - Entry points and data flow
3. Save Gemini's response as `spec.md` in the project root
4. Use the spec for Claude's implementation work

**Code review delegation**:
1. Gather the diff or changed files
2. Send to `mcp__gemini__gemini-analyze-code` with appropriate focus (quality, security, performance, bugs)
3. Synthesize Gemini's review with Claude's own analysis

**Context caching** (repeated queries on same codebase):
1. Use `mcp__gemini__gemini-create-cache` to cache the codebase content
2. Query the cache with `mcp__gemini__gemini-query-cache` for 90% input cost discount
3. Cache TTL defaults to 60 min; set longer for extended sessions

### Available Gemini MCP Tools

| Tool | Use For |
|------|---------|
| `gemini-query` | General queries (pro or flash model) |
| `gemini-analyze-code` | Code review with focus area (quality/security/performance/bugs) |
| `gemini-analyze-text` | Text analysis (sentiment/summary/entities/key-points) |
| `gemini-analyze-url` | Analyze web pages (up to 20 URLs) |
| `gemini-brainstorm` | Multi-round brainstorming with Claude's initial thoughts |
| `gemini-deep-research` | Async deep research (returns research ID, poll with check-research) |
| `gemini-create-cache` | Cache files for repeated queries at 90% discount |
| `gemini-count-tokens` | Check token count before sending large content |
| `gemini-summarize-pdf` | PDF summarization |
| `gemini-extract-tables` | Table extraction from documents |

### Prompt Template for Codebase Analysis

When sending a codebase to Gemini, structure the prompt as:

```
You are analyzing a codebase. Provide a structured analysis covering:

1. **Architecture**: High-level structure, patterns used, key abstractions
2. **Dependencies**: File dependency graph, external dependencies
3. **Data Flow**: How data moves through the system
4. **Entry Points**: Main entry points and their purposes
5. **Conventions**: Coding patterns, naming conventions, error handling approach
6. **Issues**: Potential bugs, security concerns, performance bottlenecks

Codebase:
[paste files here]
```

### Cost Awareness

- Gemini 3 Pro: $2/$12 per MTok (input/output) for <=200K, $4/$18 for >200K
- Context caching: $0.20/MTok (90% discount on input)
- Use `gemini-count-tokens` before large sends to estimate cost
- For simple tasks, use `flash` model instead of `pro` ($0.15/$0.60 per MTok)
