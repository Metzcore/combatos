# W20 — Nav Shell Restructure · Tier: IMPL, then REVIEW pre-merge
_Written 2026-07-10 after the W19 sign-off (see `../W19-NAV-IA-PROPOSAL.md` §6). This is the
smallest possible structural PR: it moves furniture and introduces one shared component. It adds
NO feature content — the Checklist hub ships as a placeholder. W21 is gated on this landing._

**Instructions for the User:** paste everything below the dashed line into a fresh session.
Diagnostic-first: the agent must present its plan before changing anything.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Read repo-root `AGENTS.md` first and obey
its hard rules. Task: restructure the app's navigation shell per the signed-off W19 design.

## THE DECIDED DESIGN (W19 §6 rulings — do not relitigate)
Bottom nav stays at 5 hubs, but the occupants change:

| Slot | Hub | Layer-2 top tabs |
|---|---|---|
| 1 | ⚔️ TRAIN | `Workout` (today's HUD, unchanged) · `Playbook` (existing PlaybookViewer, moved as-is) |
| 2 | ⏱️ TIMER | `Basic` · `Rounds` (already a segmented control — adopt the shared component) |
| 3 | 📅 LOG | `Log` · `Stats` (W9's toggle — adopt the shared component) |
| 4 | ☑️ CHECKLIST | placeholder screen only ("coming soon" in CombatOS voice); W21 fills it |
| 5 | ⚙️ SETTINGS | unchanged |

- **One new shared component: `TopTabs`** — the Layer-2 top-tab bar used by Train, Timer, Log
  (and later Checklist). Underline/indicator on the active tab, CombatOS tactical-amber styling
  (this is OUR component — do NOT copy TRW's navy/gold look; paradigm only).
- **Playbook's CONTENT is untouched in this PR** — `PlaybookViewer.jsx` renders exactly as today,
  just reached via Train → Playbook instead of its own bottom slot. Its rebuild is a separate
  later item (absorbs W11).
- No swipe gestures between top tabs (explicitly deferred in W19 §2).

## DO NOT TOUCH
- HUD internals, state persistence, scroll-restore behavior — the HUD component moves inside a
  hub wrapper but its logic/markup must not change.
- Webhooks, payload shapes, `playbook.js`/CSV pipeline, %1RM/e1RM logic, n8n (AGENTS.md rules).
- DailyIgnition (developer: working well as-is — verify it still fires on app open after the
  shell change).
- Timer/stopwatch persistence across tab switches — battle-tested behavior; your diagnostic must
  explain why your change preserves it.

## PHASE 1 — DIAGNOSTIC (report, then STOP for approval)
1. **Map the current shell:** `AppShell.jsx` (five `activeTab` string cases: `hud`, `playbook`,
   `timer`, `calendar`, `settings`) and `BottomNav.jsx` (five buttons). Propose the new tab-state
   shape — note that Layer-2 selection (which top tab is active inside a hub) must survive hub
   switches the same way current tab state does (e.g. switching Train→Timer→Train returns to the
   top tab you were on).
2. **Inventory existing Layer-2 switches:** the `[Basic|Rounds]` control in `Timer.jsx` and the
   `[Log|Stats]` toggle in `Calendar.jsx`/`WeeklyStats.jsx` (W9). Propose how each adopts the
   shared `TopTabs` component with zero behavior change.
3. **Component moves:** how HUD and PlaybookViewer come to live under a Train hub wrapper. State
   explicitly how HUD's mount/unmount behavior changes (or doesn't) — its state persistence across
   tab switches was hard-won (see CHECKLIST.md A1) and must be regression-tested.
4. **Checklist placeholder:** slot-4 button (☑️ CHECKLIST) → minimal placeholder screen.
5. **Tests:** which existing tests touch tab names/shell structure; what new tests pin the shell
   (e.g. TopTabs renders/switches, Layer-2 state survives hub switches).
6. **Risk list:** anything where this restructure could disturb scroll restore, timer
   persistence, or DailyIgnition's app-open splash.

## PHASE 2 — IMPLEMENT (only after approval)
- Execute the approved plan. `npm test` and `npm run build` green (`npm ci` for deps).
- Manual checklist for the user (on localhost, then on-device after merge): every hub reachable ·
  Train shows Workout/Playbook top tabs and both render · timers keep running across hub switches ·
  HUD state + scroll position survive Train→Log→Train · a full workout log still lands in the
  Sheet · DailyIgnition still fires on open · Checklist placeholder visible.

Commit: `feat: layered nav shell — TopTabs, Playbook into Train, Checklist slot (W19/W20)`.

## REVIEW PASS (separate session)
Focus: HUD state/scroll persistence under the new wrapper, timer continuity across hub switches,
and that PlaybookViewer and the webhook path are byte-for-byte untouched.
