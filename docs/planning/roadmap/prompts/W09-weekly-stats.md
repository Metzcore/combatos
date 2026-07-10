# W9 — Weekly Stats in the Log Tab · Tier: IMPL, then REVIEW pre-merge

**Instructions for the User:** paste below the dashed line into a fresh session. Diagnostic-first. This is the first feature that shows your logged data back to you — months of sessions have never been surfaced anywhere.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Task: add a weekly-stats view inside the EXISTING Log tab (the `Calendar` component — nav id `calendar`). No new nav tab (decision D3 keeps the 6th slot free).

### DO NOT TOUCH
- %1RM/e1RM logic, webhook/sync code, schemas, `BottomNav.jsx` tab set.
- Data source is LOCAL Dexie `sessions` only — no Sheet reads, no network.

### PHASE 1 — DIAGNOSTIC (report, stop for approval)
1. Read `app/src/components/Calendar.jsx` and the `sessions` store shape in `app/src/db/index.jsx`. Report: exact fields available per session (date, day, phase, sessionType, completeness, hipScore, …), how many are reliably populated, and how the Calendar currently renders.
2. Report how "week" should bucket given the date format stored (ISO date? locale?), and what happens with sparse weeks.
3. Propose the UI: a stats section (toggle or sub-view within Log) showing per-week: sessions logged (S&C vs fight-gym split), average completeness %, hip-score trend, phase/day coverage. Sketch layout in text; match existing tactical-amber styling and component idioms.

### PHASE 2 — IMPLEMENT (after approval)
- Pure derivation from Dexie — no schema changes, no new stores.
- Empty/sparse data states handled (weeks with zero sessions, missing fields).
- `npm run build` + `npm test` green. Manual check list for the user (verify numbers against 2–3 known logged sessions).

Commit: `feat: weekly stats view in Log tab`.

### REVIEW PASS (separate Opus session)
Verify the aggregation math against raw Dexie contents (off-by-one week boundaries, timezone drift on date bucketing, division-by-zero on empty weeks).
