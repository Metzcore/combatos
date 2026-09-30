# STATUS
_Last updated: 2026-09-29 · Auth: password sign-in + recovery shipped and verified_

## Last session
Password-based auth replaced magic link end to end, across six merged PRs (#94–#99). Email +
password is now the only sign-in path shown; magic link stays in the code, unused by the UI (D16).
Self-service recovery works over custom SMTP (Zoho, via the existing metzcore.com mailbox — no DNS
change was needed).

Two of those PRs fixed bugs in the first attempt. W33 originally relied on Supabase's
`PASSWORD_RECOVERY` event, but GoTrue initialises inside its own constructor at import time and
emits that event from a `setTimeout` — both before React mounts, so `AuthProvider` subscribed too
late and never received it. A recovery link signed the user into the app having never asked for a
password. Caught by the developer's first real test, not by CI. Separately, `signOut()` defaulted
to `scope: 'global'` and signed the account out on every device while the button said "Sign out on
this device?".

Verified end to end on a real account: reset requested, email delivered (spam on first send), link
opened the set-password screen, new password worked, cartridge loaded.

## Current focus
`main` is at `856ed1a`, 63 test files / 1213 tests green, no unmerged branches. The first client is
correctly provisioned (one cartridge, available and active) and has been sent the URL — awaiting
confirmation that he installed and signed in.

## Up next
1. New improvement work — the developer has a set of updates to scope (next session's purpose)
2. Update `VITE_DEV_PASSWORD` in `app/.env.local`; the dev sign-in button is broken until then
3. On-device check: sign out on one device, confirm a second stays signed in
4. W32 · change password while signed in — see the two traps in the W33 prompt
5. Push Track B: local `main` 5 commits ahead of `origin/main`, unpushed since 2026-08-10
