# A9 diagnostic — cartridge availability and activation

_2026-07-22. Diagnostic approved; A9a database foundation, A9b metadata, and A9c access/cache data
layer implemented and verified. A9d visual Library work remains._

## A9a implementation outcome

- `user_cartridges` is live with explicit grants, own-row read RLS, and no client write access.
- The profile policy is split into own-row read and active-cartridge update; authenticated users can
  update only `assigned_cartridge`, not role or profile lifecycle.
- A composite foreign key prevents selecting a cartridge that is not available to that user.
- Primary phone account: both Combat OS programs available, Foundation active.
- Developer account: all three programs available, Foundation active.
- Brother's account: Apex available and active; confirmed still never signed in.
- Isolation was exercised as each database identity: visible row counts are 2, 3, and 1 respectively.
  Self-assignment, role edit, profile deletion, anonymous read, and unavailable activation all fail.
- Supabase advisors were rerun. Remaining notices are unrelated leaked-password protection, the
  pre-existing `sessions` policy performance warning, and expected newly-created unused indexes.
- A9b is complete: schema v3, authoring kit, reviewer, validator/tests, and all three canonical/
  bundled cartridge pairs now share validated summary/outcomes/tags/equipment metadata. No training
  prescription or Train UI changed.
- A9c is complete: app-wide own-user access loading, a validated existing-store Dexie cache,
  online-only confirmed activation, unknown-ID reporting, wrong-user/sign-out isolation, and a
  controlled read-only offline-device Auth fallback. Verification: 25 focused tests, 355 full-suite
  tests, production PWA build. No Supabase schema, service worker, or Train visual UI changed.

## Recommendation in one paragraph

Add one small Supabase table that records which cartridges are available to each user. Keep
`profiles.assigned_cartridge` as the single active-cartridge pointer. For the first three users,
the coach manages availability manually through Supabase; do not build a coach dashboard yet. The
app reads only the signed-in user's assignment rows, caches the last successful result locally for
offline browsing, and lets the user activate only an available cartridge. Activation requires a
connection; workouts do not. The cartridge files remain bundled, so this is deliberate UI hiding,
not content privacy.

This is the smallest model that satisfies: several programs available, exactly one active, coach
controls availability, user can choose among available programs, and no extra main-navigation item.

## What existed at diagnostic time

### Live Supabase

- `profiles` had two rows at the start of the diagnostic. Both had role `user`.
- Both profiles currently have `assigned_cartridge = null`.
- There is no table for multiple available cartridges.
- `profiles.assigned_cartridge` is nullable text with no constraint tying it to an available or
  bundled cartridge.
- The existing `own profile` policy covers every operation and every signed-in user currently has
  broad table privileges. RLS still limits a user to their own row, but the shape would allow a user
  to update their own `role`, delete their profile, or write an arbitrary active cartridge if a
  client exposed those calls.
- The live security advisor reports no table/RLS security error. It reports the unrelated leaked-
  password-protection warning. The performance advisor flags the current profile/session policies
  for calling `auth.uid()` once per row rather than once per statement.

### App

- All three cartridge JSON files are bundled into one registry in
  `app/src/data/cartridges/index.js`.
- `CartridgeViewer` displays all three and defaults to the first one. Its `activeId` means “currently
  previewed,” not “the user's active program,” and it disappears on unmount/reload.
- No frontend code currently reads `profiles`.
- The existing Dexie `settings` table can hold a small access cache without a schema-version bump.
- Supabase Auth already provides the signed-in user's ID and persists the login session.

## Proposed database shape

Create `public.user_cartridges` with these fields:

| Field | Shape | Purpose |
|---|---|---|
| `user_id` | UUID, required, foreign key to `auth.users`, cascade on user deletion | Who may see/use the cartridge |
| `cartridge_id` | text, required, lower-kebab format | Stable ID matching a bundled cartridge |
| `assigned_by` | UUID, optional, foreign key to `auth.users`, set null if assigner is deleted | Small audit trail; not displayed to the user |
| `assigned_at` | timezone-aware timestamp, required, default now | When it became available |

Use `(user_id, cartridge_id)` as the primary key. This prevents duplicate availability rows and is
already the right index for “load this user's programs.” Add an index on `assigned_by` because
Postgres does not automatically index foreign-key columns.

Keep `profiles.assigned_cartridge`. Add a composite foreign key from
`(profiles.id, profiles.assigned_cartridge)` to `(user_cartridges.user_id,
user_cartridges.cartridge_id)`. The active pointer may be null during onboarding, but when present it
must point to one of that user's available cartridges. An active assignment cannot be removed until
the pointer is changed or cleared, which is safer than silently switching the user.

Do not add a database `cartridges` catalogue yet. The bundled registry is the content source of
truth; a second catalogue would create a drift problem for three files. The app must handle an
assignment whose cartridge ID is missing from the installed build by showing “Program update
needed,” never by falling back to a different cartridge.

## Proposed permissions

### `user_cartridges`

- Signed-in user: may select only rows where `user_id` is their own ID.
- Signed-in user: cannot insert, update, or delete availability rows.
- Anonymous visitor: no access.
- Service/admin context: full access for manual coach assignment.

The policy must target `authenticated` explicitly, compare `user_id` with
`(select auth.uid())`, and the migration must explicitly grant `SELECT` to `authenticated`. Current
Supabase projects are moving to no automatic Data API grants, so RLS and grants must be delivered
together.

### `profiles`

Replace the broad `own profile` policy as part of A9:

- signed-in user may select their own profile;
- signed-in user may update only `assigned_cartridge`;
- signed-in user may not insert/delete profiles or update `role` through the public client;
- use separate `SELECT` and `UPDATE` policies targeted to `authenticated`, with
  `(select auth.uid())` and both `USING`/`WITH CHECK` on the update;
- use column-level privilege for `assigned_cartridge`, not table-wide update permission.

Do not use the current `profiles.role` field to authorize coach actions. It is not yet a safe
authorization source and both live profiles are ordinary users. If a coach-facing app is earned
later, design a real coach/client relationship and server-managed authorization in its own item.
Never put the service-role key in the web app.

Do not change the `sessions` table or its policy in A9. Its performance-advisor warning is real but
unrelated to cartridge access and belongs in separate housekeeping.

## First-three-users workflow

For now, “coach assignment” means a trusted manual Supabase action:

1. Create/invite the user's Auth account as today.
2. Confirm the matching profile row exists.
3. Add one `user_cartridges` row per program to make available.
4. Set one of those IDs as `profiles.assigned_cartridge`.
5. The app refreshes and caches the user's list.

Do not put generated user UUIDs or email addresses in a committed migration. The developer supplied
the account mapping on 2026-07-22; keep the actual emails in Supabase, not in tracked repo docs.
Initial assignments after A9a:

- primary phone account: Foundation + Operator available; choose the active one during rollout
  (Foundation is recommended only if it is still the intended run-first block);
- developer password-login/testing account: all three cartridges available so every path can be
  tested; choose any one as the initial active cartridge;
- brother's real account: Auth user and automatic profile row are now confirmed live, but the user
  has never signed in; make Apex Phase 1 available and active after A9a, before onboarding him.

The exact dashboard procedure is maintained in `docs/OPERATIONS.md` under “Assign programs to a
user.”

## App data flow and offline behaviour

Use one Dexie settings entry, with no schema bump:

```text
cartridgeAccessCache = {
  userId,
  availableIds,
  activeId,
  syncedAt
}
```

Rules:

1. After Auth resolves, load a matching-user cache immediately so Train can render without waiting
   for the network.
2. Refresh `user_cartridges` and the profile's active pointer in the background. Include an explicit
   `user_id` filter in the client query even though RLS also enforces it.
3. Keep only IDs that exist in the bundled cartridge registry. Report unknown IDs as an update
   problem; never substitute another program.
4. A successful server read replaces the cache. A network failure keeps the last valid cache and
   labels it offline; it must not turn into an empty Library.
5. If there is no matching cache and no network, show “Connect once to load your programs” with a
   retry action.
6. Previewing cached available programs works offline. Changing the active program is an occasional
   setup action and requires a connection; do not create a second offline mutation queue in A9.
7. Update the local active ID only after Supabase confirms the profile update. A failed update leaves
   the current program unchanged.
8. Although account switching is unsupported, include `userId` in the cache. Ignore a cache belonging
   to a different Auth user and clear/quarantine it on explicit sign-out.

This keeps workout use offline-first without inventing conflict resolution for program assignment.
A6.5 remains responsible for preserving the actual unfinished workout.

## Library interaction contract

The Library list should use one action per card, not compressed side-by-side controls:

- active program first, with a clear **Active** badge and **Open plan** action;
- remaining available programs below, each with title, short summary, useful tags/equipment, and a
  full-width **Preview** action on its own row;
- Preview drills into a full Library screen using the existing read-only program renderer. It is too
  long for a bottom sheet;
- an available but inactive preview ends with a large **Use this program** action;
- activation confirmation uses the existing `BottomSheet`: “Make [program] active? Your history
  stays. Today and Plan will use this program.”;
- the card's text, source/equipment line, and action must never share a cramped row—the overlap in
  the current mock-up is explicitly rejected;
- controls need at least a comfortable thumb target, safe-area spacing, visible focus, and no
  hover/long-press dependency.

Required states:

- loading from cache/server;
- active + available;
- available but no active selection;
- no programs available (“Your coach has not made a program available yet” + Retry);
- offline with a usable cache;
- offline without a cache;
- assignment references a cartridge missing from this app version;
- activation in progress and activation failed.

Do not show unassigned bundled cartridges in the normal user Library. A future coach/admin screen may
show them, but that is not A9.

## Exact metadata recommendation for the spec revision

Promote the cartridge format additively to v3 with these root fields:

| Field | Rule | Used by |
|---|---|---|
| `schemaVersion` | required integer, exactly `3` for this revision | compatibility and validator |
| `cartridgeVersion` | required semantic-version string such as `1.0.0` | revisions without changing stable ID |
| `summary` | required plain string, 1–160 characters | Library and Plan cards |
| `outcomes` | required array of 2–4 unique strings, 1–80 characters each | benefit-led Library/program detail copy |
| `tags` | required array, 1–8 unique lowercase-kebab strings | compact grouping/filtering |
| `requirements.equipment` | required for training cartridges; unique non-empty display strings; empty array allowed | gym-fit warning and Plan |

Keep `description` as the longer program explanation. Do not add owner, athlete, assignment, active
state, estimated duration, privacy, or coach-lock fields to JSON. Ownership/access belongs in
Supabase. Do not add cross-cartridge journey fields during A9; that revision is shared with future
Checklist work and stays outside Train.

When v3 is implemented, update together:

- `PROGRAM-CARTRIDGE-SPEC.md` and its worked examples;
- Authoring Kit prompt/readme/reviewer checklist;
- `validateCartridge()` and focused tests;
- all three canonical root cartridges and their app-bundled mirrors;
- the permanent regression guard over every authored cartridge.

The existing Coach Prompt says cartridges should record its version, but the current spec has no
field for that. Do not silently invent one in A9. Either remove that sentence or rule on a separate
`authoredWith` field when the authoring provenance is actually consumed.

## Recommended implementation slices

Keep A9 as four reviewable changes rather than one large PR:

1. **A9a — Supabase access foundation:** migration, explicit grants, RLS, profile-policy hardening,
   composite active/available constraint, advisor checks, and real two-user isolation proof.
2. **A9b — cartridge spec v3 metadata:** spec, authoring kit, validator/tests, three canonical files,
   and app mirrors. No UI.
3. **A9c — access loader and offline cache:** pure mapping/validation helpers, Supabase reads/update,
   cache behaviour, error states, and tests. No visual redesign.
4. **A9d — Library behaviour:** assigned-only list, preview drill-in, activation sheet, loading/empty/
   offline states, responsive CSS, and on-device checks.

A10 then renames Workout / Playbook / Cartridges to Today / Plan / Library and completes the wider
Train information architecture. Do not smuggle that rename into A9.

## Proof required before A9 is complete

Database/RLS:

- user A sees only A's availability rows; user B sees only B's;
- neither user can add/remove availability, edit `role`, delete a profile, or activate an unavailable
  cartridge;
- each user can activate one of their own available cartridges;
- anonymous access returns nothing/permission denied;
- trusted admin/service action can assign and remove a non-active availability row;
- database security and performance advisors are rerun; any remaining warnings are named and scoped.

App:

- filtering never reveals an unassigned card through ordinary UI;
- first paint can use valid cache; refresh cannot erase it on network failure;
- wrong-user or corrupt cache is rejected;
- unknown cartridge IDs never fall back to the first bundled cartridge;
- failed activation leaves server and cache on the previous active program;
- app close/reopen and offline reopen preserve the last confirmed Library state;
- Android and iOS portrait checks cover card spacing, keyboard/safe areas, 3-second recognition of
  the active program, and the exact metadata/Preview overlap reported in the mock-up.

## Risks and boundaries

- **Hidden is not private.** A technical user can inspect bundled files. Genuine privacy would need
  backend delivery and is deliberately not part of A9.
- **Manual coach operation is intentional.** A coach dashboard for three users would cost more than
  it saves and would introduce harder authorization work.
- **Deployment order matters.** Apply and prove A9a, identify/seed assignments, then ship the
  assigned-only UI. Otherwise existing users would briefly see an empty Library.
- **No payload changes.** A9 does not touch workout logging, `sessions.payload`, `%1RM/e1RM`, Sheets,
  `playbook.js`, n8n, A6.5 drafts, or A7.

## Approval record

Approved on 2026-07-22. These five recommendations were accepted; the four implementation slices
remain A9a through A9d:

1. `user_cartridges` plus the existing profile active pointer and composite constraint;
2. narrow the current profile policy/privileges as part of A9a;
3. manual coach assignment for now; user activation only from the available set;
4. cached offline browsing but online-only activation;
5. the v3 metadata contract and four-PR sequence. The subsequent phone review added structured
   `outcomes` because a summary alone could not reliably produce a scan-friendly benefit section;
   the developer explicitly approved that review before A9b.

## Current Supabase references

- [Securing the Data API: grants and RLS work together](https://supabase.com/docs/guides/api/securing-your-api)
- [Row Level Security guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [2026 change: new tables may require explicit Data API grants](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
