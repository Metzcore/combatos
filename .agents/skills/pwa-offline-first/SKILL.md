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

`vite-plugin-pwa` runs with `registerType: 'autoUpdate'` and no in-app update UI. New code
reaches the phone only after: PR merged → Cloudflare deploys → the installed app is next
opened and the service worker swaps in the new build (sometimes only on the launch *after*
that). Consequences:

- **A merged PR is not "on the phone."** When the developer verifies on-device, stale-SW
  confusion is the first suspect for "my change isn't there" — close/reopen the app (or
  reinstall) before debugging it as a code bug.
- Don't add an update-prompt flow or switch `registerType` casually — the zero-interaction
  update model is a deliberate fit for a single-user app.

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
