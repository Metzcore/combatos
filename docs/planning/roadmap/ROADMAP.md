# COMBAT OS — SEQUENCED ROADMAP
_Deliverable 2 of the Fable 5 architect session, 2026-07-10. Same format and role as `archive/CHECKLIST.md` (which this supersedes for sequencing — CHECKLIST.md remains the historical record of Project A). Small/safe/high-value first; bigger or riskier later; gated items explicitly gated._

**How to run this:** each `W##` item has a matching prompt in `docs/planning/roadmap/prompts/`. Copy the prompt into a fresh session with the assigned worker tier, review its plan/diagnostic, approve, test, check the box. One item per session. Diagnostic before modification wherever the change isn't trivially safe.

**Worker tiers** (from the brief): **ARCH** = Fable 5 (plans only) · **IMPL** = Sonnet 4.6 thinking / Gemini 3.1 Pro high · **FAST** = Gemini 3.5 Flash / Composer 2.5 / GPT-OSS · **REVIEW** = Opus 4.6 thinking (pre-merge pass).

---

## Phase 0 — Truth-up (no code; do first)
- [x] 0.1 **HUMAN:** Read `OPEN-DECISIONS.md` and rule on D1 (delete semantics) and D2 (next-day semantics). _Done 2026-07-10 — all seven decisions ruled; see the RULED lines in OPEN-DECISIONS.md._
- [x] 0.2 **HUMAN:** Open the Google Sheet for the first time. Sanity-check the FightLog tab against `docs/reference/fight-log-schema.md`. _Done 2026-07-10 — developer reviewed the Sheet; data confirmed present and well-formed._
- [~] 0.3 Update `STATUS.md` / `docs/handoff.md` / `docs/planning/CHECKLIST.md` to record that both backports shipped in `3caf4ca`. _CHECKLIST addendum done in this commit; STATUS/handoff handled by the goodnight skill at session close._

## Phase 1 — Repo hygiene (small, safe, high value) — ✅ COMPLETE 2026-07-10 (PRs #1–#4)
- [x] W1 · **FAST** · Git hygiene: `.gitignore` fix, untrack `app/build_error.log`, remove unused `papaparse`. _Shipped in PR #2 (Haiku batch)._
- [x] W2 · **FAST** · Legacy consolidation into `archive/legacy-spreadsheet-system/`; duplicate `.gs` and redundant `playbook.csv` removed. _Shipped in PR #2 (Haiku batch)._
- [x] W3 · **FAST** · Stale-comment truth-up in `webhook.gs` and `usePlaybook.js` headers. _Shipped in PR #2 (Haiku batch)._
- [x] W4 · **IMPL**, then **REVIEW** · `README.md`, `AGENTS.md`, `ARCHITECTURE.md` created from the live repo. _Shipped in PR #4 (Sonnet; reviewed by Fable)._
- [x] W5 · **FAST** · GitHub starter kit: `.github/` templates + CI build-check workflow. _Shipped in PR #1 (Haiku)._
- [x] W6 · **IMPL** (read-only) · Directory-reorg diagnostic → report at `W06-REORG-REPORT.md`; executed as the D5 reorg in PR #3 (Sonnet).

## Phase 2 — Structural debt — ✅ COMPLETE 2026-07-10 (PRs #6, #7, #9)
- [x] W7 · **IMPL** · Test bootstrap: Vitest + fake-indexeddb; 25 unit tests (next-day calc, playbook lookup/hip-routing, syncQueue mechanics); test step added to CI. _Shipped in PR #6 (Sonnet)._
- [x] W8 · **IMPL**, then **REVIEW** · Sync refactor completed: queue/sync logic extracted to `app/src/sync/syncQueue.js`, zero behavior change, tests passed unmodified. _Shipped in PR #7 (Sonnet, diagnostic reviewed+approved by Fable, TDZ hardening added in review)._
- [x] **CI incident (post-#6):** two "passes-locally, fails-on-Linux" bugs — Windows-generated lockfile missing Linux-only optional deps (broke `npm ci` on CI AND Cloudflare deploys), and a Node-20 `navigator` crash in the test stub. Fixed in PR #9 (lockfile regenerated from scratch; `vi.stubGlobal`). **Standing policy going forward: agents install deps via `npm ci`; lockfile-changing installs require a from-scratch lockfile regen + clean `npm ci` verification; browser globals in tests via `vi.stubGlobal`.**

## Phase 3 — Close the feedback loop — ✅ COMPLETE 2026-07-10 (PR #8)
- [x] W9 · **IMPL**, then **REVIEW** · Weekly-stats view in the Log tab: `[Log|Stats]` toggle, 8-week cards (S&C/Fight split, S&C-only completeness avg, hip-score dots, day/phase coverage, honest empty weeks), 35 new unit tests. _Shipped in PR #8 (Sonnet, math reviewed by Fable); verified on-device by the developer._

## Phase 4 — UX feature work (one surgical change per session; any order within phase)
- [x] W10 · **IMPL**, then **REVIEW** · HUD visual hierarchy + collapsible bag-work and core/accessory blocks (auto-expand when logged). Diagnostic-first — HUD is the largest, most-used component. → `prompts/W10-hud-hierarchy.md` _Shipped in PRs #21 + #23 (Sonnet; reviewed by Fable), 2026-07-17 — the W10.1 follow-up extended collapse to all HUD blocks (mob/str/clr default open)._
- [ ] W11 · **IMPL** · Playbook tab overhaul: collapse/group by phase→day→block. ⚠️ _Per the W19 proposal, this is absorbed into the Playbook rebuild inside the Train hub — run AFTER W20, using a revised prompt; the standalone `prompts/W11-playbook-overhaul.md` is superseded pending W19 sign-off._
- [x] W12 · **RULED OUT** (2026-07-31) · Reusable exercise picker. Developer ruling: free-text notes
      are sufficient for weights days and avoid the complexity/schema cost of a dedicated picker
      store; for fight days the right approach is cartridge-dependent and wasn't considered until
      now — worth a fresh look once a second fight-day cartridge exists to compare against.
      `prompts/W12-exercise-picker.md` is retained as historical record, not an active spec.
- [ ] W13 · **IMPL** · Mobility upgrades: per-exercise YouTube link (opens new tab) + Settings-level injury/mobility profile with a global toggle to hide the mobility block. → `prompts/W13-mobility-profile.md` ⚠️ _The legacy mobility-video portion is now a candidate for absorption into A11’s cartridge-era Exercise Reference layer. The injury/profile toggle remains separate, and W13 must be re-scoped before execution._
- [x] W14 · **FAST** · Phase lock/unlock signaling: make the existing unlock logic legible in the UI
      (what unlocks next, why, how close). No logic changes. → `prompts/W14-phase-signaling.md`
      _Truth-up 2026-07-31: done in substance via W27, not standalone — W27's implementation
      ([HUD.jsx:253](../../../app/src/components/HUD.jsx) comment) explicitly moved this condition
      into `utils/phaseUnlock.js` and shipped the disabled-option gating, the "NEXT: PHASE n · DAY m"
      surface, and the stale-phase mismatch badge — the entirety of what W14 asked for. No separate
      work needed; the checkbox was stale._
- [x] W15 · **IMPL** · Timers page: user-controlled reordering of stopwatch/rest-timer blocks through explicit Move up/down actions, with order persisted in settings. → `prompts/W15-timer-reorder.md` _Shipped in commit `efcbe91` (`feat: reorderable timer blocks`), 2026-07-20; explicit controls were chosen over drag-and-drop for reliable touch use._
- [x] W15.1 · **IMPL**, then **REVIEW** · Timer behavioral UX/UI pass: make Basic and Custom Rounds feel like one premium, action-oriented timing instrument; fix the Rest completion visual signal targeting the Stopwatch card; preserve the timer engine, audio/vibration, wake lock, saved setups, and W15 persistence. Ethical cue→action→truthful-feedback design only—no fabricated rewards or new tracking. → `prompts/W15.1-TIMER-BEHAVIORAL-UX-UI-EXPERIMENT-KIMI.md` _Shipped locally in `fc63b5d` (`feat(timer): add Instrument Strata experience`), 2026-07-31; developer visually accepted, 933 tests and production build passed._
- [x] W16 · **IMPL**, then **REVIEW** · Day-7 cycle extension (re-scoped per D2 ruling): keep sequential day counting, extend the cycle 6→7 with Day 7 as an optional/custom gym day (cardio/mobility/free-form notes — `FightGymDay.jsx` already supports these session types). Diagnostic-first. → `prompts/W16-next-day-semantics.md` (rewritten 2026-07-10) _Shipped in PR #18 (Sonnet; reviewed by Fable), 2026-07-17._
- [x] W17 · **IMPL**, then **REVIEW** · ⛔ gated on **D1** · Delete semantics rework (only if D1 = soft delete): webhook.gs v3 with status column + local tombstone. The one item where the "do not touch webhooks" guardrail is deliberately lifted. → `prompts/W17-soft-delete.md` _Shipped in PR #22 (Sonnet; reviewed by Fable), 2026-07-17 — final design: Status column only (col 66/BN), NO local tombstone (local hard delete ratified); Apps Script v3 redeployed + verified on-device._

## Phase 4.5 — Navigation redesign (per decision D3; see `W19-NAV-IA-PROPOSAL.md`)
- [x] W19 · **ARCH** · Nav-IA redesign proposal written (Fable, 2026-07-10) and **SIGNED OFF same day (evening)** — rulings in the proposal's §6, informed by live study of the TRW native Android app (`docs/reference/therealworld-app-references/android-app-observations.md`). Final shape: 5 hubs **Train / Timer / Log / Checklist / Settings**; Playbook moves inside Train; **slot 4 = Checklist hub** (habit-tracker; Notes deferred); pinned quick-add input instead of a FAB; streaks in v1.
- [x] W20 · **IMPL**, then **REVIEW** · Nav shell restructure shipped (PR #13, 2026-07-10): shared TopTabs component, Playbook → Train top tab, Checklist placeholder in slot 4. → `prompts/W20-nav-shell.md`
- [x] W21 · **IMPL**, then **REVIEW** · Checklist hub v1 shipped (PR #14, 2026-07-11): groups, daily-recurring tasks, derived streaks, pinned quick-add, bottom-sheet actions, shared BottomSheet primitive, Dexie v2 (additive, upgrade-tested), connector-ready `exportChecklist()`. → `prompts/W21-checklist-hub.md`
- [x] W22 · **IMPL**, then **REVIEW** · Checklist v1.1 polish shipped (PR #15, 2026-07-12): group `…` action sheet (all `prompt()` removed), configurable reset time + "RESETS IN" countdown, Share→JSON export, Import→paste-text. → `prompts/W22-checklist-polish.md`
- [x] W23.5 · **IMPL** (small) · **Runs BEFORE W23** · Data durability quickwin (2026-07-12 dialogue ruling: NO new Sheets tabs/Apps Script — Sheets stays the append-only workout log; Supabase is the eventual backend; the backup JSON doubles as its migration seed): `navigator.storage.persist()` + Settings "Export full backup" (dynamic `db.tables`, share/download) + "last backup" hint. Export-only; restore is Supabase-era. → `prompts/W23.5-data-durability.md`
- [x] W23 · **IMPL**, then **REVIEW** · ⛔ gated on W23.5 · Notes v1 as the second top tab in the Checklist hub (D4, re-ruled 2026-07-12 after the brainstorm dialogue — `docs/reference/checklist-ideas/brainstorm-summary.md`): groups, plain-text notes with tappable `- [ ]` inline checklists, **tags + pin (5-star retired)**, on-demand daily note on the logical day with an EDITABLE template, substring search, quick capture, Dexie v3 additive, `exportNotes()`. Ruled OUT: rich text, backlinks/graph, per-note themes, Initiatives surfaces, media. → `prompts/W23-notes-hub.md`
- [x] W24 · **IMPL** (small) · Counted tasks — gate opened + re-scoped 2026-07-17 (D8, usage validation): the standalone Tracking system is DEFERRED; instead, an optional +1 tally on existing checklist tasks (`counted` flag + `count` on completions, both non-indexed → no Dexie bump; streaks unchanged by construction; local-only). → `prompts/W24-counted-tasks.md` _Shipped in PRs #29 + #30 (Fable direct, diagnostic approved by developer), 2026-07-18 — verified on-device same day; the day-one strikethrough bug on counted rows was caught by real use and fixed in #30._
- [x] W25 · **IMPL** (tiny, parallel-safe) · Notes export button: `exportNotes()` (W23 deliverable) had no UI caller — wired a Share control into the Notes toolbar mirroring the checklist's Share (share-or-download path, delivered-vs-cancelled discipline). → `prompts/W25-notes-export.md` _Shipped in PR #32 (Sonnet, reviewed by coordinator), 2026-07-19 — verified on-device._
- [x] W26 · **ARCH** · ⛔ gated on living with W24 counted tasks · Log hub redesign research: one proposal for surfacing BOTH data families in the Log hub — workout weeks (W9 cards) + checklist/habit streak data (+ counted-task counts, notes presence) on their two distinct day-axes (calendar vs logical). Includes a modern-apps reference pass; diagnostic/proposal only, with an explicit adopted/rejected list. Absorbs D8's deferred reduction-vs-growth target semantics. **Per-day tally history surfacing is a VALIDATED requirement** (2026-07-18: the developer's day-one W24 use showed the per-date data is already stored — the gap is visibility, not storage). → `prompts/W26-log-hub-research.md` (research brief written, PR #34, 2026-07-19; being run as a separate parallel research session — implementation plan follows the developer's rulings).
      _Truth-up 2026-07-31: the research brief was never run. It was superseded by
      `docs/planning/rebuild/LOG-HUB-EXPERIENCE-PLAN.md`, written fresh against current reality —
      the Log tab's Stats view still surfaced hip score, Day 1–7 coverage and Phase N, legacy-only
      fields cartridge sessions never populate. Implemented as History + Overview across PRs
      #65–#68. Checklist/Notes data was ruled OUT of the Log hub in either direction, which also
      removes D13 and the two-day-axis reconciliation from this surface entirely; no personal
      weekly target was added (the heatmap delivers the behavioural function without a number to
      fail against). Full ruling in `docs/decision_log.md`'s 2026-07-31 "Log hub rebuilt" entry._
- [x] W27 · **IMPL** · Phase logging integrity (Workout/HUD): fixes a real mislogging risk the developer hit after a gym change. Touch A gates the phase `<select>` (unearned phases disabled; new pure `highestUnlockedPhase`/`isPhaseSelectable` helpers in `phaseUnlock.js`, no-lockout-trap proven in tests); Touch B surfaces the phase that WILL be logged in the "Next up" box (`NEXT: PHASE n · DAY m`); Touch C a gentle stale-phase mismatch badge (last-logged ≠ selected). UI-only — logging path/webhook/Playbook untouched (Playbook stays browsable per W14). → `prompts/W27-phase-logging-integrity.md` _Built 2026-07-20 (Sonnet, reviewed by coordinator); merged via PR #37 (`a327d68`). Truth-up 2026-07-31: confirmed `a327d68` is an ancestor of current `main` — the "PR open" note and unchecked box were stale, not an actual gap._

- [x] W29 · **IMPL**, then **REVIEW** · Settings → **More hub**: a menu of six screens (Profile,
      Settings, Ignition, Backup & Data, Agent, About & Help) replacing the flat 214-line Settings
      page, plus the Agent outbound-integration surface. Ships the backup **credential-redaction
      boundary** (a backup would otherwise carry the token for writing to the endpoint it is sent
      to), an outbound push transport with real CORS/2xx acknowledgement, custom ignition quotes,
      and Android hardware-Back support the app never had. → rationale
      `docs/planning/rebuild/MORE-HUB-EXPERIENCE-PLAN.md`, executable
      `prompts/W29-MORE-HUB-AND-WEIGHT-KIMI.md` _Structure/logic merged in PRs #72–#75, #78
      (2026-07-31); the visual pass merged in PR #81 (`7705b64`), completing the item._
- [x] W30 · **IMPL**, then **REVIEW** · **Body-weight tracking**: Dexie v5 `bodyWeight` store
      (compound owner key), pure value/trend/due-state utilities, an owner-aware sibling sync to a
      new Supabase `body_metrics` table with owner-scoped RLS, a Profile check-in surface, a Log ›
      Overview trend, and a quiet weekly due rail. Governed by the Log-hub ruling that
      self-monitoring is well-evidenced and distal targets are not: **no target, no streak, no
      projection, no verdict.** Enables the coach loop (weight → Supabase → n8n/Hermes → Telegram)
      without building the gated B9 dashboard. → same plan/prompt as W29 _Merged in PRs #76, #77,
      #79 (2026-07-31); the visual pass merged with W29's in PR #81 (`7705b64`), completing the
      item. Supabase migration **applied to production on 2026-07-31** as
      `20260731202537_add_body_metrics` and verified against the live database (see
      `docs/decision_log.md`); the repo file was renamed to match that live version on 2026-08-01._

## Phase 5 — Gated / deferred (no prompts yet, on purpose)
- [ ] W28 · **candidate, unruled** · Data-layer phase guard (belt-and-suspenders follow-up to W27): reject an ineligible phase inside `logSession` (`db/index.jsx`) by comparing `sessionData.phase` against `highestUnlockedPhase(sessionCount)` before persisting, so even a direct Dexie/webhook write or a future bug can't record an unearned phase. Deliberately NOT bundled into W27 (UI-scoped) because it touches the logging path — near the frozen webhook contract (AGENTS.md rule 2), so it needs its own diagnostic. Also the natural home for self-healing a pre-W27 corrupted `currentPhase`. Decide whether the UI gate is sufficient before scoping.
- [x] W18 · **ARCH** · Custom Claude skills shipped at the 4-skill hard cap: `combatos-conventions` (PR #25), then `pwa-offline-first` + `mobile-interaction-ux` + `personal-analytics-viz` (PR #27, 2026-07-17), all in `.agents/skills/`, facts derived from live code. → `prompts/W18-custom-skills.md`
- [x] ✅ **Supabase backend (D7 — go)** — no longer a gated future migration: the foundation is **live in production** (magic-link auth + `profiles`/`sessions` + RLS, M1–M3, go-live 2026-07-21). The original free-tier-pause gate is handled by an external GitHub Action keep-alive (`.github/workflows/supabase-keepalive.yml`); the n8n stack remains an untouchable protected dependency. The app's write path still logs to the Google Sheets webhook — repointing that to Supabase is separate, unstarted work.
- [ ] ⛔ **Audio-ducking bug** — gated on research prompt 3 results (Android audio focus / Media Session API). Reproducible, documented, not urgent.
- [ ] ⛔ **Hermes connector** — the notepad half of D4 is now ACTIVE as W23 (Phase 4.5, re-ruled 2026-07-12: tags+pin replaced 5-star). The connector half stays deferred: `exportChecklist()`/`exportNotes()`/the W23.5 full backup are its designed inputs, wired up in a later connector/integration phase (or via Personal-OS, whichever comes first).
- [ ] ⛔ **Apex (second user) onboarding** — reframed by the 2026-07-20 rebuild ruling (decision #2): Apex is **not a sibling app** but a cartridge bundle inside this one app (`cartridges/apex-protocol-phase1.json`, shipped A5, assigned to the brother's Supabase profile). The remaining work is onboarding him, not kicking off a separate app. Historical "Project B" sequencing is in `archive/CHECKLIST.md`.
- [ ] ⛔ **Sell-as-product** — parked by the developer; demand validation deliberately deferred. Nothing to do.

---

## Phase 6 — Authentication (ACTIVE since 2026-09-23)
Magic-link-only sign-in blocked a real client twice: Supabase's built-in email sender is
rate-limited and uses a spam-prone shared sending domain. Password sign-in becomes the production
path. Rulings for all three items are in `docs/decision_log.md` (2026-09-23) and **D16** in
`OPEN-DECISIONS.md`. Auth is high-risk under `AI-WORKFLOW.md` §4/§8, so each item takes the full
lifecycle: diagnostic → independent review → human approval → one writer → evidence.

- [x] W31 · **IMPL**, then **REVIEW** · **Production password sign-in**: promote the existing
      `signInWithPassword` (`auth/AuthProvider.jsx:137`, live since 2026-07-22 but gated behind
      `import.meta.env.DEV`) to the only sign-in path visible in production. A new pure
      `auth/authErrors.js` maps Supabase failures to user-safe copy with one identical message for
      unknown-email and wrong-password, so sign-in is not an enumeration oracle. `SignIn.jsx`
      becomes a real email + password form (`autoComplete="current-password"`, reveal toggle,
      "Forgotten your password? Contact your coach"). `signInWithMagicLink` stays in the code,
      unused by the UI (D16). The `import.meta.env.DEV` dev-bypass block **stays** — it is how
      coding agents drive the app without an email round-trip, and `vite build` strips it.
      → `prompts/W31-password-signin.md` _Shipped in PR #95 (Opus 5), 2026-09-23 — 61 test files
      / 1192 tests green; dev bypass verified stripped from `dist/`. Two browser-found defects
      fixed: `index.css` styles `input[type="text"]` but not `[type="password"]`, so revealing
      re-fonted the field; and `1rem` computes to 14px, which triggers iOS Safari zoom-on-focus.
      On-device acceptance still outstanding._
- [ ] W32 · **IMPL** · **Self-service change password**: a new card in More › Profile beside
      `WeightCheckIn`, calling `updateUser({ current_password, password })` — already supported by
      the installed `@supabase/auth-js` 2.110.7, so no dependency change. Requires enabling
      **"Require current password when changing password"** in Supabase Auth (project-wide, so it
      needs a Track B compatibility check per `SHARED-SUPABASE-BOUNDARY.md` R6). Do **not** enable
      the reauthentication-by-nonce setting — it emails a nonce, and broken email is the whole
      premise. Load-bearing, not polish: the developer sets passwords by hand and therefore knows
      them, so the user must be able to change to something private.
- [x] W33 · **IMPL**, then **REVIEW** · **Custom SMTP + self-service forgot-password**: the real
      fix for remote password resets. Custom SMTP replaces Supabase's built-in sender (Zoho, via
      the existing `metzcore.com` mailbox — no DNS change needed, SPF already authorises
      `zohomail.eu`), then `requestPasswordReset()` → emailed link → a `SetNewPassword` screen
      gated on the `PASSWORD_RECOVERY` event. That event handling is the non-obvious part: a
      Supabase recovery link yields a **real session**, so without intercepting it in `AuthGate`
      the user is silently signed in and never asked for a password. Adds a pure
      `auth/passwordPolicy.js` (min 8, no character classes — NIST SP 800-63B) that W32 reuses.
      D16 narrowed, not reversed: a reset link is used once and ends at a durable credential; a
      magic link would make email a permanent dependency of every sign-in.
      → `prompts/W33-smtp-password-recovery.md` _Shipped in PR #96, 2026-09-29, then fixed in
      PR #97 — **verified end to end on a real account**: reset requested, email delivered through
      Zoho (spam on first send), link opened the set-password screen, new password worked, and the
      account's cartridge loaded. 63 test files / 1213 tests green.
      **PR #96 alone did not work.** It relied on Supabase's `PASSWORD_RECOVERY` event, but GoTrue
      initialises inside its own constructor at import time and emits that event from a
      `setTimeout(…, 0)` — both before React mounts, so `AuthProvider` subscribed too late and the
      event was missed on every first load, which is the only load a recovery link has. The link
      signed the user into the app having never asked for a password. PR #97 reads the intent from
      the URL at module scope instead, and also stops a failed recovery link falling through to the
      offline cartridge cache, which had been disguising failure as success. Caught by the
      developer's first real test, not by CI — there is no component-test infrastructure (D14)._

**Ruled out for this phase, with reasons on record** (do not silently revisit):
leaked-password protection (Pro-plan-only; the developer has ruled out upgrading) · CAPTCHA ·
client-side attempt counters · auto-generated passwords · a password-reset button in Track B's
coach dashboard (needs `/auth/v1/admin`, which Track B's `scripts/isolation-test.mjs` fails the
build on and whose 2026-08-05 entry already rejected it; lifting it means amending
`SHARED-SUPABASE-BOUNDARY.md` in both repos) · a Telegram/n8n reset bot. Revisit the rate-limiting
items at roughly 20 users, or if the app ever takes payments.

---

## Phase 7 — Developer-reported improvements (ACTIVE since 2026-09-30)
Improvements the developer noticed in daily use, scoped one item per PR.

- [ ] W34 · **IMPL**, then **REVIEW** · **Log a workout for a past day**: a "Logging for: Today ·
      Yesterday · Pick a date" control above FINISH on Today, so a forgotten workout lands on the
      day it was done. Rulings (2026-09-30): chosen on Today, not in a separate Log-tab form (one
      logger, not two); window is today plus the previous 14 days, no future dates; no payload
      shape change — `date` carries the training day, `completedAt` stays the true entry time,
      `startedAt` is omitted for a past date; `AGENTS.md` rule 2 lifted for **one clarifying
      sentence** in `session-payload-schema.md` only. Three readers switch from entry order to
      training-day order (next-day suggestion, last performance, History), which is provably a
      no-op for existing rows. Cartridge sessions only; rest/recovery one-tap and the legacy HUD
      stay today-only. → `prompts/W34-log-past-day.md`
- [ ] W35 · **IMPL** · ⛔ gated on W34 · **Calendar shortcut into past-day logging**: tapping an
      empty past day on the Log › Overview calendar offers "Log a workout for this day", opening
      Today with that date already chosen. Prompt written after W34 lands, against W34's actual
      control. Decide there whether rest/recovery days can be back-filled from this entry point.
- [ ] W36 · **IMPL** · **Runs BEFORE W34** · **Plan load survives a brand-new sign-in token**:
      right after a fresh password sign-in the app can show "Couldn't load your plan" until the user
      taps Retry. Measured 2026-09-30 in the Supabase edge logs: the `profiles` read returns 401
      `PGRST303` with a 79-byte body — exactly PostgREST's `"JWT issued at future"` — while the
      parallel `user_cartridges` read with the same token passed 6 ms earlier. Supabase's Auth and
      PostgREST clocks disagree by ≥0.93 s, so a token used within its first second can be rejected.
      Seen twice (2026-09-29, 2026-09-30), both on a fresh sign-in; no real-user hit in the
      retained logs, but a client's first sign-in on a device is exactly when it can happen. Fix:
      `fetchCartridgeAccess` retries the read up to twice (1 s, then 2 s) on `code === 'PGRST303'`
      only; every other error still surfaces immediately. No UI, schema or auth-setting change.
- [ ] W37 · **IMPL** · before the next client is onboarded · **No-programme accounts stop falling
      back to the legacy HUD**: `TodayRouter` sends an account with no cartridge access to the
      pre-cartridge HUD, which runs the developer's own original programme — what Track B's test
      account saw on 2026-08-10 (logged there as a suspected cache bug; it is not). Measured
      2026-09-30: 1 of 5 accounts has no cartridge (the unused account slated for deletion, zero
      sessions) and no legacy-kind session has been logged in 30 days, so nobody is affected today.
      Direction agreed with the developer: show a "no programme yet — your coach will assign one"
      state instead. Diagnostic must first establish whether anything else still depends on the
      legacy route (a live legacy draft always wins in `resolveTodaySurface` — keep that).

---

## Track A / Stage-2 — Train + Playbook cartridge rebuild (ACTIVE — main line since 2026-07-21)
The Train tab (incl. Playbook) becomes a universal player over a **cartridge** — one person's
program as JSON, per `docs/planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md` (v2, block-composable).
Backend (Supabase) already live. Stage 0 (patch `playbook.csv`) skipped — the rebuild and the
gym-change fix are the same work (decisions 2026-07-21 #3/#4).

The approved product direction, metadata recommendation, persistence decision, and implementation
order are in `docs/planning/rebuild/TRAIN-EXPERIENCE-PLAN.md`.

- [x] **A1 · Program Authoring Kit** (model-agnostic docs) — `docs/authoring/`: `INTAKE-SCHEMA.md`,
      `COACH-PROMPT.md`, `REVIEWER-CHECKLIST.md` (Part A structural / Part B coaching-sanity),
      `README.md`. Plain files so a future self-hosted model (Hermes) runs the same process with no
      rework. Built + proven on the developer's own program; updated to v2 (block model) doctrine
      once A4 landed. _2026-07-22._
- [x] **A2 · First cartridges** — `cartridges/combatos-foundation-2026.json` (Phase 1, 4-wk
      corrective/spine-friendly, run FIRST — developer under active chiropractic care) +
      `cartridges/combatos-operator-2026.json` (Phase 2, heavy strength). Periodization =
      cartridge-swap. Authored from `intake-developer-program.md`, validated. _2026-07-22._
- [x] **A3 · `validateCartridge()`** — `app/src/utils/validateCartridge.js` implements reviewer
      Part A; reworked alongside A4 for the block model (day.blocks[] → kind + items, kind-specific
      shape checks, optional per-item prescription). Tested (318 total suite tests incl. a
      permanent regression guard over every authored cartridge); W26-independent throughout. _2026-07-22._
- [x] **A4 · Block-composable cartridge schema v2** — reading a SECOND real program (Apex Protocol)
      surfaced that the v1 flat exercise list underserved both real users (Combat OS's own legacy
      `playbook.csv` already used a block taxonomy the fresh spec had dropped). Redesigned as
      `day.blocks[] → kind + items` (5 seed kinds: mobility/strength/conditioning/cooldown/core),
      hand-proven against Apex's richest day before touching code (`BLOCK-MODEL-DRAFT.md`), then
      promoted into `PROGRAM-CARTRIDGE-SPEC.md` v2. One composable engine, not two apps — a
      "segment" (combat vs. generalist) is a curated block-kind bundle + theme, not a fork.
      _2026-07-22._
- [x] **A5 · Apex cartridge** (2nd person) — `cartridges/apex-protocol-phase1.json`, adapted from
      his existing `playbook.csv`: 4 training days, all 5 block kinds, PAP pairing, round-structured
      bag work, 49 items. The stress test that proved A4 before promotion. Assigned to his Supabase
      profile by A9a; he has not signed in yet. _2026-07-22._
- [x] **A6 · Cartridge Viewer (read-only render path)** — new "Cartridges" tab in the Train hub;
      browses all 3 real cartridges with a renderer per block kind. Read-only, zero touch to
      HUD.jsx/db/webhook — needs nothing from the payload-shape gate below. **Shipped, merged, LIVE
      in production** — first real on-device review done. _2026-07-22._
- [x] **A6.5 · Durable active-workout draft** — additive Dexie v4 autosave/resume for unfinished
      workouts, with owner isolation, hydration gating, bounded-loss lifecycle flushing,
      stale-write invalidation, explicit Continue/Discard/conflict handling, and atomic clearing
      after successful local logging. Temporary draft shape remains separate from the permanent
      session payload. _Shipped in PR #57, 2026-07-26; 450 tests and production build passed.
      Android acceptance passed every reported scenario; sign-out and active-draft survival
      across a later PWA update were not exercised on-device._
- [x] **A7 · Interactive (logging) renderer** — the half of A6 that WRITES a session from a
      cartridge; inline per-session exercise substitution (decision 2026-07-21 #2). Payload shape
      is locked (D11, revised corrective pass, `payloadVersion: 2`) — A6.5 is complete, so A7 is
      ungated. Scope: every block kind, item field, and day type used by the three real shipped
      cartridges (strength/core with PAP/superset grouping, mobility/cooldown/conditioning as
      read-only guidance, custom/rest/recovery days, a zero- or one-block `cycle.blocks` phase
      context, `sessionActivities` analytics-ready fields). Multi-phase (`cycle.blocks.length >=
      2`) execution is explicitly out of scope for v1 (D12) — no shipped cartridge needs it. A
      first end-to-end implementation attempt (unpushed, unmerged) is preserved on the
      `attempt1/a7-*` branches; a Phase 0 review found real defects and the developer supplied
      binding corrections — see `docs/planning/roadmap/prompts/A7-CORRECTIVE-IMPLEMENTATION-PLAN.md`.
      Sequenced as four stages, each stopping for review before the next begins: **Stage 0**
      (payload-lock docs, this entry), **A7a** (pure payload builder/validation/analytics fields +
      cartridge draft/state integration, no UI change), **A7b** (interactive Today redesign +
      reader compatibility), **A7c** (later, separate: evaluate app-wide `FocusedNoteEditor`
      adoption without forcing reuse).
      _Status 2026-07-30: Stage 0, A7a, and A7b are complete. A7b plus its Android acceptance
      remediation passed independent review, 787 tests, production build, and developer Android
      acceptance. The `weights` activity-ID expansion and the unbounded interactive-block clipping
      fix passed the same review/Android gates. The A7c diagnostic found no appropriate
      Checklist/Notes adoption surface: Notes already has a persistence-owning full-screen editor,
      while the Checklist task note and daily template are fields inside explicit-save sheets where
      `FocusedNoteEditor` would create incompatible nested-modal and save semantics. The developer
      approved the no-adoption ruling; A7c therefore closes with no app change and A7 is complete._
- [x] **A8 · Cartridge Viewer UX/UI pass** — quiet block headers, collapsible days, collapsed About
      disclosure, and tab-contrast fix shipped. _2026-07-22._
- [x] **A9 · Cartridge availability + activation** — A9a–A9d complete. Assigned-only Library,
      active/viewing separation, schema-v3 metadata, account-scoped cache, controlled offline
      fallback and confirmed activation are implemented. Final visual hierarchy and member-facing
      programme guidance passed Android portrait review. 363 tests and production build pass.
      _Merged through PR #51 and live, 2026-07-23._ See
      `docs/planning/rebuild/A9-CARTRIDGE-ACCESS-DIAGNOSTIC.md`.
- [x] **A10 · Train information architecture** — Today / Plan / Library shipped inside the existing
      Train hub with no new main-navigation button. Plan renders the confirmed active cartridge;
      Library preserves assigned-only preview/activation; Today preserves the existing HUD pending
      A6.5/A7. Phone-approved; 369 tests and production build passed.
      _Merged through PR #52, 2026-07-23._
- [x] **Lock logging payload shape** — **RULED (revised, corrective pass, 2026-07-27):** narrowly
      decoupled from the unscheduled W26 research (D11); no completed W26 result exists or is
      needed for the payload-critical questions. Contract:
      `docs/reference/session-payload-schema.md` (`payloadVersion: 2` — bumped from a first
      attempt's `v1` because one real `v1` test row already reached production Supabase and its
      removal isn't confirmed), frozen under `AGENTS.md` rule 2 ("the logging schema").
      _Corrected 2026-09-30: this line previously cited a "rule 2a", which was drafted in the
      unmerged first A7 attempt (`b6fcd19`) and has never existed on `main`._ One canonical structured `blocks[]`
      record per cartridge session; completeness counts only strength/core (+ PAP/pair);
      `sessionActivities` makes sessions analytics-ready for a future W26 without any new table.
      Legacy sessions are completely unchanged; no migration or rewrite of any existing row, local
      or remote.
- [x] **A11 · Exercise Reference layer** — design a stable canonical exercise identity and curated
      external-resource catalogue supporting explicit “Watch demo” actions in Plan and later Today.
      _Diagnostic and architecture approved 2026-07-30:_ keep cartridge `item.id` as its existing
      prescription-slot identity; add optional canonical `exerciseId` as additive schema-v3 metadata,
      resolved against a separate bundled catalogue. File-backed v1; no Dexie/Supabase or payload
      change; manual identity/link curation only; PAP/pair references deferred; no name/fuzzy
      matching. Sequence: **A11a** contract/catalogue/validation foundation
      (`prompts/A11A-EXERCISE-REFERENCE-FOUNDATION.md`), then a small curated set + Plan adoption and
      Android acceptance, then Today separately if Plan proves the pattern. _Plan phase accepted
      locally 2026-07-30:_ A11a foundation; seven-entry catalogue + ten cartridge annotations
      (`0db2f54`); fail-safe direct-open Plan/Library links and focused tests (`ad8a8cc`); and the
      developer-accepted hybrid Plan/TRAIN visual polish (`f51f94f`). _Today phase accepted locally
      2026-07-30:_ one shared fail-safe primary-video resolver; compact 48px direct-open DEMO links
      across all Today item renderers and superset headers; prescribed links hidden for free-text
      substitutions; 26 focused component/integration cases; and developer localhost acceptance
      (`f104028`). _Today visual phase accepted 2026-07-31:_ the frontend-only “Execution Strata”
      pass translates Plan/Library's layered material and semantic spines into the execution
      surface, using the existing canonical `done/units` count for its header progress rail and no
      invented gamification (`c77ea94`). Independent final evidence: 45 test files / 900 tests pass,
      the production PWA build succeeds, and the developer accepted the complete Today experience
      after localhost testing. Plan/Library and Today adoption are proven. The developer deliberately
      skipped the optional generic warm-up reference because no approved URL exists; A11 is complete
      at its accepted scope. No new main-nav button.
- [x] **A12 · RULED OUT** (2026-07-31) · Academy / Exercise Guides IA. Developer ruling: A11's Plan
      tab demo buttons + direct-open URL system already solve the "find the reference for this
      exercise" problem this item existed to address — a dedicated grouped-guides surface would be
      redundant. No sixth nav button, no diagnostic needed.

**Also queued, separate & bigger scope (not a Track A item):** Playbook + Log tab full UX/UI
redesign — dark/light mode, color system, best-in-class UX bar. Own design session; see
`docs/handoff.md` Pending.

New decision this track: **D10** (cartridge weekly structure = pool of day-templates + suggested
order, not a fixed rotation; overlaps D9) — see OPEN-DECISIONS.md.

---

## Addendum — 2026-07-10 developer rulings (see OPEN-DECISIONS.md for full text)
All seven decisions were ruled the same day the roadmap was produced. Gate/scope changes, not yet re-sequenced into the phases above:
- **W17 UNGATED** (D1 = soft delete). Runs as written.
- **W16 RE-SCOPE NEEDED** (D2): current sequential behavior ratified, but the cycle extends to a new **Day 7** — optional/custom gym day with free-text notes. The drafted W16 prompt (skip-days rework) is void; a replacement diagnostic-first prompt is needed (day-structure 6→7 touches wrap math, `usePlaybook` synthesis, completeness/unlock counting).
- **NEW ARCH ITEM (D3): nav-IA redesign proposal** based on the layered TRW/Discord paradigm (`docs/reference/therealworld-app-references/mobile_app_architecture_spec.md`): ≤5 bottom hubs, swipeable top tabs inside hubs, bottom sheets, FAB, accordions. Design doc first, no code. W10/W11 should be reviewed for absorption into it before being run standalone.
- **NEW FEATURE ITEM (D4): notepad/idea-organizer** — folders, tags, 5-star rating, connector-ready data layer; UI reference `docs/reference/therealworld-app-references/checklist_ui_specification.md`. Sequenced AFTER the D3 redesign proposal decides where it lives. Hermes connector stays deferred (own tab, later).
- **W6 MANDATE STRENGTHENED** (D5): propose real moves, tracked homes for durable docs (the TRW specs being "lost" in dev_files/ is the proof case — historical description, accurate as of when this was written).
- **W4/W5 SIMPLIFIED** (D6): no drafts exist to recover — generate fresh; skip the "find drafts" step.
- **D7 (Supabase): leaning go, gates unchanged.**
- **Process ruling:** adopt proper branch workflow (feature branches + PRs to main) as part of working "the GitHub way" — W5's CI and templates support this; batch prompts should create a branch per batch.

---

## Track B — Coaching operations & onboarding (ACTIVE, parallel to Track A)

Client onboarding, the coaching dossier, and the coach-facing website. The site code lives in a
separate repository, while integration documentation and migration history live here. Track B runs
in parallel with Track A and shares the same production Supabase project, so schema work is
serialized behind the migration baton described in the system design. Design and rationale:
`docs/planning/rebuild/ONBOARDING-SYSTEM-DESIGN.md`.

### Parallel-track protocol (read before starting any session here)

| Track | Owns | Files |
|---|---|---|
| **A — app** | Train / Plan / exercise reference / nav / Log hub | `app/`, `cartridges/` |
| **B — coaching ops** | Onboarding, questionnaire, dossier, coaching site | `docs/planning/rebuild/`, the separate site project |

1. **One writer per working tree.** A second concurrent agent uses its own `git worktree` and branch.
   Readers may run in parallel; writers may not.
2. **Never infer app state from `STATUS.md` or `ROADMAP.md`.** Both go stale between sessions —
   verify against code, `git`, and the database (AI-WORKFLOW §1).
3. **Delegated agents get an explicit read-first file list** and are told not to explore the repo.

### Items

- [x] **B1 · Pilot coaching data architecture diagnostic** — where client data may live, the privacy
      boundary, and the six-phase Supabase implementation gate. Diagnostic only; no migration,
      bucket, or policy created. → `docs/planning/rebuild/PILOT-COACHING-DATA-ARCHITECTURE-DIAGNOSTIC.md`
- [x] **B2 · Pilot onboarding pack draft** — coach-facing welcome copy, staged intake, gym-photo
      brief, dossier templates, clarification loop, readiness checklist, plus four proposed doctrine
      improvements. Authored by Grok 4.5 against a bounded plan; independently reviewed (gates
      verified against `INTAKE-SCHEMA.md`, external citations verified live, authoring kit
      untouched). → `docs/planning/rebuild/PILOT-ONBOARDING-PACK-DRAFT.md`
- [x] **B3 · Onboarding system design** — channels, surfaces, data model, n8n workflows, deferrals,
      and build order. Supersedes the earlier Slack-mediated and form-tool assumptions: onboarding
      moves to a bespoke authenticated page, accountability moves to Telegram, Slack is dropped.
      → `docs/planning/rebuild/ONBOARDING-SYSTEM-DESIGN.md`
- [x] **B4 · Question spec + gym-photo vision prompt** — the canonical ~17-question set mapped to all
      seven `[GATES]`, targeted at under ten minutes, plus the vision prompt that keeps equipment
      inventory out of both the questionnaire and Supabase Storage.
      → `ONBOARDING-QUESTION-SPEC.md`, `GYM-PHOTO-VISION-PROMPT.md`
- [~] **B5 · Onboarding site v1** — the standalone questionnaire UI is checkpointed locally in its
      own repository (`a223b9e`); its production build passes, but it does not yet authenticate,
      persist answers, submit notifications, or deploy. The draft `onboarding_responses` migration
      remains unapplied and must pass its separate privacy/security review before real intake data.
      The committed Pages plan and the site's Workers configuration must be reconciled before a
      hosting target is chosen. No uploads, agents, or dashboard.
      → `docs/planning/rebuild/ONBOARDING-SITE-IMPLEMENTATION-PLAN.md`
- [ ] **B6 · n8n notification workflows** — submission → Telegram with an intake-gate completeness
      report, client confirmation email, dossier-skeleton render, and a 48-hour abandonment nudge.
      Deterministic rules, no model calls. New workflows only; the stack itself stays untouched
      (guardrail 5).
- [ ] **B7 · Authoring-kit doctrine edit** — fold the four approved proposals from B2 into
      `COACH-PROMPT.md` / `INTAKE-SCHEMA.md` / `REVIEWER-CHECKLIST.md`, plus the priority-ranking
      elicitation note (top-2 in the form, coach confirms the full order at the summary step — the
      `[GATES]` requirement itself is unchanged). **One bounded edit**, after B5 settles.
- [ ] **B8 · PILOT-01 trial run, end to end** — real intake through to a deployed, assigned
      cartridge, entirely manual. **This is the actual test of the design**, not B5.
- [ ] ⛔ **B9 · Client web dashboard** — gated on B8. A `/dashboard` route on the B5 site: read-only
      analytics, magic-link auth, no uploads. Split ruling in `ONBOARDING-SYSTEM-DESIGN.md` §8 —
      mobile answers "did I do the work," web answers "is it working." Fed to the running **W26**
      Log-hub research as a scope input, **not** a separate decision record. Existing W9 mobile
      analytics must not be stripped before this exists.
- [ ] ⛔ **Deferred, with reasons on record** — client photo upload, agent-based answer validation,
      automated plan generation, consent and retention framework, profile pictures, and the
      feed/platform concept. See `ONBOARDING-SYSTEM-DESIGN.md` §7. The platform concept overlaps the
      parked "sell-as-product" item; do not silently un-park it.

---

## Standing guardrails (apply to every item)
1. Never touch `%1RM`/e1RM logic without explicit instruction.
2. Never alter webhook payload shapes or the Sheets integration (exception: W17, explicitly).
3. Never import Apex-specific content (Apex tab, Maintenance, Regla Cero, RPE components).
4. Never hand-edit `app/src/data/playbook.js`; CSV changes go through `audit_playbook.py` → `csv_to_js.py`.
5. Never disrupt the n8n stack — fixed, protected dependency. It is **not** in this repo:
   n8n (production automation + PostgreSQL) and the Hermes agent run on a Hetzner server
   documented at `C:\Users\Doble P\Documents\n8n-render\METZCORE_RUNBOOK.md` (n8n reachable at
   `systems.metzcore.com`; the Hermes dashboard is Tailscale-only). That runbook's §8 hard rules
   apply to any agent that ever touches this infrastructure — never `docker compose down` or
   rebuild the n8n stack, and never alter `N8N_ENCRYPTION_KEY`. The app may POST **outbound** to
   an n8n webhook (a W29 Agent-surface capability); it must never read or modify n8n
   configuration. Note the app's Supabase keep-alive is already external and already built —
   `.github/workflows/supabase-keepalive.yml` — and per decision_log 2026-07-20 #8 it must never
   be reimplemented in-app.
6. Diagnostic before modification; one change per session; commit per item.
