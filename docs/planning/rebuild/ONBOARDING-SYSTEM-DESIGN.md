# Onboarding System Design

**Status:** approved design, doc-only. No app code, Supabase migration, n8n workflow, or cartridge
exists from this document. It is the self-contained packet for whoever builds each piece.

**Scope:** how a new coaching client goes from "you have their email" to "a personalised cartridge is
running on their phone" — the channels, the surfaces, the data, and the order of construction.

**Pilot identifier:** `PILOT-01`. Never put a real name, email, photo, or health detail in this repo.

---

## 1. Companion documents

Read these before building anything here. This document does not repeat their contents.

| Document | What it owns |
|---|---|
| `PILOT-COACHING-DATA-ARCHITECTURE-DIAGNOSTIC.md` | Where data may live, the privacy boundary, the Supabase implementation gate |
| `PILOT-ONBOARDING-PACK-DRAFT.md` | The coach-facing pack: welcome copy, dossier templates, clarification loop, readiness checklist |
| `ONBOARDING-QUESTION-SPEC.md` | The canonical questionnaire — the reusable artifact the site renders |
| `GYM-PHOTO-VISION-PROMPT.md` | Turning client gym photos into a structured equipment inventory |
| `ONBOARDING-SITE-IMPLEMENTATION-PLAN.md` | Build instructions for the landing page |
| `docs/authoring/*` | The authoring kit — unchanged by this design |

> ⚠️ Some companion files are currently **untracked** in the `codex/kimi-trial-1` working tree and
> are not on this branch. They are approved work product; commit them alongside this branch.

---

## 2. What this system is — and is not

**Is:** a manual, coach-run onboarding process with one polished client-facing surface, plus
notification automation. One coach, a handful of clients, everything reversible.

**Is not:** a self-service product, a client portal, a health-data platform, or an automated
plan generator. Each of those is explicitly deferred in §7 with a reason.

---

## 3. The client journey

1. **Coach obtains the client's email** and creates their Supabase user, **setting `display_name` to
   the client's real first name at creation time** (the signup trigger otherwise auto-populates it
   with their email — see §5).
2. **Coach sends a magic link.** This single link both authenticates them and is the personalised
   entry point — no password, no separate slug, no account-creation step.
3. **Client lands on the onboarding page.** Greeting by name, one heading, the questionnaire.
   No navigation bar, no footer, no distractions.
4. **Client answers, at their own pace.** Progress saves continuously; they can close the tab and
   resume from the same link later.
5. **On submit:** answers are written to Supabase; a webhook fires an n8n workflow that notifies the
   coach on Telegram (including which intake gates remain unanswered) and emails the client a
   confirmation.
6. **Gym photos travel over WhatsApp,** not the site. The coach runs `GYM-PHOTO-VISION-PROMPT.md`
   against them in any vision-capable model and gets a structured inventory draft back.
7. **Coach confirms uncertain equipment** with the client, completes the dossier
   (`PILOT-ONBOARDING-PACK-DRAFT.md` Part 4), and writes the coach brief.
8. **Coach authors the cartridge** using the existing authoring kit, validates it, commits, deploys,
   and assigns it via `user_cartridges`.
9. **Client installs the app** and trains against their own programme.
10. **Later — after real training history exists —** the same website gains a dashboard route with
    the heavier analytics, while the mobile Log tab stays deliberately simple.

Steps 6–8 are **manual by design** for the pilot. See §7.

---

## 4. Surfaces and where data lives

| Surface | Purpose | Notes |
|---|---|---|
| **Onboarding site** (new) | Questionnaire now; client dashboard later | Own Cloudflare Pages project, shared Supabase. Same site, two routes — not two products. |
| **Combat OS PWA** (existing) | Training delivery and logging | Unchanged by this design |
| **Supabase** (live) | Auth, profile, questionnaire answers | Magic-link auth already in production since 2026-07-21 |
| **n8n** (live) | Notification and rendering workflows | New workflows only — never touch the stack itself |
| **Telegram** | Coach notification + client accountability | Hermes `sentinel` profile already live |
| **WhatsApp** | Gym photos only | Manual. Keeps client images out of Supabase Storage for now. |

**Slack is not used.** It was considered and dropped: it has no integration, and the automation
stack already points at Telegram.

---

## 5. Data model

Nothing here is implemented. The coach applies migrations; agents do not — see §9a for the
cross-track protocol governing that.

**`profiles`** (existing table, verified against `20260720231445_init_sessions_profiles_rls.sql`) —
**`display_name` already exists.** No migration needed. It is currently auto-populated with the
user's email by the signup trigger and is read nowhere in the app, so it is safe to overwrite. The
coach sets it to the client's real first name at account-creation time (§3 step 1) — that is the
column's first real use.

> This correction replaced an earlier draft of this document that proposed adding the column. The
> Track A agent caught it on cross-track review; verified directly against the migration file, not
> taken on trust (see AI-WORKFLOW §1 — a chat claim is signal, not authority, until checked).

**`onboarding_responses`** (new table):

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | references the authenticated user; one row per client |
| `answers` | jsonb | the full answer set |
| `status` | text | `in_progress` \| `submitted` |
| `updated_at` | timestamptz | |

**Why `jsonb`:** the question set will change. A JSON column means editing a question never
requires a migration.

**Save-and-resume** is an upsert against the same row. No extra machinery.

**Row Level Security — required in the same migration:**

- a client may `select` / `insert` / `update` **only their own row**, via three explicit
  `to authenticated` policies — deliberately not the single `for all` pattern `sessions`/`profiles`
  use, because that pattern cannot express "no delete";
- no client `delete`;
- the coach reads via the **service role inside n8n**, never from a browser;
- existing `profiles`, `sessions`, and `user_cartridges` policies stay untouched;
- verification uses the **anon key with a real user JWT**, never the service role, which bypasses
  RLS and proves nothing. Full checklist: `ONBOARDING-SITE-IMPLEMENTATION-PLAN.md` §3.

**Do not** add columns to `auth.users` — it is Supabase-managed.

---

## 6. n8n workflows

New workflows only. Adding a workflow is ordinary n8n usage and does not conflict with the
"never disrupt the n8n stack" guardrail — that rule covers containers, the encryption key, and the
compose stack, none of which are touched.

| # | Workflow | Trigger | Value |
|---|---|---|---|
| 1 | Submission → Telegram to coach | webhook on submit | Coach knows immediately |
| 2 | Confirmation email to client | same | Closes the loop politely |
| 3 | **Gate completeness check** | same | Reports which of the seven `[GATES]` are unanswered, so the coach knows instantly whether the intake is authorable |
| 4 | **Dossier skeleton render** | same | Renders answers into the Part 4 dossier template — removes manual transcription |
| 5 | **Abandonment nudge** | scheduled | Started but idle > 48h → gentle reminder. This is the real mitigation for incomplete intakes. |

Workflows 3 and 4 are **deterministic rules, not model calls.** At this scale an LLM adds a failure
surface and buys nothing.

---

## 7. Explicitly deferred — and why

| Deferred | Reason |
|---|---|
| **Client photo upload on the site** | Needs case-scoped RLS, signed URLs, a private bucket, and the diagnostic's six-phase implementation gate. WhatsApp + vision prompt achieves the same outcome at zero risk. |
| **Agent validation of answers** | Roughly sixteen answers can be read in ninety seconds. A deterministic gate check (workflow 3) covers the real need. |
| **Automated plan generation** | The pipeline still terminates in a manual commit, build, and deploy. Automating upstream of an unchanged manual bottleneck saves nothing, and the process has never been run end-to-end. |
| **Consent and retention framework** | Deliberately deferred for the friends-and-family pilot. **Revisit before the first paying client.** |
| **Client dashboard** | Build after trial #1, when real usage says which analytics matter. |
| **Profile pictures** | Requires Supabase Storage — same gate as photo upload. Keep separate. |
| **Feed / platform / articles** | Separate exploration. Note it overlaps the parked "sell-as-product" decision; do not silently un-park it. |

---

## 8. Analytics split — mobile versus web

Ruling to apply when the client dashboard is built:

- **Mobile Log tab answers "did I do the work"** — glanceable, current, roughly eight weeks or less.
- **Web dashboard answers "is it working"** — trends, cross-cartridge comparison, long horizon.
- Heuristic: **needs more than eight weeks of data, or a wide chart → web.**

⚠️ **Do not remove what already ships.** The W9 weekly-stats view is tested and verified on device.
The web dashboard does not exist yet; stripping mobile analytics now would be a regression with
nothing to catch it. The Log hub should **stop adding** heavy analytics, not lose existing ones.
Migrate only once the web surface is live.

This is a **scope input to the running W26 Log-hub research session**, not a separate ruling. W26
already owns the Log-hub question; a parallel decision record would create two homes for one
question.

---

## 9. Parallel-track boundaries

More than one agent session runs against this repo at once. Boundaries:

| Track | Owns | Files |
|---|---|---|
| **Track A — app** | Train / Plan / exercise reference / nav / Log hub | `app/`, `cartridges/` |
| **Track B — coaching ops** (this document) | Onboarding, questionnaire, dossier, coaching site | `docs/planning/rebuild/`, the separate site project |

**Rules:**

1. **One writer per working tree.** A second agent uses its own git worktree and branch. Multiple
   readers are fine; two writers are not.
2. **Never infer app state from `STATUS.md` or `ROADMAP.md`.** Both go stale between sessions.
   Verify against the code, `git`, and the database.
3. **Delegated agents get an explicit read-first file list** and are told not to explore the
   repository. This is what kept the onboarding-pack delegation in scope.

### 9a. Cross-track Supabase safety protocol

This is the first time two tracks have run against the **same live Supabase project**
concurrently. Two independent git worktrees are not themselves a risk — they're just two clients of
one service, same as any two devices. The real risk is two schema changes landing on the database at
once. Agreed with the Track A agent before Track B's migration was written (2026-07-30):

1. **One production-schema baton.** Exactly one actor applies a migration against the real project
   at a time. Never an ad-hoc SQL change, never a concurrent `db push` from two places.
2. **The coach holds the baton.** Neither track's agent applies a migration directly — same
   precedent as `SUPABASE-MIGRATION-PLAN.md` M1–M3, where the coach provisioned and ran everything.
3. **Before applying:** the track proposing a change re-checks that no other track has an
   uncommitted or pending schema change; the exact migration and a proposed window go up for review
   first.
4. **Test on an isolated git branch + its own Cloudflare preview first** — the same pattern already
   proven for Milestone 1, **not** Supabase's paid database-branching product. Resolved, not just
   flagged: the project runs on Supabase's free tier (`ROADMAP.md` — the free-tier-pause gate is
   handled by a keep-alive GitHub Action, confirming no paid tier is active), and native database
   branching isn't available on free tier. The git-branch-and-preview pattern is the only option
   here, not a stylistic choice.
5. **Immediately after applying:** verify migration history, confirm RLS is enabled, and run the
   isolation test matrix (`ONBOARDING-SITE-IMPLEMENTATION-PLAN.md` §3) before anything is built
   against the new table.
6. **Credentials:** never copy secrets between worktrees; the service-role key never reaches a
   client bundle or either frontend; treat any command aimed at production as real regardless of
   which worktree it's launched from.
7. **RLS specifics that bit no one yet but are cheap to get right:** every client-facing policy
   scoped `to authenticated`; an explicit `select` policy is required for `update` to behave
   correctly, not just for reads; confirm the `authenticated` role has ordinary Data API access to
   any new table — RLS governs rows, not table-level access, so a missing grant looks like an RLS
   bug but isn't one.

---

## 10. Build order

| Phase | What | Owner |
|---|---|---|
| **0** | These documents | done with this branch |
| **1** | Supabase schema + RLS; landing page built and deployed; end-to-end test with a burner email | coach + Antigravity |
| **2** | n8n workflows 1–5 | coach |
| **3** | **Trial #1 end-to-end, fully manual** — real intake through to a deployed cartridge | coach |
| **4** | Client dashboard route, informed by what trial #1 revealed | later |

**Phase 3 is the real test, not Phase 1.** A beautiful questionnaire that produces a cartridge nobody
can train from is a failure. The end-to-end run is what validates this design.

---

## 11. Open questions

1. **Consent and retention** — deferred, but must be resolved before the first paying client.
2. **Where filled dossiers live** — private notes outside Git for now; the diagnostic's case tables
   remain unimplemented and ungated.
3. **Doctrine proposals A–D** — approved by the coach, not yet written into the authoring kit. One
   bounded edit, still pending.
4. **Cartridge delivery remains a deployment operation.** Database-hosted cartridges are a separate
   product decision, not a shortcut to take during the pilot.
