---
name: combatos-sunshine
description: Open a Combat OS dev session cleanly. Reads STATUS.md, docs/handoff.md, docs/decision_log.md, and the active roadmap, then gives a 30-second orientation plus the top pending items. Use whenever the user says "sunshine", "let's continue", "where did we leave off", or starts a new Combat OS session without other context. Read-only — makes no changes.
---

# Combat OS — Sunshine (Session Open)

Opens a session from a position of certainty, the mirror of `goodnight`/`session-close`. Read-only.

---

## Step 1: Read, in this order

1. `STATUS.md` (repo root) — the 30-second orientation
2. `docs/handoff.md` — the Pending section + current-state summary
3. `docs/decision_log.md` — most recent 1-2 entries only, for anything that changed a rule or convention
4. `docs/planning/roadmap/ROADMAP.md` — the active sequence and gates

If `STATUS.md` doesn't exist yet, say so plainly and skip to a general repo orientation instead (don't fabricate a status).

## Step 2: Verify repository state before trusting the files

The continuity files describe what *was* true at the last close; the repository is what *is* true
now (see `docs/engineering/AI-WORKFLOW.md` §1). Before orienting, establish the ground truth with
evidence, not memory:

- current branch, `HEAD` SHA, and `git status` (describe untracked files accurately — e.g. an
  untracked `.claude/` is not "a clean tree");
- the most recent commits on `main`.

These are local reads and stay within a read-only open. **Only refresh remote state (`git fetch`)
when the session actually needs it and network access is authorized** — e.g. before claiming a
branch is or isn't stranded on the remote. Otherwise, state the boundary ("local refs only; remote
not checked this session") rather than implying a remote check you did not run.

**Never assert a PR, CI, build, or deploy status you have not just observed.** "A9 merged in PR #51"
is only true if `git`/the PR page says so this session — a continuity file claiming it is signal to
verify, not proof. Use the precise verb (implemented / committed / pushed / merged / deployed) from
`AI-WORKFLOW.md` §6.

## Step 3: Treat roadmap/pending items as signal, not spec

This is the important part. `docs/planning/roadmap/ROADMAP.md` and any pending items may be **stale** — old ideas that seemed right at the time, not commitments. Before presenting them as "next up," do a quick sanity check against verified repository state and anything the user says at the start of this session. If the user's stated goal for today doesn't match what the files say is next, say so explicitly and ask which takes priority — don't silently follow the file.

## Step 4: Output the orientation

Keep it under 10 lines. The files do the heavy lifting; this is just the on-ramp.

```
Combat OS — continuing from [date of last STATUS.md update].
Last session: [1-2 sentences from STATUS.md "Last session"]
Current focus: [1 sentence]
Top pending (verify these still hold before starting):

- [item]
- [item]
- [item]

Anything look outdated, or are we good to start here?
```

If the opening message already contains a clear task that matches verified repository state, give
the orientation and then **continue into that task** — don't force a redundant confirmation turn.
Only stop and wait when there's no clear task yet, or when verified state contradicts what the
files or the user's stated goal say is next (flag the conflict; the user decides priority).

## Edge cases

**No STATUS.md / docs/handoff.md yet:** This is a first-ever sunshine run. Do a general repo orientation instead (read `README.md` and `AGENTS.md`), and tell the user these tracking files don't exist yet — offer to create them via a `goodnight` close at the end of this session.

**No active roadmap:** Say that `docs/planning/roadmap/ROADMAP.md` is missing and continue from the
continuity files. Do not fall back to the archived `archive/CHECKLIST.md` as active sequencing.

**Pending items contradict the user's stated goal for today:** Flag it, don't resolve it silently. The user decides which takes priority.
