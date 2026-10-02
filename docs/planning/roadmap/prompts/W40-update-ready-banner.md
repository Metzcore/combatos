# W40 — "New Version Ready" Banner · Tier: IMPL, then REVIEW
_Written 2026-10-02. Context: updates already reach installed apps with no reinstall — verified the
same day: production served the W36 fix (`PGRST303` present in the live bundle) after PR #101
merged. But the update is silent. `registerType: 'autoUpdate'` plus the plugin's injected
`registerSW.js` registers `sw.js` (`skipWaiting` + `clientsClaim` + `cleanupOutdatedCaches`), so a
new version takes over in the background while the screen keeps running the old code until the app
is **fully closed and reopened**. Users never learn an update arrived, and "swipe it away and
reopen" is not obvious, especially on iPhone. This item tells them, and lets them restart when
they choose._

**Instructions for the User:** paste everything below the dashed line into a fresh session.
Diagnostic-first. This changes how the service worker activates — a PWA risk gate under
`docs/engineering/AI-WORKFLOW.md` §8 — so it takes the full §4 lifecycle, including independent
review.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Read repo-root `AGENTS.md` first and obey
its hard rules; read the `pwa-offline-first`, `combatos-conventions` and `mobile-interaction-ux`
skills in `.agents/skills/`, and `AI-WORKFLOW.md` §8. Task: an update-ready banner. Nothing else.

## FACTS (verified 2026-10-02)
- `vite-plugin-pwa` **0.20.5**; `registerType: 'autoUpdate'`; registration is the plugin's injected
  `registerSW.js` (no `virtual:pwa-register` import anywhere in `app/src`). The plugin ships
  `virtual:pwa-register/react` (`useRegisterSW`, with `needRefresh` and `updateServiceWorker`).
- `public/_headers` serves `sw.js` and `registerSW.js` with `no-cache`, so update checks reach the
  network.
- The production bundle is a **single JS file** (no lazy chunks), so a page running old code after a
  new worker activates cannot fail on a missing chunk today. Re-check this; if code-splitting has
  appeared, it changes the risk.
- Unfinished workouts are durable (A6.5 Dexie drafts) and resume after a reload. Even so, a restart
  must be the user's choice.

## THE DECIDED SCOPE (developer ruling, 2026-10-02)

**1. Switch to prompt-style updating.** A new version downloads in the background as now, but waits
instead of taking over silently. The app shows a small banner: **"A new version of Combat OS is
ready — Restart"**, plus a "What's new" link to W39's guide section if W39 has landed. Tapping
Restart activates the waiting worker and reloads.

**2. Never mid-workout.** While a workout is active (a live draft / started session), the banner
does not appear. It appears once the workout is finished or discarded. It never reloads anything by
itself.

**3. Long-open sessions still find updates.** An installed app can stay open for days. Check for
updates on resume (`visibilitychange` → visible) and/or on a modest interval. Choose and justify in
the diagnostic.

**4. Dismissible.** "Later" hides it for the current session only. The new version still loads on
the next full close and reopen — today's behaviour, unchanged.

**5. Coexists with W38.** If W38's install banner and this banner could both show in a browser tab,
define one priority (update first) and show one at a time.

## THE RISKS TO DESIGN OUT (diagnostic must answer each)
- **The transition itself.** Every installed phone today runs an `autoUpdate` worker. Prove that the
  first deploy of the prompt-style worker reaches those phones and behaves correctly. No phone may
  get stuck on an old version, and no reinstall may be needed. This is the load-bearing question.
- Two tabs open (browser) when Restart is tapped in one.
- Offline when the banner shows; Restart while offline.
- iOS standalone quirks with service-worker updates. State what is known and what needs a device.
- `cleanupOutdatedCaches` and precache behaviour while a new worker waits.

## EXPLICITLY OUT OF SCOPE
- Forced updates / minimum-version gates. (The cartridge "update-required" state already exists for
  programmes; this item does not touch it.)
- Push notifications about updates.
- Writing the "What's new" content (W39 owns it).

## DO NOT TOUCH
- Workbox caching strategy beyond what prompt-mode requires, `runtimeCaching`, `public/_headers`.
- Dexie schema, drafts, `syncQueue`, webhook payloads, `scripts/webhook.gs`, `playbook.js`, `%1RM` math.
- `package.json` / lockfile. Zero new dependencies (`virtual:pwa-register/react` is already in the
  installed plugin).

## PHASE 1 — DIAGNOSTIC (report, then STOP for approval — then independent review)
1. The exact registration change (`registerType`, `injectRegister`, where `useRegisterSW` mounts) and
   the generated `sw.js` difference (no `skipWaiting` until asked).
2. The transition proof from the risks list, with evidence from the plugin and Workbox source.
3. How "a workout is active" is read, and which existing state it reuses.
4. Update-check cadence and why.
5. Copy, placement, and the W38 priority rule.

## PHASE 2 — IMPLEMENT (only after approval and review)
- `npm ci` only. `npm test` and `npm run build` green, with counts. Diff the generated `dist/sw.js`
  against `main`'s and explain every difference.
- Pure, tested decision for "show the banner now?" (update waiting × workout active × dismissed ×
  W38 banner present). The service-worker wiring itself cannot be unit-tested here (D14). Say so,
  and rely on the device checks.
- Browser check: run a build with `vite preview`, then rebuild with a visible change. Confirm the
  banner appears, Restart loads the new version, and the banner stays hidden during an active
  workout.

## MANUAL CHECKLIST FOR THE DEVELOPER (real hardware — required)
- **The transition:** after this deploys, an Android and an iPhone that were installed *before*
  W40 both pick it up without a reinstall.
- On the next deploy after that: the banner appears on both; Restart shows the new version.
- Start a workout, deploy, and confirm no banner until it is finished; then confirm the draft
  survived.
- Leave the installed app open in the background for a day; confirm it still finds the update.

Commit: `feat(pwa): tell users when a new version is ready (W40)`.
