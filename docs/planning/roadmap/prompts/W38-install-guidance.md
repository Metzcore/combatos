# W38 — Install Guidance (get the app onto the home screen) · Tier: IMPL, then REVIEW
_Written 2026-10-02. Base: `main` @ `a762088`. Context: the app is fully installable — the live
manifest, icons, service worker and `display: standalone` were verified on `train.metzcore.com`
— but it never asks anyone to install. Android Chrome shows its own mini-infobar once; a user who
misses or dismisses it gets nothing more. iPhone has no automatic prompt at all. The only install
surface today is a warning paragraph in More › About. Every new client starts here, so this runs
**before W34**._

**Instructions for the User:** paste everything below the dashed line into a fresh session.
Diagnostic-first: the agent must present its plan before changing anything.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Read repo-root `AGENTS.md` first and obey
its hard rules; read the `combatos-conventions`, `pwa-offline-first` and `mobile-interaction-ux`
skills in `.agents/skills/`. Task: guide a phone user to install the app. Nothing else.

## PLATFORM FACTS (verified 2026-10-02 — build on these, re-check anything you doubt)
- **Android (Chrome, Samsung Internet, Edge)** fire `beforeinstallprompt` when the app is
  installable and not installed. The page can `preventDefault()` it, keep the event, and call
  `prompt()` later from a user gesture — **once per event**; after `userChoice` resolves the browser
  fires a fresh event to keep. `appinstalled` fires however the app gets installed. The event is
  non-standard (WICG Manifest Incubations); Firefox and Safari do not implement it.
- **iPhone/iPad** have no programmatic install. The only route is Share → Add to Home Screen. Since
  iOS 26, anything added to the Home Screen opens as a web app by default.
- **iOS keeps the Home Screen app's storage separate from Safari's.** Only cookies are copied, once,
  at install time. This app's Supabase session lives in `localStorage`, so **the installed app
  starts signed out**, and Dexie data created in the Safari tab (checklist, notes, drafts) stays
  behind. This is why the iPhone guidance must appear **before sign-in**.
- **"Is the app installed?" from a browser tab:** only Chromium's `navigator.getInstalledRelatedApps()`
  can answer, and only with a self-referencing `related_applications` entry (`platform: "webapp"`)
  in the manifest. Experimental; feature-detect it. iOS cannot answer at all.
- **In-app browsers** (Instagram, Facebook, and others) cannot install. Links sent to clients
  through messaging apps may open in one.
- **Running installed:** `matchMedia('(display-mode: standalone)')`, or `navigator.standalone` on
  iOS. Both `DailyIgnition.jsx` and `more/AboutScreen.jsx` already duplicate this check.

## THE DECIDED SCOPE (developer rulings 2026-10-02 — do not relitigate)

**1. One pure module, `app/src/utils/installState.js`.** It decides which guidance applies from
injectable inputs (user agent, standalone flags, whether a deferred event is held, the
related-apps result, the dismissal timestamp, now) and returns one of: `installed`,
`android-prompt` (an event is held), `android-already-installed`, `ios-safari-steps`,
`in-app-browser`, `unsupported` (desktop, or nothing to offer), plus whether a dismissed banner may
show again. `DailyIgnition.jsx` and `AboutScreen.jsx` switch to its `isStandalone` helper — same
behaviour, one implementation.

**2. Capture `beforeinstallprompt` at module scope, before React mounts.** This is the W33 lesson
(`docs/decision_log.md` 2026-09-29 #1): an event that fires early and has no subscriber yet is gone.
Register the listener in a tiny module imported at the top of `main.jsx`. It stores the event and
notifies subscribers, and it also handles `appinstalled`. Prove in the diagnostic that the listener
exists before the event can fire.

**3. Where guidance appears (in browser tabs only — never in the installed app):**
- **The sign-in screen, always.** The install step comes before sign-in so an iPhone user signs in
  once, inside the installed app. Copy for iPhone says so in plain words: "after adding it, open
  Combat OS from your home screen and sign in there."
- **After sign-in, a small dismissible banner.** Dismissing hides it on this device for **7 days**,
  stored in `localStorage` (per-device, a convenience; wrap reads and writes in try/catch).
- **More › About** keeps its warning, and gains the same Install action or iPhone steps.

**4. What each state shows:**
- `android-prompt`: an **Install app** button that calls the held event's `prompt()`.
- `android-already-installed`: "You already have Combat OS — open it from your home screen."
- `ios-safari-steps`: three short illustrated steps — Share icon → Add to Home Screen → open from
  the home screen and sign in. Use inline SVG for the Share glyph. No screenshots of Apple UI.
- `in-app-browser`: "Open this page in Chrome or Safari to install Combat OS."
- `unsupported` / `installed`: nothing.

**5. Manifest (`app/vite.config.js`):**
- `name` and `short_name` become **"Combat OS"** (ruling: the home-screen label; `index.html`'s
  `apple-mobile-web-app-title` already says Combat OS).
- Add `id: "/"`. This equals the id Chrome already derives from `start_url: "/"`, so existing
  installs keep their identity. **Verify that equivalence; do not assume it.** A different `id`
  orphans every existing Android install.
- Add `related_applications: [{ platform: "webapp", url: "https://train.metzcore.com/manifest.webmanifest" }]`
  for the already-installed check.

## EXPLICITLY OUT OF SCOPE
- In-app branding: the sign-in heading "Fighter's OS", `<title>Fighter's OS HUD</title>` and the
  meta description. Note them in the diagnostic; renaming the app's own UI is a separate decision.
- Blocking browser-tab use. Ruled out — it would lock out anyone who cannot install.
- Push notifications, app badges, manifest `screenshots`, store listings.
- Any change to auth, session persistence, Dexie, sync, or the workout payload.

## DO NOT TOUCH
- `AuthProvider.jsx` and the auth flow. The sign-in screen gains a block of guidance, not logic.
- Dexie schema, `syncQueue`, webhook payloads, `scripts/webhook.gs`, `playbook.js`, `%1RM` math.
- Service worker / workbox config, and `public/_headers`.
- `package.json` / lockfile. Zero new dependencies.

## PHASE 1 — DIAGNOSTIC (report, then STOP for approval)
1. How `beforeinstallprompt` capture is guaranteed to precede the event, and how the held event
   reaches the sign-in screen, the banner and More › About.
2. The `id: "/"` equivalence, with evidence from Chrome's manifest-id rules.
3. The user-agent heuristics for iOS Safari vs other iOS browsers vs in-app browsers: which strings,
   and the failure mode when a guess is wrong. A wrong guess must show weaker guidance, never a broken
   button.
4. Exact diff plan: files, the module and its tests, the three surfaces, the manifest. Nothing else.
5. Copy for every state, written out in full for approval.

## PHASE 2 — IMPLEMENT (only after approval)
- `npm ci` only. `npm test` and `npm run build` both green, with real counts cited.
- Tests in house style (Vitest, `globals: false`, 4-space, no semicolons, behaviour-named
  `describe`) for `installState.js`: every state, the 7-day boundary, a held event outranking UA
  guesses, and standalone always winning.
- Confirm the built `dist/manifest.webmanifest` carries the new name, `id` and
  `related_applications`.
- Browser check at 375px via `combatos-verify` (port 5180): the iPhone steps render when the UA is
  emulated as iOS Safari; nothing renders when standalone is emulated; dismissal hides the banner
  and survives a reload. The real install dialog cannot be driven from an agent browser — say so
  rather than implying it was tested.

## MANUAL CHECKLIST FOR THE DEVELOPER (real hardware — required, not optional)
- **Android Chrome, not installed:** the Install button opens Chrome's install dialog; after
  installing, the guidance disappears in the tab and never appears in the installed app.
- **Android Chrome, already installed, opened in a tab:** the "already have it" message appears (if
  `getInstalledRelatedApps` supports it on your device), otherwise nothing broken.
- **Existing Android install:** after deploy it still opens as the same app (no duplicate icon), and
  its label updates to "Combat OS" when Chrome next refreshes it.
- **iPhone Safari:** the steps are correct for your iOS version, and the installed app asks you to
  sign in once, as the copy promised.
- **A link opened from WhatsApp/Telegram/Instagram** on each phone: either it opens in the real
  browser, or the in-app message appears.

Commit: `feat(install): guide phone users to install Combat OS (W38)`.
