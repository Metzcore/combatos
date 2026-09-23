# STATUS
_Last updated: 2026-09-23 · Password auth planned (W31–W33); continuity docs reconciled_

## Last session
Two prior sessions are folded in here: the 2026-08-04 close was written but never committed, and
the 2026-09-12 cartridge work closed without one.

**2026-08-04 —** Both production surfaces went live for the first time: train.metzcore.com (Track A,
a new Cloudflare Pages project in the correct production account) and portal.metzcore.com (Track B,
a Cloudflare Worker, not Pages). PRs #91 (cartridge-registration preflight) and #92
(device-migration restore, then used for a real personal data migration off the old device) merged.
The first real onboarding client was provisioned and invited; an invite hash mismatch blocked him
and was fixed directly in Supabase.

**2026-09-12 —** `foundation-conditioning-phase1` registered as a Track A cartridge (PR #93).

**2026-09-23 (this session) —** Password-based sign-in designed and scoped as W31–W33. No app code
changed; this PR is documentation reconciliation only.

## Current focus
`main` is at `1604607`. Next work is **W31 — production password sign-in**. Magic link stays in the
code but leaves the production UI: Supabase's built-in email sender is rate-limited and uses a
spam-prone shared domain, and it blocked a real client twice.

## Up next
1. W31 · production password sign-in (branch off `1604607`)
2. W32 · self-service change-password in More › Profile
3. W33 · custom SMTP + self-service forgot-password — closes the remote-reset gap
4. Rotate the temporary Supabase developer password
5. Push Track B: its local `main` is 5 commits ahead of `origin/main`, unpushed since 2026-08-10
6. Remove the stale `Fight-Camp-kimi-trial` folder
7. Log hub integration test + written manual QA checklist
