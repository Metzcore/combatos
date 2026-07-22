## Current state (one line)
Supabase is **LIVE in production**; the Cartridge Viewer UX pass and dev-only local sign-in are
shipped. A9a/A9b are live and verified. A9c is complete on
`codex/a9c-cartridge-access-cache`: own-user Supabase loader, validated Dexie cache, confirmed
online-only activation, unknown-ID/update reporting, and controlled read-only offline-device entry.
No Train visual UI or Supabase schema changed. Project `pckokypnxrimayjmjgcl` (free tier). Operator
guide: `docs/OPERATIONS.md`.

## Pending

- [ ] **Train experience plan is now canonical:** read
      `docs/planning/rebuild/TRAIN-EXPERIENCE-PLAN.md` before A9/A10/A6.5/A7 work. Decisions captured:
      Today/Plan/Library; several available but one active; unassigned bundled cartridges hidden, not
      private; coach controls availability; unfinished drafts stay local first; A6.5 is an explicit
      prerequisite to A7. No Train code or Supabase schema was changed in the planning session.
- [ ] **A9 — continue with A9d:** A9a is live and verified. `user_cartridges` controls availability;
      `profiles.assigned_cartridge` is the one-active pointer and can only name an available program;
      users can read only their own rows and cannot edit availability, role, or profile lifecycle.
      Initial state: primary phone account has both Combat OS programs with Foundation active;
      developer account has all three with Foundation active; brother has Apex active and has still
      never signed in. A9b is complete: schema v3 and the authoring/validation contract now require
      summary, outcomes, tags and equipment. A9c now loads and caches one complete server-confirmed
      access snapshot, ignores/clears wrong-user cache, requires online confirmation before changing
      active, and permits read-only offline entry only after retryable Auth connectivity failure on a
      previously confirmed device. Exact emails stay in Supabase, not repo docs. Next: A9d
      assigned-only list→detail Library UI. Manual assignment steps are in `docs/OPERATIONS.md`.
- [ ] **Rotate the dev Supabase password-login user's password** — set to a weak placeholder during
      tonight's setup; swap for something long/random. Low severity (burner account, no real data)
      but a real loose end — the account is a real row in the production Supabase project, reachable
      by anyone who guesses the credentials via the public Auth API, not just through the app's UI.
- [ ] **Train information architecture (A10)** — specify Today / Plan / Library inside the existing
      Train hub, including optional-phase behaviour, responsive layout, touch targets, safe areas,
      and the Library-card spacing fix. No new main-nav button.
- [ ] **A6.5 — durable active-workout draft:** local Dexie autosave/resume before A7; temporary draft
      shape is separate from the permanent logged-session payload and works fully offline.
- [ ] **Playbook + Log tab redesign (own session, bigger scope)** — UX/UI aiming for a
      best-in-class bar (reference TBD — Apple-tier framing, Obsidian floated); includes
      dark/light mode + a full color-system pass. Model choice to be discussed at that session's start.
- [ ] **Checklist/Notes backend now that Supabase is live** — export/import flow reconsidered
      (currently "could be improved or overcomplicated"). Idea floated: an n8n scheduled workflow
      syncing notes/checklist data every ~3 days — would double as the Supabase free-tier keep-alive.
- [ ] **Lock logging payload shape** (per-session vs per-set; carry prescribed+performed per
      exercise) — gated on W26; blocks the INTERACTIVE (logging) half of the Train renderer only —
      the read/render half is already live.
- [ ] **Fix undefined `--red`/`--white` CSS vars in `PlaybookViewer.jsx`** — small, pre-existing,
      spotted while building the Cartridge Viewer (harmless fallback). Flagged, not fixed.
- [ ] **Habit / "mental side" = checklist-cartridge** extension of the existing Checklist hub.
      Out of scope until Train UX work lands; study Trainerize/Everfit.
- [ ] **Coach CRM foundation:** model clients in Supabase `profiles`; prompts + cartridges as
      versioned files. Dashboard DEFERRED until manual process is the bottleneck (~5–10+ clients).
- [ ] **D9** — off-programme activity logging: open, unruled; candidate input to W26.
- [ ] **W26** — log-hub redesign research (parallel); informs the payload shape + the Log redesign.
- [ ] **Small housekeeping:** subtle medical/AI disclaimer in Settings (once); run the keep-alive
      Action once manually to confirm; delete merged `feat/supabase-foundation` branch.
