-- =============================================================================
-- Pilot 1: onboarding cases, case events, questionnaire responses.
--
-- Authored in Track A (this repo) because of rule R5 -- one Supabase project,
-- one migration ledger. The tables belong to Track B (CombatOS-Onboarding); the
-- ledger entry belongs here. See docs/engineering/SHARED-SUPABASE-BOUNDARY.md.
--
-- NOT YET APPLIED. Filename is a placeholder: rename this file to
-- <live_version>_onboarding_pilot1.sql after the developer applies it, exactly
-- as add_body_metrics was reconciled on 2026-08-01. See README.md.
--
-- Hardened from CombatOS-Onboarding/docs/SCHEMA-HANDOFF-PILOT-1.md; every
-- deviation from that draft is listed in README-onboarding-pilot1-verification.md.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. onboarding_cases -- staff/Worker-only control plane, one row per client.
-- ---------------------------------------------------------------------------
--
-- No client role ever touches this table: `authenticated` and `anon` hold zero
-- grants, exactly as coach_athletes does in 20260731202537_add_body_metrics.sql.
-- Clients reach it only indirectly, through onboarding_case_is_open() below.
--
-- The invite token is NOT authentication. Authentication is the Supabase
-- magic-link JWT; the token binds a case to the person who received the link.
-- Only the SHA-256 hex of the token is ever stored -- the raw value is returned
-- once by the Worker's create-case response and never persisted anywhere.
create table public.onboarding_cases (
  id                  uuid primary key default gen_random_uuid(),
  handle              text not null unique,
  user_id             uuid not null unique references auth.users(id) on delete cascade,
  client_first_name   text not null,
  client_email        text not null,

  -- Invite lifecycle. The full semantics -- first use, resume, expiry,
  -- revocation, reissue -- are specified in
  -- README-onboarding-pilot1-verification.md section "Invite lifecycle".
  -- Summary of the three states this triple encodes:
  --   active  : invite_revoked_at is null and (invite_expires_at is null or invite_expires_at > now())
  --   expired : invite_revoked_at is null and invite_expires_at <= now()
  --   revoked : invite_revoked_at is not null
  -- Only the ACTIVE state permits a client to CREATE a response row. None of
  -- the three affects a response row that already exists -- see the note on
  -- revocation in the guard-function comment below.
  invite_token_hash   text not null,
  invite_issued_at    timestamptz not null default now(),
  -- Nullable = never expires. Deliberate: Pilot 1 runs with one client and one
  -- developer, and a hard clock that strands the pilot is a worse failure than
  -- an invite that stays open. Set it once the flow is proven.
  invite_expires_at   timestamptz,
  invite_revoked_at   timestamptz,

  stage               text not null default 'intake_pending'
                      check (stage in (
                        'intake_pending',
                        'intake_received',
                        'clarification_required',
                        'gym_inventory_confirmed',
                        'coach_draft_ready',
                        'approved_for_compilation',
                        'compiled',
                        'validated',
                        'deployed',
                        'assigned',
                        'client_verified',
                        'retrospective_complete'
                      )),
  image_status        text not null default 'not_requested'
                      check (image_status in (
                        'not_requested',
                        'requested',
                        'received',
                        'processed'
                      )),
  attention           text,
  owner               text not null default 'Coach (dev)',
  dossier_path        text not null,
  clarification_used  boolean not null default false,
  created_at          timestamptz not null default now(),
  -- Worker-maintained, NOT trigger-enforced. Stated plainly rather than
  -- implied: nothing in the database keeps this honest. It is acceptable here
  -- only because no client role can write this table at all, so the sole writer
  -- is the Worker. Do not cite it as tamper-evident.
  updated_at          timestamptz not null default now(),

  constraint onboarding_cases_invite_expiry_after_issue
    check (invite_expires_at is null or invite_expires_at > invite_issued_at),
  constraint onboarding_cases_invite_revoked_after_issue
    check (invite_revoked_at is null or invite_revoked_at >= invite_issued_at)
);

-- Unique so a reissued token cannot collide with a live one, and so a hash
-- lookup in the Worker's verify path is a single index probe.
create unique index onboarding_cases_invite_token_hash_uidx
  on public.onboarding_cases (invite_token_hash);

-- Non-unique on purpose: the same person may hold more than one case over time
-- (a re-run, a second programme). Uniqueness lives on handle and user_id.
create index onboarding_cases_client_email_idx
  on public.onboarding_cases (client_email);

-- No index for onboarding_case_is_open()'s lookup: it filters on user_id, which
-- the inline `unique` above already indexes.

comment on table public.onboarding_cases is
  'Pilot onboarding cases. Worker/service_role only -- no client grants. invite_token_hash is a binding token, not authentication.';

-- ---------------------------------------------------------------------------
-- 2. onboarding_case_events -- append-only approval / note log.
-- ---------------------------------------------------------------------------
create table public.onboarding_case_events (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.onboarding_cases(id) on delete cascade,
  at          timestamptz not null default now(),
  kind        text not null check (kind in ('approval', 'note', 'system')),
  text        text not null,
  from_stage  text,
  to_stage    text,
  by          text not null
);

create index onboarding_case_events_case_id_at_idx
  on public.onboarding_case_events (case_id, at);

comment on table public.onboarding_case_events is
  'Case audit log. Worker/service_role only. Invite issue, revocation and reissue are logged here as kind = system.';

-- ---------------------------------------------------------------------------
-- 3. onboarding_responses -- one questionnaire row per auth user.
-- ---------------------------------------------------------------------------
--
-- spec_version exists because ruling 4 in CombatOS-Onboarding/docs/decision_log.md
-- defers the questionnaire review until AFTER real submissions, which guarantees
-- the question set will change. `answers` is unversioned JSONB keyed by question
-- ID, so without a stamp there is no honest way to say which question set an old
-- answer was collected under -- and it cannot be backfilled later, because the
-- information is simply not in the row. Client-supplied (the frontend is what
-- actually knows which question set it rendered) with no default, so omitting it
-- fails loudly at insert instead of silently recording a wrong version.
--
-- It records the spec under which the row was LAST WRITTEN. For a submitted row
-- that is the spec used at submission, frozen by the immutability rule below.
-- For an in-progress row it re-stamps on each save, which is the truthful answer
-- when a client resumes after the question set changed.
create table public.onboarding_responses (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  answers       jsonb not null default '{}'::jsonb,
  status        text not null default 'in_progress'
                check (status in ('in_progress', 'submitted')),
  spec_version  text not null
                check (char_length(spec_version) between 1 and 64),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint onboarding_responses_answers_object
    check (jsonb_typeof(answers) = 'object')
);

comment on table public.onboarding_responses is
  'One questionnaire row per auth user. Owner may select/insert/update own row; no client delete. Submitted rows are immutable for every role, including service_role.';

-- ---------------------------------------------------------------------------
-- 4. Functions
-- ---------------------------------------------------------------------------

-- Guard: owns both timestamps and enforces submitted-row immutability.
--
-- Fires on INSERT as well as UPDATE. The draft was `before update` only, so a
-- client could forge updated_at (and, with created_at added here, a start time)
-- on the way in. Column-limited grants below already stop a client from naming
-- those columns; this is the second layer, and it is the only layer that binds
-- service_role -- a trigger is not RLS, and BYPASSRLS does not bypass triggers.
--
-- Consequence worth stating: because this binds service_role too, a submitted
-- row cannot be edited by the Worker either. Correcting a submitted
-- questionnaire means DELETE + re-invite, not UPDATE. That is the intended
-- rule; the escape hatch is a superuser session disabling the trigger, which
-- should leave an onboarding_case_events row behind when used.
create function public.onboarding_responses_guard()
  returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at = now();
    new.updated_at = now();
    return new;
  end if;

  -- tg_op = 'UPDATE'
  if old.status = 'submitted' then
    raise exception 'submitted onboarding responses are immutable';
  end if;

  -- old.status is therefore 'in_progress'. The status check constraint already
  -- limits new.status to in_progress|submitted, so both remaining transitions
  -- are legal and no further test is needed. Submission is one-way purely
  -- because the branch above rejects every later UPDATE.
  new.created_at = old.created_at;
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger functions returning "trigger" cannot be invoked directly via SQL/RPC
-- anyway, but revoke explicitly for the same defense-in-depth reason as
-- 20260720231512_lock_down_handle_new_user_execute.sql.
revoke execute on function public.onboarding_responses_guard()
  from public, anon, authenticated;

create trigger onboarding_responses_guard_trg
  before insert or update on public.onboarding_responses
  for each row execute function public.onboarding_responses_guard();

-- Is the CALLER's onboarding case open? Used by the insert policy so that
-- invite_expires_at / invite_revoked_at are enforced by the database rather
-- than being two columns nobody checks.
--
-- SECURITY DEFINER for the same reason as is_coach_of(): `authenticated` has no
-- grant on onboarding_cases at all, and this hands out one boolean instead of
-- table access.
--
-- Takes NO argument and reads auth.uid() itself, deliberately. A
-- p_user_id parameter would make this a probe for "does an open case exist for
-- arbitrary UUID X?"; with no argument it can only answer about the caller, so
-- it is not an enumeration oracle in any form.
--
-- Load-bearing detail: it reads onboarding_cases, which has FORCE ROW LEVEL
-- SECURITY and zero policies. It works because the function owner (postgres)
-- holds the BYPASSRLS role attribute, which outranks FORCE (verified live
-- 2026-08-01: pg_roles.rolbypassrls is true for postgres and service_role). If
-- that attribute were ever removed, this returns false for everyone and no
-- client could start a questionnaire. Check 4 of the verification procedure is
-- what catches that.
create function public.onboarding_case_is_open()
  returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (
    select 1
    from public.onboarding_cases c
    where c.user_id = (select auth.uid())
      and c.invite_revoked_at is null
      and (c.invite_expires_at is null or c.invite_expires_at > now())
  );
$$;

revoke execute on function public.onboarding_case_is_open() from public, anon, authenticated;
grant execute on function public.onboarding_case_is_open() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.onboarding_cases enable row level security;
alter table public.onboarding_cases force row level security;

alter table public.onboarding_case_events enable row level security;
alter table public.onboarding_case_events force row level security;

alter table public.onboarding_responses enable row level security;
alter table public.onboarding_responses force row level security;

-- Honest note on FORCE: it makes RLS apply to the table OWNER, but roles
-- holding the BYPASSRLS attribute still bypass it. On this project that is
-- postgres AND service_role (verified live). So FORCE constrains neither the
-- Worker nor the SQL editor today. It is kept because it is free, because it
-- becomes real on a fresh project or if BYPASSRLS is ever dropped, and because
-- removing it would read as a deliberate loosening. Do not describe the Worker
-- as "constrained by RLS" -- per R7 it is not constrained by anything.

-- onboarding_cases / onboarding_case_events: NO policies for anon or
-- authenticated, on purpose. RLS on + zero policies + zero grants is the
-- lockdown, the same shape as coach_athletes. This will raise the
-- rls_enabled_no_policy advisory twice; both are expected -- see the
-- verification README.

-- onboarding_responses: three separate owner-only policies. Deliberately split
-- rather than one `for all`, so a later "simplification" cannot quietly hand
-- out DELETE. There is no delete policy and no delete grant.
create policy "onboarding_responses: own select"
  on public.onboarding_responses
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- The invite gate lives here and ONLY here: an expired or revoked invite blocks
-- ENTRY -- creating the response row -- and nothing else. Once the row exists,
-- resume is authorized by the owner's own JWT via the select/update policies
-- above and below, which do not consult the case at all. That is a decision,
-- not an oversight: an invite clock that strands a half-finished questionnaire
-- is a worse failure than an invite that outlives its usefulness.
create policy "onboarding_responses: own insert"
  on public.onboarding_responses
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.onboarding_case_is_open()
  );

create policy "onboarding_responses: own update"
  on public.onboarding_responses
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 6. Privileges
-- ---------------------------------------------------------------------------
--
-- Grants and RLS are two separate layers: a grant decides whether a role can
-- reach the table over the Data API at all, RLS decides which rows it then
-- sees. Verified against current Supabase documentation on 2026-08-01
-- (guides/api/securing-your-api).
--
-- These revokes are load-bearing on THIS project right now. Verified live
-- 2026-08-01: pg_default_acl still carries the legacy Supabase default, which
-- auto-grants arwdDxtm on new public tables to anon, authenticated AND
-- service_role. So without the revokes below, `anon` would hold full CRUD on
-- all three tables the moment they are created.
revoke all privileges on table public.onboarding_cases from public, anon, authenticated;
revoke all privileges on table public.onboarding_case_events from public, anon, authenticated;
revoke all privileges on table public.onboarding_responses from public, anon, authenticated;

-- service_role grants are written out explicitly even though this project's
-- default privileges happen to supply them today. Two reasons: Supabase is
-- moving the platform default to REVOKE the automatic grants (exposure becomes
-- opt-in), and replaying this ledger onto a fresh project must reproduce the
-- live schema without depending on which side of that change the project was
-- created. An implicit grant is not a recorded one.
grant all privileges on table public.onboarding_cases to service_role;
grant all privileges on table public.onboarding_case_events to service_role;
grant all privileges on table public.onboarding_responses to service_role;

-- Client privileges on onboarding_responses only.
grant select on table public.onboarding_responses to authenticated;

-- Column-limited INSERT: created_at and updated_at are trigger-owned, so the
-- client is not permitted to name them at all. Column privileges are checked
-- only for columns the statement actually references, so a payload that simply
-- omits them succeeds and the defaults apply.
grant insert (user_id, answers, status, spec_version)
  on table public.onboarding_responses to authenticated;

-- Column-limited UPDATE. The draft's section 3 claimed a column-limited update
-- while its SQL issued a blanket `grant select, insert, update`; this is the
-- SQL matching the stated intent. user_id is the primary key and the identity
-- of the row and must never change; created_at/updated_at are trigger-owned.
-- Only answers, status and spec_version are legitimately re-settable.
grant update (answers, status, spec_version)
  on table public.onboarding_responses to authenticated;

-- No DELETE grant and no delete policy for authenticated, on either layer. A
-- client cannot remove their questionnaire; a reset is a Worker action.
-- (Contrast body_metrics, where DELETE IS granted -- there the user owns a
-- health measurement shared with a coach and must be able to remove it. Here
-- the row is one half of an operational case record whose other half the client
-- cannot see, so a client-side delete would desynchronise the case.)

commit;
