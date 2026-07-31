## Current state (one line)
Combat OS `main` at `b665e2d` contains the rebuilt Log hub (History + Overview) and its aggregation
layer; the standalone onboarding site remains locally checkpointed at `a223b9e` in
`CombatOS-Onboarding`.

## Pending

- [ ] **Merge the W14 duplicate fix:** `docs/fix-duplicate-w14-entry` is pushed but unmerged;
      `ROADMAP.md` on `main` still lists W14 twice with contradicting checkbox states.
- [ ] **W26 truth-up:** mark W26 complete in `ROADMAP.md` (its entry still describes the superseded
      research scope), record that `docs/planning/rebuild/LOG-HUB-EXPERIENCE-PLAN.md` supersedes
      `prompts/W26-log-hub-research.md`, and write D9's ruling into `OPEN-DECISIONS.md`.
- [ ] **Log hub verification depth:** add a fixture-based integration test (a real weights day built
      through `buildCartridgeSessionPayload`, then through all three Overview utilities) plus a
      written manual QA checklist. No React-render infrastructure — that stays a separate decision.
- [ ] **Folder cleanup:** `Fight-Camp-kimi-trial` still exists.
- [ ] **Onboarding site:** finish questionnaire feedback, reconcile Pages versus Workers hosting,
      then design auth and persistence separately. The draft `onboarding_responses` migration stays
      unapplied pending privacy/retention/security review.
- [ ] **Security follow-up:** rotate the temporary Supabase developer password.
