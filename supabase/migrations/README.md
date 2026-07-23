# Supabase migrations — Combat OS (Track B foundation)

These SQL files are the schema history for the multi-tenant Supabase backend
(project `pckokypnxrimayjmjgcl`, off-`main` on `feat/supabase-foundation`). See
`docs/planning/rebuild/SUPABASE-MIGRATION-PLAN.md` for the design.

## Provenance

Migrations are applied to the **remote** project via the Supabase MCP connector because there is no
local Supabase CLI stack. The first three were captured back into the repo on 2026-07-21 from
`supabase_migrations.schema_migrations`; later migrations are recorded here as they are applied.
Filenames use the Supabase CLI convention `<version>_<name>.sql` and match the versions recorded
remotely. Replaying them in version order on a fresh project reproduces the current live schema.

| Version | What it does |
|---|---|
| `20260720231445_init_sessions_profiles_rls` | `sessions` + `profiles` tables, RLS (`own sessions` / `own profile`, own-rows-only), and the `handle_new_user` trigger that auto-creates a profile on signup. |
| `20260720231512_lock_down_handle_new_user_execute` | Revokes EXECUTE on `handle_new_user()` from `public`/`anon`/`authenticated` (the trigger still fires — it runs as table owner). |
| `20260721090354_m3_profiles_auto_create_and_backfill` | Idempotent re-assert of the trigger (`on conflict do nothing`) + backfill of existing users. |
| `20260722184735_add_user_cartridge_access` | Adds per-user cartridge availability, constrains the active cartridge to that set, and narrows profile grants/RLS. |
| `20260722185014_index_profiles_active_cartridge` | Adds the covering index required by the active-cartridge composite foreign key. |

> Ordering note: migration 3 uses `create or replace function`, which **preserves**
> the grants revoked in migration 2 — so the lock-down survives a replay. Verified
> live: EXECUTE is held only by `postgres` + `service_role`.

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
