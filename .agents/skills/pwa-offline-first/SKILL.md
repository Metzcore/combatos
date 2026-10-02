---
name: pwa-offline-first
description: Judgment for service-worker, vite-plugin-pwa, manifest, and IndexedDB-persistence work in Combat OS. Read before touching the PWA options in app/vite.config.js, Dexie schema versions, caching, install behavior, or anything that changes what happens offline or on app update. The app is an installed Android PWA used mid-workout — offline is the primary path, not the fallback.
---

# Combat OS — PWA / Offline-First Judgment

The app runs installed on one developer's Android phone, in a gym, often with no useful
network. The only network call in the entire product is the fire-and-forget webhook POST
(`mode: 'no-cors'`, response never read). Everything else — playbook, logging, checklist,
notes, timers, stats — must work fully offline. Never design a feature whose happy path
needs a network response.

---

## The update flow (and its number-one trap)

`vite-plugin-pwa` runs with `registerType: 'prompt'` and `injectRegister: false` (W40).
Registration is hand-written in `app/src/swUpdate.js` (imported from `main.jsx`, outside
AuthGate/DBProvider), not the plugin's `useRegisterSW`, whose `register.js` reloads every window on a
controller change. The generated `sw.js` has **no** `skipWaiting`/`clientsClaim` — only a `message`
listener that skips waiting on `{type:'SKIP_WAITING'}`. Do not set `workbox.skipWaiting` or
`clientsClaim`. Consequences:

- **A merged PR is not "on the phone."** New code reaches the phone like this: PR merged → Cloudflare
  deploys → the app checks for an update (on launch, on resume from the background, hourly while
  open) → the new worker installs in the background and **waits** → a banner says "A new version of
  Combat OS is ready" → Restart (or a full close and reopen) activates it. When a developer verifies
  on-device and "my change isn't there", the first suspects are: the banner was never tapped, the
  banner was hidden by an active workout/timer, or the app was never fully closed. The build stamp in
  More › About › Version (date · commit) says which build is actually running.
- **Pull-to-refresh never activates a waiting worker — permanently, not just during a transition.**
  A reload is served by the still-active old worker. Only Restart or a full close and reopen swaps it.
- The banner never appears during a live workout or timer (`isWorkoutActive` in
  `utils/updateBanner.js`: meaningful live draft, draft hydrating, stopwatch/countdown/rounds timer
  not idle), and nothing ever reloads a window except that window's own Restart tap. "Later" lasts
  the session only.
- The state machine is unit-tested against fakes (`swUpdate.test.js`); the real service-worker
  lifecycle on iOS/Android cannot be (D14) and is covered by the W40 device checklist. Any change to
  `swUpdate.js`, `registerType` or the `sw.js` activation behaviour is a PWA risk gate (AI-WORKFLOW §8).
- `public/_headers` still has a `/registerSW.js` rule; the file is no longer generated, so the rule
  is inert and harmless.

## Cache judgment

- Precache is `workbox.globPatterns: '**/*.{js,css,html,ico,png,svg,csv}'` — `.csv` is
  there on purpose (the playbook ships in the app). **Adding a new asset file type means
  extending this glob, or the asset silently won't exist offline.**
- Runtime caching covers Google Fonts only (CacheFirst, 1-year expiry). Never add runtime
  caching for the webhook / `script.google.com` — offline resilience for logging lives in
  Dexie's `syncQueue` retry loop, not in HTTP caching.

## Manifest / install

`display: 'standalone'`, `orientation: 'portrait'` (locked), theme `#0a0a14`, icons
192/512 plus a 512 maskable. The Android install flow was hardened once already and
verified by fresh reinstall — any manifest or icon change re-triggers that cost: retest
with a full uninstall/reinstall on the phone, not just a browser reload. iOS/Safari
quirks are Project B (Apex) territory; don't spend effort on them here.

## IndexedDB is the only copy of real data

Local Dexie (`FightersOS`) plus the append-only Sheet are the entire persistence story —
a dropped table is unrecoverable training history. Schema-bump discipline (see
`combatos-conventions` for the store map):

- Every `db.version(n).stores({...})` restates **all** tables verbatim — omitting one
  deletes it, silently, on real devices.
- Changes are additive-only; no `.upgrade()` unless data genuinely must transform.
- Tests assert schema facts with capture-before/assert-unchanged or `>=` floors, never
  `verno === n`.

## Durability plumbing already in place (don't re-invent, don't break)

- `navigator.storage.persist()` is requested best-effort at startup — deliberately not
  awaited on the critical path and never allowed to throw or delay first paint. Keep it
  that way.
- The full-backup export (`app/src/db/backup.js`) iterates `db.tables` dynamically — a
  new Dexie table is included in backups automatically, with no registration step to
  forget. Export-only by design; restore/import is deliberately deferred to the Supabase
  era. Don't build a restore path ahead of that decision.
