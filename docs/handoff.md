## Current state (one line)
Combat OS `main` at `1604607` — train.metzcore.com live; `foundation-conditioning-phase1` registered
as a cartridge (PR #93, 2026-09-12). `CombatOS-Onboarding` local `main` at `09eb2e9` while its
`origin/main` is still `b7bd58d` — 5 commits unpushed.

## Pending
- [ ] **W31 · production password sign-in** — email + password becomes the only visible path;
      `signInWithMagicLink` stays in `AuthProvider` but leaves the UI. Every existing account must
      be issued a password **before** this deploys, or a working magic-link user is locked out.
- [ ] **W32 · self-service change-password** in More › Profile, using
      `updateUser({ current_password, password })` with "Require current password" enabled.
- [ ] **W33 · custom SMTP + self-service forgot-password** — the fix for remote password resets.
      metzcore.com is already on Cloudflare nameservers with Zoho Mail on MX.
- [ ] Rotate the temporary Supabase developer password.
- [ ] **Push Track B:** local `main` is 5 commits ahead of `origin/main`, unpushed since 2026-08-10;
      `docs/RFC-ADMIN-INTAKE-WORKSPACE.md` is untracked.
- [ ] **Track B credential sweep:** confirm `AUTOMATION_API_KEY` (regenerated 2026-08-10) matches in
      both n8n and `.dev.vars`, and that no stale copy lingers.
- [ ] **Track B edge hardening:** Cloudflare Access was *deferred* 2026-08-06 (Zero Trust requires a
      payment method on file), not merely left undone. The WAF rate-limit rule on
      `/api/onboard/verify` **is live**. `/api/admin/*` still has no rate limit — the Worker's
      `requireAdmin` is its only gate.
- [ ] Log hub verification depth: fixture-based integration test + written manual QA checklist.
- [ ] Folder cleanup: `Fight-Camp-kimi-trial` still exists.
