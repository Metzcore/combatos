# W33 — Custom SMTP + Self-Service Password Recovery · Tier: IMPL, then REVIEW
_Written 2026-09-23. Context: W31 made password the production sign-in path, which left one gap —
a forgotten password had no self-service route, so the sign-in screen said "contact your coach".
That is untenable operationally: a client at the gym needs to get in while the developer is away
from a computer, and the Supabase dashboard cannot set a password on an existing user. Fixing the
email channel is cheaper and strictly better than building an admin reset button, and it takes the
developer out of the loop entirely. See `docs/decision_log.md` 2026-09-23 #9 and D16._

**Instructions for the User:** paste everything below the dashed line into a fresh session.
Diagnostic-first: the agent must present its plan before changing anything.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Read repo-root `AGENTS.md` first and obey
its hard rules; read the `combatos-conventions` and `mobile-interaction-ux` skills in
`.agents/skills/`. Auth is high-risk under `docs/engineering/AI-WORKFLOW.md` §4/§8. Task:
self-service password recovery. Nothing else.

## THE DECIDED SCOPE (do not relitigate)

**1. Custom SMTP is an operator step, not code.** Supabase → Project Settings → Authentication →
SMTP Settings, using the existing Zoho mailbox on `metzcore.com`. Runbook in `docs/OPERATIONS.md`.
**No DNS change is needed** — SPF already authorises `zohomail.eu`, Zoho already handles DKIM, and
DMARC is `p=none`. Verify by public lookup rather than assuming.

**2. `auth/passwordPolicy.js` (new, pure).** `validateNewPassword(password, confirmation)` →
`{ valid, reason, message }`, plus `MIN_PASSWORD_LENGTH = 8`. No character-class rules: NIST
SP 800-63B puts the floor at 8 and advises *against* composition rules, which produce `Password1!`
rather than entropy. **Never trim** — spaces are legitimate password characters, and stripping them
would store something other than what the user typed. The constant mirrors the Supabase dashboard
setting; if they drift, the user passes client validation then gets an unactionable server error.

**3. `AuthProvider`: `requestPasswordReset` + `completePasswordReset` + `recoveryMode`.**
- `resetPasswordForEmail(email, { redirectTo: window.location.origin })`. Each origin must be in
  Auth → URL Configuration → **Redirect URLs**, added additively. **Never change Site URL** — it is
  shared with the onboarding site (`SHARED-SUPABASE-BOUNDARY.md`, decision log 2026-08-04 #2).
- `updateUser({ password })` with **no `current_password`** — the emailed link *is* the proof of
  identity; the user is here because they do not know the old one.

**4. The `PASSWORD_RECOVERY` interception is the whole point — do not skip it.** A Supabase
recovery link produces a **real session**. The existing `onAuthStateChange` handler calls
`setSession(newSession)` for every event, so without intercepting, clicking "reset my password"
silently signs the user in, drops them on the HUD, and never asks for a password — the link behaves
as a plain magic link. `AuthGate` checks `recoveryMode` **before** rendering children.

**5. `SetNewPassword.jsx` (new).** Two fields + reveal toggle, matching `SignIn.jsx`'s inline-style
idiom — these are siblings. Carry over W31's two load-bearing field properties: `fontFamily:
'inherit'` (index.css styles `input[type="text"]` but not `[type="password"]`, so revealing
re-fonts and shifts height) and `fontSize: '16px'` (the 14px root triggers iOS Safari
zoom-on-focus). A "Skip for now" exit is honest rather than optional-feeling: the session is
already valid, so pretending otherwise would be a lie.

**6. "Forgotten your password?" on `SignIn.jsx`.** Enabled only once the email field parses.
**Ignore the result deliberately** and always show the same "if that address has an account…"
copy — Supabase returns success whether or not the user exists, and surfacing a failure would hand
back the enumeration signal that design protects. This is the same property W31 established for
sign-in errors.

**7. `describePasswordUpdateError` in `authErrors.js`.** Distinct from `describeSignInError`,
deliberately: the caller is already authenticated, so there is no enumeration concern and specific
messages are helpful. An **expired or already-used link** must route to "request a new one", not to
"choose a different password" — otherwise the user loops forever.

## EXPLICITLY OUT OF SCOPE
- **Change password while signed in** — that is W32.
- Returning magic link to the sign-in UI. D16 was narrowed, not reversed: a reset link is used once
  and ends at a durable credential; a magic link makes email a permanent dependency of every
  sign-in, which is the failure this whole line of work exists to escape.
- CAPTCHA, attempt counters, leaked-password protection, a Track B admin reset button, a
  Telegram/n8n bot. All ruled out with reasons on record.
- Custom email templates. The Supabase defaults are fine; revisit only if deliverability needs it.

## DO NOT TOUCH
- Dexie schema, `syncQueue`, webhook payloads, `scripts/webhook.gs`, `playbook.js`, `%1RM` math.
- Any Supabase migration. W33 needs none.
- **Site URL**, "Allow new users to sign up", or any project-wide Auth setting beyond SMTP, the
  email rate limit, and the Redirect URLs allow-list — all shared with Track B (R6).
- `package.json` / lockfile. Zero new dependencies.

## PHASE 1 — DIAGNOSTIC (report, then STOP for approval)
1. Confirm `resetPasswordForEmail` cannot create an account and cannot be used to enumerate users.
   State the mechanism.
2. Trace what happens today when a recovery link lands, given `detectSessionInUrl: true` and the
   current `onAuthStateChange` handler. Name the bug before fixing it.
3. Exact diff plan + edge cases: expired link, already-used link, link opened on a different
   device from the one that requested it, "Skip for now", offline mid-save, and a reset requested
   for an address with no account.

## PHASE 2 — IMPLEMENT (only after approval)
- `npm ci` only. `npm test` and `npm run build` green, with real counts cited.
- Tests for `passwordPolicy.js` and the new error mapper in house style (Vitest, `globals: false`,
  4-space, no semicolons, behaviour-named `describe`). Assert against the **real** Supabase error
  classes. Pin `MIN_PASSWORD_LENGTH` against the dashboard setting so drift fails a test.
- Browser check at 375px via the `combatos-verify` launch config (port 5180). Note that editing
  `AuthProvider` with the page live produces spurious `useAuth must be used within AuthProvider`
  errors from React context + HMR — **confirm in a fresh tab before believing them.**

## ⚠️ DEPLOY PREREQUISITE — not a follow-up
**Custom SMTP must be live before this merges.** `main` deploys to production. Shipping
"Forgotten your password?" while Supabase is still on the built-in sender routes users straight
back into the failure this work exists to fix — and worse, it looks like it worked, because the
screen deliberately cannot tell them the email never went out.

## CARRY FORWARD TO W32 — verify, do not assume
**Does "Require current password when changing password" break recovery?** W32 wants that project
setting enabled. `@supabase/auth-js`'s own type comment says `current_password` is "only ever
present when the user is resetting their password and
`GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD` is true", which implies recovery
sessions are exempt — but that is an inference, not documentation. **W32 must test a full recovery
with the setting ON before leaving it on**, because if recovery is not exempt, enabling it silently
destroys the only self-service recovery path.

Also for W32: the installed 2.110.7 accepts **`current_password` (snake_case) only**. Supabase's
docs show a camelCase `currentPassword` in one guide; that key does not exist in this version and
would be silently dropped, leaving the check unenforced.

## MANUAL CHECKLIST FOR THE DEVELOPER (real hardware — no agent can do these)
- A real reset email arrives, **not in spam**, and the link opens the app.
- The full loop on a real iOS home-screen PWA and a real Android install: request → email → link →
  set password → signed in → sign out → sign in with the new password.
- Link requested on desktop but opened on the phone (the common real-world case).
- Password-manager "save new password" prompt behaves in standalone PWA mode.
- No iOS zoom-on-focus on either field.

Commit: `feat(auth): custom SMTP + self-service password recovery (W33)`.
