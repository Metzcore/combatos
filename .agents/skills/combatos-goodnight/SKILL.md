---
name: combatos-goodnight
description: Close a Combat OS dev session cleanly. Updates STATUS.md, docs/handoff.md (Pending section), and docs/decision_log.md, then outputs a paste-ready sunshine prompt for the next session. Use whenever the user says "goodnight", "close session", "wrap up", "done for today", or wants to capture what was done and prepare context for next time.
---

# Combat OS — Goodnight (Session Close)

Ends a session cleanly so the next `sunshine` starts from certainty. Updates three files, outputs a handoff. Mirrors the Life-OS `session-close` pattern, scoped to this project.

---

## The three files and why they matter

**`STATUS.md`** (repo root) — the human-facing daily driver, 30-second orientation. Plain English, current. Any "My notes" section at the top is user-owned — preserve it exactly.

**`docs/handoff.md` → Pending section** — the single canonical pending-task list for this project. Rewritten completely each close, not appended to.

**`docs/decision_log.md`** — only true decisions: places where a rule, convention, or approach changed for the future. "Fixed the alarm bug" is activity. "Decided to hard-delete instead of soft-delete on undo" is a decision.

---

## Step 1: Synthesize the session — from evidence, not memory

Before writing anything, establish the following. Where a claim is checkable, check it this
session (`git`, a test run, a build) rather than trusting what the conversation said happened —
see `docs/engineering/AI-WORKFLOW.md` §6:

- Session type: planning / feature work / backport / housekeeping / mixed
- What was done: 3-5 items, plain English
- **Evidence of state:** current branch + `HEAD` SHA; test count and result if tests ran; build
  result if a build ran; PR/merge status from `git` or the PR page if a PR was involved.
- Decisions made: ask "will a future session need to behave differently because of this?" — if yes, it's a decision
- Pending items: unfinished carry-forwards from this session, plus anything still open from existing files

**Use the precise verb** when recording status: *implemented* (in the working tree) → *committed*
→ *pushed* → *merged* (in `main`) → *deployed* (a successful production deployment is live). These
are not interchangeable; a PR that is open is not "merged," and a merged app change is not
"deployed" until the Cloudflare Pages production deployment actually succeeds (and a `webhook.gs`
change not until a manual Apps Script redeploy).

## Step 2: Read existing files first

Read `STATUS.md`, `docs/handoff.md`, `docs/decision_log.md` before drafting anything, so formatting stays consistent and nothing gets silently dropped.

## Step 3: Draft and preview

Show all three drafts in one message before writing:

```
Preview — confirm or adjust

STATUS.md (full rewrite)
[complete new STATUS.md]

docs/handoff.md — Pending section
[just the new Pending section]

docs/decision_log.md — new entry
[just the new entry to append]
```

Wait for confirmation before writing.

## Step 4: Write

1. `STATUS.md` — full rewrite
2. `docs/handoff.md` — Pending section + current-state summary only
3. `docs/decision_log.md` — append new entry

## Step 5: Output the sunshine prompt (a self-contained task packet)

The next session must be able to start cold from this alone (`AI-WORKFLOW.md` §5). Record the base
honestly from verified `git` state: if the work merged to `main`, give the `main` HEAD SHA; if it
is still on a feature branch (PR open or not), give the **branch name + its HEAD SHA + PR status**,
not a "main base commit" it hasn't reached. The next `sunshine` uses this to confirm nothing shifted
underneath it.

```
Combat OS — continuing from [date].
Base: [main HEAD SHA, or "branch <name> @ <SHA>, PR #<n> <status>"]
Read first:
· STATUS.md (30-second orientation)
· docs/handoff.md (full context)
· [any files the next task must read before acting]
Session type: [type]
Objective: [one sentence — what "done" looks like next session]
Constraints: [relevant AGENTS.md hard rules / scope boundaries for the next task]
Open decisions (do not silently default): [any unruled OPEN-DECISIONS items the work touches]
Top pending:

- [most urgent]
- [second]
- [third — max 5]
```

---

## File formats

### STATUS.md

```markdown
# STATUS
_Last updated: [date] · [session type]_

## Last session
[2-3 sentences, plain English]

## Current focus
[One sentence]

## Up next
1. [item]
2. [item]
3. [item]
[max 5]
```

### docs/decision_log.md entry

- Date + one-line context
- Decisions table: `# | Decision | Rationale` — omit if no real decisions this session
- What was NOT done / deferred
- To do next session

### docs/handoff.md Pending section

```markdown
## Pending

- [ ] [item 1]
- [ ] [item 2]
```

One list, one place — consolidate anything scattered elsewhere in the file.

---

## Relationship to the roadmap and archived CHECKLIST

`docs/planning/roadmap/ROADMAP.md` is the active sequencing doc (one `W##`/`A#` item per PR). The
older `archive/CHECKLIST.md` (moved to `archive/` on 2026-07-22) is a **historical** Project A /
Project B record — superseded for sequencing and not touched by this skill. `docs/handoff.md`'s
Pending section is the short, session-to-session carry-forward (max 5 items) — a different
granularity, not a duplicate of the roadmap.

## Edge cases

**No STATUS.md yet:** Create it from scratch.

**No decisions this session:** Skip the decisions table, log what was done and what's pending.

**A `sunshine` flagged something as stale/contradictory earlier in this session:** Make sure the resolution (what actually got prioritized instead) is captured as a decision, not silently dropped.
