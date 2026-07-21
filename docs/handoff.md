## Current state (one line)
Supabase is **LIVE in production** (magic-link, cut over 2026-07-21). Track A / Stage-2 cartridge
rebuild is now BUILDING: the model-agnostic **Program Authoring Kit** (`docs/authoring/`) is done
and proven on the developer's own two-phase program (`cartridges/combatos-foundation-2026` +
`-operator-2026`); `validateCartridge()` shipped as the first tested rebuild module. Next: the
Train/Playbook renderer. Project `pckokypnxrimayjmjgcl` (free tier). Cartridges will attach to the
sole Supabase user **at.25degrees@gmail.com** once assignment is built. Operator guide: `docs/OPERATIONS.md`.

## Pending

- [ ] **Track A / Stage-2 — Train + Playbook RENDERER** (A4): the app player over a cartridge, per
      `PROGRAM-CARTRIDGE-SPEC.md`, with inline per-session exercise substitution. Authoring kit +
      first cartridges + `validateCartridge()` DONE 2026-07-22; the renderer's read/render path is
      W26-independent, its logging path is gated on the payload-shape lock. Skips Stage 0. Main focus.
- [x] **AI authoring framework (docs, not app code):** intake schema · versioned coach prompt ·
      split reviewer checklist — DONE 2026-07-22 in `docs/authoring/`, proven on the developer's
      two-phase program. `validateCartridge()` makes reviewer Part A executable. Re-authoring-from-
      logged-data loop still deferred. Apex cartridge (A5) = the next quick test of the kit.
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
