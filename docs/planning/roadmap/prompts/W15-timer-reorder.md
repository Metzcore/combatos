# W15 — Timer Page Drag-and-Drop Reorder · Tier: IMPL

**Instructions for the User:** paste below the dashed line into a fresh session.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Task: user-controlled ordering of the blocks on the Timer tab (stopwatch / rest-timer blocks in `BasicTimer.jsx` — currently fixed order; post-W20 the rounds timer is a separate top tab, not a stackable block).

### DO NOT TOUCH
- Timer LOGIC: the rounds engine, interval/bell scheduling, audio, the in-memory timer state persistence (this survived a hard-won Project A fix — see `db/index.jsx` in-memory timer state). Reordering is layout-only.

### PHASE 1 — DIAGNOSTIC (brief; report, stop for approval)
1. Read the Timer tab composition (`Timer.jsx`, `BasicTimer.jsx`, `RoundsTimer.jsx` — establish which component owns the page layout).
2. Propose the mechanism: mobile-first (touch), so prefer explicit reorder affordances (long-press drag via a small library, or simple up/down controls in an "edit layout" mode — recommend one, justify; a heavy dnd library for 3 blocks may not be worth it).
3. Order persists in the Dexie `settings` store (no schema version bump — settings is key/value; confirm).

### PHASE 2 — IMPLEMENT (after approval)
Build + tests green. Manual checklist: reorder on phone, order survives app restart, running timers unaffected by a reorder mid-count.

Commit: `feat: reorderable timer blocks`.
