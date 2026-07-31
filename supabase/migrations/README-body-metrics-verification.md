# Manual verification: `20260731180314_add_body_metrics.sql`

This is a hand-run procedure for the developer to execute in the Supabase **SQL
Editor** (or `psql` against the project connection string) after applying the
migration, before trusting it with real data. It is not automated and this
migration was not applied by the agent that wrote it.

The SQL Editor connects as `postgres` (a superuser, which bypasses RLS
entirely), so every check below explicitly switches role and impersonates a
specific user via the `request.jwt.claims` session setting that
`auth.uid()`/`auth.role()` read from. Run each numbered block as its own
statement or transaction; `reset role;` between blocks to avoid leaking the
impersonation into the next check.

## 0. Set up test fixtures

Replace the UUIDs below with real ones, or create throwaway users first (e.g.
via Supabase Auth admin / dashboard) and substitute their ids. Keep the three
IDs distinct: `USER_A`, `USER_B`, `COACH_1` (mapped to A only). `COACH_2` is
never inserted into `coach_athletes` -- it is the "unmapped coach" case, so it
needs no fixture beyond an existing auth user id.

```sql
-- Run as postgres (default SQL Editor role) -- these are trusted, service-side writes.
set role postgres;

insert into public.body_metrics (user_id, measured_on, kg, client_id)
values ('<USER_A>', '2026-07-30', 81.500, gen_random_uuid())
on conflict (user_id, measured_on) do nothing;

insert into public.body_metrics (user_id, measured_on, kg, client_id)
values ('<USER_B>', '2026-07-30', 70.200, gen_random_uuid())
on conflict (user_id, measured_on) do nothing;

insert into public.coach_athletes (coach_id, athlete_id)
values ('<COACH_1>', '<USER_A>')
on conflict do nothing;

reset role;
```

**Expected result:** both inserts and the mapping insert succeed (0 or more
rows affected, no error) -- `postgres` is the table owner and bypasses RLS.

---

## 1. Owner A reads and writes only their own rows

```sql
set role authenticated;
set request.jwt.claims = '{"sub": "<USER_A>", "role": "authenticated"}';

-- 1a. A sees exactly their own row, not B's.
select user_id, measured_on, kg from public.body_metrics order by measured_on;
```
**Expected:** exactly 1 row, `user_id = <USER_A>`. B's row is absent.

```sql
-- 1b. A can upsert their own row (same-day correction -> UPDATE via ON CONFLICT).
insert into public.body_metrics (user_id, measured_on, kg, client_id)
values ('<USER_A>', '2026-07-30', 81.700, gen_random_uuid())
on conflict (user_id, measured_on) do update
  set kg = excluded.kg, client_id = excluded.client_id;

select kg, created_at, updated_at from public.body_metrics
where user_id = '<USER_A>' and measured_on = '2026-07-30';
```
**Expected:** succeeds; `kg = 81.700`; `updated_at > created_at` (trigger fired
on the UPDATE path, proving server-side maintenance -- the client never sent
`updated_at`).

```sql
-- 1c. A cannot write a row under someone else's user_id.
insert into public.body_metrics (user_id, measured_on, kg, client_id)
values ('<USER_B>', '2026-07-29', 60.000, gen_random_uuid());
```
**Expected:** fails -- `new row violates row-level security policy` (the
`with check ((select auth.uid()) = user_id)` on the insert policy rejects it).

```sql
reset role;
```

---

## 2. Owner B cannot see A's rows

```sql
set role authenticated;
set request.jwt.claims = '{"sub": "<USER_B>", "role": "authenticated"}';

select user_id, measured_on, kg from public.body_metrics order by measured_on;
```
**Expected:** exactly 1 row, `user_id = <USER_B>`. A's row (and A's 81.700
correction) is invisible to B.

```sql
-- B cannot update A's row even by primary key.
update public.body_metrics set kg = 999
where user_id = '<USER_A>' and measured_on = '2026-07-30';
```
**Expected:** succeeds at the statement level but affects **0 rows** (the
`using` clause on the update policy filters A's row out of B's visible set
before the update can touch it). Re-select as A afterward to confirm `kg` is
still `81.700`, not `999`.

```sql
reset role;
```

---

## 3. `anon` is denied entirely

```sql
set role anon;

select * from public.body_metrics;
```
**Expected:** fails -- `permission denied for table body_metrics`. This is a
table-grant failure, not an empty-set RLS filter: `anon` was never granted
`select`/`insert`/`update` on `body_metrics` at all (the migration's `revoke
all ... from public, anon, authenticated` plus the absence of any grant back to
`anon`), so it fails before RLS policies are even evaluated.

```sql
insert into public.body_metrics (user_id, measured_on, kg, client_id)
values ('<USER_A>', '2026-07-01', 80, gen_random_uuid());
```
**Expected:** fails the same way -- `permission denied for table
body_metrics`.

```sql
select * from public.coach_athletes;
```
**Expected:** fails -- `permission denied for table coach_athletes` (same
reasoning; `anon` has zero grants on this table either).

```sql
reset role;
```

---

## 4. A mapped coach can SELECT only their mapped athlete's rows, and cannot write them

```sql
set role authenticated;
set request.jwt.claims = '{"sub": "<COACH_1>", "role": "authenticated"}';

-- 4a. Coach 1 is mapped to A only -- should see A's row, not B's, not their own
-- (coach has no body_metrics row of their own in this fixture, so this also
-- implicitly checks the owner-select policy doesn't leak anything extra).
select user_id, measured_on, kg from public.body_metrics order by user_id;
```
**Expected:** exactly 1 row, `user_id = <USER_A>`. `<USER_B>`'s row does not
appear (Coach 1 has no `coach_athletes` mapping to B).

```sql
-- 4b. Coach cannot insert a row for the athlete they read.
insert into public.body_metrics (user_id, measured_on, kg, client_id)
values ('<USER_A>', '2026-07-28', 82.000, gen_random_uuid());
```
**Expected:** fails -- RLS violation. The only insert policy on
`body_metrics` requires `auth.uid() = user_id`; the coach-read policy is
`for select` only, so it grants no insert path.

```sql
-- 4c. Coach cannot update the athlete's row.
update public.body_metrics set kg = 1 where user_id = '<USER_A>';
```
**Expected:** 0 rows affected (same reasoning as 2 -- no update policy covers
`auth.uid() != user_id`, coach or not).

```sql
-- 4d. Coach cannot delete the athlete's row.
delete from public.body_metrics where user_id = '<USER_A>';
```
**Expected:** fails -- `permission denied for table body_metrics`. There is
no `delete` grant to `authenticated` at all (owner or coach), so this fails at
the grant level before any policy is consulted.

```sql
-- 4e. Coach cannot read or write coach_athletes directly, only indirectly via
-- the is_coach_of() helper the body_metrics policy calls internally.
select * from public.coach_athletes;
```
**Expected:** fails -- `permission denied for table coach_athletes`.
`authenticated` was never granted access to this table; the mapping is only
consulted through the `security definer` function `public.is_coach_of()`,
which runs as the table owner.

```sql
reset role;
```

---

## 5. An unmapped coach sees nothing

```sql
set role authenticated;
set request.jwt.claims = '{"sub": "<COACH_2>", "role": "authenticated"}';

select user_id, measured_on, kg from public.body_metrics order by user_id;
```
**Expected:** 0 rows. Coach 2 has no `coach_athletes` row at all, so
`is_coach_of(user_id)` evaluates to `false` for every row, and Coach 2 also has
no owner rows of their own in this fixture.

```sql
reset role;
```

---

## 6. Cleanup

```sql
set role postgres;
delete from public.body_metrics where user_id in ('<USER_A>', '<USER_B>');
delete from public.coach_athletes where coach_id = '<COACH_1>' and athlete_id = '<USER_A>';
reset role;
```

## Summary of what each result proves

| # | Check | Proves |
|---|---|---|
| 1 | Owner A read/write own rows, blocked on B's `user_id` | Owner insert/update/select policies scope to `auth.uid() = user_id`; `updated_at` is server-maintained |
| 2 | Owner B cannot see or mutate A's row | Same policies deny cross-user access symmetrically |
| 3 | `anon` denied on both tables | No grants exist for `anon` -- failure is at the grant layer, not RLS |
| 4 | Mapped coach: SELECT-only, scoped to their athlete | Coach policy is `for select` only; no insert/update/delete path opens up; `coach_athletes` itself stays ungranted to `authenticated` |
| 5 | Unmapped coach sees nothing | `is_coach_of()` returns `false` with no mapping row, denying by default |
