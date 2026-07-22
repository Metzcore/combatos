begin;

create table public.user_cartridges (
  user_id       uuid not null references auth.users(id) on delete cascade,
  cartridge_id  text not null,
  assigned_by   uuid references auth.users(id) on delete set null,
  assigned_at   timestamptz not null default now(),
  primary key (user_id, cartridge_id),
  constraint user_cartridges_cartridge_id_format_check
    check (cartridge_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index user_cartridges_assigned_by_idx
  on public.user_cartridges (assigned_by);

alter table public.user_cartridges enable row level security;

revoke all privileges on table public.user_cartridges
  from public, anon, authenticated;
grant select on table public.user_cartridges to authenticated;
grant all privileges on table public.user_cartridges to service_role;

create policy "users read own cartridge availability"
  on public.user_cartridges
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy "own profile" on public.profiles;

revoke all privileges on table public.profiles
  from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (assigned_cartridge) on table public.profiles to authenticated;
grant all privileges on table public.profiles to service_role;

create policy "users read own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "users select own active cartridge"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter table public.profiles
  add constraint profiles_active_cartridge_available_fkey
  foreign key (id, assigned_cartridge)
  references public.user_cartridges (user_id, cartridge_id);

commit;
