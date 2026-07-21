-- M3: auto-create a profile row for every auth user; backfill existing users.
-- SECURITY DEFINER so the trigger (running as table owner) bypasses RLS on the
-- insert; empty search_path is the Supabase-recommended hardening against
-- search_path hijacking.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill the account(s) created during M1/M2 testing.
insert into public.profiles (id, display_name)
select id, email from auth.users
on conflict (id) do nothing;
