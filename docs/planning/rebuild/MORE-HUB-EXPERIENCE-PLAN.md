# More Hub + Weight Experience Plan (W29 / W30)

_Written by Opus 5 across the W29/W30 implementation sessions, 2026-07-31. Design rationale and
rulings live here; the executable half is
`docs/planning/roadmap/prompts/W29-MORE-HUB-AND-WEIGHT-KIMI.md`. Same relationship as
`LOG-HUB-EXPERIENCE-PLAN.md` → the `W26-LOG-HUB-*` prompts._

**Status:** all structure and logic BUILT AND MERGED (PRs #72–#79). The visual pass is the only
outstanding piece. Independently verified by Codex in two rounds —
`dev_files/answers-from-agents-to-review/codex-w29-more-hub-analysis.md` and
`codex-w30-weight-analysis.md`. Both are binding evidence.

---

## 1. Purpose

Settings was the last surface untouched by the rebuild — 214 lines of flat inline-styled JSX, four
cards, no subcomponents, no tests, predating the Strata language entirely. Two things made now the
moment to fix it rather than later:

- The app is about to be handed to a **real external pilot user**. That turns "settings" into "the
  screen where a non-technical athlete works out what this app does with their data."
- Body-weight tracking — the biggest genuinely missing feature for a combat-sports app — needed a
  home, and Profile was it.

The work shipped as nine merged PRs. What remains is making it *look* like the rest of the app.

---

## 2. Scope of the visual pass

**In:** the More hub menu and its six screens (Profile, Settings, Ignition, Backup & Data, Agent,
About & Help), the weight check-in surface inside Profile, the Body-weight panel in Log › Overview,
and the weight due rail above the bottom nav.

**Out, deliberately:** every other hub. Train, Timer, Log's History tab and the three existing
Overview panels are accepted baselines and must not regress.

---

## 3. Navigation: a menu, not a tab bar (ruled)

The other four hubs use the shared `TopTabs` bar. More does not, for reasons that are structural
rather than aesthetic:

- **Six destinations do not fit a 360px portrait tab row**, and a catch-all hub only accumulates
  more over time. A list scales; a tab bar does not.
- It is the paradigm **D3/W19 already ratified** — the TRW layered-nav reference has its own answer
  for an overflow hub, recorded at `archive/Snippets-for-review/trw-app-more-tab.jpeg`.
- More's menu→screen relationship is **hierarchical, not peer tabs**. Modelling it as top tabs
  would render a `role="tablist"` for what is really a navigation list.

### 3.1 A page, not a BottomSheet — Codex correction

The first draft proposed raising the menu as a bottom sheet, TRW-style. Codex refuted it:
`BottomSheet` is a modal primitive (dimmed backdrop, 80vh cap, dismiss-on-tap-outside) with 18
production consumers, all of them contextual actions, pickers or short forms. A primary hub needs
stable scroll, visible bottom navigation and a predictable Back. **Reuse the row styling, not the
modal container.**

### 3.2 Android hardware Back — a gap Codex found

The app has **no router**; all navigation is React state, so nothing answered the Android back
gesture. Flat hubs tolerated that; drill-down would not ("I pressed Back and the app closed").
`MoreHub` now pushes exactly one history entry per detail.

**A known, deliberate wart:** leaving a detail via the bottom nav strands one history entry, so one
hardware-Back press is a no-op. An earlier version popped it on unmount, but `history.back()` fires
`popstate` asynchronously — the event could land after the *next* MoreHub mounted, which read it as
a user Back and bounced to the menu. Two fixes were attempted (per-instance entry tagging, then a
pending-pop counter) and both failed: a cleanup pop and a genuine Back are indistinguishable to the
listener, and the counter is never decremented when the pop fires during the unmount→mount gap,
poisoning the *next* real Back. The wart is bounded and strictly better than an in-app Back that
silently fails. Full reasoning is recorded in `app/src/hooks/useMoreBackNavigation.js`. **Do not
re-add the cleanup.**

---

## 4. The Agent surface — framing (ruled)

**Not "AI in the app."** It is the app's **outbound integration console**, configuring it as a
sensor and trigger for the automation stack the developer already runs (n8n + Hermes + Telegram).
Telegram is already a better agent front-end than anything built here; the app's job is to be a
good data source.

Ruled out: in-app LLM chat · the agent writing back to the app · a custom service worker · Web
Share Target · Web Bluetooth · Apple Health / Health Connect (PWAs cannot access either) · in-app
Supabase keep-alive (it already exists externally at
`.github/workflows/supabase-keepalive.yml`).

**Cross-platform reality, Codex-verified against vendor sources:** Background Sync, Periodic
Background Sync, Web Share Target and Web Bluetooth are **all unavailable on iOS**, and Periodic
Background Sync is engagement-gated even on Android. App-open/focus/online is the only quiet
scheduler common to both platforms. This is settled.

### 4.1 Two security decisions worth preserving

- **Backups redact device credentials.** `exportFullBackup()` enumerates every Dexie table, and
  `settings` is one — so an endpoint token stored there would ride inside the very backup sent to
  that endpoint. `db/backupRedaction.js` is the boundary; the format version moved 1 → 2 because
  the promise genuinely narrowed.
- **Endpoint ID + revocable bearer token, not a secret URL.** The first proposal treated a
  high-entropy webhook path as the credential. Codex rejected it: URLs leak into proxy logs, n8n
  execution metadata and screenshots, conflate routing with auth, and cannot be rotated cleanly.

---

## 5. Weight — the governing ruling

decision_log 2026-07-31 (Log hub, ruling #3) is directly on point: *"the evidence for
self-monitoring is strong; for vague distal goals it is weak… without creating a number to fail
against."*

Applied to weight: **record the trend; never set a target to miss.** That is also the safest design
in a sport where weight cutting is already a pressure. Codex's strongest warning matched it
verbatim.

**Ruled out by construction — not open to reinterpretation in a visual pass:**
weight targets · weight-class lines · cut-rate calculators · threshold alerts · projected weigh-ins
· "on track" labels · logging streaks.

A streak deserves its own note: it rewards entering *a* number, which actively incentivises a fake
entry on a day someone dislikes the real one.

### 5.1 Honesty rules that are load-bearing, not stylistic

- **The ratchet.** 180.0 lb is 81.6466 kg, displays as 81.6, and persisting the *displayed* value
  loses 0.047 kg — compounding on every repeat until a stable weight visibly drifts. In this sport
  that drift is the exact signal being watched. Unit toggles are presentation-only; edits derive
  from untouched canonical kg; only an explicit Save writes.
- **Gaps are breaks, never lines.** Zero-filling draws a plunge to 0 kg that never happened;
  interpolation invents measurements; and even spacing — the subtlest — redraws a three-month gap
  as though it were a week, changing the apparent slope of a real trend. Points are positioned by
  actual calendar distance.
- **A single entry gets no slope.** "Stable" is a claim one measurement cannot support.
- **Colour carries no verdict.** Up and down share one neutral accent; a red "gain" would be a
  judgement on the athlete's body.

### 5.2 The due rail

Lives at `AppShell` level, above the bottom nav — not inside Today, because `TodayRouter` selects
between two Today implementations and the signal would have to be maintained twice.

- **"No entry" is NOT overdue.** The weekly cycle starts after the first saved check-in, so
  shipping this does not nag every existing user before they opt in.
- **Dismiss is a bounded seven-day snooze**, labelled so its lifetime is legible. Not persisting
  recurs on every reload; persisting forever silently kills the feature.
- One line, one action, one dismiss. No alarm colour, no overdue-day count, no celebration.

**A layout constraint discovered in browser verification:** `.bottom-nav` is `position: fixed`, so
an in-flow rail lays out at the end of the document — it rendered at y=864 in an 812px viewport,
correctly in the DOM and entirely off-screen. The rail must stay `position: fixed`, anchored via
`--bottom-nav-height`.

---

## 6. The coach loop, without a dashboard

Weight → Supabase `body_metrics` → n8n/Hermes → Telegram. That delivers the coach half of the
requirement without building the gated B9 web dashboard, and it is the first real payoff from the
Agent surface.

**Alert semantics:** *"new weight logged: date, value"* — never "too high", "behind", "on track",
or "must lose X". A single reading or gap must never trigger advice. The app records and transmits
observations; it does not prescribe a cut.

---

## 7. Build order (all merged)

| PR | | |
|---|---|---|
| #72 | More hub skeleton | structural refactor, content moved as-is |
| #73 | Housekeeping | infra guardrail, stale claims, D9/D14 |
| #74 | Backup redaction + push transport | the credential boundary |
| #75 | Custom ignitions | paste-import, per-user quotes |
| #76 | `body_metrics` schema + RLS | + owner-scoped DELETE |
| #77 | Weight data layer | Dexie v5, pure utils, owner-aware sync |
| #78 | Agent screen + scheduler | config, status, at-most-once-daily |
| #79 | Weight surfaces | Profile check-in, Overview trend, due rail |

**Remaining: the visual pass (this plan's executable half).**

---

## 8. Open items before the external pilot

Not blockers for the visual pass, but they are blockers for handing the app to someone else:

1. **Verify the 2026-07-22 Supabase migration is actually applied in the live database.** The
   RLS hardening was confirmed in the migration *files*; files cannot prove what is applied.
2. **Settle the account-switching question.** The Dexie database is single-named and most tables
   are not keyed by user. `workoutDrafts` and `bodyWeight` use compound owner keys; the rest do
   not. Either adopt "one account per device" as a stated product constraint, or scope the
   remaining local data by user.
3. **Apply the `body_metrics` migration** (written, reviewed, deliberately not applied).
4. **Rotate the temporary Supabase developer password.**
5. **D14 (component-test infrastructure)** remains open. It bit twice in W30 — both bugs found in
   browser verification were invisible to 1137 passing tests.
6. **`Overview.jsx` computes "today" from UTC**, not the user's local date — wrong for several
   hours every evening for a US-based user. One line; tracked separately.
