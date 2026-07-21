-- sessions: generic per-user log; JSONB payload so the cartridge rebuild needs no 2nd migration
create table public.sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  created_at        timestamptz not null default now(),
  cartridge_id      text,
  client_session_id text not null,
  payload           jsonb not null,
  unique (user_id, client_session_id)
);
create index sessions_user_created_idx on public.sessions (user_id, created_at desc);

alter table public.sessions enable row level security;
create policy "own sessions" on public.sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- profiles: app-level user metadata
create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  display_name       text,
  role               text not null default 'user',
  assigned_cartridge text,
  created_at         timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- auto-create a profile row when a new auth user is created
create function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
