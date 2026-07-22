# Program Cartridge Spec — the "hand it to any LLM" file

> **STATUS: v2 — DESIGN PROVEN, NOT YET RENDERED.** This defines the program-definition format the
> rebuilt Train tab will consume (see `ARCHITECTURE-NORTHSTAR.md`, the console+cartridge model).
> **v2 (2026-07-22) replaces the flat-exercise v1 with a block-composable model** — see
> "Revision history" at the bottom for why. The format itself is now proven: three real cartridges
> (`cartridges/combatos-foundation-2026.json`, `combatos-operator-2026.json`,
> `apex-protocol-phase1.json`) validate clean against it, and `app/src/utils/validateCartridge.js`
> implements every rule below in tested code. What's still missing is the **renderer** — the Train
> tab does not consume this format yet. Treat the JSON shape as locked; treat "how it looks in the
> app" as open.

---

## Purpose

A **cartridge** is one person's complete training program, expressed as a single JSON file the
app renders directly. This spec is written so a non-developer can hand it to any capable LLM and
say: *"Act as a senior strength & conditioning coach. Interview me, then output a cartridge that
conforms to this spec."* The resulting file is assigned to that person's account — no app code
changes, no new deployment.

## Mental model

- The **app** is a universal player. It does not know about any specific program.
- The **cartridge** carries everything program-specific: the days, the blocks, the exercises, the
  prescription style, the coaching notes.
- Swapping cartridges swaps the entire training experience with zero code changes.
- A training journey is usually a **sequence of cartridges** (phases) — e.g. Foundation → Strength
  → Peak. Author one phase per cartridge; each should name what the athlete graduates to next.

## Cartridge types (a person gets a BUNDLE)

Every cartridge has a `type`. A person's program is a **bundle** of one or more cartridges:

- **`training`** — a workout program (days → blocks → items). Drives the Train hub. This is the
  main body of this spec.
- **`content`** — theory / educational / quick-consumption material (sections → items). Renders
  in its own hub or a "More" entry. Sold/shipped independently of the training cartridge.

Most of this document specifies the `training` type. The `content` type is intentionally minimal
for now (the content strategy is undeveloped) — see "Content cartridge" near the end. It is
unaffected by the v2 block-model change.

## The block model (v2 core)

A training day is not a flat list of exercises — it's an **ordered list of blocks**, and each
block has a **`kind`** that decides its item shape:

```
cartridge → days[] → day.blocks[] → block.kind + block.items[]
```

**Why:** real programs are block-structured (mobility → strength → conditioning → cooldown), and
prescription style varies *within* a day (a lift wants RPE/%1RM; a mobility hold wants a time
dose; a bag round wants round structure). A single flat exercise list with one prescription model
per cartridge could not express either — v1 tried, and broke on the first genuinely multi-modal
day.

A **generalist** cartridge is the natural degenerate case — one block, e.g. a single `strength`
block per training day. Nothing about the simple case gets harder; the rich case just becomes
possible.

### Seed block kinds

New kinds are added only when a real program needs one — the same rule as everything else in this
authoring system. Do not invent a kind speculatively.

| `kind` | Item shape | Serves |
|--------|-----------|--------|
| `mobility` | `name` · `dose` (free text, e.g. `"2x60s each side"`) · `note`? · `cue`? | warm-up / prep / rehab holds |
| `strength` | `name` · `target`? · `sets` · `reps` · `prescription`? (free object) · `pair`? (PAP) · `superset`? · `cue`? | loaded work |
| `conditioning` | `name` · `rounds` (number) · `roundLength`? · `rest`? · `perRound`? (array) · `cue`? | bag work, intervals, circuits, yoga flows — the generic conditioning umbrella |
| `cooldown` | `name` · `dose` · `note`? · `cue`? | stretches / decompress |
| `core` | `name` · `sets` · `reps` · `prescription`? · `cue`? | trunk / accessory work |

- **`prescription` is per strength/core ITEM, not per cartridge, and is optional.** When present
  it's a free object — `{ percent }`, `{ rpe }`, `{ rir }`, `{ addedLoad }`, `{ note }`, or any
  combination (e.g. `{ percent: 0.8, rpe: 8 }` to dual-code a %1RM lift with an RPE anchor when no
  tested max exists yet). There is no fixed enum of "the five models" anymore — a cartridge is
  free to mix styles across items, which is how real multi-modal programs actually work.
- **`pair`** on a strength/core item encodes PAP (post-activation potentiation) — a paired
  explosive movement logged alongside the main lift: `{ name, sets, reps, note? }`. This is
  distinct from `superset` (equipment-sharing / back-to-back grouping).
- **`superset`** groups ≥2 items with a shared label (e.g. `"A"`), same meaning as v1.

### Deliberately NOT modelled (parked, not forgotten)

- **State-conditional content** (e.g. an alternate mobility routine for an injury-flare day, seen
  in real programs as a `STANDARD` vs `HIGH_ALERT` variant). This needs a tracked state input the
  app doesn't have yet (Combat OS roadmap item **W13**, the injury/mobility profile). Author the
  standard content only; do not invent a schema field for this until W13 exists to drive it.
- **A dedicated per-round schema** beyond `perRound: string[]`. If free-text rounds prove clunky
  once a renderer exists, a structured per-round shape can be added additively then — not before.

## Cartridge JSON structure

```jsonc
{
  "cartridgeId": "kebab-case-unique-id",        // e.g. "combatos-operator-2026", "apex-protocol-phase1"
  "type": "training",                            // "training" | "content" (see Cartridge types)
  "label": "Human-readable program name",
  "description": "Who this is for, the philosophy, and (if part of a sequence) the next phase.",
  "cycle": {
    "dayCount": 7,                               // days in one rotation (commonly 6 or 7)
    "weeksPerBlock": 4,                           // optional: length of this phase/mesocycle
    "blocks": [                                   // optional: named phases (cycle-level, NOT day-level blocks)
      { "id": "phase1", "label": "Phase 1 — Foundation" }
    ]
  },
  "days": [
    {
      "day": 1,
      "label": "Day 1",
      "type": "training",                        // training | rest | recovery | custom
      "focus": "Lower Body — Squat & Vertical Power",
      "blocks": [                                 // omit/empty for rest/recovery; custom days need none
        {
          "kind": "mobility",
          "label": "Mobility & Prep",             // optional display label
          "items": [
            { "id": "d1-mob-1", "name": "90/90 Hip Internal/External Rotation",
              "dose": "2x60s each side", "note": "RIGHT side priority",
              "cue": "Breathe into the position, find end range." }
          ]
        },
        {
          "kind": "strength",
          "label": "Strength",
          "items": [
            {
              "id": "d1-str-1",
              "name": "Barbell Back Squat",
              "target": "Quads / Glutes",
              "sets": 4,
              "reps": "4-5",
              "prescription": { "percent": 0.80, "rpe": 8 },
              "pair": { "name": "Box Jump", "sets": 4, "reps": "3", "note": "Full reset between reps." },
              "superset": null,
              "cue": "Controlled 3s descent, drive through heels, full depth."
            }
          ]
        },
        {
          "kind": "conditioning",
          "label": "Bag Work",
          "items": [
            {
              "id": "d1-bag-1",
              "name": "Jab-Cross Foundation",
              "rounds": 6,
              "roundLength": "3 min",
              "rest": "60s",
              "perRound": ["R1: Technical Jab-Cross", "R2: Jab-Cross-Hook", "R6: Power Round"],
              "cue": "Stay loose. Snap the jab, rotate the hip into the cross."
            }
          ]
        }
      ]
    },
    { "day": 2, "label": "Day 2", "type": "rest", "focus": "Rest & Recovery" }
  ],
  "features": {                                    // optional domain widgets, all default OFF
    "hipScoreRouting": false,                     // injury-aware exercise variants
    "bagWork": false                              // combat/bag block present
  }
}
```

Note: `cycle.blocks` (named phases, e.g. `"phase1"`) is unrelated to `day.blocks` (mobility/
strength/etc. inside a day) — same word, different level. Keep this straight when authoring.

## Day types

- `training` — has `blocks[]`; the app renders and logs a full session.
- `rest` — no blocks; the app shows a rest card and logs a one-tap "rest day done".
- `recovery` — no blocks; active-recovery guidance card + one-tap log.
- `custom` — free-form (fight classes / cardio / open gym / skills); no blocks required, the app
  logs free-text + optional duration. This is also how fight/class days are represented today —
  they don't need block structure, just a `focus` line and free-text logging.

## Validation rules (a structurally valid `training` cartridge)

These are implemented in tested code at `app/src/utils/validateCartridge.js` (Part A of
`docs/authoring/REVIEWER-CHECKLIST.md`) — treat that module as the executable source of truth if
this list and the code ever drift.

1. `cartridgeId` and `label` are present.
2. `cycle.dayCount` is a positive number.
3. `days[]` covers `1..cycle.dayCount` with no gaps, no duplicates, none out of range.
4. Each day's `type` is one of `training` · `rest` · `recovery` · `custom`.
5. A `training` day has ≥1 block; `rest`/`recovery` days have none; `custom` needs none.
6. Every block has a known `kind` (see the seed table) and ≥1 item.
7. Every item has an `id` (unique across the WHOLE cartridge, not just its block) and a `name`.
8. Kind-specific item requirements:
   - `mobility` / `cooldown`: requires `dose`.
   - `strength` / `core`: requires `sets` and `reps`; `prescription` (if present) must be an
     object; `pair` (if present) must be an object with a `name`.
   - `conditioning`: requires a numeric `rounds`; `perRound` (if present) must be an array.
9. `superset` labels, where used, group ≥2 items.
10. Any `features` referenced are known flags (currently `hipScoreRouting`, `bagWork`).

## Instructions for the authoring LLM

1. Adopt the role of a senior S&C + performance coach. Interview the person: goals, training age,
   days/week available, equipment, injuries, preferences (see `docs/authoring/INTAKE-SCHEMA.md`).
2. Design each training day as an ordered sequence of blocks — pick the kinds the day actually
   needs (a simple program may need only `strength`; a combat day may need all five). Don't add a
   block kind the person's program doesn't call for.
3. Choose prescription per strength/core item, not once for the whole cartridge. Prefer the
   simplest expression that fits (a plain `{ rpe }` over inventing structure). Use `{ percent,
   rpe }` together when the program is %1RM-based but no tested max exists yet.
4. Output ONE JSON cartridge conforming exactly to the structure and validation rules above.
   Output ONLY the JSON (plus a short plain-English summary of the rationale separately).
5. Do NOT write or modify any app code, deployment config, or database. The cartridge is data; a
   developer/agent assigns it to the person's account separately.
6. When unsure, prefer the simpler, more proven option and leave a note for the developer rather
   than inventing new fields or block kinds.

## Worked example (neutral — a simple 3-day straight-sets beginner program)

A generalist program is the block model's degenerate case: one `strength` block per training day,
descriptive (no `prescription`) since a beginner isn't yet training to RPE or %1RM.

```jsonc
{
  "cartridgeId": "beginner-full-body-3day",
  "label": "Beginner Full-Body 3×/Week",
  "description": "General fitness for a new trainee: three full-body days, fixed sets and reps.",
  "cycle": { "dayCount": 7 },
  "days": [
    {
      "day": 1, "label": "Day 1", "type": "training", "focus": "Full Body A",
      "blocks": [
        {
          "kind": "mobility", "label": "Warm-up",
          "items": [{ "id": "d1-mob-1", "name": "Brisk walk + bodyweight squats", "dose": "5 min + 2x10" }]
        },
        {
          "kind": "strength", "label": "Strength",
          "items": [
            { "id": "d1-str-1", "name": "Goblet Squat", "target": "Legs", "sets": 3, "reps": "10",
              "cue": "Chest up, sit between the hips." },
            { "id": "d1-str-2", "name": "Dumbbell Bench Press", "target": "Chest", "sets": 3, "reps": "10",
              "cue": "Control the weight down." }
          ]
        }
      ]
    },
    { "day": 2, "label": "Day 2", "type": "rest", "focus": "Rest" },
    {
      "day": 3, "label": "Day 3", "type": "training", "focus": "Full Body B",
      "blocks": [
        {
          "kind": "strength", "label": "Strength",
          "items": [{ "id": "d3-str-1", "name": "Romanian Deadlift", "target": "Hamstrings", "sets": 3, "reps": "10",
            "cue": "Hinge at the hips, flat back." }]
        }
      ]
    },
    { "day": 4, "label": "Day 4", "type": "rest", "focus": "Rest" },
    {
      "day": 5, "label": "Day 5", "type": "training", "focus": "Full Body C",
      "blocks": [
        {
          "kind": "strength", "label": "Strength",
          "items": [{ "id": "d5-str-1", "name": "Lat Pulldown", "target": "Back", "sets": 3, "reps": "12",
            "cue": "Pull to the collarbone." }]
        }
      ]
    },
    { "day": 6, "label": "Day 6", "type": "rest", "focus": "Rest" },
    { "day": 7, "label": "Day 7", "type": "recovery", "focus": "Active Recovery" }
  ],
  "features": { "hipScoreRouting": false, "bagWork": false }
}
```

## Content cartridge (`type: "content"`) — minimal, provisional

Content cartridges carry theory / educational / quick-consumption material (the Apex "theory" tab
is the first example). The content strategy is undeveloped, so this shape is intentionally
minimal and WILL evolve — treat it as a placeholder, not a finished contract. Unaffected by the
v2 block-model change (blocks are a `training`-cartridge concept only).

```jsonc
{
  "cartridgeId": "apex-theory-v1",
  "type": "content",
  "label": "Theory",
  "description": "Quick-consumption training & mindset material.",
  "sections": [
    {
      "id": "sec1",
      "title": "Principles",
      "items": [
        { "id": "i1", "title": "Progressive Overload", "body": "Plain-text or lightweight markdown." },
        { "id": "i2", "title": "Recovery Basics", "body": "..." }
      ]
    }
  ]
}
```

Rules: `type: "content"`, unique `cartridgeId`, ≥1 section, each section ≥1 item, unique ids.
No blocks, no days. Media (images/video) is explicitly OUT of scope for v1 (text only), mirroring
the Notes editor plain-text ruling; revisit when the content strategy is defined.

---

## Revision history

- **v2 (2026-07-22):** replaced the flat `exercises[]` + single-cartridge-wide `prescription`
  model with the block-composable model above. Trigger: authoring a second real program (Apex
  Protocol) surfaced that Combat OS's own legacy `playbook.csv` already used a block taxonomy
  (mobility/strength/bag/cooldown, PAP pairing, round-structured bag work) that v1 had dropped —
  v1 underserved BOTH real users, not just the new one. See
  `docs/planning/rebuild/BLOCK-MODEL-DRAFT.md` for the design proof (hand-checked against Apex's
  richest real day before any code changed) and `docs/decision_log.md` (2026-07-22) for the full
  reasoning. Proven against three real cartridges before promotion to this spec.
- **v1 (2026-07-21):** initial spec — flat `exercises[]`, one `prescription` model per cartridge
  (five-model closed set). Superseded by v2; kept no record here at the time (this history section
  added retroactively during the v2 promotion).
