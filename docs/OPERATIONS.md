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

## Supabase — user management (magic-link, invite-only)

The app is **invite-only**: signups are OFF at the project level *and* the app refuses to create
accounts (`shouldCreateUser: false`). So **nobody gets in unless you add them first.**

### Add a user
Dashboard → **Authentication → Users → "Add user"** (top-right). Two options:
- **"Send invitation"** — email only; sends them an invite link immediately. Best when the
  person is ready to log in *right now* (e.g. onboarding your brother).
- **"Create new user"** — email + a throwaway password + tick **"Auto Confirm User"**. They
  never use the password; they log in via magic link from the app afterwards.

After the user exists, confirm that **Table Editor → `profiles`** contains a row with the same user
ID. The existing database trigger normally creates it automatically. Because the app signs in with
`shouldCreateUser: false`, adding the Auth user must happen before they request a magic link.

### Assign programs to a user

`user_cartridges` holds every program available to the user. Do not try to imitate multiple
assignments by typing several values into `profiles.assigned_cartridge`; that field holds one active
ID only and the database requires it to match one of the user's availability rows.

> A9a is database-only. The current Train UI still shows all bundled cartridges until the A9c loader
> and A9d assigned-only Library ship; the rows below prepare and protect that later behaviour.

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
7. After A9c/A9d ship, save, then have the user open Library while online and tap Retry/reopen the
   app. After the first successful load, the list is cached for offline browsing.

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

### Magic-link facts to remember
- **One tap, one time per device.** The session persists + auto-refreshes for months.
- **Links expire (default 1 hour) and are single-use.** Never pre-send — generate when ready.
  (Change under Auth → Emails → OTP expiry, up to 24h.)
- The email also carries an **8-digit code** as an alternative to clicking the link.
- **Built-in email is test-grade + rate-limited** (a few/hour). Fine for you + brother. Before
  onboarding more people, add a **custom SMTP** (Resend/SendGrid) in Auth settings, or you'll
  hit "email rate limit exceeded."
- **Redirect allowlist matters.** A link only lands if its target is the **Site URL** or in the
  **Redirect URLs** list (Authentication → URL Configuration). Missing entry = broken login.
- Expired link? They just request another from the sign-in screen (works for existing users
  even with signups off).

### Other Supabase self-serve
- **See who exists / their data:** Authentication → Users; Table Editor → `profiles` / `sessions`.
- **Security check after any schema change:** Advisors → Security (the "leaked password" warning
  is irrelevant to us — we're passwordless).
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
