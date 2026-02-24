---
name: handover
description: >
  Generate a structured handover document to preserve session context.
  Triggers on: "handover", "hand over", "handoff", "session summary",
  "wrap up session", "done for today", "save progress".
  Use at end of session or before /clear to capture everything for next session.
---

## Handover Protocol

Core principle: **write to disk, not conversation.** Every decision, failed approach, and piece of context that matters must exist as a file — not as conversation history that degrades with compaction.

### Execution Steps

**Auto-compact resilience**: The handover file is the critical artifact. Write it FIRST in a single tool call. Git state and MEMORY.md updates are secondary — if auto-compact interrupts after step 2, the handover is already safely on disk.

When invoked:

1. **Capture git state in parallel** (if in a git repo): Run `git status` and `git log --oneline -5`. These are fast and go in the same tool call batch.

1b. **Flush beads state** (if in a beads project — `.beads/` directory exists): Run `bd sync --flush-only` to export current issue state to JSONL. This is a no-op if not in a beads project.

2. **Write the handover file immediately** using the template below. Do this in a SINGLE Write tool call — do not split across multiple calls. Include git state from step 1 if available. Create `~/.claude/handovers/` if needed.

3. **Confirm** the file path and remind the user how to resume:
   ```
   Resume with: claude
   Then paste: "Read ~/.claude/handovers/{filename} and continue the work."
   ```

4. **Update persistent files** (AFTER the handover is saved): Review whether any decisions or patterns discovered this session should be added to CLAUDE.md or MEMORY.md. If so, update them now and note what was added.

**File naming**: `HANDOVER-{YYYY-MM-DD}-{short-topic}.md`
- `{short-topic}` is 2-4 words in kebab-case summarizing the main work (e.g., `auth-refactor`, `context-research`, `api-migration`)

### Document Template

```markdown
# Session Handover
> Generated: {YYYY-MM-DD HH:MM}
> Context utilization: {approximate % of context window used}
> Branch: {current git branch, or "not a git repo"}

## Objective
{The overarching goal — not just today's task but the broader intent. Include enough context for a fresh session to understand WHY this work matters.}

## Completed
- {Concrete accomplishment with `file:line` references}
- {Each item verifiable — specific files, functions, configs changed}

## Key Decisions
| Decision | Rationale | Rejected Alternatives |
|----------|-----------|----------------------|
| {What was decided} | {WHY — preserve the full reasoning, not just the conclusion} | {What was considered and why it lost} |

## Failed Approaches (CRITICAL)
{What was tried and did NOT work. Include: the approach, the error/outcome, and the root cause. This is the single most valuable section — it prevents the next session from wasting tokens retrying the same things.}

- **Approach**: {what was tried}
  **Result**: {what happened}
  **Root cause**: {why it failed}

{If nothing failed, write: "None this session."}

## Current State
- **Working**: {What is functional right now}
- **Broken/Incomplete**: {What needs fixing — include specific error messages}
- **Blocked**: {External dependencies, waiting on user input, etc.}
- **Uncommitted changes**: {List files with uncommitted modifications from git status}

## Beads State
{If in a beads project (`.beads/` exists), include:}
- **Open issues**: {count from `bd list --status=open`}
- **In-progress**: {list of issues currently claimed}
- **Ready work**: {output of `bd ready`}
{If not a beads project: "N/A — not a beads project"}

## Gemini Sessions
{If any Gemini caches were created or used this session, include:}
- **Display name**: {cache display name}
- **Source file**: {path to source file on disk for recreating the cache}
- **Contents summary**: {what's in the cache}
{If no Gemini caches: "None this session."}

## Critical Context
{Non-obvious things the next session MUST know:}
- {Environment quirks, workarounds in place}
- {Constraints discovered during work}
- {Gotchas not documented in CLAUDE.md}
- {Conditional logic: IF x THEN y, EXCEPT when z — preserve exact conditions}
- {Specific numbers, thresholds, or limits that matter}

## Files to Load Next Session
{Explicit manifest — the FIRST thing the next session should read:}
1. `{path}` — {why this file matters for continuing}
2. `{path}` — {why}

## Do NOT Re-Read
{Files already fully processed this session — reading them again wastes tokens:}
- `{path}` — {already analyzed/processed}

## Next Steps
1. {Specific, actionable task with enough detail to start immediately}
2. {Second priority}
3. {Third priority}

## Files Modified This Session
- `{path}` — {one-line description of change}

## Resume Prompt
> Read this handover file, then read the files listed in "Files to Load Next Session". {Additional specific instructions for the next session.}
```

### Rules

**Content quality — prevent the 5 compaction failure modes:**
- Preserve exact numbers, thresholds, and limits (don't round or approximate)
- Preserve conditional logic fully (IF/BUT/EXCEPT — don't simplify)
- Preserve decision rationale (the WHY, not just the WHAT)
- Preserve cross-file relationships (file A depends on file B because...)
- Mark open questions as OPEN — never silently resolve them as settled

**Sizing:**
- Target 100-150 lines. Max 200. This gets injected into the next session's context.
- No raw code blocks longer than 5 lines. Reference `file:line` instead.
- If the session produced a large artifact (research report, implementation plan), save it as a separate file and reference the path here.

**Specificity:**
- Write file paths, function names, error messages, URLs — not vague summaries.
- "Failed Approaches" is MANDATORY even if empty.
- For research sessions: include source URLs and confidence levels.

**Persistent knowledge:**
- Before writing the handover, check if any discoveries should be added to CLAUDE.md or MEMORY.md. Handover docs are for the NEXT session; CLAUDE.md is for ALL sessions.
- If you updated CLAUDE.md or MEMORY.md, note what was added in the handover.
