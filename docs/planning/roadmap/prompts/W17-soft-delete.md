# W17 — Soft-Delete Rework · Tier: IMPL, then REVIEW pre-merge · ⛔ GATED ON DECISION D1

**Instructions for the User:** run ONLY if you decided in D1 to adopt soft delete. This is the ONE item where the "never touch the webhook" guardrail is deliberately lifted — and it requires you to manually redeploy the Apps Script afterwards.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. The developer has decided "Delete Last Logged Day" should be a SOFT delete (Apex Protocol pattern: keep the row, mark it cancelled) instead of the current hard delete on both ends (`deleteLastSession()` in `app/src/db/index.jsx:431`; `log.deleteRow()` in `scripts/webhook.gs`).

### SCOPE — the guardrail exception, precisely
- You MAY change `scripts/webhook.gs` delete handling and `deleteLastSession()`.
- You may NOT change the LOG action's payload/row layout, the queue mechanics, or anything else.

### PHASE 1 — DIAGNOSTIC (report, stop for approval)
1. Read both delete paths end-to-end (including the queue-ordering comment at `db/index.jsx:442` and the sessionId matching in webhook.gs).
2. Sheet-side design question to resolve with the user: soft delete needs a STATUS column. The current FightLog row layout ends with sessionId (see webhook.gs). Propose: append a `status` column after sessionId (empty = active, `CANCELLED` = deleted), OR strikethrough formatting, OR both. Check `database/fight-log-schema.md` for constraints. Recommend one.
3. Local-side design: should the local Dexie record also be kept as a tombstone (excluded from Log/stats/next-day) or still hard-deleted locally? Report implications for W9 stats and the next-day calc, recommend one, flag for user sign-off.
4. Migration note: existing rows have no status column — confirm the design treats absent status as active.

### PHASE 2 — IMPLEMENT (after approval)
1. `webhook.gs` v3: `action:'delete'` marks the matched row per the approved design instead of `deleteRow()`. Bump the header version and delete-behavior description (keep W3's accuracy standard).
2. Update `deleteLastSession()` per the approved local design. Update W7 tests.
3. Provide the user EXACT redeploy steps for the Apps Script (new deployment vs. update-in-place — note that update-in-place keeps the same URL; recommend that) and a two-step verification: log a throwaway session → delete it → confirm the row is marked, not gone.
4. Build + tests green.

Commit: `feat: soft-delete for last logged day (local tombstone + webhook v3)`.

### REVIEW PASS (separate Opus session)
Focus: sessionId matching still correct against the new column layout; log action provably unchanged; queue ordering (log-then-delete) still race-safe.
