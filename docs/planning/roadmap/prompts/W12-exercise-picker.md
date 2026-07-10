# W12 — Reusable Exercise Picker · Tier: IMPL, then REVIEW pre-merge

**Instructions for the User:** paste below the dashed line into a fresh session. This one adds a Dexie store — schema version bump territory, hence the review pass.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Task: let the user save a custom exercise once (core/accessories and cooldown/stretch entries — the places where names are currently retyped every session) and pick it from a dropdown thereafter.

### DO NOT TOUCH
- The playbook-driven strength blocks (%1RM/e1RM territory) — this feature is for the FREE-TEXT entry areas only (`CoreBlock`, `CooldownBlock` — confirm in diagnostic which components have free-text exercise entry).
- Webhook payload shape: the logged output must remain the same string-based format the Sheet expects (e.g. the `core` array → "ex — sets×reps" join in webhook.gs). Saved exercises change how names are ENTERED, not how they're LOGGED.

### PHASE 1 — DIAGNOSTIC (report, stop for approval)
1. Identify every free-text exercise-entry point and its current state flow into the payload.
2. Read the Dexie setup in `app/src/db/index.jsx` (current schema `version(...)` calls). Report the current version number and the exact upgrade path for adding a `customExercises` store (`++id, name, category`) WITHOUT disturbing existing stores or triggering data loss. State how Dexie handles version bumps for existing installed clients (the developer's phone has months of data — this must be zero-risk).
3. Propose the UI: dropdown-with-add pattern per entry point; manage/delete saved exercises in Settings.

### PHASE 2 — IMPLEMENT (after approval)
- Schema bump exactly as approved. Build + tests green; add a unit test for the new store's basic CRUD if the W7 harness exists.
- Manual checklist: existing session history intact after upgrade (verify Log tab), save→reuse→delete of a custom exercise, logged payload string identical in format.

Commit: `feat: reusable custom exercise picker (core/cooldown)`.

### REVIEW PASS
Focus solely on the Dexie migration safety and payload-format preservation.
