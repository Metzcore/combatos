# W11 — Playbook Tab Overhaul · Tier: IMPL

**Instructions for the User:** paste below the dashed line into a fresh session.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Task: rework the stale Playbook tab (`app/src/components/PlaybookViewer.jsx`) from its current flat layout into a collapsed/grouped browser of the training plan.

### DO NOT TOUCH
- `app/src/data/playbook.js` (generated — read-only), `playbook.csv`, the csv pipeline scripts, `usePlaybook.js` lookup logic, logging/sync/%1RM code.

### PHASE 1 — DIAGNOSTIC (brief; report, stop for approval)
1. Read `PlaybookViewer.jsx` and report its current rendering approach and data access.
2. Confirm the data shape from `playbook.js` (Phase → Day → Block → slot → variant; days 2/4 absent = fight-gym).
3. Propose the grouped UI: Phase → Day accordions → blocks (STRENGTH/MOBILITY/etc.), showing exercise, sets×reps, load note, cue; HA variants visibly tagged; current phase/day (from settings) expanded by default; fight-gym days shown as labeled rest-from-playbook entries, not omitted silently.

### PHASE 2 — IMPLEMENT (after approval)
- Match existing styling idioms (tactical amber, existing collapse patterns if W10 landed first — reuse its component if one exists).
- Mobile-portrait-first. Build + tests green.

Commit: `feat: grouped collapsible Playbook viewer`.
