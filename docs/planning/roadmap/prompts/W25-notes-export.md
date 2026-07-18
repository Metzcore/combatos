# W25 — Notes Export Button · Tier: IMPL (tiny, parallel-safe), review by coordinator
_Written 2026-07-18. Context: `exportNotes()` shipped fully tested in W23 (`app/src/db/notes.js`)
as the D4 connector contract, but no UI calls it — Notes data is currently only reachable via
the W23.5 full backup. This wires the missing Share control into the Notes toolbar, mirroring
the checklist's W22 Share exactly. No new mechanics: the share-or-download path and its
delivered-vs-cancelled discipline already exist in `app/src/utils/checklistShare.js`._

**Instructions for the User:** paste everything below the dashed line into a fresh session.
Diagnostic-first: the agent must present its plan before changing anything.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Read repo-root `AGENTS.md` first and obey
its hard rules; read the `combatos-conventions` and `mobile-interaction-ux` skills in
`.agents/skills/`. Task: a Share button for Notes export. Nothing else.

## THE DECIDED SCOPE (do not relitigate)

**1. One new wrapper in `app/src/utils/checklistShare.js`.** `shareOrDownloadNotes(exportData)`,
a thin sibling of `shareOrDownloadChecklist()`: filename `combatos-notes-${localDateStr()}.json`,
title `CombatOS Notes Export`, delegating to `shareOrDownloadJson()`. That inherits the ruled
delivery mechanics for free — `canShare`/`share`/blob-download feature-detection order, NO
fileless text-share tier, and the AbortError discipline (user-cancelled share sheet must NOT
fall through to a download). Filename stamps are the plain local calendar date (`localDateStr`),
not the reset-shifted logical date — same reviewer ruling as the checklist filename.

**2. One new button in the Notes toolbar.** `⇪ Share` as a `btn-ghost` in
`.checklist-toolbar__actions` in `app/src/components/Notes.jsx`, alongside `☀ Today` and
`✎ Template`, with `aria-label="Share notes export"`. Handler mirrors `Checklist.jsx`'s
`handleShare`: `const data = await n.exportData(); await shareOrDownloadNotes(data)`.
`useNotes` already exposes `exportData` (→ `exportNotes()`) — no hook changes.

**3. Export shape untouched.** `exportNotes()` is the D4 connector contract; this task calls
it, it does not modify it. The shape-pinning tests in `notes.test.js` must pass unmodified.

**4. Tests.** Extend `app/src/utils/checklistShare.test.js` with a `shareOrDownloadNotes`
wrapper test pinning filename + title, mirroring the existing `shareOrDownloadChecklist` one.
No other test files change.

## EXPLICITLY OUT OF SCOPE
- Notes Import (checklist-style paste-import) — not on the roadmap; do not add it.
- A "last export" timestamp hint — that is a W23.5 full-backup-only feature.
- Any change to `exportNotes()` / `exportChecklist()` shapes, or to `shareOrDownloadJson()`.
- Any webhook/Sheets involvement — Notes data is LOCAL-ONLY, per the standing data policy.

## DO NOT TOUCH
- `app/src/db/notes.js`, Dexie schema, webhooks, `sync/`, payload shapes.
- `package.json` / lockfile (zero new dependencies).

## PHASE 1 — DIAGNOSTIC (report, then STOP for approval)
1. Toolbar fit: the Notes toolbar already holds a search input + two buttons; confirm a third
   `btn-ghost` fits a narrow phone viewport without wrapping or shrinking tap targets below the
   mobile-interaction-ux floor. If it doesn't fit, propose the minimal adjustment using existing
   tokens/classes only (e.g. tighter action gap) — no new visual language.
2. Exact diff plan: the wrapper, the button + handler, the test. Nothing else should appear.
3. Risk list: double-tap while the share sheet is open (state what the existing checklist
   button does today — parity is the requirement, not new debouncing).

## PHASE 2 — IMPLEMENT (only after approval)
- `npm ci` only; `npm test` and `npm run build` green; existing tests unmodified.
- Manual checklist for the user (on-device): Share from Notes opens the Android share sheet ·
  delivered file is valid JSON with the documented shape · cancelling the sheet does NOT also
  download · desktop browser falls back to a plain download.

Commit: `feat: notes export share button (W25)`.
