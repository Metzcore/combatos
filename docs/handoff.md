## Current state (one line)
A9a–A9d are complete and phone-approved on `codex/a9d-assigned-library`: per-user availability,
one active programme, schema-v3 presentation metadata, validated account cache with controlled
offline fallback, assigned-only Library list/detail, confirmed activation, and the final mobile
visual/copy standard. Final verification: 363 tests and production PWA build pass. No workout
prescription, logging payload, Supabase schema, service-worker or main-navigation change.

## Pending

- [ ] **Publish A9:** `codex/a9d-assigned-library` contains the complete stacked A9a–A9d work.
      A9d passed two Android portrait reviews and is approved. Final verification: 363 tests and a
      successful production PWA build. Push/open PR/merge before beginning A10 implementation.
- [ ] **A10 — Train information architecture:** specify Today / Plan / Library inside the existing
      Train hub, with no new main-navigation button. Begin with a read-only diagnostic covering what
      survives from Workout, how Plan differs from Library, optional-phase behaviour, phone and
      responsive layouts, three-second-glance priorities, touch targets, safe areas, loading/offline
      states, and boundaries with A6.5/A7. Stop for approval before code.
- [ ] **Rotate the developer Supabase password-login user's password:** replace the temporary
      placeholder with something long and random.
- [ ] **A6.5 — durable active-workout draft:** local Dexie autosave/resume before A7. Keep its
      temporary draft shape separate from the permanent logged-session payload decision.
- [ ] **Future independent work:** Log-tab UX/UI redesign, followed later by the Checklist/Notes
      backend and protected n8n keep-alive idea.
