# STATUS
_Last updated: 2026-07-21 · Supabase M1–M3 built + invite-only + hardening (Track B)_

## Last session
Built the Supabase foundation end-to-end on `feat/supabase-foundation` (off main): M1 magic-link
auth + sign-in gate, M2 syncQueue drain repointed webhook→Supabase (a real session synced and
verified in the DB), M3 RLS isolation proven with a real 2nd account (throwaway, since dropped) +
a forged-write block. Locked to invite-only at two layers (project signups off + app
`shouldCreateUser:false`). Captured the 3 Supabase migrations into the repo. Added an operator
runbook (`docs/OPERATIONS.md`) and an idea icebox (`docs/planning/ICEBOX.md`). Cloudflare preview
deploy hit an accidental Zero-Trust Access wall → chose Path A (go live at the production merge;
skip the preview URL).

## Current focus
Supabase foundation is DONE and proven on the branch; stays off `main` until you cut production
over. Production still runs on Sheets, untouched. (All continuity + these docs live on
`feat/supabase-foundation`.)

## Up next
1. Go-live when ready: merge `feat/supabase-foundation` → main; set VITE_SUPABASE_* on the
   Cloudflare **Production** scope; add the production URL to Supabase redirect config; log in on phone
2. Free-tier keep-alive (external cron) — before anyone relies on it daily (brother onboarding)
3. CSV Program Authoring Kit — unblock the gym-change program swap on the CURRENT app
4. Track A (cartridge rebuild) — needs its OWN planning session; don't jump the queue
5. D9 ruling (off-programme logging) · fold in W26 research when it returns
