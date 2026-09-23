# W31 — Production Password Sign-In · Tier: IMPL, then REVIEW
_Written 2026-09-23. Context: the app shipped magic-link-only. Supabase's built-in email sender is
rate-limited and sends from a shared, spam-prone domain — a real client entered his email twice and
never received a link. `signInWithPassword` has been on the auth context since the 2026-07-22 dev
auth-bypass work (`app/src/auth/AuthProvider.jsx`), but the only caller sat inside an
`import.meta.env.DEV` block in `SignIn.jsx`, so `vite build` stripped it from production. This item
promotes that existing call to the production path. It is mostly UI plus one new pure module — not
new auth plumbing._

**Instructions for the User:** paste everything below the dashed line into a fresh session.
Diagnostic-first: the agent must present its plan before changing anything.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Read repo-root `AGENTS.md` first and obey
its hard rules; read the `combatos-conventions` and `mobile-interaction-ux` skills in
`.agents/skills/`. Auth is high-risk under `docs/engineering/AI-WORKFLOW.md` §4/§8 — diagnostic,
independent review, and human approval all apply. Task: production password sign-in. Nothing else.

## THE DECIDED SCOPE (do not relitigate)

Rulings are in `docs/decision_log.md` (2026-09-23) and **D16** in `OPEN-DECISIONS.md`.

**1. One new pure module: `app/src/auth/authErrors.js`.** `describeSignInError(error)` returns
`{ reason, message }`. The load-bearing property: **every credential rejection returns one
identical message** — unknown email, wrong password, unconfirmed account and banned user are
indistinguishable, so the form is not a user-enumeration oracle. There is nothing a user could do
differently with the specific answer; accounts are invite-only and provisioned out of band, so the
remedy is always "ask the coach". `reason` exists for tests and logging and is never rendered.
Offline (`AuthRetryableFetchError`), 429, and weak-password get their own messages because those
*do* change what the user should do. Match on `name`/`code`/`status` before message text — the
codes are a published contract, the strings are not.

**2. `SignIn.jsx` becomes an email + password form.** Real `<form>`, `id`+`name` on both fields,
`autoComplete="email"` / `"current-password"`, `enterKeyHint="go"`, and a Show/Hide reveal toggle
(a 20-char password typed blind on a phone is where this fails in practice). Error in a
`role="alert"` paragraph, matching the file's existing inline-error convention. A static
"Forgotten your password? Contact your coach to have it reset." line — honest about the real
recovery path, and not a button that depends on the broken channel.

Two non-obvious CSS facts, both verified in the browser, both load-bearing:
- `index.css` styles `input[type="text"]` globally (Courier, tighter radius) but **not**
  `input[type="password"]`. Without `fontFamily: 'inherit'` on the shared field style, tapping
  "Show" re-fonts the field and shifts its height ~1px.
- The root font size is 14px, so `fontSize: '1rem'` computes under 16px and **iOS Safari
  auto-zooms the viewport on focus.** These two fields use `fontSize: '16px'` deliberately.

**3. Magic link stays in the code, leaves the UI.** Do not delete `signInWithMagicLink` or the
`signInWithOtp` call. D16 ruled no fallback control on the screen. It returns when W33 lands.

**4. The dev bypass STAYS.** The `import.meta.env.DEV` block and `VITE_DEV_AUTOLOGIN` are how a
coding agent drives the app in a browser without a human typing credentials — explicit developer
ruling. `vite build` strips it; verify that against `dist/` rather than assuming it.

**5. Comment truth-up.** `AuthProvider.jsx`'s header ("built on Supabase magic-link") and its
`signInWithPassword` comment ("Harmless in prod: no shipped code path calls it") both become false.
So does `supabaseClient.js`'s "magic-link login is a one-time action". Fix in this PR
(`AI-WORKFLOW.md` §1 — stale docs are bugs).

**6. `docs/OPERATIONS.md`.** The `##` heading names magic link; two lines assert the app is
passwordless. Add an **"Issue or reset a password for an existing account"** runbook — the
dashboard **cannot** set a password on an existing user, so this is a local Admin API command with
the service-role key, with a hard warning never to delete-and-recreate the user (it cascades into
training history *and* the onboarding site's cases).

**7. `AGENTS.md`.** The expected-advisories list goes from five to six:
`auth_leaked_password_protection` is now permanent and unactionable (Pro-plan-only, upgrading ruled
out). The rule itself invites this — "do not silently add a sixth without checking why it appeared."

## EXPLICITLY OUT OF SCOPE
- **Change password** — that is W32 (`updateUser({ current_password, password })` in More › Profile).
- **Custom SMTP / forgot-password** — that is W33.
- **CAPTCHA, client-side attempt counters, auto-generated passwords, leaked-password protection,
  a reset button in Track B's coach dashboard, a Telegram/n8n reset bot** — all ruled out with
  reasons on record. Do not add them back.
- Any change to session persistence. `persistSession`/`autoRefreshToken`/`detectSessionInUrl` were
  investigated and found correct; do not "fix" them.
- Migrating `SignIn.jsx` to the `.btn-*` classes. It is inline-styled throughout; match that or
  propose a migration separately — do not half-do it.

## DO NOT TOUCH
- Dexie schema, `syncQueue`, webhook payloads, `scripts/webhook.gs`, `playbook.js`, `%1RM` math.
- Any Supabase migration. W31 needs none — it is client-side only.
- Project-wide Auth settings beyond the password strength fields. The redirect allow-list and
  "Allow new users to sign up" are shared with Track B (`SHARED-SUPABASE-BOUNDARY.md` R6), and the
  Site URL must never change.
- `package.json` / lockfile. Zero new dependencies — `current_password` support is already in the
  installed `@supabase/auth-js` 2.110.7 (that matters to W32, not W31).

## PHASE 1 — DIAGNOSTIC (report, then STOP for approval)
1. Confirm `signInWithPassword` cannot create an account, and that invite-only therefore needs no
   Auth-settings change. State the mechanism, don't assume it.
2. Exact diff plan: the new module + its test, the `SignIn.jsx` rewrite, the three comment fixes,
   the two doc files. Nothing else should appear.
3. Edge-case list, including: an account with **no password ever set** (the deploy prerequisite
   below), wrong password, offline, 429, a second device, and a password that no longer meets a
   tightened strength policy.

## PHASE 2 — IMPLEMENT (only after approval)
- `npm ci` only. `npm test` and `npm run build` both green, with real counts cited.
- Tests for `authErrors.js` in house style (Vitest, `globals: false` so explicit imports, 4-space,
  no semicolons, behaviour-named `describe`). Assert against the **real** `AuthApiError` /
  `AuthRetryableFetchError` / `AuthWeakPasswordError` classes, not hand-made shapes — and assert
  the rejection set collapses to exactly **one** distinct message.
- Verify the dev block is stripped: grep `dist/` for `VITE_DEV_EMAIL`, `VITE_DEV_PASSWORD`,
  `VITE_DEV_AUTOLOGIN`, `Dev sign-in`, `.env.local` — all must be zero. Confirm the password copy
  *is* present and magic-link UI copy is gone.
- Browser check on a 375px viewport via the `combatos-verify` launch config (port 5180): form
  renders, reveal toggle flips `type` and `aria-label`, computed font/size/height identical masked
  vs revealed, wrong credentials produce the generic `role="alert"` message, dev sign-in reaches
  the HUD.

## ⚠️ DEPLOY PREREQUISITE — not a follow-up
**Every existing account must be issued a password before this merges to `main`.** `main` deploys
to production. An existing magic-link user who opens the app after deploy with no password set is
locked out of an app that previously worked for them, and D16 ruled out an in-UI fallback. Four
accounts existed as of 2026-09-23. Use the new `OPERATIONS.md` runbook.

## MANUAL CHECKLIST FOR THE DEVELOPER (real hardware — no agent can do these)
- Session survives app close, backgrounding, and a **phone restart** on a real iOS home-screen PWA
  and a real Android install.
- Password-manager autofill (iOS Keychain, Google Password Manager) in standalone PWA mode.
- No iOS zoom-on-focus when tapping either field.
- Tap targets against the `mobile-interaction-ux` floor, portrait, one-handed.
- A full sign-in on a **separate device or browser profile** (one account per device — D15).

Commit: `feat(auth): production password sign-in (W31)`.
