## Current state (one line)
Supabase is **LIVE in production**; Track A/Stage-2 shipped its full read/render arc today — the
Program Authoring Kit, block-composable cartridge spec v2, 3 real cartridges (Foundation, Operator,
Apex Phase 1), and a live **Cartridge Viewer** in the Train hub (merged, deployed). First on-device
review is in: works, but needs a real UX/UI pass before the interactive (logging) renderer, which
stays gated on W26. Project `pckokypnxrimayjmjgcl` (free tier). Operator guide: `docs/OPERATIONS.md`.

## Pending

- [ ] **Cartridge Viewer UX/UI pass** — description text alignment/readability, copy quality,
      collapsible exercise blocks, section-header visual redesign (current styling reads
      "dated/noisy" — a new user doesn't know what to do).
- [ ] **Cartridge tagging** — group cartridges by category as the library grows (e.g. `25`,
      `ufcgymd1`; developer also floated `em`/`fulltransformation` — clarify meaning next session)
      + a way to "select/activate" a cartridge for real use (Cartridge Viewer is browse-only today).
- [ ] **Train hub discoverability** — the 3 top tabs (Workout/Playbook/Cartridges) aren't obvious
      to a new user at first glance; needs a real UX solution, not just a visual tweak.
- [ ] **Playbook + Log tab redesign (own session, bigger scope)** — UX/UI aiming for a
      best-in-class bar (reference TBD — Apple-tier framing, Obsidian floated); includes
      dark/light mode + a full color-system pass. Model choice to be discussed at that session's start.
- [ ] **Dev auth-bypass for agent browser testing** — two candidates: (a) a local-only, gitignored
      long-lived Supabase session for dev-mode only; (b) using the connected Gmail to auto-click
      the magic link. Neither built; discuss + pick next session.
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
      `docs/planning/CHECKLIST.md` → `archive/` move remains uncommitted-deliberate.
