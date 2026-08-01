# Supabase migrations — Combat OS backend

These SQL files are the schema history for the Supabase backend
(project `pckokypnxrimayjmjgcl`), which is **live in production**. See
`docs/planning/rebuild/SUPABASE-MIGRATION-PLAN.md` for the design.

> **Naming note.** An earlier revision titled this "Track B foundation", where
> "Track B" meant the *second user* (Apex). That label is now overloaded: in
> current vocabulary **Track B is the standalone onboarding site**
> (`CombatOS-Onboarding`) — a separate repository that shares this same Supabase
> project. This file covers the Combat OS app's schema history.
>
> **One project, one ledger.** Any migration applied to `pckokypnxrimayjmjgcl` —
> including one authored for the onboarding site — is recorded here, under the
> version string it carries live.

## Provenance

Migrations are applied to the **remote** project via the Supabase MCP connector because there is no
local Supabase CLI stack. The first three were captured back into the repo on 2026-07-21 from
`supabase_migrations.schema_migrations`; later migrations are recorded here as they are applied.
Filenames use the Supabase CLI convention `<version>_<name>.sql` and match the versions recorded
remotely. Replaying them in version order on a fresh project reproduces the current live schema.

**Reconciled 2026-08-01.** `add_body_metrics` was committed as `20260731180314` but applied live as
`20260731202537`, breaking the "filenames match the versions recorded remotely" invariant stated
above. The file was renamed to the live version after verifying the SQL is identical — comments and
whitespace stripped, md5 `4bc0035d06fa4044d9500047785ab027`, 2497 chars, matching
`supabase_migrations.schema_migrations`. Bookkeeping only; no schema change.

| Version | What it does |
|---|---|
| `20260720231445_init_sessions_profiles_rls` | `sessions` + `profiles` tables, RLS (`own sessions` / `own profile`, own-rows-only), and the `handle_new_user` trigger that auto-creates a profile on signup. |
| `20260720231512_lock_down_handle_new_user_execute` | Revokes EXECUTE on `handle_new_user()` from `public`/`anon`/`authenticated` (the trigger still fires — it runs as table owner). |
| `20260721090354_m3_profiles_auto_create_and_backfill` | Idempotent re-assert of the trigger (`on conflict do nothing`) + backfill of existing users. |
| `20260722184735_add_user_cartridge_access` | Adds per-user cartridge availability, constrains the active cartridge to that set, and narrows profile grants/RLS. |
| `20260722185014_index_profiles_active_cartridge` | Adds the covering index required by the active-cartridge composite foreign key. |
| `20260731202537_add_body_metrics` | Adds `body_metrics` (owner-keyed weight log) and `coach_athletes`, their RLS, and the `is_coach_of` helper. Applied live 2026-07-31. |

> Ordering note: migration 3 uses `create or replace function`, which **preserves**
> the grants revoked in migration 2 — so the lock-down survives a replay. Verified
> live: EXECUTE is held only by `postgres` + `service_role`.

## Pending — not yet applied

| File | What it does |
|---|---|
| `PENDING_onboarding_pilot1.sql` | Creates `onboarding_cases`, `onboarding_case_events` and `onboarding_responses` for **Track B** (`CombatOS-Onboarding`), with their RLS, column-limited client grants, the `onboarding_responses_guard` trigger and the `onboarding_case_is_open` helper. Recorded here under rule **R5** — one project, one ledger — even though the tables belong to the onboarding site. Verification procedure: `README-onboarding-pilot1-verification.md`. |

**This file has no version string because it has not been applied.** The version
is assigned by Supabase at apply time, and guessing it is exactly what produced
the drift reconciled on 2026-08-01 (below). It is named `PENDING_` on purpose so
it cannot be mistaken for applied history.

### Apply it as one transaction, through the migration path

Paste the **whole file** — it is wrapped in `begin; … commit;` and is meant to
land atomically. Do not run it statement by statement. This project's default
privileges still auto-grant `anon` full CRUD on new `public` tables (verified
2026-08-01 in `pg_default_acl`), so between `create table` and the
`revoke all … from public, anon, authenticated` near the foot of the file there
is a window in which all three tables are world-writable. Inside one transaction
no other session ever observes that window; committed statement-by-statement, it
is real.

**Use `apply_migration` (the Supabase MCP connector), the same path
`add_body_metrics` took — not the SQL Editor.** The distinction is not cosmetic:

> ⚠️ **The SQL Editor does not write to `supabase_migrations.schema_migrations`.**
> Applying there leaves the schema live, this repo holding a file, and the live
> ledger with no entry — precisely the R5 breach the one-ledger rule exists to
> prevent, and step 1 below would have nothing to read.

If the SQL Editor is used anyway, the ledger row must be written by hand
afterwards, as `postgres`, carrying the **entire file text** as the single
statement element (that is the shape all six existing rows have):

```sql
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('<YYYYMMDDHHMMSS-utc>', 'onboarding_pilot1', array[$mig$<entire file>$mig$]);
```

The version must be 14 digits UTC and sort after `20260731202537`.

**After the developer applies it:**

1. Read the assigned version back from the live ledger:
   ```sql
   select version, name from supabase_migrations.schema_migrations order by version desc limit 1;
   ```
2. Rename the file to `<version>_onboarding_pilot1.sql`.
3. Move its row from this section into the table above.
4. Record the applied-to-production result at the foot of
   `README-onboarding-pilot1-verification.md`, in the same shape as the
   `add_body_metrics` entry.

This is the same reconciliation `add_body_metrics` needed after the fact; doing
it as a planned step is the point of the `PENDING_` name.

## What is NOT in here (deliberately)

- **Auth settings** — magic-link config, allowed redirect URLs, and
  **"Allow new users to sign up" (off = invite-only)** live in the Supabase
  **dashboard / Auth config**, not in SQL migrations. Invite-only is also
  enforced app-side via `shouldCreateUser: false` (see `app/src/auth/AuthProvider.jsx`).
- **Secrets** — the `anon`/publishable key is a client env var (`VITE_SUPABASE_*`,
  public-safe); the service-role key never touches the repo.

## Applying to a fresh project (future reference)

With the Supabase CLI linked to the project:

```bash
supabase db push          # applies any migrations not yet recorded remotely
```

Since these are already applied to `pckokypnxrimayjmjgcl`, `db push` there is a
no-op — they exist for reproducibility / disaster recovery / a second project.
