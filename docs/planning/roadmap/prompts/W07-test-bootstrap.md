# W7 — Test Bootstrap · Tier: IMPL (Sonnet 4.6 thinking)

**Instructions for the User:** paste everything below the dashed line into a fresh session. Run this BEFORE the sync refactor (W8) — these tests are its safety net.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Task: introduce a minimal, permanent test harness and the first unit tests. The repo currently has zero tests. Keep it small — this is a foundation, not a coverage drive.

### DO NOT TOUCH
- No production code changes EXCEPT the narrow allowance below.
- %1RM/e1RM math, webhook payloads, playbook.js — read-only.

### NARROW ALLOWANCE
Pure functions currently trapped inside components/hooks (e.g. the next-day calculation inline at `app/src/components/HUD.jsx:72`, key-building/hip-routing helpers in `app/src/hooks/usePlaybook.js`) may be EXTRACTED into plain exported functions (e.g. `app/src/utils/`) so they're testable — extraction must be behavior-identical and is the only production edit allowed.

### TASKS
1. Add Vitest to `app/` (plus `fake-indexeddb` if you test Dexie paths). Wire `npm test`.
2. Tests, in priority order:
   a. **Playbook lookup** — key construction (`P{phase}-D{day}-{block}-{slot}-{variant}`), hip-score routing (hipScore ≤ 2 + HA variant exists → HA row), fight-gym-day synthesis for days 2/4.
   b. **Next-day calculation** — pin CURRENT behavior (`(day % 6) + 1`) with a comment noting decision D2 may change the spec later. Tests document reality, not aspiration.
   c. **Sync queue** — enqueue on log (envelope shape: `action`, `sessionId`, `payload`), enqueue of delete envelopes, attempts increment on failure. Use fake-indexeddb; mock `fetch` — never hit the real webhook URL.
3. `npm run build` and `npm test` both pass.
4. Add the test command to W5's CI workflow ONLY if W5 is already merged; otherwise note it for later.
5. Commit: `test: add vitest harness and first unit tests (playbook, next-day, sync queue)`.

### ACCEPTANCE
Green tests that would genuinely catch a regression in the W8 refactor. If extracting a function forces any visible behavior change, stop and report.
