# W14 — Phase Lock/Unlock Signaling · Tier: FAST (escalate to IMPL if the logic turns out gnarly)

**Instructions for the User:** paste below the dashed line into a fresh session.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Phases lock/unlock based on tracked history, but the logic isn't legible in the UI. Task: SIGNAL the existing logic — do not change it.

### DO NOT TOUCH
- The unlock logic itself, wherever it lives (`PhaseUnlockBanner.jsx`, `db/index.jsx`, or elsewhere — find it first). Zero behavior change; this is presentation only.
- Logging, sync, %1RM code.

### PHASE 1 — DIAGNOSTIC (report, stop for approval)
1. Find and quote the actual unlock condition(s). Report them in plain English (e.g. "Phase N+1 unlocks after X logged sessions in Phase N").
2. Report where phase state is displayed today (`PhaseUnlockBanner`, Settings, HUD selector).
3. Propose lightweight signaling: e.g. a locked-phase row shows "🔒 Unlocks after N more logged sessions" with a live count; the banner explains WHY it fired. Better signaling, not instructions — keep it to one or two UI touches.

### PHASE 2 — IMPLEMENT (after approval)
Build + tests green.

Commit: `feat: make phase unlock conditions visible in UI`.
