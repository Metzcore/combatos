## Current state (one line)
Combat OS `main` at `4cae484` — **email + password sign-in and self-service recovery are live and
verified end to end on a real account**, first client provisioned and ready to onboard.
`CombatOS-Onboarding` local `main` at `09eb2e9` while its `origin/main` is still `b7bd58d` — 5
commits unpushed.

## Pending
- [ ] **Merge `fix/signout-scope-local`**, then confirm on-device: sign out on one device, a second
      device stays signed in. `signOut()` defaulted to `scope: 'global'` and signed the account out
      everywhere while the button said "Sign out on this device?".
- [ ] **Update `VITE_DEV_PASSWORD` in `app/.env.local`.** The developer account's password was
      changed during the recovery test, so the dev sign-in button — how coding agents drive the app
      in a browser — fails until the file is updated.
- [ ] **Client onboarding:** URL sent, awaiting confirmation of install and first sign-in. Warn
      about the spam folder; first sends from a new domain land there.
- [ ] **`jean.hirakov@gmail.com` has no cartridge assigned** (`assigned_cartridge` null, none
      available). If that is a real person they would sign in to an empty Library.
- [ ] **W32 · change password while signed in** (More › Profile). Traps in
      `prompts/W33-smtp-password-recovery.md`: `@supabase/auth-js` 2.110.7 accepts
      `current_password` (snake_case) **only** — the camelCase spelling in Supabase's docs does not
      exist here and would be silently dropped, leaving the check unenforced. And it is
      undocumented whether a recovery session is exempt from the "Require current password"
      project setting, so **test a full recovery with it ON before leaving it on**.
- [ ] Rotate the temporary Supabase developer password.
- [ ] **Push Track B:** local `main` is 5 commits ahead of `origin/main`, unpushed since
      2026-08-10; `docs/RFC-ADMIN-INTAKE-WORKSPACE.md` is untracked.
- [ ] **Track B credential sweep:** confirm `AUTOMATION_API_KEY` (regenerated 2026-08-10) matches
      in both n8n and `.dev.vars`, and that no stale copy lingers.
- [ ] **Track B edge hardening:** Cloudflare Access was *deferred* 2026-08-06 (Zero Trust requires
      a payment method), not left undone. The WAF rate-limit rule on `/api/onboard/verify` **is
      live**. `/api/admin/*` still has no rate limit — `requireAdmin` is its only gate.
- [ ] Log hub verification depth: fixture-based integration test + written manual QA checklist.
- [ ] Folder cleanup: `Fight-Camp-kimi-trial` still exists.

## Known auth behaviour (measured 2026-09-29 — do not re-derive)
- A **password change revokes every other session** (8 → 1 in a controlled test). So a developer
  cannot reset their own password without signing in again on their phone; test resets on a spare
  account.
- **Sign-out is device-local** once `fix/signout-scope-local` merges.
- The reset screen **never reveals whether an address has an account**, by design — so "no email
  arrived" and "no such account" look identical. Check Authentication → Users when someone is stuck.
