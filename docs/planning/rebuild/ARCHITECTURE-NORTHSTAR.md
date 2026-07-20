# Combat OS — Rebuild Architecture (North-Star)

> **STATUS: PLANNING / TARGET STATE — not yet built.** This documents the direction the
> Train/Log/Settings rebuild is aiming at, decided in the 2026-07-20 architecture consult.
> It is NOT a description of the current app (see `ARCHITECTURE.md` at repo root for that).
> Nothing here imports Apex Protocol code (AGENTS.md rule 3); Apex is referenced only as the
> second reference implementation whose divergence revealed the variation axes below.

---

## 1. The core idea: console + cartridge

The app should be a **universal training-tracker shell** ("the console") that renders whatever a
**program definition** ("the cartridge") tells it to. One codebase runs every training style; a
person's specific program is data, not a fork. This is the direction because we now have three
data points: Combat OS v1 (first build), Apex (second, cleaner), this rebuild (third) — the
classic "rule of three" moment to extract the abstraction.

Apex's HUD already half-implements this (it renders a dynamic `exercises[]` array from JSON).
The rebuild adopts that dynamic, program-driven model as the foundation; Combat OS's fixed-slot
CSV model is the thing being replaced.

A person's program is a **bundle of TYPED cartridges** — a `training` cartridge (workout days +
prescription model) and optionally a `content` cartridge (theory / educational / quick-consumption
material, e.g. Apex's "theory" tab, which has monetisation potential as a separately shippable
product). The bundle also declares **which navigation hubs appear** — so the set of tabs is
config, not hardcoded. "Combat OS" and "Apex" become two bundles on one app, not two codebases.

## 2. Three layers, kept strictly separate

The mental model that resolves most of the "will I wipe someone's data?" fears:

| Layer | What it is | Lives in | Changing it affects |
|-------|-----------|----------|---------------------|
| **Code** | the app's screens + logic | the repo → Cloudflare deploy | features, for everyone |
| **Config (cartridge)** | a person's program definition | a JSON file / DB row assigned to their account | that one person's program |
| **Data** | a person's logged sessions | the database (Supabase) | only their own history |

**Redeploying the code never touches anyone's data**, because data lives in the database, not
in the deployment. This is the property the current Sheets+webhook setup lacks (data is trapped
in the deployment/device) and the main reason the rebuild targets a real backend.

## 3. The six variation axes (what differs between training styles)

Derived from comparing Combat OS and Apex. Everything else is universal. A program bundle
(its cartridges + their choices) is defined by these six:

1. **Data schema** — how a day/exercise is described (mostly universal; see the cartridge spec).
2. **Prescription model** — the "science": `%1RM` (Combat OS), `RPE` (Apex), `straight-sets`,
   `time/distance`, `bodyweight`. A small closed set (~5). The app carries one small module per
   model; a cartridge picks one by name. **NOTE: `%1RM` math is AGENTS.md rule 1 (frozen);
   `RPE` is rule-3 Apex content — these stay as ISOLATED modules, never merged.**
3. **Logging payload** — per-session-row vs per-set-row. The rebuild picks ONE canonical shape.
4. **Day-type vocabulary** — training / rest / recovery / fight / custom.
5. **Domain widgets** — optional per-program surfaces (hip-score routing, bag work, warmups,
   recovery cards). Feature-flagged by the cartridge, off by default.
6. **Navigation / hubs** — which bottom-nav hubs appear and in what order, declared per bundle.
   Universal hubs (Checklist, Timer, Settings) are always available; program-specific surfaces
   (e.g. Apex's theory tab, driven by a `content` cartridge) appear only for bundles that include
   them. This is why "I don't want the Apex theory tab in Combat OS" is trivially true — Combat
   OS's bundle just doesn't declare it. See §3.1 for the pattern that keeps the bar uncrowded.

### 3.1 Navigation model: config-driven hubs + the "More" catch-all

Two composition patterns, both mobile-proven (the TRW app uses both — see
`docs/reference/therealworld-app-references/`):

- **Hub with top-tabs** (Combat OS already has this): one bottom-nav hub whose screen has
  swipeable sub-tabs — Train→Workout/Playbook, Checklist→Checklist/Notes. Good for 2–3 tightly
  related screens.
- **"More" catch-all hub** (TRW pattern; the rebuild adds this): one bottom slot opens a
  menu-list of secondary / rarely-used / program-specific destinations (Settings, Profile, and
  program-specific surfaces like the Apex theory tab). Keeps the bottom bar at ~4–5 PRIMARY
  icons no matter how many secondary surfaces exist.

Consequence: **Checklist is promoted to a universal primary hub** (wanted in every app);
overflow and program-specific tabs go into "More". Apex's crowding problem (6 icons + no room
for Checklist) is solved by moving secondary tabs into "More" and making the hub set config.

### 3.2 Cartridge types

A cartridge carries a `type`. Two are defined now; more may be added:

- **`training`** — workout days + a prescription model. Drives the Train hub. (Fully specced.)
- **`content`** — theory / educational / quick-consumption material (sections + items). Renders
  in its own hub or a "More" entry. Monetisation-relevant: a workout-science cartridge and a
  theory/content cartridge can be sold or shipped independently and bundled per person.

Combat OS today ships a `training` cartridge only. A `content` cartridge is an Apex concern;
Combat OS may add a placeholder "More" hub later, but the theory *content* stays out of its bundle.

## 4. The vocabulary: branch vs environment vs tenant (do not conflate)

| Concept | What it is | Used for | We want |
|---------|-----------|----------|---------|
| **Branch** (git) | a version of the **code** | building features | one `main` |
| **Environment** (deployment) | a running copy pointed at a backend via env-vars | prod vs demo vs staging | 2: production + public demo |
| **Tenant** (user) | a person's isolated **data** in one deployment | separating users | many, via auth + row-level security |

**Forking (divergent code per person) is the anti-pattern we are escaping** — it is exactly the
Combat-OS-vs-Apex pain. Per-user *program* = a cartridge (data). Per-user *data* = a tenant. The
ONLY legitimate second deployment is the public **demo environment**: same code, dummy backend.

## 5. Two tracks (separable; the full vision needs both)

- **Track A — Cartridge system** (client-side): one program-definition format, a small
  prescription-module registry, a dynamic renderer. Makes the app *configurable* per style.
- **Track B — Multi-tenant backend** (Supabase): auth + row-level security, per-user data,
  central analysis. Makes the app *shareable, analyzable, open-sourceable*. This is decision D7.

The developer is committing to **Track B** as the load-bearing move (2026-07-20).

## 6. Multi-tenant specifics (Track B)

- **Auth = magic link / passwordless.** A user taps one emailed link on their phone → logged in.
  **PWA sessions persist** (token auto-refreshes) — they log in ONCE, ever, not per open. No
  password management.
- **Public signup DISABLED.** Only invited accounts exist → no unwanted users from the public URL.
- **Public LinkedIn demo = guest mode**, a separate environment with a dummy backend and no
  signup; touches no real data.
- **User registry lives in Supabase:** `auth.users` (identity/login, built-in) + a `profiles`
  table (one row per user: display name, assigned cartridge, role, notes). No external user doc.
- **Onboarding a person** = invite email + assign a cartridge. No branch, no new deployment,
  no risk to other users. Redeploy freely.

## 7. Migration off Google Sheets

Two distinct things, often conflated:
1. **Old data** (historical Sheet rows) — **wipe / freeze, do not carry forward.** The new
   schema differs enough that migrating is a translation exercise into a schema we're adopting
   *because* the old one was limiting. Freeze both Sheets as read-only archives; nothing is lost
   (a one-time CSV import can be written LATER if the history is ever wanted).
2. **Write path** (code that logs to the Sheet webhook) — **repointed at Supabase** as part of
   the Track B build. This is a code change, not a data operation.

Combat OS and Apex migrate independently; no big-bang. Google Sheets may survive as an OPTIONAL
per-user export later, never again as the primary store.

## 8. Staged plan

| Stage | What | Notes |
|-------|------|-------|
| **0 — now** | Gym change = `playbook.csv` swap into the CURRENT app | Unblock training; do NOT entangle with the rebuild. |
| **1** | These two planning docs (this file + the cartridge spec) | The rule-of-three artifact; the reference to hand other agents. |
| **2** | Rebuild Train + Log on the universal program format; `%1RM` as first prescription module. Single-user. | The "third time done right." Build so 3–4 aren't foreclosed; don't build 3–4 early. |
| **3** | Supabase migration (Track B): auth, RLS, per-user data; retire per-user Sheets | Unlocks sharing + central analysis + open source. |
| **4** | Segment onboarding: add RPE / straight-sets modules, a program-authoring flow, "pick your model" | New person = a cartridge, not a deployment. Apex folds in here. |

## 9. Non-goals / anti-patterns (say no to these)

- **No forks per user.** Config + tenants instead.
- **No premature engine.** Don't build Stages 3–4 before the Stage-2 rebuild exists.
- **No merging the prescription sciences.** `%1RM` and `RPE` stay isolated modules (rules 1, 3).
- **No touching the frozen webhook/Sheets schema** until Track B deliberately replaces the write
  path (AGENTS.md rule 2).

## 10. Decisions to formalize (log in decision_log / OPEN-DECISIONS at next goodnight)

- **Committed:** Track B (Supabase multi-tenant) is the distribution foundation (extends D7).
- **Committed:** one app, cartridge-driven — no per-user forks; Apex becomes a cartridge, not a
  sibling app, at Stage 4.
- **Committed:** clean-slate migration (wipe/freeze old Sheet data).
- **Committed:** a program is a BUNDLE of typed cartridges (`training` + optional `content`);
  cartridge types can be sold/shipped independently. Apex's theory tab is a `content` cartridge.
- **Committed:** navigation is config-driven (variation axis #6); ~4–5 primary hubs + a "More"
  catch-all for overflow/program-specific surfaces; Checklist is a universal primary hub.
- **Open:** canonical logging shape (per-session vs per-set row) — decide during the Stage-2
  rebuild, informed by the W26 Log-hub research.
- **Open:** exact prescription-module boundary/interface — decide when the second module (RPE)
  is actually added (rule of three again — don't over-abstract on the first).
