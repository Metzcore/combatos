## Current state (one line)
Combat OS `main` at `856ed1a` — email + password sign-in and self-service recovery are live and
verified end to end on a real account; first client provisioned and sent the URL.
`CombatOS-Onboarding` local `main` at `09eb2e9` while its `origin/main` is still `b7bd58d` — 5
commits unpushed.

## Pending
- [ ] **Scope the developer's new improvement requests** — the purpose of the next session.
- [ ] **Update `VITE_DEV_PASSWORD` in `app/.env.local`.** Changed during the recovery test, so the
      dev sign-in button — how coding agents drive the app in a browser — fails until updated.
- [ ] **On-device check:** sign out on one device, confirm a second device stays signed in
      (`scope: 'local'`, merged in #98 but not yet confirmed on hardware).
- [ ] **W32 · change password while signed in.** Traps in `prompts/W33-smtp-password-recovery.md`:
      `@supabase/auth-js` 2.110.7 accepts `current_password` (snake_case) **only** — the camelCase
      spelling in Supabase's docs does not exist here and is silently dropped, leaving the check
      unenforced. And it is undocumented whether a recovery session is exempt from the "Require
      current password" setting, so **test a full recovery with it ON before leaving it on**.
- [ ] **Track B:** push local `main` (5 commits ahead, `docs/RFC-ADMIN-INTAKE-WORKSPACE.md`
      untracked) · confirm `AUTOMATION_API_KEY` matches in n8n and `.dev.vars` · `/api/admin/*`
      still has no rate limit and Cloudflare Access was *deferred* 2026-08-06, not left undone.
- [ ] Housekeeping: rotate the temporary Supabase developer password · remove
      `Fight-Camp-kimi-trial` · Log hub integration test + manual QA checklist.

## Known auth behaviour (measured 2026-09-29 — do not re-derive)
- A **password change revokes every other session** (8 → 1 in a controlled test). A developer
  cannot reset their own password without signing in again on their phone; test resets on a spare
  account.
- **Sign-out is device-local** (`scope: 'local'`); Supabase's default is `global`.
- The reset screen **never reveals whether an address has an account**, by design — so "no email
  arrived" and "no such account" are indistinguishable. Check Authentication → Users when stuck.
- Five accounts exist, all with passwords set and confirmed.
