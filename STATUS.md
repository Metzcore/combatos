# STATUS
_Last updated: 2026-09-29 · Password auth shipped end-to-end and verified against a real reset_

## Last session
**Password sign-in and self-service password recovery are live and proven on a real account.**
Five PRs: #94 (docs reconciliation), #95 (W31 password sign-in), #96 (W33 SMTP + recovery),
#97 (recovery-event fix), plus an open sign-out scope fix.

- **W31** — email + password replaced magic link as the only sign-in path shown. Magic link stays
  in the code, unused by the UI (D16). Pure `auth/authErrors.js` returns one identical message for
  every credential rejection, so sign-in is not a user-enumeration oracle. The
  `import.meta.env.DEV` bypass was deliberately kept for agent browser testing, verified stripped
  from `dist/`.
- **W33** — custom SMTP through the existing Zoho mailbox on `metzcore.com` (no DNS change needed),
  then "Forgotten your password?" → emailed link → `SetNewPassword`.
- **The bug a real test caught (#97).** W33 relied on Supabase's `PASSWORD_RECOVERY` event. GoTrue
  initialises inside its own constructor at import time and emits that event from a
  `setTimeout(…, 0)` — both before React mounts, so `AuthProvider` subscribed too late and never
  received it. The link signed the user straight into the app having never asked for a password.
  Now the intent is read from the URL at module scope, before the client can strip it. Reproducing
  it also exposed a second defect: a failed recovery link fell through to the offline cartridge
  cache and rendered the app, disguising failure as success. Both fixed.
- **Measured, not assumed:** a password change revokes every other session — a reset took one
  account from 8 live sessions to 1. That is Supabase's behaviour on a credential change.
- **Found while measuring:** `signOut()` defaults to `scope: 'global'`, so signing out on one
  device signed the account out everywhere, while ProfileScreen said "Sign out on this device?".
  Pre-dates the auth work (shipped with W29). Fix is open in `fix/signout-scope-local`.

## Current focus
`main` is at `4cae484`, deployed. A real reset was completed end to end on a second account: email
delivered (spam on first send), link opened the set-password screen, new password worked, and the
account's cartridge loaded correctly. **The first client is provisioned and can be sent the URL.**

## Up next
1. Merge `fix/signout-scope-local`, then confirm on-device: sign out on one device, second stays in
2. Update `VITE_DEV_PASSWORD` in `app/.env.local` — the dev sign-in button is broken until then
3. Client onboarding: send the URL, confirm install and first sign-in
4. `jean.hirakov@gmail.com` has no cartridge assigned at all — would see an empty Library
5. W32 · change password while signed in. Two traps recorded in the W33 prompt: only
   `current_password` (snake_case) exists in `@supabase/auth-js` 2.110.7, and it is undocumented
   whether a recovery session is exempt from the "Require current password" setting — test that
   with the setting ON before leaving it on
6. Push Track B: its local `main` is 5 commits ahead of `origin/main`, unpushed since 2026-08-10
7. Remove the stale `Fight-Camp-kimi-trial` folder
