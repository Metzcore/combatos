# W8 — Finish the Sync Refactor · Tier: IMPL (Sonnet 4.6 thinking), then REVIEW (Opus 4.6) pre-merge

**Instructions for the User:** run AFTER W7 (tests) is merged. This is diagnostic-first: the agent must present a plan before changing anything.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. A refactor was started long ago and never finished: `app/src/sync/` exists but is empty, and sync/queue logic lives inside `app/src/db/index.jsx` (see `trySyncQueue` ~line 530, enqueue logic in the session-save and `deleteLastSession` paths, and the `online`/`focus` listeners ~line 567). Your job is to complete it: move sync concerns into `app/src/sync/syncQueue.js` with **zero behavior change**.

### HARD RULES
1. **Zero payload change.** The webhook envelope (`action`, `sessionId`, `payload`) and the log-row payload shape must be byte-for-byte identical. The deployed Apps Script is NOT being touched.
2. **Zero behavior change.** Retry/attempts logic, queue ordering (log-then-delete race prevention — see the comment at `db/index.jsx:442`), online/focus triggers, and the concurrent-sync lock from commit `3caf4ca` all behave identically.
3. Do not touch %1RM/e1RM logic, components, or `webhook.gs`.
4. W7's tests must pass before AND after, unmodified (except import paths).

### PHASE 1 — DIAGNOSTIC (report, then stop for approval)
1. Map every sync-related symbol in `db/index.jsx`: functions, the syncQueue Dexie table usage, listeners, the sync lock, and every call site.
2. Propose the exact split: what moves to `app/src/sync/syncQueue.js`, what stays (Dexie instance ownership — recommend `db` stays in `db/index.jsx` and is imported by the sync module, but justify), the export surface, and the updated call sites.
3. List every risk (circular imports, listener double-registration, lock semantics) and how you'll verify each.

### PHASE 2 — IMPLEMENT (only after user approves the plan)
Execute the approved plan. Then: `npm test` green, `npm run build` green, and a manual smoke instruction list for the user (log a session offline → go online → verify one new row in the Sheet; delete last day → verify the row disappears).

Commit: `refactor: extract sync queue into src/sync/syncQueue.js (no behavior change)`.

### REVIEW PASS (separate Opus session)
Diff-review for: payload identity, lock semantics preserved, no duplicate event listeners, no circular import hazards. Findings only unless a confirmed bug is found.
