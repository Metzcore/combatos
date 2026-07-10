# W13 — Mobility Video Links + Injury Profile · Tier: IMPL

**Instructions for the User:** paste below the dashed line into a fresh session.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Two related mobility features:

1. **Per-exercise video link:** attach a YouTube URL to a mobility exercise; a small link icon opens it in a new tab. User-attached (stored in settings or a small Dexie map keyed by exercise name/key), NOT baked into playbook.csv.
2. **Injury/mobility profile in Settings:** a list-based profile (e.g. "left hip", "right shoulder" as free entries — list, not per-exercise detail) plus a global toggle that hides the mobility block in the HUD entirely when off.

### DO NOT TOUCH
- `playbook.csv` / `playbook.js` / the csv pipeline — links live in local state, not the plan data.
- Hip-score routing logic in `usePlaybook.js` (the hipScore ≤ 2 → HA-variant system stays exactly as is; the new profile is informational and does NOT feed routing).
- Logging payloads. If mobility is toggled off, confirm in diagnostic what `mobDone` should log (presumably 0) and preserve that field's presence in the payload.

### PHASE 1 — DIAGNOSTIC (brief; report, stop for approval)
1. Read `MobilityBlock.jsx`, the Settings component structure, and how `mobDone` flows into the payload.
2. Propose storage shape for links + profile (settings store entries) and the exact toggle behavior (HUD hides block; completeness calculation impact — report how completeness currently weights mobility and propose how a disabled block should be treated, flagging it for user choice if ambiguous).

### PHASE 2 — IMPLEMENT (after approval)
Build + tests green. Manual checklist: link opens in new tab on phone, toggle hides/shows block, logging still produces a well-formed row.

Commit: `feat: mobility video links, injury profile, mobility block toggle`.
