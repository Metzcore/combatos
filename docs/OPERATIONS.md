# Combat OS — Operator's Guide (things you can do yourself)

> **Purpose:** the manual runbook. Everything here is something *you* can do in a dashboard
> or terminal without spending AI tokens on it. Also a general map of how the system fits
> together. Living doc — add to it whenever you learn "oh, that's where that lives."

---

## The map — what lives where

| Thing | Where | Notes |
|---|---|---|
| **App code** | `app/` in this repo (`Metzcore/combatos`) | React + Vite + Dexie (local) PWA |
| **Production app** | `main` branch → Cloudflare Pages → `combatos.pages.dev` | Currently the **Google Sheets** app — your daily driver |
| **Supabase work** | `feat/supabase-foundation` branch (off `main`) | Not merged until proven; see `docs/planning/rebuild/SUPABASE-MIGRATION-PLAN.md` |
| **Supabase project** | `pckokypnxrimayjmjgcl` (eu-west-1, **free tier**) | URL `https://pckokypnxrimayjmjgcl.supabase.co` |
| **Cloudflare Pages project** | `combatos` (account `885f6273…`) | Production branch = `main`; all other branches = Preview |
| **Schema history** | `supabase/migrations/` in the repo | Reproducible; mirrors the live project |
| **Continuity docs** | `STATUS.md`, `docs/handoff.md`, `docs/decision_log.md` | Updated at each `goodnight` |
| **The plan** | `docs/planning/roadmap/ROADMAP.md`, `OPEN-DECISIONS.md` | One W## item per PR; decisions ruled with rationale |
| **Ideas not yet scheduled** | `docs/planning/ICEBOX.md` | Braindumps + triage; nothing here is a commitment |

---

## Supabase — user management (password, invite-only)

The app is **invite-only**: signups are OFF at the project level *and* no code path in the app can
create an account. `signInWithPassword` has no create-user option because the endpoint cannot make
one, and the magic-link call still passes `shouldCreateUser: false`. So **nobody gets in unless you
add them first.**

Since W31 the app signs in with **email + password**. Magic link is still in the code but is not
shown on the sign-in screen — see "Magic link" below for why.

### Add a user
Dashboard → **Authentication → Users → "Add user"** (top-right). Use **"Create new user"**:
email + the password you are giving them + tick **"Auto Confirm User"**. This is now the only
option that works end to end — the password you type here is the one they will actually sign in
with, so set the real one rather than a throwaway.

**Do not use "Send invitation"** for a new app user. It emails them a link, which is the exact
delivery path that is unreliable and the reason W31 exists.

After the user exists, confirm that **Table Editor → `profiles`** contains a row with the same user
ID. The existing database trigger normally creates it automatically.

### Set up custom SMTP (do this once — W33 depends on it)
Supabase's built-in email sender is test-grade: a few messages an hour, from a shared domain that
lands in spam. Every email feature — the W33 reset link, magic link — is unreliable until this is
replaced. **`metzcore.com` already runs on Cloudflare nameservers with Zoho on MX**, so there is
usually **no DNS work at all**: SPF already authorises `zohomail.eu`
(`v=spf1 include:zohomail.eu include:dc-…._spfm.metzcore.com ~all`), Zoho already signs with DKIM,
and DMARC is `p=none`, so nothing will be rejected while you set it up.

1. In **Zoho Mail**, create or pick a sending mailbox — `noreply@metzcore.com` is better than your
   personal address, because this credential lives in Supabase and should have a small blast radius.
2. Generate an **app-specific password** for it (Zoho → My Account → Security → App Passwords).
   Zoho's normal account password will not work for SMTP when 2FA is on, and should not be used
   here regardless.
3. Supabase → **Project Settings → Authentication → SMTP Settings → Enable Custom SMTP**:
   - Host `smtp.zoho.eu` · Port `587` · uncheck nothing (STARTTLS)
   - Username: the full mailbox address · Password: the app-specific password
   - Sender email: the same address · Sender name: `Combat OS`
4. Send yourself a password reset from the app's sign-in screen and confirm it arrives **and does
   not land in spam**.
5. While you are there, raise the email rate limit (Auth → Rate Limits) — the low default only
   exists because of the built-in sender.

If Zoho's sending limits or deliverability ever bite, switching to Resend (3,000/month free, DNS
all in Cloudflare) is a five-field change here and needs no code change.

### Issue or reset a password for an existing account
**The dashboard cannot do this.** Authentication → Users has no field to set a password on a user
that already exists. Once custom SMTP is live, prefer **"Send password recovery"** from the user's
row, or just tell them to tap **Forgotten your password?** on the sign-in screen — that is the whole
point of W33, and it does not involve you. The command below stays as the fallback for when a user
cannot receive email at all.

> ⚠️ **Never delete and recreate the user to get a new password.** Deleting an `auth.users` row
> cascades into `profiles`, `sessions`, `user_cartridges`, `body_metrics` **and** the onboarding
> site's `onboarding_cases` — it destroys training history, not just a login. See
> `docs/engineering/SHARED-SUPABASE-BOUNDARY.md`.

1. Grab the user's UUID from **Authentication → Users**, and the **service-role key** from
   **Settings → API**. That key bypasses RLS on every table in the project, including the
   onboarding site's — treat it like a root password. It never goes in the repo, in
   `.env.local`, or in any `VITE_*` variable (Vite inlines those into the public bundle).
2. Stop this shell from recording the command, because both the key and the password appear in it:
   ```powershell
   Set-PSReadLineOption -HistorySaveStyle SaveNothing
   ```
3. Set the password:
   ```powershell
   $key = "<service-role key>"
   $uid = "<user uuid>"
   $pw  = "<the new password>"
   curl.exe -s -X PUT "https://pckokypnxrimayjmjgcl.supabase.co/auth/v1/admin/users/$uid" `
     -H "apikey: $key" -H "Authorization: Bearer $key" `
     -H "Content-Type: application/json" `
     -d (@{ password = $pw } | ConvertTo-Json -Compress)
   ```
   A success returns the user JSON. A `422` usually means the password is under the minimum
   length; a `401`/`403` means the key is the anon key rather than the service-role key.
4. Close the shell window, then confirm by signing in as that user on a **separate browser
   profile** (one account per device — D15).

**Handing the password over:** say it in person, or send it over Signal/WhatsApp — never email,
never in the repo, and never in `STATUS.md`, `docs/handoff.md` or `docs/decision_log.md`. If they
tell you the password they want, set that; then point them at **More → Profile → change password**
(W32) so they can move to something you don't know.

### Assign programs to a user

`user_cartridges` holds every program available to the user. Do not try to imitate multiple
assignments by typing several values into `profiles.assigned_cartridge`; that field holds one active
ID only and the database requires it to match one of the user's availability rows.

> A9c loads and caches account access. The A9d Library consumes those rows and shows only programs
> available to the signed-in user; bundled but unassigned cartridges remain hidden, not private.

The exact cartridge IDs are:

- `combatos-foundation-2026`
- `combatos-operator-2026`
- `apex-protocol-phase1`

1. Go to **Authentication → Users** and copy the target user's UUID. Use the UUID, not their email,
   in database rows.
2. Go to **Table Editor → `user_cartridges` → Insert row**.
3. Set `user_id` to that UUID and `cartridge_id` to one exact ID above.
4. Leave `assigned_at` empty so Supabase fills the current time. `assigned_by` is optional; either
   put your own Auth UUID there for an audit trail or leave it empty.
5. Insert one row for every program that should appear in that user's Library.
6. Go to **Table Editor → `profiles`**, open the same user's row, and set
   `assigned_cartridge` to exactly one of the IDs you just made available. This is their active
   program.
7. Save, then have the user open Library while online and tap Retry/reopen the app. After the first
   successful load, the list is cached for offline browsing.

Initial rollout plan (emails deliberately kept out of this tracked file):

- **Primary phone account:** Foundation + Operator available; Foundation active.
- **Developer password-login account:** all three available, Foundation active, so it can test every
  cartridge one at a time.
- **Brother's account:** Auth user created and email-confirmed; automatic profile row verified;
  Apex Phase 1 available and active; never signed in as of 2026-07-22.

To make another program available later, add another `user_cartridges` row. To change the active
program manually, update only `profiles.assigned_cartridge`. To remove availability, first change
the active pointer if it currently names that cartridge, then delete the corresponding assignment
row. Never edit `auth.users` through Table Editor.

### Remove a user
**Authentication → Users →** click the row (or its ⋯) → **"Delete user"**. Irreversible.
Cascades: their profile, program assignments, **and** all their logged sessions are deleted with them.

### Turn signup on/off (invite-only switch)
**Authentication → Sign In / Providers → Supabase Auth → User Signups →
"Allow new users to sign up"**. Keep this **OFF** for invite-only.

### Password facts to remember
- **One sign-in per device.** The session persists + auto-refreshes for months, exactly as the
  magic-link session did. `persistSession` / `autoRefreshToken` are unchanged.
- **Minimum length 8, no required character classes** (Auth → Sign In / Providers → Email).
  NIST SP 800-63B puts the floor at 8 and advises *against* composition rules, which push people
  toward predictable shapes like `Password1!`.
- **Leaked-password protection is not available to us.** It needs the Pro plan; upgrading is
  ruled out (decision log, 2026-09-23). Do not treat the advisor warning as a to-do.
- **Self-service reset exists since W33** — "Forgotten your password?" on the sign-in screen emails
  a link. It only works if custom SMTP is configured; without it you are back on the built-in
  sender that caused all of this.
- The reset screen **never confirms whether an address has an account**, by design. Supabase
  returns success either way so the form cannot be used to discover who exists — so "I got no
  email" and "that address has no account" look identical to the user. Check Authentication →
  Users if someone is stuck.
- **Wrong-password attempts are barely rate-limited** — `/auth/v1/token` allows 1800/hour per IP.
  Accepted for a handful of invite-only users; revisit at ~20 users.
- An existing password that falls below a *tightened* strength setting fails at sign-in with a
  weak-password error, not at change time. The app tells the user to contact you.

### Magic link — still in the code, not on the screen
`signInWithMagicLink` remains on the auth context and still works if ever called, but W31 removed
it from the sign-in UI (D16). Showing a known-unreliable option reproduces the failure the change
was made to fix. Facts worth keeping for when W33 brings it back:
- **Built-in email is test-grade + rate-limited** (a few/hour) and sends from a shared, spam-prone
  domain. This is the whole reason for W33's **custom SMTP**. `metzcore.com` already runs on
  Cloudflare nameservers with Zoho on MX, so the DNS work is small or nil.
- **Links expire (default 1 hour) and are single-use.** Never pre-send — generate when ready.
  (Auth → Emails → OTP expiry, up to 24h.)
- **Redirect allowlist matters.** A link only lands if its target is the **Site URL** or in the
  **Redirect URLs** list (Authentication → URL Configuration). Missing entry = broken login. Add
  entries additively per hostname; **never change the Site URL** — it is shared with the
  onboarding site (decision log, 2026-08-04 #2).

### Other Supabase self-serve
- **See who exists / their data:** Authentication → Users; Table Editor → `profiles` / `sessions`.
- **Security check after any schema change:** Advisors → Security. The **"leaked password
  protection disabled"** warning is expected and **must not be actioned** — the feature is
  Pro-plan-only and upgrading is ruled out (decision log, 2026-09-23). It is the sixth known-benign
  advisory, alongside the five listed in `AGENTS.md`; anything beyond those six is a real finding.
- **Keys:** the *publishable/anon* key is public-safe (ships in the client bundle; it's the
  `VITE_SUPABASE_ANON_KEY`). The **service-role key never leaves the dashboard** and never goes
  in the repo or the client.

---

## Cloudflare Pages — deploys & env vars

### The two rules that bit us (don't forget these)
1. **Env vars are per-environment.** `main` deploys as **Production**; every other branch
   deploys as **Preview**. Variables set on one scope are invisible to the other. Set
   `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` on **whichever scope** the branch you're
   testing deploys as.
2. **Vite bakes env vars in at BUILD time.** After adding/changing a var you must trigger a
   **fresh build** (push a commit, or Deployments → ⋯ → Retry). Changing a var alone does
   nothing to an already-built deployment.

### Preview vs production URLs
- **Branch alias** (stable): `feat-supabase-foundation.combatos.pages.dev` — use this.
- **Per-deployment hash** (`<hash>.combatos.pages.dev`): changes every build — never register
  this anywhere.

### The "Access wall" gotcha (Zero Trust)
Turning on Pages **"Preview access"** auto-creates a Cloudflare **Access** application that walls
preview URLs behind a login — which breaks the magic-link redirect. Removing it requires
enabling the **Zero Trust Free** plan (free, but wants a payment method on file) and deleting the
Access application. We chose to **skip preview URLs** and go live at the production merge instead.

### Want a free live sandbox URL anyway? (second Pages project)
Instead of fighting the Preview wall: create a **second** Cloudflare Pages project pointed at the
**same repo**, and set *its* production branch to `feat-supabase-foundation`. Because that branch
then deploys as **Production** on the new project, no Access wall is auto-created → free,
phone-testable URL. Method is **manual/guided in the dashboard** (there's no Cloudflare
connector). Optional; only if you want to test on your phone before the real production merge.

---

## Free-tier keep-alive (automated)
A scheduled GitHub Action (`.github/workflows/supabase-keepalive.yml`) pings the Supabase REST
API **once a day** so the free-tier project never hits the ~7-day inactivity pause (a paused
project has to be restored by hand, and the live app is down until then). It's **external** to
the app by design (an app can't ping itself when closed) and needs no secrets — it uses the same
public anon key that ships in the client bundle.

- **Check it's healthy:** GitHub repo → **Actions** tab → **Supabase Keep-Alive**. Green runs =
  fine. A red run emails you and means the ping got a non-2xx (project paused, or the anon key was
  rotated without updating the workflow).
- **Run it on demand:** Actions → Supabase Keep-Alive → **Run workflow** (the `workflow_dispatch`
  button) — useful right after a rest week/holiday, or to test.
- **If you rotate the anon key:** update `SUPABASE_ANON_KEY` in the workflow file (it's inlined
  there, public-safe).
- **Upgrading to Pro** removes the pause entirely and makes this optional — worth it once your
  brother is a daily user.

---

## Things NOT to touch / handle with care
- **Don't commit directly to `main`.** Feature branch → PR → CI green → merge (see `AGENTS.md`).
- **Don't put the service-role key anywhere** outside the Supabase dashboard.
- **Don't hand-edit `auth.*` tables** in Supabase — use the dashboard Users UI.
- **The old Google Sheets webhook (`scripts/webhook.gs`)** is still deployed but no longer
  called after the Supabase cut-over. Harmless; leave it (reversing = repoint the drain back).

---

## Deeper references
- Architecture: `ARCHITECTURE.md`, `docs/planning/rebuild/ARCHITECTURE-NORTHSTAR.md`
- Supabase design: `docs/planning/rebuild/SUPABASE-MIGRATION-PLAN.md`
- Program format (future): `docs/planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md`
- Decisions & history: `docs/decision_log.md`, `docs/planning/roadmap/OPEN-DECISIONS.md`
