# Pilot Coaching Data Architecture Diagnostic

**Status:** diagnostic and proposed contract only — no migration, Storage bucket, client data, or app behaviour is created by this document.

> **Historical foundation:** the privacy boundary and separation-of-information analysis remain useful,
> but `ONBOARDING-SYSTEM-DESIGN.md` supersedes this document's Slack-mediated workflow,
> client-surface assumptions, and proposed storage direction. Use the newer system design and
> `ONBOARDING-QUESTION-SPEC.md` for current implementation decisions.

**Scope:** two adult pilot clients who are long-time friends. The developer remains the coach and the intermediary for client communication. Slack is the intended professional communication channel, used manually for now; no Slack integration or automation is in scope. This is a private coaching workflow, not yet a client-facing onboarding product.

## Decision summary

Keep the existing authoring kit, including `docs/authoring/COACH-PROMPT.md`. It is a durable, versioned instruction layer for an AI-assisted coach; it is not imported by the app, stored in Supabase, or required at runtime. Deleting it would not crash Combat OS, but it would break the documented authoring workflow and remove useful proven context.

Build on it in stages:

1. Preserve the current prompt as the tested baseline.
2. Add a separately versioned coaching doctrine and evidence ledger after its contents have been reviewed.
3. Later, update the coach prompt to explicitly consume that doctrine version.
4. Keep each client's personal information and raw onboarding material outside Git and outside the rendered cartridge.

The existing Supabase model is intentionally too small for private coaching dossiers. It currently supports authentication, session sync, and cartridge availability; it does not provide a coach-owned case record, a private gym-photo store, a revision history, or a safe administrative workflow. Do not overload `profiles`, `sessions`, or `user_cartridges` to hold this information.

## What exists today

| Area | Current responsibility | Not suitable for |
| --- | --- | --- |
| `docs/authoring/COACH-PROMPT.md` | Model-agnostic coaching/authoring instruction baseline | Personal client records or runtime app data |
| `docs/authoring/INTAKE-SCHEMA.md` | Portable intake structure for a model-assisted authoring workflow | Secure storage of completed intakes |
| `app/src/data/cartridges/index.js` | Static registry of bundled cartridge JSON mirrors | Private, per-client program delivery without a code deployment |
| `profiles` | A signed-in user's profile and active cartridge pointer | Intake, injuries, gym images, coaching conversations, or coach notes |
| `user_cartridges` | Which cartridge IDs a user may access | Cartridge content, private dossier data, or client self-service authoring |
| `sessions` | Workout-session sync data | Coaching records or client administration |

`user_cartridges` answers “may this user open cartridge X?” It does not make a bundled cartridge private. A custom cartridge still needs to be validated, added to the application's registry, built, and deployed before that availability row can be useful.

## Separation of information

Use four distinct places, each with one job.

| Place | Store here | Never store here |
| --- | --- | --- |
| Git repository | Generic schemas, doctrine, authoring prompts, validators, anonymised fixtures | Names, email addresses, intake answers, photos, raw chat, private coaching notes |
| Private Supabase database | Case metadata, structured intake revisions, gym-inventory revisions, coach brief, approvals, links to assets | Runtime cartridge source of truth or unbounded raw chat history |
| Private Supabase Storage | Gym photos and other client-provided files, with metadata linked to the coaching case | Public assets, public URLs, or files without a case identifier |
| Cartridge JSON and app registry | Only the approved program: exercises, schedule, safe program notes, and display data | Email, photos, detailed injury/health history, raw intake, coach deliberation, or consent records |

This separation prevents a program export, source-code commit, or normal app screen from becoming an accidental copy of a client's personal information.

## Proposed Pilot Coaching Dossier v1

The dossier is a coaching-case record, not one large document and not a replacement for the runtime cartridge. It should be append-only where practical: new intake clarifications and revisions are added rather than silently overwriting history.

### Case lifecycle

```text
intake_requested
  -> intake_received
  -> clarification_required
  -> gym_inventory_confirmed
  -> coach_draft_ready
  -> client_review
  -> approved_for_compilation
  -> compiled
  -> validated
  -> deployed
  -> assigned
```

The state indicates what may happen next; it is not a judgement of the client. A return from `client_review` to `clarification_required` is normal and preserves the feedback loop.

### Data contract (logical, not SQL yet)

```text
CoachingCase
  id
  status
  coach_owner_user_id
  client_profile_id (optional until the client has authenticated)
  client_contact_email (restricted; never copied into a cartridge)
  consent_recorded_at
  created_at / updated_at
  final_cartridge_id (optional until deployment)

CoachingCaseRevision
  id
  case_id
  revision_number
  type: intake | gym_inventory | clarification | coach_brief |
        client_feedback | approval | compilation_handoff
  structured_payload
  author_role: coach | client_via_coach | system
  created_at

CoachingAsset
  id
  case_id
  storage_path
  asset_type: gym_overview | equipment_detail | cardio_area | other
  capture_source: client
  inventory_status: pending_review | detected | client_confirmed | excluded
  created_at
```

The data contract deliberately keeps contact identity at the case level and keeps the detailed program brief in revisions. The cartridge compiler receives an approved, minimised `compilation_handoff` revision, not unrestricted access to every raw file and message.

### Dossier content requirements

The intake and coach brief should support, at minimum:

- goals, priority order, outcome and time horizon;
- training history, current routine, schedule, session length, recovery and preferences;
- equipment available, unavailable, uncertain, and substitutions accepted;
- relevant limitations volunteered by the client, expressed only to the level needed to coach safely;
- gym inventory confidence and client confirmation;
- coach-selected program principles, progression approach, exercise alternatives, and reasons for material constraints;
- client questions, requested changes, and explicit approval of the final direction;
- cartridge validation, deployment, and assignment status.

Do not treat raw Slack conversation as the dossier. The coach should add a concise, structured clarification or decision revision after each meaningful exchange, then manually relay the appropriate summary to the pilot in Slack. This keeps the record usable, reduces sensitive-data sprawl, and lets the same case resume cleanly weeks later.

## Gym-photo inventory workflow

1. Ask for wide, well-lit photographs of each gym zone: free weights, machines, cables, cardio, functional area, and any relevant outdoor/conditioning space.
2. Ask for individual photographs of unfamiliar or branded machines, including their labels and adjustment points where visible.
3. A vision-capable assistant creates a **draft** inventory with a confidence level for each item.
4. The coach reviews it, then asks the client only about uncertain equipment, restrictions, and plausible alternatives.
5. Store the confirmed inventory as a `gym_inventory` revision. Mark raw images and individual assets with their confirmation status.
6. The coach brief and compilation handoff may use only confirmed equipment, plus explicitly approved substitutions.

The model must never infer that a pictured machine is safe, correctly adjusted, or available during the client's usual training time. A photograph is evidence of possible equipment, not a prescription.

## Access and privacy model for the pilot

### Recommended v1 boundary

For the two pilots, the developer/coach is the only person who can read or write dossier tables and asset metadata. Pilot clients keep their existing app access: they can see only their own profile, sessions, and assigned cartridge availability. They do **not** receive an in-app dossier screen or direct file-upload access in v1.

This matches the intended WhatsApp-mediated process and avoids prematurely building a health-data portal.

### Future boundary, only when needed

If clients later upload files or view parts of their onboarding status in the app, add narrowly scoped, case-specific policies and signed upload/download URLs. Do not grant broad `authenticated` access, use a public Storage bucket, or place a Supabase service-role key in the frontend.

The future implementation must include Row Level Security on every new public-schema table, explicit grants, and tests proving that:

- the coach can access only cases they own;
- a signed-in pilot cannot read another pilot's dossier or assets;
- a pilot cannot modify a case, cartridge approval, or assignment;
- app-side credentials cannot perform coaching administration;
- the existing policies for `profiles`, `sessions`, and `user_cartridges` remain unchanged.

## Cartridge compilation boundary

The compiler's input is a reviewed, approved `compilation_handoff` revision containing only:

- confirmed training constraints and equipment;
- approved program design choices and substitution rules;
- a pseudonymous case identifier and intended cartridge ID;
- the information needed by the cartridge schema and validator.

The compiler must not receive personal contact details, raw images, unrestricted health history, or raw client conversation by default. Its output remains subject to the existing cartridge specification, reviewer checklist, validation commands, app build, deployment, and only then the normal `user_cartridges` assignment process.

Custom-cartridge delivery remains a deployment operation in the current architecture. Dynamic database-hosted cartridges are a separate future product decision, not a shortcut to take during this pilot.

## Explicit non-goals

- No schema migration, Storage bucket, RLS policy, Edge Function, or admin dashboard in this diagnostic.
- No client personal data committed to the repository.
- No daily check-in system, n8n automation, Slack integration, or agent autonomy over client communication.
- No changes to workout maths, webhook payloads, Google Sheets, `playbook.js`, or the existing cartridge-assignment rules.
- No claim that this is a substitute for medical assessment, clinical nutrition care, or emergency support.

## Open decisions before implementation

These need an explicit developer ruling before any migration is written:

1. **Pilot consent and retention.** Deferred by the developer until a later stage. No consent or retention system is created for the friends-and-family pilot.
2. **Raw image retention.** Recommended: retain images while the inventory is under review; after confirmation, keep only those still useful for exercise selection and delete the rest on the agreed retention schedule.
3. **Client identity linking.** Recommended: create the coaching case first, then link it to `profiles.id` only once the person has authenticated with the intended email.
4. **Admin boundary.** Recommended: an explicitly protected coach-only server/admin workflow, never a privileged browser client.
5. **Client dossier access.** Recommended: no direct dossier access in v1; communication remains mediated by the coach.
6. **Slack handling.** Decided for v1: use Slack manually for professional client communication; do not import raw chats. Store structured summaries, decisions, and client-approved changes only.

## Implementation gate for a later, separate roadmap item

Before any database implementation begins, create a dedicated, approved roadmap prompt with these phases:

1. Inspect the live Supabase schema, roles, extensions, and current RLS policies; report only.
2. Approve the final data model, retention choices, and protected coach administration mechanism.
3. Write reversible migrations for case/revision/asset metadata tables and a private Storage bucket, with RLS and grants in the same change.
4. Validate policies using coach, pilot-client, and unauthenticated test cases; run Supabase security advisors.
5. Add a minimal internal-only workflow to create/link a pilot case and record the first structured revision.
6. Test that a generated cartridge contains no personal dossier data, then use the existing validation/build/deployment/assignment path.

Until that item is approved, `COACH-PROMPT.md` remains the authoring baseline and the two pilots' private information must stay out of the repository.
