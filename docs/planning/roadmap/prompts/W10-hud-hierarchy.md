# W10 — HUD Visual Hierarchy + Collapsible Blocks · Tier: IMPL, then REVIEW pre-merge

**Instructions for the User:** paste below the dashed line into a fresh session. Diagnostic-first — HUD is the largest, most-used, highest-risk component in the app.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Task: visual/structural upgrade of the HUD tab (`app/src/components/HUD.jsx` and its block children: `StrengthBlock`, `CoreBlock`, `BagBlock`, `CooldownBlock`, `MobilityBlock`, `FightGymDay`).

### GOALS
1. Clearer heading/subheading hierarchy across exercise blocks.
2. Stronger visual treatment for superset/PAP pairings than color-coding alone (grouping container, connector, labeling — propose options).
3. Bag-work and core/accessories blocks become collapsible, DEFAULT COLLAPSED, auto-expanding when they contain logged data for the current session.

### DO NOT TOUCH
- Logging logic, payload construction, %1RM/e1RM math, completeness calculation, sync calls, the Next Day indicator logic, phase-unlock logic.
- The webhook payload must be provably unchanged (same fields, same values for the same inputs).

### PHASE 1 — DIAGNOSTIC (report, stop for approval)
1. Map HUD.jsx's structure: sections in render order, which state lives where, how block children receive/write data, where the in-memory active-workout state (db/index.jsx) is touched.
2. Identify exactly where collapse state could live so it does NOT interfere with logged values (UI-only state; must survive tab switches — check how commit `3caf4ca`-era HUD state persistence works and follow the same pattern).
3. Propose the visual changes concretely (which classNames/CSS vars in `index.css`, mobile-portrait-first) and the superset/PAP treatment options with a recommendation.

### PHASE 2 — IMPLEMENT (after approval)
- One coherent commit. Build + tests green. Manual checklist: portrait phone layout, collapse persistence across tab switches, auto-expand when data logged, log a full session end-to-end and confirm the Sheet row looks identical in shape to previous rows.

Commit: `feat: HUD visual hierarchy, superset treatment, collapsible bag/core blocks`.

### REVIEW PASS
Focus: no state regressions in the active-workout persistence (this exact area had a Project A bug-fix history), no payload drift.
