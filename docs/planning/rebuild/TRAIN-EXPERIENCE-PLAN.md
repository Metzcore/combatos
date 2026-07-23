# Train experience plan

_Planning decision, 2026-07-22. Documentation only: no app code or database changes were made._

## The outcome

Train should feel like a focused workout tool, not a file browser. It keeps the existing five-button
main navigation. Inside Train, the three top tabs become:

- **Today** — start, continue, and finish the current workout.
- **Plan** — understand the active program and browse its days or phases.
- **Library** — see programs made available to this user and choose which one is active.

The app remains useful to fighters and non-fighters. Combat-specific content belongs in a cartridge,
not in the navigation or the universal player.

## Product rules already decided

- A user can have several available programs but only one active program.
- A coach controls which programs are available and may set the active program.
- For the first version, a user may activate any program the coach made available. Do not build a
  separate coach-lock system until a real case needs it.
- Programs that are not assigned are **hidden, not private**. All bundled cartridge files still ship
  in the web app. This is acceptable for now because a user may legitimately try another person's
  program. If programs later need commercial or medical privacy, they must be delivered from the
  backend rather than bundled into the app.
- Switching between different user accounts on one device is not a supported use case.
- A cross-cartridge journey belongs in the next cartridge-spec revision for future Checklist work.
  Train must not add journey or graduation UI in this pass.
- Attention techniques are allowed only when they help the user act, finish, recover, or see honest
  progress. No infinite feeds, artificial urgency, loss aversion, streak punishment, or random
  rewards.

## What each Train tab must do

### Today

Keep the useful parts of the current Workout screen:

- selected day or day-template, phase when the cartridge actually has phases, and hip score when the
  cartridge uses that feature;
- next-up guidance and honest lock/unlock information;
- the full ordered workout, including mobility, strength, conditioning, cooldown, and core blocks;
- checks and performed values needed to log the session;
- substitutions, notes, custom/fight/cardio sessions, and the final log action;
- the current collapse behaviour where it helps a three-second glance.

Remove duplicated setup and library decisions from the workout itself. Today should open on one clear
state: **Start**, **Continue**, **Rest/recovery**, or **Complete**. The main action should be reachable
with one thumb, and the screen must remain usable offline.

### Plan

Plan explains the one active cartridge. It shows its summary, equipment, structure, days, and optional
phases. If a cartridge has no phases, there is no phase selector or empty phase area. This is browsing
and orientation, not the main logging surface.

### Library

Library shows only programs made available to the signed-in user. Each card needs enough separation
that the program owner/audience line cannot collide with the Preview button. A simple vertical card is
preferred: title and short summary first, availability/source metadata second, then full-width actions.

Library states are explicit: **Active**, **Available**, and, only for a coach-facing view later,
**Unassigned**. Activating a program replaces the single active pointer; it does not delete history or
remove the other available programs.

The approved phone-review direction is **list → detail**, not a row of variable-width selector pills:

- the Library list uses equal-width, left-aligned, whole-row-tappable program cards;
- the real active program carries an **Active** badge; opening another card means **viewing**, not
  silently activating it;
- a detail screen names the program again, shows `summary` and `outcomes` first, then equipment,
  tags and the collapsible week;
- `description` is longer author/program context, not the first unbroken paragraph a user must read;
- Library day rows default collapsed so the week is understood before one day is inspected; Today
  owns the expanded, act-now workout state;
- use neutral dark rows for ordinary structure and reserve strong amber emphasis for "now" or an
  important action rather than filling every training-day header.

For Combat OS, "premium" means calm hierarchy, consistent geometry, honest copy, large touch targets,
fast/offline behaviour and no ambiguity between active/viewing/tappable states. It does not mean glass,
decoration or more animation.

## Supabase responsibility

The live `profiles.assigned_cartridge` field is a good active-program pointer, but one text field cannot
represent several available programs. The implementation diagnostic for A9 should propose an additive
assignment table, conceptually:

- user;
- cartridge ID;
- who made it available;
- when it was made available.

Keep `profiles.assigned_cartridge` as the one active cartridge for now. Access rules must let a user read
only their own assignment rows. Coach write access needs an explicit design and RLS review before any
database change. Owner, assignment, availability, and active state do **not** belong in cartridge JSON.

## Recommended cartridge metadata

The next additive spec revision should add only metadata the real UI or validator will use:

- `schemaVersion` — identifies the cartridge contract understood by the validator and renderer;
- `cartridgeVersion` — identifies a revision of one program without changing its stable cartridge ID;
- `summary` — one short user-facing explanation for Library and Plan cards;
- `outcomes` — two to four short, believable benefits rendered as separate scan lines;
- `tags` — normalized lowercase-kebab values for useful filtering or grouping;
- `requirements.equipment` — a structured list used to warn that a program may not fit the user's gym.

Keep the existing longer `description` for fuller program context. Do not add owner, assigned user,
active state, estimated duration, or speculative progression fields to Train's metadata pass. The
cross-cartridge journey should be designed separately with Checklist, even though it will ultimately be
documented in the shared cartridge specification.

Any metadata change is incomplete unless the written spec, authoring prompt, reviewer checklist,
validator, tests, and every existing cartridge agree. An LLM should still be able to produce a complete
valid cartridge from the authoring kit alone.

## Unfinished workout persistence

Recommendation: keep unfinished workout drafts **local to the device at first**. Supabase receives the
finished session after the user deliberately logs it; it does not need every checkbox or half-typed value
in real time.

The draft is a temporary working document, separate from the permanent session payload. Store it in
Dexie, restore it after an app close or phone lock, and clear it only after a successful local log or an
explicit discard. Save after meaningful changes with a short debounce, and flush on backgrounding,
visibility change, and unmount. It must work with no network.

This avoids a new online dependency and reduces conflict complexity. Since account switching on one
device is out of scope, v1 does not need multi-account draft merging. An explicit sign-out should still
discard or quarantine the local draft so it cannot appear under a later login.

## Roadmap order

1. **A9 — availability and activation diagnostic.** Confirm the assignment-table shape, coach/user
   permissions, RLS, migration, and Library states. Stop for approval before implementation.
2. **A10 — Train information architecture.** Rename the subtabs to Today / Plan / Library and produce
   the responsive interaction specification. Preserve the five-button main navigation.
3. **A6.5 — durable active-workout draft.** Add local autosave and resume before the interactive
   cartridge renderer ships. This is an explicit prerequisite to A7.
4. **Lock the permanent session payload.** W26 still decides the logged-session shape. Draft storage
   must not silently become that permanent contract.
5. **A7 — interactive cartridge renderer.** Render and log every valid cartridge field, including
   optional phases/features and exercise substitutions.

A9 and A10 may proceed while W26 is unresolved. A7 may not.

## Acceptance checks for later implementation

- A new user sees only their available programs and can identify the active one immediately.
- A program without phases never shows phase controls.
- Closing/reopening, locking the phone, switching app hubs, losing the network, or receiving a PWA
  update does not lose an unfinished workout.
- Logging or explicitly discarding a workout clears the correct draft; changing cartridge/day never
  overwrites an unrelated draft silently.
- Android and iOS portrait layouts have large tap targets, safe-area spacing, no keyboard-covered
  action, and no overlap between metadata and actions.
- Today reaches the next meaningful action within a three-second glance and does not depend on a
  network response.

## Protected scope

This plan does not authorize changes to %1RM/e1RM math, the permanent logging payload, historical
Google Sheets/webhook behaviour, generated `playbook.js`, n8n, or the cross-cartridge Checklist
journey. Each implementation item remains diagnostic-first and gets its own branch/PR.
