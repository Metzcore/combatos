## Current state (one line)
Roadmap W25/W14/W15/W27 shipped & merged. Rebuild architecture + Supabase multi-tenant committed
as planning docs (`docs/planning/rebuild/`). Supabase project LIVE with sessions+profiles+RLS
applied; app-side auth (M1) not yet built. All Supabase work on `feat/supabase-foundation` (off
main). Project: `pckokypnxrimayjmjgcl` (eu-west-1, FREE tier), URL
https://pckokypnxrimayjmjgcl.supabase.co; publishable key via the connector (`get_publishable_keys`)
— set as an env var during M1, never commit. Supabase MCP connector is connected. Brother NOT
pre-staged (onboard via magic link when he + his cartridge are both ready). Keep-alive for the free
tier must be EXTERNAL (n8n per D7 or a GitHub Action cron), before he relies on it.

## Pending

- [ ] Supabase M1 (auth): supabase-js client + magic-link sign-in screen on `feat/supabase-foundation`; register preview URL as an allowed redirect; deploy preview; adds supabase-js (from-scratch lockfile regen). Then developer signs in on his phone. Built-in email = confirmed OK.
- [ ] Supabase M2/M3: repoint syncQueue drain (webhook → Supabase insert; idempotent via `unique(user_id, client_session_id)`); prove RLS isolation with a throwaway 2nd account. Clean-cut from Sheets; freeze the Sheet as archive.
- [ ] CSV Program Authoring Kit: a doc letting any LLM re-author the CURRENT app's program (`playbook.csv` schema + `audit_playbook.py` + `csv_to_js.py` regenerate). Developer changed gyms; must redo the program (same structure, new exercises/sets/descriptions). Independent of the rebuild.
- [ ] W26 log-hub research: developer running it as a parallel session (brief at `docs/planning/roadmap/prompts/W26-log-hub-research.md`); output feeds the Log-tab rebuild + the canonical log-shape decision.
- [ ] D9 ruling — off-programme activity logging; open. Leaning: counted-task-first (zero code) + a small "unscheduled session" build off the Day-7 machinery (skips next-day/phase-count). Feeds W26/cartridge design.
