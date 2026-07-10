---
name: combatos-sunshine
description: Open a Combat OS dev session cleanly. Reads STATUS.md, docs/handoff.md, docs/decision_log.md, and docs/planning/CHECKLIST.md, then gives a 30-second orientation plus the top pending items. Use whenever the user says "sunshine", "let's continue", "where did we leave off", or starts a new Combat OS session without other context. Read-only — makes no changes.
---

# Combat OS — Sunshine (Session Open)

Opens a session from a position of certainty, the mirror of `goodnight`/`session-close`. Read-only.

---

## Step 1: Read, in this order

1. `STATUS.md` (repo root) — the 30-second orientation
2. `docs/handoff.md` — the Pending section + current-state summary
3. `docs/decision_log.md` — most recent 1-2 entries only, for anything that changed a rule or convention
4. `docs/planning/CHECKLIST.md` — for context on what's been sequenced

If `STATUS.md` doesn't exist yet, say so plainly and skip to a general repo orientation instead (don't fabricate a status).

## Step 2: Treat checklist/pending items as signal, not spec

This is the important part. `docs/planning/CHECKLIST.md` and any pending items may be **stale** — old ideas that seemed right at the time, not commitments. Before presenting them as "next up," do a quick sanity check against anything the user says at the start of this session. If the user's stated goal for today doesn't match what the files say is next, say so explicitly and ask which takes priority — don't silently follow the file.

## Step 3: Output the orientation

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

Wait for the user's response before starting substantive work.

## Edge cases

**No STATUS.md / docs/handoff.md yet:** This is a first-ever sunshine run. Do a general repo orientation instead (read `README.md` and `AGENTS.md`), and tell the user these tracking files don't exist yet — offer to create them via a `goodnight` close at the end of this session.

**Pending items contradict the user's stated goal for today:** Flag it, don't resolve it silently. The user decides which takes priority.
