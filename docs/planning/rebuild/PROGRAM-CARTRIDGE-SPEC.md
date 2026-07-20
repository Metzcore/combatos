# Program Cartridge Spec — the "hand it to any LLM" file

> **STATUS: PROPOSED / TARGET FORMAT — not yet implemented in the app.** This defines the
> program-definition format the rebuilt Train tab will consume (see `ARCHITECTURE-NORTHSTAR.md`,
> the console+cartridge model). It synthesizes the best of Combat OS and Apex without importing
> either's code. Until Stage 2 of the rebuild ships, treat this as the design target, not a
> live contract.

---

## Purpose

A **cartridge** is one person's complete training program, expressed as a single JSON file the
app renders directly. This spec is written so a non-developer can hand it to any capable LLM and
say: *"Act as a senior strength & conditioning coach. Interview me, then output a cartridge that
conforms to this spec."* The resulting file is assigned to that person's account — no app code
changes, no new deployment.

## Mental model

- The **app** is a universal player. It does not know about any specific program.
- The **cartridge** carries everything program-specific: the days, the exercises, the
  prescription style, the coaching notes.
- Swapping cartridges swaps the entire training experience with zero code changes.

## The prescription model (the one real "science" choice)

Every cartridge declares ONE prescription model. It controls what fields each set prescribes and
what the app asks the user to log. Pick from this closed set:

| `prescription` | Prescribes | User logs | Fits |
|----------------|-----------|-----------|------|
| `percent-1rm`  | % of estimated 1RM (+ target reps) | load (kg) + reps | strength / powerlifting |
| `rpe`          | target RPE or RIR (+ rep range)    | load + reps + RPE | hypertrophy / general |
| `straight-sets`| fixed sets × reps (optional cue weight) | load + reps | beginners / simple |
| `time-distance`| duration or distance               | time / distance   | conditioning / running |
| `bodyweight`   | sets × reps, no external load       | reps (± added load) | calisthenics / home |

New segments (a woman's program, a bodybuilder's, etc.) almost always REUSE one of these — they
differ in exercises, volume, and structure (all data below), not in the prescription model. Do
not invent a new prescription model unless none of the five can express the intent.

## Cartridge JSON structure

```jsonc
{
  "cartridgeId": "kebab-case-unique-id",        // e.g. "combatos-fighter-2026", "hypertrophy-6day"
  "label": "Human-readable program name",
  "description": "One or two sentences on who this is for and the training philosophy.",
  "prescription": "percent-1rm",                 // one of the five models above
  "cycle": {
    "dayCount": 7,                               // days in one rotation (commonly 6 or 7)
    "weeksPerBlock": 8,                           // optional: length of a training block/phase
    "blocks": [                                   // optional: named phases/mesocycles
      { "id": "phase1", "label": "Phase 1 — Foundation" }
    ]
  },
  "days": [
    {
      "day": 1,
      "label": "Day 1",
      "type": "training",                        // training | rest | recovery | custom
      "focus": "Lower Body — Squat & Vertical Power",
      "warmup": [                                 // optional, free-text lines
        "3 min easy bike or row",
        "Hip 90/90 — 60s each side"
      ],
      "exercises": [                              // omit/empty for rest & recovery days
        {
          "id": "d1-ex1",                         // unique within the cartridge
          "name": "Barbell Back Squat",
          "target": "Quads / Glutes",             // muscle group or quality trained
          "superset": null,                       // null, or a label like "A" to group back-to-back
          "sets": 4,
          "reps": "5",                            // string — allows ranges like "10-12" or "8 each side"
          "prescription": { "percent": 0.80 },    // shape DEPENDS on the model (see below)
          "cue": "Brace hard. Knees track toes. Drive the floor away."
        }
      ]
    },
    { "day": 2, "label": "Day 2", "type": "rest", "focus": "Rest & Recovery" }
  ],
  "features": {                                    // optional domain widgets, all default OFF
    "hipScoreRouting": false,                     // injury-aware exercise variants
    "bagWork": false                              // combat/bag block
  }
}
```

### The per-exercise `prescription` object (varies by model)

- `percent-1rm`: `{ "percent": 0.80 }` — fraction of estimated 1RM.
- `rpe`: `{ "rpe": 8 }` or `{ "rir": 2 }` — target effort.
- `straight-sets`: `{}` or `{ "suggestedLoad": "bodyweight" }` — sets/reps carry the prescription.
- `time-distance`: `{ "duration": "30s" }` or `{ "distance": "400m" }`.
- `bodyweight`: `{}` or `{ "addedLoad": "10kg" }`.

## Day types

- `training` — has `exercises[]`; the app renders and logs a full session.
- `rest` — no exercises; the app shows a rest card and logs a one-tap "rest day done".
- `recovery` — no exercises; active-recovery guidance card + one-tap log.
- `custom` — free-form (cardio / open gym / skills); the app logs free-text + optional duration.

## Validation rules (a valid cartridge)

1. `cartridgeId`, `label`, and `prescription` are present; `prescription` is one of the five.
2. `days[]` covers `1..cycle.dayCount` with no gaps and no duplicates.
3. Every `training` day has ≥1 exercise; `rest`/`recovery` days have none.
4. Exercise `id`s are unique within the cartridge.
5. `superset` labels group ≥2 exercises when used.
6. Each exercise's `prescription` object matches the cartridge's declared model.
7. Any `features` referenced are known flags (currently `hipScoreRouting`, `bagWork`).

## Instructions for the authoring LLM

1. Adopt the role of a senior S&C + performance-nutrition coach. Interview the person: goals,
   training age, days/week available, equipment, injuries, preferences.
2. Choose the single most appropriate `prescription` model from the five. State why.
3. Design the cycle and days, then output ONE JSON cartridge conforming exactly to the structure
   and validation rules above. Output ONLY the JSON (plus a short plain-English summary of the
   program rationale separately).
4. Do NOT write or modify any app code, deployment config, or database. The cartridge is data;
   a developer/agent assigns it to the person's account separately.
5. When unsure, prefer the simplest model that fits (`straight-sets` over `rpe` over
   `percent-1rm`) and leave a note for the developer rather than inventing new fields.

## Worked example (neutral — a simple 3-day straight-sets beginner program)

```jsonc
{
  "cartridgeId": "beginner-full-body-3day",
  "label": "Beginner Full-Body 3×/Week",
  "description": "General fitness for a new trainee: three full-body days, fixed sets and reps.",
  "prescription": "straight-sets",
  "cycle": { "dayCount": 7 },
  "days": [
    {
      "day": 1, "label": "Day 1", "type": "training", "focus": "Full Body A",
      "warmup": ["5 min brisk walk", "Bodyweight squats — 2x10"],
      "exercises": [
        { "id": "d1-ex1", "name": "Goblet Squat", "target": "Legs", "superset": null,
          "sets": 3, "reps": "10", "prescription": {}, "cue": "Chest up, sit between the hips." },
        { "id": "d1-ex2", "name": "Dumbbell Bench Press", "target": "Chest", "superset": null,
          "sets": 3, "reps": "10", "prescription": {}, "cue": "Control the weight down." }
      ]
    },
    { "day": 2, "label": "Day 2", "type": "rest", "focus": "Rest" },
    { "day": 3, "label": "Day 3", "type": "training", "focus": "Full Body B",
      "warmup": ["5 min bike"], "exercises": [
        { "id": "d3-ex1", "name": "Romanian Deadlift", "target": "Hamstrings", "superset": null,
          "sets": 3, "reps": "10", "prescription": {}, "cue": "Hinge at the hips, flat back." }
      ] },
    { "day": 4, "label": "Day 4", "type": "rest", "focus": "Rest" },
    { "day": 5, "label": "Day 5", "type": "training", "focus": "Full Body C",
      "warmup": ["5 min row"], "exercises": [
        { "id": "d5-ex1", "name": "Lat Pulldown", "target": "Back", "superset": null,
          "sets": 3, "reps": "12", "prescription": {}, "cue": "Pull to the collarbone." }
      ] },
    { "day": 6, "label": "Day 6", "type": "rest", "focus": "Rest" },
    { "day": 7, "label": "Day 7", "type": "recovery", "focus": "Active Recovery" }
  ],
  "features": { "hipScoreRouting": false, "bagWork": false }
}
```
