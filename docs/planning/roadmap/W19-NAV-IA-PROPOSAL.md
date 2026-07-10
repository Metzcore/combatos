# W19 — Navigation IA Redesign Proposal (ARCH deliverable, decision D3)
_Written by the Fable 5 architect, 2026-07-10. This is a DESIGN DOC — no code. It resolves decision D3 (nav capacity / layered-nav paradigm) and decides where D4's notepad lives. It requires the developer's sign-off; the "Your decisions" section at the end lists exactly what to approve or overrule._

**Inputs:** `docs/reference/therealworld-app-references/mobile_app_architecture_spec.md` (the TRW/Discord layered paradigm), `docs/reference/therealworld-app-references/checklist_ui_specification.md` (checklist UI reference), the live codebase as of PR #8, and the developer's rulings: adopt PARADIGMS not styling; CombatOS keeps its own tactical-amber identity; 6 flat tabs was tried and felt cluttered.

---

## 1. The proposed skeleton

The bottom nav stays at **5 hubs** — but one slot changes occupant. Playbook stops being a top-level destination and becomes a top tab inside Train; the freed slot goes to the new Notes hub (D4).

| Slot | Hub | Contents (Layer 2 = top tabs / segmented control) |
|---|---|---|
| 1 | **⚔️ TRAIN** | `Workout` (today's HUD, unchanged) · `Playbook` (reference content, overhauled — absorbs W11) |
| 2 | **⏱️ TIMER** | `Basic` · `Rounds` (already a segmented control — becomes the standard top-tab pattern) |
| 3 | **📅 LOG** | `Log` · `Stats` (already shipped in W9 — already matches this paradigm) |
| 4 | **🗒️ NOTES** *(new, D4)* | `Notes` (folders/tags/stars) · later: `Checklist` · later still: `Hermes` (connector, D4's "special tab") |
| 5 | **⚙️ SETTINGS** | Sections as collapsible groups (injury profile from W13 lands here) |

Why this shape:
- **Playbook → inside Train** is the only structural move. Rationale: Playbook is reference material consulted *in the context of training*, not a destination of equal rank with training itself. Two of five current tabs (HUD, Playbook) are really one activity. The merge costs one tap for direct Playbook access and buys a whole nav slot.
- **Notes earns the freed slot** rather than being crammed into Settings or a 6th tab. Capture only works if it's one tap away — a capture tool buried two levels deep won't build the habit, and the 6-tab experiment already failed once.
- **Timer and Log already follow the pattern.** W9's `[Log|Stats]` toggle and Timer's `[Basic|Rounds]` switch are the Layer-2 pattern in embryo. The redesign standardizes what exists rather than inventing something new.

## 2. Adopted / rejected from the TRW specs (explicit, per the D3 ruling)

**Adopted (paradigm):**
- Layered navigation: ≤5 bottom hubs → top tabs within a hub (Layer 3).
- Collapsible sections/accordions for long lists (drives W10's HUD blocks, Settings sections, Playbook groups).
- Bottom sheets for complex in-context interactions — first concrete use: W12's exercise picker (choose-or-add-exercise slides up rather than inline dropdowns); second: Notes' new-note/move-to-folder actions.
- FAB (floating action button) — **scoped to the Notes hub only** ("+ new note"). The HUD's LOG SESSION button stays where it is: logging is the *end* of a workout flow, not a floating quick-action, and a global FAB would cover HUD input fields.
- The checklist spec's group-card/task-row data model (groups → items with icon, schedule, recurrence, streak) as the reference shape for the later Checklist top tab — adapted, not cloned.

**Rejected (with reasons):**
- Discord-style left-column "space selector" — built for many communities/campuses; a single-user app with one program has nothing to put in it. Overkill.
- Chats/Community hub — no users but one. Nothing to build.
- The reference palette (navy/gold), typography, and any visual cloning — per the developer's explicit ruling, CombatOS keeps and develops its own tactical-amber/mil-spec identity.
- Swipe-gestures between top tabs — deferred, not rejected outright: horizontal swipe fights vertical scroll on the HUD's long forms, and tap targets already work. Revisit only if tab-switching ever feels slow in practice.
- Streaks/gamification from the checklist spec — not core to a tool the developer already uses daily; revisit when the Checklist tab is actually built.

## 3. Per-screen verdicts (keep / restyle / rebuild)

| Screen | Verdict | Reasoning |
|---|---|---|
| HUD (workout) | **Restyle** (W10, as scoped) | Battle-tested logic with hard-won state persistence — visual hierarchy + collapsible blocks only; no structural rebuild. |
| Playbook | **Rebuild** (absorbs W11) | Already stale + needs the move into Train. Rebuilding it as a Train top-tab with phase→day→block accordions does W11 and the relocation in one PR. |
| Timer | **Keep** (W15 later) | Works; drag-reorder (W15) is additive. Mode switch formalizes into the standard top-tab component when the shell lands. |
| Log/Stats | **Keep** | W9 just shipped it in the target pattern. |
| Settings | **Restyle, lightly** | Grouped collapsible sections as it accumulates (injury profile W13, saved exercises W12, sync info). |
| DailyIgnition | **Keep, untouched** | Developer: "working well as-is." |
| BottomNav | **Rebuild, small** | 5 buttons stay; Playbook button becomes Notes; add the shared TopTabs component used by Train/Timer/Log/Notes. |

## 4. Sequencing (new/changed roadmap items — gated on your approval of this doc)

- **W20 — Nav shell restructure** (IMPL + REVIEW, diagnostic-first): introduce the shared TopTabs component; move Playbook under Train; put Notes placeholder in slot 4. Smallest possible structural PR — no feature content, everything else untouched. *Prereq for W21; W10 does NOT wait for it.*
- **W21 — Notes hub v1** (IMPL + REVIEW, diagnostic-first): notepad MVP per D4 — folders (create/rename/tag), notes with 5-star importance, edit/delete, FAB, bottom-sheet actions. New Dexie store (schema bump — same care as W12). **Connector-ready by design:** every note carries stable ids + updatedAt + an exportable plain-JSON shape, so the future Hermes top tab is an integration, not a rework. Node-connectors (Miro-like) are explicitly OUT of v1 — they only make sense once real notes exist.
- **W11 → absorbed into the rebuilt Playbook** (runs after W20; its old standalone prompt is superseded).
- **W10, W12–W17 — unaffected**; W12's picker should use the bottom-sheet pattern if W20 has landed by then (else inline, migrate later).

## 5. Your decisions (approve, adjust, or overrule)

1. **Playbook moves inside Train** — the one structural change with a real cost (one extra tap to reach Playbook). Approve?
2. **Slot 4 goes to Notes** (vs. keeping Playbook top-level and deferring Notes until something else frees a slot). Approve?
3. **Hub names/icons** — TRAIN ⚔️ / TIMER ⏱️ / LOG 📅 / NOTES 🗒️ / SETTINGS ⚙️ — naming taste, overrule freely.
4. **FAB scoped to Notes only** (no global floating button). Approve?
5. Anything in the adopted/rejected lists you'd flip.

On sign-off: W20 and W21 get written as diagnostic-first worker prompts in the standard format and enter the roadmap as active items.
