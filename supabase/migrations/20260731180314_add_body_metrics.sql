begin;

-- body_metrics: on-device weight logs (Dexie) synced up so the developer/coach can
-- be alerted (n8n/Hermes) when an athlete hasn't logged recently -- no web dashboard
-- needed. (user_id, measured_on) is the PK and the upsert conflict target: one
-- weight per user per day, so same-day re-logging is an UPDATE, not a second row.
create table public.body_metrics (
  user_id     uuid not null references auth.users(id) on delete cascade,
  measured_on date not null,
  kg          numeric(6,3) not null check (kg > 0 and kg < 1000),
  client_id   uuid not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, measured_on),
  unique (user_id, client_id)
);
-- No separate (user_id, measured_on desc) index: the PK b-tree already satisfies a
-- per-user newest-first scan.

alter table public.body_metrics enable row level security;

-- updated_at must be maintained server-side, not client-supplied: a coach alert
-- needs to tell "new day logged" (created_at == updated_at) apart from "today's
-- value corrected" (updated_at > created_at), and a client value can't be trusted
-- for that distinction.
create function public.body_metrics_set_updated_at()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger functions returning "trigger" can't be invoked directly via SQL/RPC
-- anyway, but revoke explicitly for the same defense-in-depth reason as
-- 20260720231512_lock_down_handle_new_user_execute.sql.
revoke execute on function public.body_metrics_set_updated_at()
  from public, anon, authenticated;

create trigger body_metrics_set_updated_at
  before update on public.body_metrics
  for each row execute function public.body_metrics_set_updated_at();

revoke all privileges on table public.body_metrics
  from public, anon, authenticated;
grant select, insert on table public.body_metrics to authenticated;
-- Column-limited: user_id/measured_on are the PK and conflict target and must not
-- change once written; created_at is server-owned; updated_at is trigger-owned.
-- Only kg (a correction) and client_id (idempotency key from a re-sync) are
-- legitimately re-settable by the owner.
grant update (kg, client_id) on table public.body_metrics to authenticated;
grant all privileges on table public.body_metrics to service_role;

create policy "owner reads own body metrics"
  on public.body_metrics
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "owner inserts own body metrics"
  on public.body_metrics
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "owner updates own body metrics"
  on public.body_metrics
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- coach_athletes: server-managed coach -> athlete mapping. Deliberately NOT
-- authorized off profiles.role -- a bare "coach" role would grant every coach
-- every athlete's data, and the app reads that column for authorization nowhere.
-- This table supplies the actual scoping relationship that's missing otherwise.
create table public.coach_athletes (
  coach_id    uuid not null references auth.users(id) on delete cascade,
  athlete_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (coach_id, athlete_id)
);
-- No extra index: the PK (coach_id, athlete_id) already covers the one access
-- pattern this table has (is_coach_of's coach_id = ... and athlete_id = ... check).

alter table public.coach_athletes enable row level security;

-- No policies for `authenticated` here on purpose: combined with the revoke below,
-- authenticated has zero direct privileges on this table -- not even SELECT. It is
-- mutable, and readable, ONLY by service_role. Coaches reach the mapping solely
-- through the SECURITY DEFINER helper function below, scoped to one boolean check.
revoke all privileges on table public.coach_athletes
  from public, anon, authenticated;
grant all privileges on table public.coach_athletes to service_role;

-- SECURITY DEFINER so this can consult coach_athletes -- which authenticated has
-- no grant on at all -- without handing out broad table access. Runs as table
-- owner, so (like handle_new_user on profiles) it bypasses coach_athletes' own RLS
-- for the same reason a table owner always can.
create function public.is_coach_of(p_athlete_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (
    select 1
    from public.coach_athletes ca
    where ca.coach_id = (select auth.uid())
      and ca.athlete_id = p_athlete_id
  );
$$;

revoke execute on function public.is_coach_of(uuid) from public, anon, authenticated;
grant execute on function public.is_coach_of(uuid) to authenticated;

-- SELECT-only: a mapped coach can read an athlete's body_metrics but has no
-- insert/update/delete path onto rows they don't own (no policy grants it, and the
-- earlier owner-scoped insert/update policies require auth.uid() = user_id anyway).
create policy "mapped coach reads athlete body metrics"
  on public.body_metrics
  for select
  to authenticated
  using (public.is_coach_of(user_id));

commit;
