---
name: mobile-interaction-ux
description: Portrait-phone-first interaction judgment for Combat OS UI work. Read before adding or changing any screen, control, sheet, or nav element. The real usage context is one user mid-workout on an installed Android PWA — sweaty hands, phone on the floor or a bench, three-second glances between sets.
---

# Combat OS — Mobile Interaction UX Judgment

Every interaction decision is judged against one scenario: the developer is between sets,
breathing hard, phone at arm's length, thumb only. Desktop rendering is irrelevant
(orientation is portrait-locked in the manifest); the layout truth is the phone.

---

## Design for the worst grip

- Big tap areas, generously padded — a sweaty thumb misses 20px targets.
- One-hand reach: primary actions live toward the bottom of the screen (bottom nav,
  bottom sheets, the pinned quick-add bar). Don't put a must-tap control top-right.
- No hover-dependent or long-press-only affordances. If it matters, it's visibly tappable.
- Fixed bars respect the notch/gesture areas via the existing `--safe-top` /
  `--safe-bottom` env() variables in `index.css`.

## Reuse the existing primitives — don't invent parallel ones

- **`BottomSheet.jsx`** is the app's one modal-ish surface (pickers, action menus,
  import/share flows). Browser `prompt()`/`confirm()` are banned — W22 removed the last
  of them; don't reintroduce.
- **`QuickAddBar.jsx`** is the pinned-input pattern for capture-fast flows.
- Navigation is the 5-slot `BottomNav` + `TopTabs` layer-2 bar (selection state in
  `utils/navState.js`, owned by `AppShell`). New surfaces slot into this paradigm; a
  sixth bottom slot or a second nav idiom is a product decision, not a UI tweak.
- Collapse convention (from the HUD): sections the user acts on now default **open**
  (mobility/strength/cooldown), payload-optional sections default **collapsed**
  (bag/core) with transition-guarded auto-expand. Collapse state is UI-only, lives in
  `DBProvider`, resets per session, and must never leak into the log payload.

## Glanceability

- The tactical-amber token system (`--accent`, `--panel`, `--alert`, `--warn`, badges) is
  the app's identity — new UI uses the existing tokens, never fresh hex values. Paradigms
  may be borrowed from other apps; styling never is.
- Status reads as color + badge, not sentences (the hip-score convention: red ≤ 2,
  amber = 3, green ≥ 4 — keep that meaning stable anywhere it appears).
- The information the user needs *mid-workout* (day focus, next exercise, what's left)
  must be visible without opening anything — e.g. the daily-focus label stays outside
  the collapsible sections.

## Never lose typed input

- Hubs fully unmount on nav switch. Anything typed or running mid-workout survives only
  in `DBProvider` (see `combatos-conventions`, "State placement judgment"). A tab-level
  `useState` holding user input is a bug by construction.
- Editors autosave debounced, with a flush on `visibilitychange` and unmount — a phone
  screen locking mid-entry must never cost a journal paragraph. Never create empty
  records from an abandoned editor.
- Plain text only: rich-text/editor libraries are ruled out (the #1 solo scope trap).
  Inline checklists are tappable `- [ ]` lines; an editor is a screen, not a sheet.

## Verify where it's used

CI proves the code; the phone proves the UX. Any layout/interaction change gets checked
on the developer's Android device in portrait before it counts as done — especially
touch-target size, keyboard overlap with pinned inputs, and safe-area behavior.
