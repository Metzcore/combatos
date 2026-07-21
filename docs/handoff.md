## Current state (one line)
Supabase Track B foundation (M1–M3) built & proven on `feat/supabase-foundation` (off main) —
invite-only, migrations captured, operator runbook added; production still on Sheets until the
merge. Project `pckokypnxrimayjmjgcl` (free tier). Operator guide: `docs/OPERATIONS.md`.

## Pending

- [ ] Go-live: merge `feat/supabase-foundation` → main; set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` on Cloudflare **Production** scope; add production URL to Supabase Site URL / redirect allowlist; then log in on phone
- [ ] Free-tier keep-alive (external n8n or GitHub Action cron) — required before brother relies on it daily; not blocking now
- [ ] CSV Program Authoring Kit — gym-change program swap on the CURRENT app; still owed
- [ ] Track A — cartridge rebuild (app reads cartridge JSON): biggest item, non-blocking; needs its own planning session (see `docs/planning/ICEBOX.md`)
- [ ] D9 — off-programme activity logging: open, unruled; candidate input to W26
- [ ] W26 — log-hub redesign research (parallel session); fold output in when back
