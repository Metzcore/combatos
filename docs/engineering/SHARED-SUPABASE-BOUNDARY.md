# Shared Supabase boundary — Track A / Track B

**Version 1.0 · 2026-08-01**

> **This contract exists in two copies.** The other is the hard-rules section of
> `CombatOS-Onboarding/AGENTS.md`. **Changing one requires changing both and bumping the version
> here.** If they ever disagree, this file is authoritative and the other copy is stale.

## Why this file exists

Two separate applications share **one** Supabase project. Until now, neither repository recorded
that fact — `ARCHITECTURE.md` did not mention onboarding at all.

That matters because of how the credentials work. An agent asked to "fix the onboarding flow"
operates in a repo whose server-side key **bypasses Row Level Security on every table in the
project**, including the live training data of the Combat OS app. Nothing in either repo previously
told it where to stop.

This file is that boundary. It is mostly convention, and it says plainly which parts are enforced
and which are not — a rule you believe is enforced when it isn't is worse than no rule.

## The two tracks

| | **Track A** | **Track B** |
|---|---|---|
| Repository | `Fight-Camp` (this one) | `CombatOS-Onboarding` |
| What it is | the Combat OS PWA, live in production | client intake questionnaire + `/coach` ops dashboard |
| Owns these tables | `sessions`, `profiles`, `user_cartridges`, `body_metrics`, `coach_athletes` | `onboarding_cases`, `onboarding_case_events`, `onboarding_responses` |
| Deployment | Cloudflare, automatic on merge to `main` | Cloudflare Workers — **not yet deployed** |

⚠️ **Naming warning.** "Track B" used to mean the *second user* (Apex Protocol, "Project B" in
`archive/CHECKLIST.md`). It now means the onboarding site. Documents written before 2026-08-01 may
use the old sense — check the date before trusting the label.

## Shared resources, and what goes wrong

| Resource | How it is shared | Failure mode |
|---|---|---|
| Postgres database `pckokypnxrimayjmjgcl` | One database, both applications | A server-side key from either side can read or write the other's tables |
| `auth.users` | One identity pool for both apps | **Deleting a user cascades** into `profiles`, `sessions`, `user_cartridges` and `body_metrics` — it destroys training history, not just a login |
| Migration history | One ledger, one version sequence | A migration applied out-of-band drifts the repo from live and breaks replay-on-fresh-project |
| Auth settings — redirect allow-list, "Allow new users to sign up" = **off** | Project-wide, dashboard-managed, in no migration | Both apps depend on invite-only. Turning signup on silently opens both |
| Free-tier quotas (auth emails, egress) | Shared pool | Track B traffic can exhaust what Track A needs |

The cascade is not theoretical. On 2026-08-01 a duplicate account created in error was deleted from
the Supabase dashboard; the `profiles` row went with it (4 → 3). It was harmless only because that
account had no training data yet.

## The rules

Enforceability is stated honestly. "Automated" means a test fails. "Procedural" means only a human
catches it.

| # | Rule | Enforcement |
|---|------|-------------|
| **R1** | Track B writes **only** `onboarding_*` tables | **Automated** — boundary test over all Track B runtime code |
| **R2** | Never delete an `auth.users` row from Track B | **Automated** in code (no Auth Admin helpers exist); **procedural** against manual dashboard actions |
| **R3** | Never create `auth.users` rows from Track B code | Same: automated in code, procedural in the dashboard |
| **R4** | Never write `user_cartridges` or `profiles.assigned_cartridge` from Track B | **Procedural** — enforced by running cartridge work as a separate Track A task |
| **R5** | One project, one migration ledger: every migration is recorded in Track A's `supabase/migrations/` under its **live** version string | **Procedural.** Was violated until 2026-08-01 (see that file's README) |
| **R6** | Never change project-wide Auth settings unilaterally | **Procedural** — both apps depend on them |
| **R7** | The Track B Worker's secret key is **revocable, not table-scoped** | **Not enforceable.** A Supabase secret/service-role key bypasses RLS everywhere. A dedicated key limits blast-radius *recovery*, not *reach* |
| **R8** | No Track B session touches `Fight-Camp/app/`, Dexie, webhook payloads, `%1RM` math, or `playbook.js` | **Procedural** — requires the task handoff below |

### On R7, specifically

Do not describe the onboarding Worker's credential as "scoped to onboarding tables". It is not.
It is a full-privilege key that happens to be used carefully, and whose only real safety property
is that it can be revoked independently of Track A's.

Genuine database-enforced isolation needs a narrowly authorised admin role or RPC surface rather
than a service-role credential. That is the actual destination; it is deliberately deferred, and
until it exists R7 is a convention.

### The boundary test is access-aware, not word-based

A test that bans Track A table *names* fails immediately and uselessly: Track B legitimately uses
"sessions" as a questionnaire section ID and in question copy ("How many gym **sessions** do you
want in a normal week?"). Test for forbidden **access constructs** — `.from("profiles")`,
`/rest/v1/<track-A-table>`, Auth Admin URLs, cross-repo filesystem paths.

## R8 — crossing the boundary for cartridge work

Cartridge delivery necessarily spans both tracks. It does so by **ending one task and starting
another**, never by one session holding both sets of credentials:

```
Track B: approved cartridge candidate
   ↓ stop the Track B task
Track A task: add cartridge → validate → test/build
   ↓ developer approval
Developer: deploy → assign
   ↓
Track B: client verification and retrospective
```

Deployment and cartridge assignment are **developer actions**. An agent may prepare, validate and
verify around them, and should print the exact command rather than run it.

## Changing this contract

1. Edit this file and bump the version.
2. Mirror the change into `CombatOS-Onboarding/AGENTS.md` and match the version.
3. Record the decision in both `docs/decision_log.md` files.

Never record a client email, Auth UUID, invite token, or magic link in either copy, or in any
tracked decision log or runbook.
