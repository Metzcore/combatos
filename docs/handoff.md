## Current state (one line)
Supabase is **LIVE in production** (magic-link login verified on phone; cut over from Sheets
2026-07-21) with a daily free-tier keep-alive Action. Now in Track A / Stage-2 planning: rebuild
the Train tab as a universal player over a cartridge, first cartridge = the developer's own
new-gym program. Project `pckokypnxrimayjmjgcl` (free tier). Operator guide: `docs/OPERATIONS.md`.

## Pending

- [ ] **Track A / Stage-2 — Train + Playbook rebuild** on the cartridge model (app renders
      days/exercises/prescription from a cartridge JSON per `PROGRAM-CARTRIDGE-SPEC.md`). First
      cartridge = the developer's new-gym program. Skips Stage 0 (no `playbook.csv` patch). Main focus.
- [ ] **AI authoring framework (docs, not app code):** intake schema (incl. equipment) · versioned
      authoring "coach" prompt that adapts proven templates · coaching-sanity reviewer checklist.
      Build + prove on the developer's own program first; re-authoring-from-logged-data loop deferred.
- [ ] **Lock logging payload shape** (per-session vs per-set; carry prescribed+performed per
      exercise for the substitution model) — open decision, gated on W26; blocks renderer code.
- [ ] **Habit / "mental side" = checklist-cartridge** extension of the existing Checklist hub
      (curated daily-reset task bundles, à la TRW campus checklists). Out of scope until the Train
      rebuild lands; study Trainerize/Everfit.
- [ ] **Coach CRM foundation:** model clients in Supabase `profiles`; prompts + cartridges as
      versioned files; AI Projects as the working surface. Dashboard app DEFERRED until the manual
      process is the bottleneck (~5–10+ clients).
- [ ] **D9** — off-programme activity logging: open, unruled; candidate input to W26.
- [ ] **W26** — log-hub redesign research (parallel); informs the payload shape + fitness-stats Log subtab.
- [ ] **Small:** subtle medical/AI disclaimer in Settings (once). Merge keep-alive PR + delete
      merged `feat/supabase-foundation`. `docs/planning/CHECKLIST.md` → `archive/` move is
      uncommitted-deliberate (developer's manual archival).
