# Onboarding Site — Implementation Plan

**Status:** approved build plan. Intended to be handed to an implementation agent (Antigravity /
Gemini 3.1 Pro) as a self-contained brief.

**Deliverable:** a one-page authenticated onboarding questionnaire, deployed as its own Cloudflare
Pages project, sharing the existing Supabase project.

**Not in this build:** the client dashboard, file upload, profile pictures, any agent or LLM call,
any change to the Combat OS PWA.

---

## 1. Objective

A signed-in client opens a link, sees `Hi <name>`, answers the questionnaire from
`ONBOARDING-QUESTION-SPEC.md`, can leave and resume at any point, and submits once. On submit the
answers persist to Supabase and a webhook notifies the coach.

The bar is a **premium one-to-one coaching** feel: calm, uncluttered, fast, obviously personal. No
navigation bar. No footer. No marketing. Nothing on the page that isn't the questionnaire.

---

## 2. Stack

Match the existing app so there is one toolchain, not two.

| Concern | Choice |
|---|---|
| Framework | React 18 |
| Build | Vite 5 |
| Data / auth | `@supabase/supabase-js` v2 |
| Hosting | Cloudflare Pages — **a new project**, not the PWA's |
| Routing | Minimal — two routes is not worth a router dependency |

**Do not** add Dexie, a service worker, PWA plugins, or offline support. This is an online,
short-lived, read-write page.

---

## 3. Supabase

⚠️ **One production-schema baton.** The coach is the only actor who applies a migration against the
real Supabase project — never an implementation agent, never either parallel track. Protocol,
confirmed with the Track A agent before this was written (2026-07-30):

1. This migration is committed as one reviewed file.
2. Before it runs, re-check that no other track has an uncommitted or pending schema change.
3. The coach applies it, then immediately verifies migration history, RLS is enabled, and the RLS
   test matrix below — the same session, before anyone builds against it.
4. Test first against an isolated **long-lived branch + its own Cloudflare Pages preview**, pointed
   at Supabase via env vars — the same pattern already proven for Milestone 1
   (`SUPABASE-MIGRATION-PLAN.md` §9). This is a **git branch + preview deployment**, not Supabase's
   paid database-branching product — confirm that reading with Track A before relying on it, the
   two are not interchangeable.

### Correction versus the original draft of this section

`profiles.display_name` **already exists** (migration `20260720231445_init_sessions_profiles_rls.sql`)
— caught by the Track A agent when this plan was reviewed cross-track, verified directly against the
migration file rather than taken on trust. **No `ALTER TABLE` is needed.** It is currently
auto-populated with the user's email at signup and read nowhere in the app, so it is safe to
overwrite. The onboarding flow's write to it (§8) is the column's first real use.

### Schema

```sql
-- Questionnaire responses. display_name is NOT touched here — it already exists on profiles
-- and is written by the onboarding flow itself once a client submits (see §8), not by migration.
create table if not exists public.onboarding_responses (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  answers     jsonb not null default '{}'::jsonb,
  status      text  not null default 'in_progress'
              check (status in ('in_progress','submitted')),
  updated_at  timestamptz not null default now()
);

alter table public.onboarding_responses enable row level security;
```

### Row Level Security — in the same migration, never later

```sql
create policy "own row: read" on public.onboarding_responses
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "own row: create" on public.onboarding_responses
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "own row: update" on public.onboarding_responses
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

⚠️ **This is deliberately three split policies, not the single `for all` pattern used by
`sessions`/`profiles`.** That's intentional — it's how "everything but delete" is expressed. A future
edit that "simplifies" this back to `for all` would silently grant clients delete on their own
intake. Leave it split.

**No delete policy** — clients cannot delete their intake. The coach reads across clients using the
**service role from n8n**, never from a browser.

**Do not** add columns to `auth.users`; it is Supabase-managed. **Do not** alter existing policies on
`profiles`, `sessions`, or `user_cartridges`.

### Verification before any client uses it

Prove, using the **anon key with each user's own JWT** — not the service role, which bypasses RLS
and proves nothing:

1. a client can read and write their own row;
2. a client **cannot** read another client's row;
3. a client **cannot** delete any row;
4. an unauthenticated request gets nothing;
5. the `select` policy specifically is present and correct — Postgres/Supabase requires a matching
   `select` grant for `update` to behave correctly, so a missing or wrong `select` policy can break
   saves in a way that looks like an RLS bug elsewhere;
6. the `authenticated` role has ordinary Data API access to the table. RLS governs which *rows* a
   query can touch — it does not by itself grant table access; confirm that ordinary Data API
   permissions are intact (they should be, by default, for a plain `create table`, but check rather
   than assume).

---

## 4. Auth flow

Magic link, which is already live in production for the PWA.

1. Coach creates the user and triggers a magic link to their email.
2. Client clicks it, lands on the site already authenticated.
3. Session persists, so returning later needs no new link within the session's lifetime; an expired
   session simply requests a fresh link.

**No slugs.** A URL slug that grants access is a capability URL — it leaks through referrers,
browser history, and screenshots, and cannot be revoked. Personalisation comes from the
authenticated user's `display_name`, not from the URL. If a vanity path is ever wanted, it must be
cosmetic only, never the access mechanism.

**No password fields anywhere on this site.**

---

## 5. Routes

| Route | Purpose |
|---|---|
| `/` | The questionnaire. Redirects to a "check your email" state if unauthenticated. |
| `/auth/callback` | Consumes the magic-link token, then redirects to `/`. |

`/dashboard` is deliberately **not** built now. Leave the structure able to accept it later.

---

## 6. Page structure

```
                    Hi {display_name}
          Please fill up the questionnaire

              [ progress indicator ]

                  [ Section A ]
                  [ Section B ]
                  [ Section C ]
                  [ Section D ]

                    [ Submit ]
```

- Greeting centred at the top, `display_name` from `profiles`; fall back to a neutral "Hi there" if
  it is null or looks like an email address — the existing signup trigger auto-populates
  `display_name` with the user's **email** (§3), so the coach must overwrite it with the client's
  real first name at account-creation time, or the page will otherwise greet them by their own
  email. Never render "Hi null" or an email in the greeting.
- One section visible at a time, with a quiet progress indicator. Progress reduces abandonment;
  an unbroken wall of seventeen questions increases it.
- Section intro lines come from the question spec — they are the "why I'm asking," and they are what
  makes this read as coaching rather than paperwork.
- Autosave on every answer change, debounced. A small, non-intrusive "saved" indicator.
- **No navigation bar, no footer, no logo lockup, no external links.**

### Accessibility and input quality

- Real `<label>` elements; the whole option row is tappable, not just the radio dot.
- Single-choice as large tap targets, not a dropdown.
- `max 2` on the priority question enforced in the UI — disable further options once two are picked,
  and say why.
- Mobile-first: most clients will open this on a phone from a messaging app.

---

## 7. Design tokens

Take these from the app's `app/src/index.css` so the two surfaces match:

| Token | Value |
|---|---|
| `--bg` | `#030503` |
| `--panel` | `#0a100a` |
| `--input` | `#111c11` |
| `--divider` | `#1b331b` |
| `--primary` | `#00ff66` |
| `--accent` | `#E8A020` |
| `--text` | `#e0ffe0` |
| `--dim` | `#5c8a5c` |
| `--label` | `#85c285` |
| `--radius-sm / md / lg` | `6px` / `10px` / `16px` |
| `--font` | `'Inter', system-ui, -apple-system, sans-serif` |

Dark surface, green primary, restrained accent. Use `--primary` for progress and the submit action
only — if everything is highlighted, nothing is.

---

## 8. Save, resume, submit

**Autosave:** debounced upsert into `onboarding_responses` with `status = 'in_progress'` and
`updated_at = now()`. One row per user, updated in place.

**Resume:** on load, read the row and rehydrate every answer, landing the client on the first
unanswered section.

**Submit:** set `status = 'submitted'`, then fire the n8n webhook. Requirements:

- disable the button while in flight, and after success;
- if the webhook fails, the answers are still saved — show a calm confirmation regardless and let
  the coach's own monitoring catch a missed notification. Never show the client an error caused by
  a notification failure;
- after submit the page becomes read-only and shows the closing message from the question spec.

**Webhook payload:** `user_id`, `display_name`, `status`, `updated_at`, and the `answers` object.
Nothing else. The n8n URL belongs in an environment variable, never committed.

---

## 9. Testing with burner users

1. Create test users with `+` aliasing on your own address — `you+pilot01@…`, `you+pilot02@…`. They
   are distinct Supabase identities, and all mail lands in one inbox.
2. Run the **full journey** on a phone: magic link → answer partially → close the tab → reopen →
   resume → submit.
3. Run the RLS matrix in §3 with two different test users.
4. Confirm the n8n workflow fires and the Telegram message arrives.
5. Confirm nothing identifying appears in any committed file.

---

## 10. Explicit non-goals

Do **not** build, add, or touch:

- file or image upload of any kind;
- profile pictures or Supabase Storage;
- any LLM or agent call from this site;
- analytics, tracking pixels, cookie banners, or third-party scripts;
- any change to the Combat OS PWA, its Dexie schema, the webhook payload, the Google Sheets
  integration, `playbook.js`, `%1RM`/e1RM logic, or cartridge assignment;
- any change to the n8n stack itself — new workflows only.

---

## 11. Acceptance criteria

1. A signed-in client sees their own name and no one else's data.
2. Every question in `ONBOARDING-QUESTION-SPEC.md` renders with the correct type and options.
3. Answers survive closing the tab and reopening from a fresh magic link.
4. The RLS matrix in §3 passes, tested with the anon key and real user JWTs.
5. Submit persists, fires the webhook, and the page becomes read-only.
6. The page is usable one-handed on a phone.
7. No navigation bar, footer, or external link exists anywhere on the page.
8. No secret is committed — Supabase anon key via environment variable, n8n URL via environment
   variable, service-role key **never present in this project at all**.
