# Manual verification: `PENDING_onboarding_pilot1.sql`

This is a hand-run procedure for the developer to execute in the Supabase **SQL
Editor** (or `psql` against the project connection string) after applying the
migration, before trusting it with a real client's data. It is not automated and
this migration was **not applied by the agent that wrote it**.

The tables are Track B's (`CombatOS-Onboarding`); the migration and this
procedure live in Track A because of rule **R5** — one Supabase project, one
migration ledger. See `docs/engineering/SHARED-SUPABASE-BOUNDARY.md`.

> **Rename after applying.** The file is named `PENDING_onboarding_pilot1.sql`
> because the live version string is assigned when the developer applies it, and
> guessing it re-creates the exact drift that had to be reconciled on 2026-08-01.
> After applying, read the version back from
> `supabase_migrations.schema_migrations` and rename the file to
> `<version>_onboarding_pilot1.sql`. See `README.md`.

## Read this first: service-role tests do not prove client RLS

**A test run with the service role proves nothing about what a client can do.**
`service_role` holds the `BYPASSRLS` role attribute (verified live 2026-08-01,
`pg_roles.rolbypassrls = true`), so every policy in this migration is skipped for
it. `FORCE ROW LEVEL SECURITY` does not change that — `BYPASSRLS` outranks
`FORCE`. A "service role can read the case, so the schema works" check is a
tautology: it would pass identically against a table with no policies at all.

The same applies to the SQL Editor's default connection, which is `postgres` —
also `BYPASSRLS`.

Every check below therefore either switches role and impersonates a specific
user via the `request.jwt.claims` session setting that `auth.uid()` reads from
(§0–§7), or goes over real HTTP with a real access token (§8). Run each numbered
block as its own statement or transaction; `reset role;` between blocks so the
impersonation does not leak into the next check.

§8 is the only section that exercises the actual Data API path — grants, Data
API exposure and PostgREST — and it is **not optional**. §1–§7 can all pass while
the table is unreachable over HTTP.

---

## Invite lifecycle — the rules the columns encode

`invite_expires_at` and `invite_revoked_at` exist because the draft had no way to
withdraw or time-bound an invite. Columns without rules just create a new failure
mode, so these are the rules. They are the specification the Worker must
implement; §4 verifies the part the database enforces.

### States

| State | Predicate |
|---|---|
| **Active** | `invite_revoked_at is null and (invite_expires_at is null or invite_expires_at > now())` |
| **Expired** | `invite_revoked_at is null and invite_expires_at <= now()` |
| **Revoked** | `invite_revoked_at is not null` |

`invite_expires_at is null` means *never expires* — the Pilot 1 default. A hard
clock that strands the one pilot client is a worse failure than an invite that
outlives its usefulness. Set an expiry once the flow is proven.

### 1. Issue

The Worker generates a cryptographically random token, stores **only** its
SHA-256 hex in `invite_token_hash`, and sets `invite_issued_at = now()`,
`invite_expires_at` to the chosen window (or `null`), `invite_revoked_at = null`.
The raw token is returned exactly once in the create-case response and is never
persisted, logged, or written to any decision log or runbook.

**Ordering constraint:** the case row must exist *before* the magic link is sent.
The insert policy consults the case, so a client who authenticates before their
case row exists cannot create a response row. This fails loudly at first entry,
which is the right time for it to fail.

### 2. First use

The client presents the token to the Worker's verify endpoint. The Worker checks
three things: the hash matches, the case is **active**, and the JWT's `sub`
equals the case's `user_id`. Any failure returns 403 with no case data.

**The token is not consumed.** It stays valid until it expires or is revoked. A
client who closes the tab before finishing must be able to open the same link
again, and a single-use token would make that a support incident on day one.

### 3. Resume after partial completion

Resume does **not** re-check the invite. Once the `onboarding_responses` row
exists, the client's own JWT plus the owner select/update policies authorize
reading and continuing it; those policies do not reference `onboarding_cases`.

This is deliberate. The invite gates *entry*, not the *session*.

### 4. Expiry

An expired invite makes `onboarding_case_is_open()` return false, so the RLS
insert policy rejects creation of a new response row. It does **not** touch a row
that already exists — an expired invite cannot strand a half-finished
questionnaire. The Worker should additionally refuse verify for an expired case,
so the client gets a clear message rather than an RLS error.

### 5. Revocation

`invite_revoked_at = now()` is the manual form of expiry — wrong recipient,
client withdrew, case abandoned. It has exactly the same database effect: entry
blocked, existing row untouched.

> **Revocation is not a mid-questionnaire kill switch.** Say this out loud rather
> than discovering it during an incident. If a client has already created a
> response row, setting `invite_revoked_at` does **not** cut off their access to
> it. To actually terminate a started case the Worker must `delete` the
> `onboarding_responses` row using the service role and record an
> `onboarding_case_events` row of `kind = 'system'`. Revoking the invite as well
> is what stops them starting again.

### 6. Reissue

Reissue overwrites the same case row: new `invite_token_hash`,
`invite_issued_at = now()`, a fresh `invite_expires_at`, and
`invite_revoked_at = null`. The old token dies automatically because only one
hash is stored per case and the index on it is unique. Log an
`onboarding_case_events` row of `kind = 'system'`.

Reissue after revocation is explicitly permitted — clearing `invite_revoked_at`
*is* the un-revoke. There is no separate un-revoke operation.

---

## 0. Set up test fixtures

Replace the UUIDs with real ones, or create throwaway users first (Supabase Auth
admin / dashboard) and substitute their ids. Keep `USER_A` and `USER_B` distinct.
`USER_C` needs no case at all — it is the "ordinary authenticated user with no
onboarding case" control.

⚠️ These are throwaway rows in a **shared production database**. Do not skip §9.

```sql
-- Run as postgres (default SQL Editor role) -- trusted, service-side writes.
set role postgres;

insert into public.onboarding_cases
  (handle, user_id, client_first_name, client_email, invite_token_hash, dossier_path)
values
  ('verify-a', '<USER_A>', 'A', 'a@example.invalid', encode(sha256('token-a'::bytea), 'hex'), 'operations/verify-a'),
  ('verify-b', '<USER_B>', 'B', 'b@example.invalid', encode(sha256('token-b'::bytea), 'hex'), 'operations/verify-b');

reset role;
```

**Expected:** both inserts succeed. `postgres` bypasses RLS.

Note the fixtures deliberately leave `invite_expires_at` and `invite_revoked_at`
null — both cases start **active**. §4 changes that.

---

## 1. Owner A reads and writes only their own row

```sql
set role authenticated;
set request.jwt.claims = '{"sub": "<USER_A>", "role": "authenticated"}';

-- 1a. A creates their questionnaire row. spec_version has no default, so it
-- must be supplied -- omitting it is meant to fail loudly, not stamp a guess.
insert into public.onboarding_responses (user_id, answers, spec_version)
values ('<USER_A>', '{"q1": "yes"}'::jsonb, '2026-08-01');

select user_id, status, spec_version, created_at, updated_at
from public.onboarding_responses;
```
**Expected:** the insert succeeds; the select returns exactly **1 row**,
`user_id = <USER_A>`, `status = 'in_progress'`, and `created_at = updated_at`
(the trigger set both on the INSERT path — the client never sent either).

```sql
-- 1b. A updates their own in-progress row.
update public.onboarding_responses
set answers = '{"q1": "yes", "q2": 3}'::jsonb
where user_id = '<USER_A>';

select answers, created_at, updated_at from public.onboarding_responses;
```
**Expected:** succeeds; `updated_at > created_at`, proving the trigger fires on
the UPDATE path too and `created_at` was preserved from `old`.

```sql
-- 1c. A cannot create a row under someone else's user_id.
insert into public.onboarding_responses (user_id, answers, spec_version)
values ('<USER_B>', '{}'::jsonb, '2026-08-01');
```
**Expected:** fails — `new row violates row-level security policy`. The insert
policy's `with check` requires `auth.uid() = user_id`.

```sql
-- 1d. A cannot forge a timestamp on the way in or on the way out. These are
-- COLUMN-grant failures, not RLS failures -- authenticated was never granted
-- insert/update on created_at or updated_at.
insert into public.onboarding_responses (user_id, answers, spec_version, updated_at)
values ('<USER_A>', '{}'::jsonb, '2026-08-01', '2020-01-01');
```
**Expected:** fails — `permission denied for column updated_at of relation
onboarding_responses` (it fails on the column privilege before the PK conflict
is even reached).

```sql
update public.onboarding_responses set updated_at = '2020-01-01' where user_id = '<USER_A>';
```
**Expected:** fails — `permission denied for column updated_at ...`.

```sql
-- 1e. A cannot rewrite the identity of their own row.
update public.onboarding_responses set user_id = '<USER_B>' where user_id = '<USER_A>';
```
**Expected:** fails — `permission denied for column user_id ...`. This is the
defect the draft carried: its blanket `grant select, insert, update` would have
allowed this statement to reach RLS, where the `with check` would then have
rejected it — a second-layer save for something that should never reach layer
two at all.

```sql
reset role;
```

---

## 2. Owner B cannot see or touch A's row

```sql
set role authenticated;
set request.jwt.claims = '{"sub": "<USER_B>", "role": "authenticated"}';

select user_id, answers from public.onboarding_responses;
```
**Expected:** **0 rows.** A's row is invisible to B.

```sql
update public.onboarding_responses set answers = '{"hacked": true}'::jsonb
where user_id = '<USER_A>';
```
**Expected:** succeeds at the statement level but affects **0 rows** — the
`using` clause filters A's row out of B's visible set before the update can touch
it. Re-select as A afterwards to confirm `answers` is unchanged.

```sql
reset role;
```

---

## 3. `anon` is denied entirely, on all three tables

```sql
set role anon;

select * from public.onboarding_responses;
```
**Expected:** fails — `permission denied for table onboarding_responses`. This is
a **grant** failure, not an empty-set RLS filter: `anon` holds no privileges on
this table at all, so it fails before any policy is evaluated.

This check is doing real work on this project. Verified live 2026-08-01,
`pg_default_acl` still carries the legacy Supabase default that auto-grants full
CRUD on new `public` tables to `anon`. Without the migration's
`revoke all ... from public, anon, authenticated`, this select would **succeed**.

```sql
select * from public.onboarding_cases;
select * from public.onboarding_case_events;
```
**Expected:** both fail the same way — `permission denied for table ...`.

```sql
reset role;
```

---

## 4. The invite gate — expiry and revocation block entry, and nothing else

This is also the canary for the `BYPASSRLS` dependency described in the
migration's comment on `onboarding_case_is_open()`. If 4a fails, the function
cannot read `onboarding_cases` and **no client can ever start a questionnaire**.

```sql
-- 4a. B's case is active, so B can create a row.
set role authenticated;
set request.jwt.claims = '{"sub": "<USER_B>", "role": "authenticated"}';

insert into public.onboarding_responses (user_id, answers, spec_version)
values ('<USER_B>', '{"q1": "no"}'::jsonb, '2026-08-01');

select public.onboarding_case_is_open();
```
**Expected:** the insert succeeds and the function returns `true`.

```sql
reset role;

-- 4b. Revoke B's invite, then confirm B can still read and edit the row they
-- already started. This is the documented rule, not a bug -- revocation gates
-- entry, not the session.
set role postgres;
update public.onboarding_cases set invite_revoked_at = now() where handle = 'verify-b';
reset role;

set role authenticated;
set request.jwt.claims = '{"sub": "<USER_B>", "role": "authenticated"}';

select public.onboarding_case_is_open();
select user_id, answers from public.onboarding_responses;
update public.onboarding_responses set answers = '{"q1": "no", "q2": 1}'::jsonb
where user_id = '<USER_B>';
```
**Expected:** the function now returns `false`; the select still returns B's 1
row; the update still succeeds and affects 1 row. **If you wanted this to cut B
off, revocation is the wrong tool — delete the response row via the service
role.**

```sql
-- 4c. With the invite revoked, B cannot start over. Delete the row first (as
-- postgres, standing in for the Worker's reset path), then retry the insert.
reset role;
set role postgres;
delete from public.onboarding_responses where user_id = '<USER_B>';
reset role;

set role authenticated;
set request.jwt.claims = '{"sub": "<USER_B>", "role": "authenticated"}';

insert into public.onboarding_responses (user_id, answers, spec_version)
values ('<USER_B>', '{}'::jsonb, '2026-08-01');
```
**Expected:** fails — `new row violates row-level security policy`. The insert
policy's `public.onboarding_case_is_open()` term is false.

```sql
reset role;

-- 4d. Expiry behaves identically to revocation. Reissue (clearing
-- invite_revoked_at and setting a future expiry) restores entry.
set role postgres;
update public.onboarding_cases
set invite_revoked_at = null, invite_expires_at = now() - interval '1 day'
where handle = 'verify-b';
reset role;

set role authenticated;
set request.jwt.claims = '{"sub": "<USER_B>", "role": "authenticated"}';
select public.onboarding_case_is_open();
reset role;

set role postgres;
update public.onboarding_cases
set invite_issued_at = now(), invite_expires_at = now() + interval '7 days'
where handle = 'verify-b';
reset role;

set role authenticated;
set request.jwt.claims = '{"sub": "<USER_B>", "role": "authenticated"}';
select public.onboarding_case_is_open();
```
**Expected:** `false` after the backdated expiry, `true` after the reissue.

```sql
-- 4e. The function is not an enumeration oracle: it takes no argument, so it
-- can only answer about the caller. This must be a syntax/signature error.
select public.onboarding_case_is_open('<USER_A>');
```
**Expected:** fails — `function public.onboarding_case_is_open(unknown) does not
exist`.

```sql
reset role;
```

---

## 5. No client DELETE, on either layer

```sql
set role authenticated;
set request.jwt.claims = '{"sub": "<USER_A>", "role": "authenticated"}';

delete from public.onboarding_responses where user_id = '<USER_A>';
```
**Expected:** fails — `permission denied for table onboarding_responses`. There
is no `delete` grant to `authenticated` at all, so this fails at the grant layer
before any policy is consulted. The absence of a delete *policy* is the second
layer; either alone would suffice, and both are intentional.

```sql
reset role;
```

---

## 6. One-way `in_progress` → `submitted`, then immutability

```sql
set role authenticated;
set request.jwt.claims = '{"sub": "<USER_A>", "role": "authenticated"}';

-- 6a. Submit.
update public.onboarding_responses
set status = 'submitted', answers = '{"q1": "yes", "q2": 3, "final": true}'::jsonb
where user_id = '<USER_A>';

select status, spec_version, created_at, updated_at from public.onboarding_responses;
```
**Expected:** succeeds, 1 row, `status = 'submitted'`, `updated_at` bumped again.
The `spec_version` recorded here is the one frozen with the submission.

```sql
-- 6b. Any further update is rejected -- not filtered, rejected.
update public.onboarding_responses set answers = '{"changed": true}'::jsonb
where user_id = '<USER_A>';
```
**Expected:** fails — `submitted onboarding responses are immutable` (the
trigger raises). Note the difference from §2: that was 0 rows affected, this is
an error, because the row IS visible to its owner and the guard runs on it.

```sql
-- 6c. Submission is one-way: you cannot go back to in_progress.
update public.onboarding_responses set status = 'in_progress'
where user_id = '<USER_A>';
```
**Expected:** fails — same exception. There is no un-submit.

```sql
-- 6d. Nor can spec_version be rewritten after submission.
update public.onboarding_responses set spec_version = '1999-01-01'
where user_id = '<USER_A>';
```
**Expected:** fails — same exception.

```sql
-- 6e. The domain of status is closed by a check constraint, independent of the
-- trigger. Prove it on B's still-in-progress row.
reset role;
set role authenticated;
set request.jwt.claims = '{"sub": "<USER_B>", "role": "authenticated"}';

insert into public.onboarding_responses (user_id, answers, spec_version)
values ('<USER_B>', '{}'::jsonb, '2026-08-01');

update public.onboarding_responses set status = 'approved' where user_id = '<USER_B>';
```
**Expected:** the insert succeeds (B's invite was reissued in 4d); the update
fails — `new row for relation "onboarding_responses" violates check constraint
"onboarding_responses_status_check"`.

```sql
reset role;
```

### 6f. The immutability rule binds `service_role` too — confirm it

```sql
set role service_role;
update public.onboarding_responses set answers = '{"admin": true}'::jsonb
where user_id = '<USER_A>';
```
**Expected:** fails — `submitted onboarding responses are immutable`. A trigger
is not RLS, and `BYPASSRLS` does not bypass triggers. **This is the intended
rule:** correcting a submitted questionnaire is DELETE + re-invite, not UPDATE.

This is the one check in the document where a service-role result is meaningful,
and it is meaningful only because it is a *denial*.

```sql
reset role;
```

---

## 7. An ordinary authenticated user sees nothing they should not

`USER_C` is a signed-in Combat OS user with no onboarding case — the realistic
"other tenant of the shared auth pool" case.

```sql
set role authenticated;
set request.jwt.claims = '{"sub": "<USER_C>", "role": "authenticated"}';

select * from public.onboarding_cases;
```
**Expected:** fails — `permission denied for table onboarding_cases`. Staff data
(`client_first_name`, `client_email`, `invite_token_hash`) is unreachable by any
browser role. Same for `onboarding_case_events`.

```sql
select * from public.onboarding_responses;
```
**Expected:** **0 rows** — not an error. C holds the table grant but owns no row,
so RLS filters everything. The contrast with the line above is the point: cases
fail at the grant layer, responses filter at the policy layer.

```sql
select public.onboarding_case_is_open();
```
**Expected:** `false`. C has no case.

```sql
insert into public.onboarding_responses (user_id, answers, spec_version)
values ('<USER_C>', '{}'::jsonb, '2026-08-01');
```
**Expected:** fails — `new row violates row-level security policy`. A signed-in
user without an invite cannot enrol themselves.

```sql
reset role;
```

---

## 8. Real Data API access over HTTP — the only check that proves reachability

§1–§7 prove grants and policies. They do **not** prove the table is reachable
through the Data API: exposure and grants are separate concerns, and a
misconfigured exposed-schema list would leave every check above passing while
every client request 404s.

Get a real access token by signing in as `USER_A` in the Track B app (or via the
magic-link flow) and copying `session.access_token`. Use the publishable/anon key
from the Track B environment — do not paste either value into this file, any
decision log, or any runbook.

```bash
curl -sS "$SUPABASE_URL/rest/v1/onboarding_responses?select=user_id,status,spec_version" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $USER_A_ACCESS_TOKEN"
```
**Expected:** HTTP 200 with a JSON array of exactly **one** object, A's row. Not
`404`, not `{"code":"42501"}`, not an empty array.

```bash
# Anonymous: publishable key only, no user token.
curl -sS -o /dev/null -w '%{http_code}\n' \
  "$SUPABASE_URL/rest/v1/onboarding_responses?select=user_id" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY"
```
**Expected:** `401`. If it returns `200` with `[]`, the `anon` revoke did not
take — stop and re-check §3.

```bash
# Staff table over the client key.
curl -sS -o /dev/null -w '%{http_code}\n' \
  "$SUPABASE_URL/rest/v1/onboarding_cases?select=id" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $USER_A_ACCESS_TOKEN"
```
**Expected:** `401`. Any `200` here is a stop-the-pilot result.

### 8d. Upsert vs PATCH — decide this before writing the client

The column-limited UPDATE grant has one consequence the Track B client must be
built around. PostgREST's upsert (`POST` with
`Prefer: resolution=merge-duplicates`) builds an `ON CONFLICT ... DO UPDATE SET`
list from the payload columns, which includes `user_id` — a column
`authenticated` may insert but may **not** update.

```bash
curl -sS "$SUPABASE_URL/rest/v1/onboarding_responses" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $USER_A_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d '{"user_id":"<USER_A>","answers":{"q1":"upsert"},"spec_version":"2026-08-01"}'
```
**Expected:** a `42501` `permission denied for column user_id` error. If so, that
is the grant working as designed, and **the client must use `PATCH` for resume
and `POST` only for first save** — not a blanket upsert. Record whichever result
you get; it determines a line of Track B client code either way.

---

## 9. Cleanup

Do not skip this — these rows are in the production database.

```sql
set role postgres;
delete from public.onboarding_responses where user_id in ('<USER_A>', '<USER_B>', '<USER_C>');
delete from public.onboarding_cases where handle in ('verify-a', 'verify-b');
reset role;

select count(*) as leftover_cases from public.onboarding_cases;
select count(*) as leftover_responses from public.onboarding_responses;
```
**Expected:** both counts `0` before the real pilot client is invited. Deleting
the cases cascades their `onboarding_case_events`.

---

## Summary of what each result proves

| # | Check | Proves |
|---|---|---|
| 1 | Owner A creates/reads/updates own row; blocked on B's `user_id`, on both timestamps and on `user_id` | Owner policies scope to `auth.uid() = user_id`; timestamps are trigger-owned; the **column-limited** insert/update grants are real, not just claimed |
| 2 | Owner B sees 0 rows, updates 0 rows | Cross-user denial is symmetric and silent (filter, not error) |
| 3 | `anon` denied on all three tables | The `revoke` did its job — and had to, because this project's default privileges still auto-grant `anon` full CRUD |
| 4 | Active invite permits entry; revoked/expired blocks entry only; reissue restores it | `invite_expires_at` / `invite_revoked_at` are database-enforced at the one point they apply, and the `BYPASSRLS` dependency of `onboarding_case_is_open()` holds |
| 5 | Owner DELETE denied at the grant layer | No client delete path exists on either layer |
| 6 | Submit succeeds once; every later write raises; `service_role` raises too | One-way transition; submitted rows are immutable for **every** role, not just clients |
| 7 | Signed-in non-owner: cases denied, responses empty, self-enrolment refused | The shared auth pool does not leak the onboarding control plane to Combat OS users |
| 8 | Real JWT over `/rest/v1` returns exactly the owner's row; anon and staff tables 401 | Data API **reachability** — the one thing §1–§7 cannot establish |

---

## Two security advisories are EXPECTED here — do not "fix" them

`get_advisors(type: security)` will report these against this migration. Both are
the intended design, and acting on either would break something. They are the
same two shapes already documented for `add_body_metrics` in
`README-body-metrics-verification.md`.

**1. `rls_enabled_no_policy` on `onboarding_cases` and `onboarding_case_events`
(INFO, ×2).**
RLS enabled with zero policies **and** zero grants means the table is unreachable
by any browser role — `service_role` only. That is the lockdown, not an
oversight. The linter flags this shape because it is usually an accident.
**Adding a policy for `authenticated` would widen access, not harden it.**

**2. `authenticated_security_definer_function_executable` on
`onboarding_case_is_open` (WARN).**
The `EXECUTE` grant to `authenticated` is **required**: the insert policy
(`with check (... and public.onboarding_case_is_open())`) is evaluated in the
querying user's context, so revoking `EXECUTE` would make every client's first
save fail. Switching it to `SECURITY INVOKER` breaks it too — the whole reason it
is `SECURITY DEFINER` is to consult `onboarding_cases`, which `authenticated` has
no grant on.

It is safe to expose because of what it returns: a boolean answering *"is my own
onboarding case open?"*, for the caller only. It takes no argument (§4e), so it
cannot be pointed at anyone else, and it reveals nothing about any other user.

---

## Deviations from the Track B draft, and why

Source: `CombatOS-Onboarding/docs/SCHEMA-HANDOFF-PILOT-1.md` (2026-07-31). That
document is explanatory handoff material; this file and the `.sql` beside it are
the executable of record.

| # | Deviation | Why |
|---|---|---|
| 1 | `grant update (answers, status, spec_version)` replaces the draft's blanket `grant select, insert, update` | The draft's §3 *claimed* a column-limited update while its SQL granted all columns. A rule you believe is enforced but isn't is worse than no rule |
| 2 | `grant insert (user_id, answers, status, spec_version)` — column-limited on INSERT too | The draft column-limited nothing on insert. Stops timestamp forging at the privilege layer, one step before the trigger |
| 3 | Trigger is `before insert or update`, was `before update` | A `before update` trigger cannot protect the INSERT path — a client could forge `updated_at` on the way in |
| 4 | Explicit `grant all privileges ... to service_role` on all three tables | Grants and Data API exposure are separate concerns. This project's default privileges still auto-grant, but Supabase is moving the platform default to revoke, and a replay onto a fresh project must not depend on which side of that change it was created (verified against `guides/api/securing-your-api`, 2026-08-01) |
| 5 | Added `invite_expires_at`, `invite_revoked_at`, `invite_issued_at`, and the lifecycle rules above | The draft had no way to time-bound or withdraw an invite. `invite_issued_at` is beyond the literal ask but reissue has no observable meaning without it |
| 6 | Added `onboarding_case_is_open()` and put it in the insert policy | The largest deviation. Without it the two new columns are decoration — nothing would consult them. **If the developer prefers prose-only semantics, this reverts by replacing one policy** and dropping one function; the columns and the written rules survive |
| 7 | Added `spec_version text not null`, no default | Ruling 5 in Track B's decision log, following from ruling 4's deferral of the questionnaire review. No default so omission fails loudly rather than stamping a guess |
| 8 | Added `created_at` to `onboarding_responses` | The draft had only `updated_at`, so "started" and "last saved" were indistinguishable — which is precisely the resume case the invite rules turn on. Matches `body_metrics` |
| 9 | Trigger logic rewritten, not patched | The draft's guard had three overlapping `tg_op = 'UPDATE'` branches whose middle branch (`in_progress` → `submitted`) returned early past the general `updated_at` stamp, and whose third branch was unreachable given the status check constraint. The rewrite is two branches and no dead code |
| 10 | `create table` / `create index` / `create trigger`, not `... if not exists` and not `create or replace function` | A ledger migration is applied once. `if not exists` turns a partially-applied re-run into a silent no-op that leaves the schema half-built and the ledger claiming success. Matches `add_body_metrics` house style |
| 11 | Two check constraints on invite timestamp ordering | Cheap, and they stop a reissue that sets an expiry before its own issue date |
| 12 | Draft comment "ensure the table is exposed to the Data API in the dashboard **if your project requires** it" dropped | Replaced with the explicit grants of #4 and the HTTP checks of §8. "If your project requires" is not a verification step |

### Kept from the draft, deliberately

One row per user keyed on `user_id`; `in_progress | submitted`; forced RLS; three
separate owner-only policies with **no delete policy**; submitted-row
immutability; hash-only invite storage; staff fields on the case row; the stage
and image-status domains; no Storage or upload surface.

### Not done

- **Not applied.** No `apply_migration`, no DDL, no SQL editor. The only queries
  run against `pckokypnxrimayjmjgcl` while authoring this were read-only
  (`list_tables`, `list_migrations`, `pg_roles`, `pg_default_acl`, `version()`).
- The spec ↔ `questions.js` parity test required by Track B ruling 5 is Track B
  code and is not in this migration's scope.
- `onboarding_cases.updated_at` is Worker-maintained, not trigger-enforced.
