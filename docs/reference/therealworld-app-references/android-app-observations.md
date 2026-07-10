# TRW Native Android App — Observed Navigation & Checklist Patterns

_Compiled 2026-07-10 from 10 screenshots of the live TRW Android app (in `android-screenshots/`),
plus a browser session on the mobile-web version. This supplements the two spec docs with what the
platform **actually does on a phone** — the specs were written from desktop/web. Where this doc and
the specs disagree, trust this doc for mobile behavior._

## 1. Primary navigation: bottom bar, 5 items (NOT the desktop rail)

The desktop/web left icon rail (7 items) becomes a **bottom tab bar with exactly 5 slots** on
native Android: `Chat · Courses · Inbox · Market · More`.

- Confirms the ≤5-hub bottom-bar paradigm CombatOS already chose in W19.
- The 5th slot is **More** — an overflow that opens a **bottom sheet** listing everything that
  didn't earn a bar slot: Settings, Profile, **Checklist**, Wallet, King, Friends, Live Chat
  Support. (Notable: TRW demotes Checklist to overflow; CombatOS deliberately does the opposite —
  our checklist earns a bar slot because it's core to the training loop, theirs competes with
  chat/courses/commerce.)
- The Discord-style "space selector" (campus switcher) does NOT exist as a persistent rail on
  mobile. It collapses into a **"My Campuses" bottom sheet** opened from the top-left header
  dropdown. Pattern: secondary nav that would cost horizontal space becomes a sheet.

## 2. Layer-2 top tabs, seen live

- Checklist hub: `[Checklist | Schedule]` — underlined active tab, amber indicator.
- Courses hub: `[Courses | In Progress | Favorites]`.
- Market hub uses a drawer-style vertical section list instead of top tabs (denser IA).

## 3. Checklist hub (the slot-4 reference for CombatOS)

**Checklist tab** — matches `checklist_ui_specification.md` with these live details:
- Group cards (General Tasks, METZCORE, Health & Fitness, Self Improvement (HQ)). Group header
  actions: `+` (add task), edit, reorder ↑ ↓, delete.
- Task row: rounded-square checkbox · emoji + title · subtext line with 📅 "Scheduled for [time]",
  🔁 "Daily", 🔥 streak count · trailing `…` button.
- `…` opens a **bottom-sheet context menu**: Edit Task · Stop Repeating Daily · Add to Group ›
  · View History · Delete Task. Background content blurs behind the sheet.
- **Quick-add is a pinned input, not a FAB**: a persistent "Describe your task" field with submit
  button sits just above the bottom nav. Capture is zero-navigation. (The architecture spec
  recommends a FAB; the real app uses a pinned input for the checklist. Both are valid; the pinned
  input is one tap cheaper for high-frequency capture.)
- Footer actions: `+ Create Group`, `Add Campus Tasks` (import).
- Header: live clock, Share / Import buttons.

**Edit Task** — full-screen modal sheet with: title · description (multiline) · "Show on Daily
Schedule" date picker + time + timezone · Duration slider · Custom End Time toggle · Set Reminder
toggle · Repeat toggle · primary action button bottom-right.

**Schedule tab** — a day-calendar (hour grid, red now-line, ‹ Today › paging) rendering the same
tasks as timeline events. Checklist and Schedule are two views over one data set.

## 4. Courses hub (reference for CombatOS Playbook rebuild)

- Header: campus icon + "Learning Center" title + search + calendar shortcut.
- Course cards: icon art · title · one-line subtitle · progress bar with "% complete" · full-width
  amber CTA ("Start Course ›") · `⋮` per-card menu.
- Inside a course: breadcrumb header (`Course › Lesson`), progress summary card ("4 Modules ·
  51 Lessons · 18%"), module section headers, numbered lesson rows with ✓ completion ticks,
  current lesson highlighted.

## 5. Inbox hub

Notification feed: filter dropdown ("All Notifications"), per-item cards showing source channel,
author, preview text, timestamp, dismiss ×. Bulk actions in header (mark seen, filter, clear,
settings).

## 6. Patterns worth adopting in CombatOS (beyond what W19 already adopted)

1. **Pinned quick-add input** for the checklist tab (instead of, or alongside, the planned FAB) —
   the highest-frequency action should cost zero taps of navigation.
2. **Bottom-sheet context menu** on list rows (`…` → actions) — cleaner than inline icon clusters
   on narrow screens; pairs with the soft-delete pattern (W17).
3. **Overflow "More" hub as a bottom sheet** — if CombatOS ever needs a 6th destination, this is
   the escape valve; do not add a 6th bar slot.
4. **Schedule-as-second-view** over checklist data — a later top tab, not v1.
5. Edit-task sheet field set (schedule time, repeat toggle, reminder toggle) is a sensible v1
   scope ceiling for CombatOS checklist tasks; duration/custom-end-time/timezone are beyond v1.

## 7. Explicitly still rejected for CombatOS

- Campus selector (single-program app — nothing to select).
- Chat/Inbox social machinery (single user).
- TRW's navy/gold styling (CombatOS keeps tactical-amber identity — paradigms only, per D3).
