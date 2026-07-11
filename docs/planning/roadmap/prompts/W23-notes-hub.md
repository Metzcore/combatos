# W23 — Notes v1 (second top tab in the Checklist hub) · Tier: IMPL, then REVIEW pre-merge
_Written 2026-07-12 after the developer's brainstorm dialogue (`docs/reference/checklist-ideas/
brainstorm-summary.md` — treat it as VISION context; THIS prompt is the ruled scope; where they
differ, this prompt wins). ⛔ Gated on W23.5 (data durability) being merged. This is the deferred
D4 notepad, updated by the 2026-07-12 rulings: tags + pin REPLACE the 5-star rating; plain text
only; daily note on-demand with an editable template._

**Instructions for the User:** paste everything below the dashed line into a fresh session.
Diagnostic-first: the agent must present its plan before changing anything.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Read repo-root `AGENTS.md` first and obey
its hard rules. Study the checklist feature before proposing anything — Notes deliberately mirrors
its architecture (data layer outside DBProvider, hook wrapper, BottomSheet patterns, soft-delete,
logical dates, connector-ready export): `app/src/db/checklist.js`, `hooks/useChecklist.js`,
`utils/checklistDate.js`, `components/Checklist.jsx`, `components/checklist/*`, `utils/navState.js`.

## THE DECIDED SCOPE (developer + architect rulings, 2026-07-12 — do not relitigate)

**Navigation.** The Checklist hub gains top tabs `[Checklist | Notes]` using the existing shared
`TopTabs` component and the `navState.js` pattern (add a `checklist` entry to `HUB_TOP_TABS`;
Layer-2 selection lifted in AppShell like Train/Timer/Log — smallest possible shell change).

**Note groups.** User-defined groups (create/rename/reorder/soft-delete with cascade, confirm
text states it) — reuse or lightly generalize the existing GroupNameSheet/GroupActionsSheet
patterns; the diagnostic decides reuse-vs-parallel-component and justifies it.

**Notes.** Title (optional — untitled notes show a body excerpt), plain-text body, `tags` (array),
`pinned` (boolean), stable UUID ids, createdAt/updatedAt, soft-delete via deletedAt. **Plain text
ONLY** — no rich text, no contenteditable, no editor libraries (explicitly ruled out as the
project's #1 scope trap).

**Inline checklists in plain text.** In VIEW mode, body lines matching `- [ ]` / `- [x]` render as
tappable checkboxes; tapping rewrites exactly that line in the stored text (`[ ]` ↔ `[x]`). EDIT
mode is a plain `<textarea>`. The line-parse/toggle logic must be a pure, unit-tested util
(`utils/noteChecklist.js` or similar) — the component only maps over its output.

**Tags.** Freeform, normalized on entry (trim, lowercase, spaces→`-`). Stored per-note as a string
array with a Dexie multiEntry index (`*tags`). Notes tab shows a derived tag-chip filter row (union
of tags in use + counts, computed from live notes — no separate tags table). Tag editing lives in
the note editor (add/remove chips). This is the app-wide tag convention: other features adopt the
same normalized shape later.

**Pin.** Pinned notes sort to the top of their group. One boolean, one toggle in the note's
actions sheet. (The old D4 5-star rating is RETIRED — do not build it.)

**Daily note (on-demand).** A "Today" affordance opens the daily note for the current LOGICAL day
(reuse `logicalDateStr` + the checklist's reset-time setting — one clock for the whole hub). If it
doesn't exist, it's created in an auto-provisioned "Daily" group, prefilled from the **daily-note
template**: a plain-text template stored in the key-value `settings` store, EDITABLE in the app
(small sheet reachable from the Notes tab; ship a sensible default like "## What went well\n\n
## What to fix\n\n## Tomorrow's focus" but never hardcode it at creation time — always read the
setting). No auto-creation of empty notes, ever.

**Search.** A search field in the Notes tab: case-insensitive substring match over title + body,
live-filtered, combinable with the tag filter. No search libraries.

**Quick capture.** The pinned quick-add bar pattern, Notes flavor: typed text becomes a new note
(first line → title) in a default "Inbox"/"General" group.

**Data layer.** Mirror the checklist split: `db/notes.js` (pure Dexie CRUD + `getNotesViewModel`
single query entry point owning the soft-delete filter + `exportNotes()` connector contract) and
`hooks/useNotes.js` (visibilitychange refresh like useChecklist). LOCAL-ONLY — zero webhook/sync
imports, same hard boundary as the checklist.

**Dexie v3.** Additive: restate ALL v1+v2 tables verbatim, add `noteGroups` and `notes` (with the
`*tags` multiEntry index and the other indexes your diagnostic justifies). Same upgrade-test
discipline as W21: prove a v2-shaped DB with real-shaped session + checklist rows survives the
bump intact. The developer's phone has real data — this is the highest-stakes part of the PR.

**Explicitly OUT of v1** (ruled, do not build): rich text · backlinks/graph view · per-note
backgrounds/themes · Initiatives/PM surfaces (an ordinary "Initiatives" notes-group is the v1
answer) · tracking/counters (future W24) · templates beyond the daily-note one · reminders ·
media/attachments · note encryption · restore/import.

## DO NOT TOUCH
- The checklist feature's behavior and tests; `exportChecklist()` and the W23.5 backup shape
  (`db.tables` enumeration auto-includes the new stores — verify, don't modify).
- Webhooks, sync/, payload shapes, HUD. package.json / lockfile (zero new dependencies).
- `TopTabs.jsx` and `BottomNav.jsx` internals (consume, don't modify; `navState.js` gets only the
  additive `HUB_TOP_TABS.checklist` entry and its tests updated accordingly — this is the one
  W20-shell file you may touch, additively).

## PHASE 1 — DIAGNOSTIC (report, then STOP for approval)
1. **Schema:** exact stores/indexes + the v3 bump plan + upgrade-test design (isolated DB name).
2. **Checkbox-line util:** parse/toggle design, edge cases (nested markers, `[X]` uppercase,
   malformed lines stay plain text), test list.
3. **Component plan:** Notes tab screen, note card/list (pinned-first ordering, excerpt
   rendering), editor sheet or screen (justify which), tag chips + filter row, search field,
   Today button, template-edit sheet, group sheets (reused vs parallel — justify).
4. **Shell wiring:** the exact navState/AppShell/Checklist.jsx changes to introduce the top tabs
   with zero disturbance to the existing Checklist tab (its countdown, quick-add, sheets).
5. **Editor save semantics:** propose and justify (explicit save vs save-on-close vs debounce) —
   the failure mode to design against is losing a long journal entry.
6. **Tests:** util tests, db/notes tests (CRUD, cascade, view model, export shape, tag
   normalization/derivation, daily-note idempotence — two "Today" taps = one note), navState
   additions, upgrade test.
7. **Risk list:** schema bump on real data, quick-add default-group provisioning race, search
   performance (fine at scale — state why), textarea data-loss vectors.

## PHASE 2 — IMPLEMENT (only after approval)
- `npm ci` only; `npm test` and `npm run build` green; existing tests unmodified except the
  additive `navState.test.js` cases.
- Manual checklist for the user: Checklist tab byte-identical in behavior · Notes tab: create
  group, create note, edit body with `- [ ]` lines, tap checkboxes in view mode, tag a note and
  filter by chip, pin floats it, search finds body text, Today creates the templated daily note
  (second tap reopens same note), edit the template and confirm the NEXT daily note uses it,
  quick-capture from the pinned bar · full backup from W23.5 now contains the notes tables ·
  kill/reopen app — everything persists · log a workout — Sheet still receives it.

Commit: `feat: notes v1 — groups, tags+pin, inline checklists, daily note, search (W23, D4)`.

## REVIEW PASS (separate session)
Focus: the v3 upgrade path against real-shaped v2 data, the checkbox line-rewrite util (must never
corrupt non-checkbox lines), soft-delete filter centralization in the view model, tag
normalization consistency, zero sync/webhook imports, and the untouched checklist tab.
