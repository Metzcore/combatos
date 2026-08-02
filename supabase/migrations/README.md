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
| `20260802065508_onboarding_pilot1` | Adds `onboarding_cases`, `onboarding_case_events` and `onboarding_responses` for **Track B** (`CombatOS-Onboarding`), their RLS, column-limited client grants, the `onboarding_responses_guard` trigger and the `onboarding_case_is_open` helper. Recorded here under **R5** — one project, one ledger — even though the tables belong to the onboarding site. Applied live 2026-08-02. Verification: `README-onboarding-pilot1-verification.md`. |

> Ordering note: migration 3 uses `create or replace function`, which **preserves**
> the grants revoked in migration 2 — so the lock-down survives a replay. Verified
> live: EXECUTE is held only by `postgres` + `service_role`.

**Reconciled 2026-08-02.** `onboarding_pilot1` was applied through the Supabase **SQL
Editor**, which executes DDL but does **not** write `supabase_migrations.schema_migrations`.
That left the schema live with no ledger row — an R5 breach in the opposite direction to
2026-08-01's: not a version mismatch, but no version at all. The row was inserted by hand as
`20260802065508`, carrying the full file text as its single `statements` element, and the file
renamed from `PENDING_onboarding_pilot1.sql` to match. Bookkeeping only; no schema change.

Fidelity was verified rather than assumed, in two steps:

1. **At insert:** the text written to the ledger was byte-identical to the repo file as it then
   stood — md5 `c3d16bb3185948f21837c1ba90dd6157`, 18330 chars (LF-normalised), computed
   independently on both sides. No transcription drift.
2. **After the header fix:** the file's opening comment then had to change, because it still read
   "NOT YET APPLIED" — actively misleading on an applied migration. The ledger text was left
   alone, since it must record what actually ran. So the two now differ, and the divergence was
   pinned rather than waved at: substituting the new header block back into the ledger text
   reproduces the repo file **byte for byte** (md5 `fc084159c627531fa8fa39eb891f645a`, 18958
   chars). That comment block is the only difference; every executable statement is identical.

This is the same "comments differ, SQL is identical" standard applied to `add_body_metrics` on
2026-08-01, but checked by exact substitution rather than by stripping comments.

> **The version is the ledger-recording time, not the apply time.** The SQL Editor records no
> apply timestamp and `pg_stat_file` is not grantable here, so the exact apply minute is
> unrecoverable — it is known only to be earlier the same day. The version's job is to sort
> after `20260731202537` and match the filename, which it does. Do not read it as forensic.

**If you apply a migration here again, use `apply_migration` (the Supabase MCP connector), not
the SQL Editor** — it writes the ledger row for you and this whole reconciliation never happens.
Paste any migration whole rather than statement-by-statement: these files are wrapped in
`begin; … commit;`, and this project's default privileges still auto-grant `anon` full CRUD on
new `public` tables (verified 2026-08-01 in `pg_default_acl`), so a per-statement run opens a
real window between `create table` and the matching `revoke`.

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
