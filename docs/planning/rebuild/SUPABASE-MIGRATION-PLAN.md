# Supabase Foundation — Migration Design (Track B, Milestone 1)

> **STATUS: DESIGN / DIAGNOSTIC — approve before any code.** Scope decided 2026-07-20:
> Supabase multi-tenant backend on the CURRENT Combat OS (foundation only, not the cartridge
> rebuild), **developed entirely off `main`** on this long-lived `feat/supabase-foundation`
> branch with its own preview deployment, **clean-cut** from Google Sheets (freeze the Sheet as
> a read-only archive). Production (`main`) keeps running on Sheets until this is proven, then
> merges as a unit. See `ARCHITECTURE-NORTHSTAR.md` for the surrounding vision.

---

## 1. What this delivers (and explicitly does NOT)

**Delivers:** you, logged in on the current Combat OS, with your training data in Supabase —
durable, multi-device, offline-first. Plus the multi-tenant plumbing (auth, per-user isolation)
that future users sit on.

**Does NOT deliver:** your brother on "his cartridge." That needs the cartridge renderer
(Track A), which is the NEXT effort. This milestone is the foundation his onboarding will use,
not his onboarding itself.

## 2. Current architecture (verified in code)

- `logSession(sessionData)` (`db/index.jsx:520`) writes the session to the local Dexie
  `sessions` table, then `enqueueSync({ sessionId, attempts, payload })` adds an envelope to the
  Dexie `syncQueue` table.
- `trySyncQueue` (`sync/syncQueue.js:32`) drains the queue, POSTing each `payload` to the
  webhook URL (`getSetting('webhookUrl')`) with `mode: 'no-cors'` (opaque response — success is
  inferred, failures can't be read). Success → delete from queue; failure → `attempts++`
  (cap `MAX_ATTEMPTS = 5`).
- `initSyncListeners` auto-drains on `online` + `focus`.

**Key insight:** the offline-first queue is already the right architecture. Migration =
**swap the queue's drain target** (webhook fetch → Supabase insert). Queue mechanics, retry,
offline handling, and listeners are all reused. Bonus: Supabase returns REAL responses, so we
finally get true success/failure detection instead of opaque no-cors guessing.

## 3. Target architecture

```
[ UI ] → logSession → [ Dexie: sessions (local, offline) ] + [ Dexie: syncQueue ]
                                                                     │  drains when online + authed
                                                                     ▼
                                                      [ Supabase: sessions (JSONB, RLS) ]
```

Dexie stays the local source of truth (gym-basement offline is non-negotiable). Supabase is the
durable sync target + multi-device backend. No Supabase-only reads on the hot path.

## 4. Supabase data model (Postgres)

**`sessions`** — generic, so the later cartridge rebuild changes the PAYLOAD, not the table
(avoids a second migration):
```sql
create table sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  created_at        timestamptz not null default now(),
  cartridge_id      text,                         -- which program produced this (future-proofing)
  client_session_id text not null,                -- the app's local session id (idempotency)
  payload           jsonb not null,               -- the full session envelope, schema-flexible
  unique (user_id, client_session_id)             -- idempotent retries: a re-sent row is a no-op
);
```

**`profiles`** — app-level user metadata (the human-readable roster):
```sql
create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  display_name       text,
  role               text not null default 'user',   -- 'user' | 'admin'
  assigned_cartridge text,
  created_at         timestamptz not null default now()
);
```

**Row-Level Security (the security-critical part):**
```sql
alter table sessions enable row level security;
alter table profiles enable row level security;

-- Each user sees/writes ONLY their own rows.
create policy "own sessions" on sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
```
Admin cross-user analytics is done SERVER-SIDE with the service-role key (Supabase dashboard /
SQL / a future serverless function) — never from the client. No client-side admin path in M1.

## 5. Auth

- **Magic link (passwordless email OTP).** One emailed link, tapped once on the phone → logged
  in. `supabase-js` persists the session and auto-refreshes the token, so it's a **one-time**
  login per device (survives app closes for months). No passwords.
- **Public signup DISABLED** in the Supabase Auth settings — invite-only. You create accounts;
  no randoms from the public/demo URL.
- **Minimal sign-in screen**: email field → "Send link". A signed-out app shows only this.
- Sync only runs when a session exists (guard in `trySyncQueue`).

## 6. The sync repoint (code changes, M2)

- Add `@supabase/supabase-js` (triggers the from-scratch lockfile-regen policy).
- New `sync/supabaseClient.js`: creates the client from env (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`).
- Change the queue drain (in `syncQueue.js` or a new `supabaseSync.js`): replace the webhook
  `fetch` with `supabase.from('sessions').insert({ user_id, cartridge_id, client_session_id,
  payload })`. Success → delete from queue; `409/conflict` (already-synced) → also treat as
  success (idempotent); other errors → `attempts++`. Reuse `MAX_ATTEMPTS`, listeners, everything.
- `logSession` unchanged in shape — it still writes Dexie + enqueues; only the drain differs.
- **Existing sync tests** (`db/syncQueue.test.js`) get updated to the Supabase drain (mock the
  client), preserving the queue-mechanics coverage.

## 7. Sheets cut-over (clean cut)

- Stop draining to the webhook; drain to Supabase. The old Google Sheet is **frozen as a
  read-only archive** — nothing new is written to it.
- `scripts/webhook.gs` is **left in place, just no longer called** (it's hand-deployed and
  harmless; deleting it is unnecessary and risky). Reversing the migration = repoint the drain
  back.
- **This deliberately supersedes AGENTS.md rule 2** (frozen Sheets/webhook write path) for the
  write path only. The north-star doc already committed to this; it gets its own `decision_log`
  entry at the next goodnight.

## 8. Secrets & environment

- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in env. The **anon key is public-safe by
  design** — it's the client key, and RLS is what actually protects data. Fine in the client
  bundle / Cloudflare env vars.
- The **service-role key NEVER touches the client or the repo.** Server-side/admin only.
- `.env` gitignored; commit a `.env.example` with the variable names (no values).
- Cloudflare Pages: env vars set per-environment, so the preview branch points at Supabase while
  production (main) still has none / stays on Sheets.

## 9. Branch & deploy strategy (the "not in main" requirement)

- All work lands on **`feat/supabase-foundation`** (this branch), which does **not** merge to
  `main` until validated. Sub-milestones can be small commits or draft-PRs into the branch.
- **Cloudflare preview deployment** gives the branch its own URL. You test Supabase THERE, on
  your phone, while your daily-driver production app stays on `main`/Sheets, untouched.
- Only when RLS isolation + offline sync are proven do we merge to `main` as a unit and cut
  production over.

## 10. Milestones (all on this branch)

| M | Scope | You can test |
|---|-------|--------------|
| **M1** | `supabase-js` + env + client + magic-link auth + sign-in screen | Log in once on the preview URL; session persists |
| **M2** | `sessions` table + RLS + repoint queue drain to Supabase | Log a session offline → reconnect → row appears in Supabase, tagged to you |
| **M3** | `profiles` + roles + **RLS isolation test** (2nd account can't see your rows) | Prove data isolation before trusting it |
| — | (Brother onboarding needs Track A cartridges — out of scope here) | |

## 11. What I need from you (provisioning — I can't create your cloud account)

1. **Create the Supabase project** (free tier is fine to start) and pick a region (closest to
   you — e.g. EU/London). Share the **project URL** + **anon key**. Keep the service-role key to
   yourself; I never need it in the client.
2. Confirm **magic-link email**: Supabase's built-in email works for low volume (rate-limited);
   a custom SMTP is a later nicety.
3. Confirm you'll keep using **production (main)/Sheets for real training** until this is proven,
   testing Supabase on the preview URL — so a bug here never costs you a real session.

## 12. Risks & mitigations

- **RLS misconfig → data leak** (the big one): explicit M3 two-account isolation test is the gate
  before trusting it. No merge to main until it passes.
- **Free-tier pausing** (D7's original gate): note it; a keep-alive or paid tier is a later call.
  Does not block M1–M3.
- **Magic-link deliverability** (spam folder): test on your real email early.
- **`supabase-js` dependency**: lockfile regen + clean `npm ci` verification per standing policy;
  watch bundle size (PWA precache).
- **Success-detection change**: the webhook was opaque (`no-cors`); Supabase gives real
  ok/error — the queue's success branch changes from "opaque assumed-ok" to "real ok / ignore
  conflict". Handle explicitly so retries stay idempotent.

## 13. Open decisions to log (next goodnight)

- **Committed:** Track B foundation on current Combat OS, off `main`, clean-cut Sheets.
- **Committed:** generic JSONB `sessions` table so the cartridge rebuild needs no 2nd migration.
- **Committed:** rule-2 write-path supersession (webhook → Supabase).
- **Open:** admin analytics surface (dashboard/SQL now; app-side later?).
- **Open:** free-tier keep-alive vs paid (D7) — revisit when usage is real.
