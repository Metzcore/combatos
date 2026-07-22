# Block Model — cartridge schema v2 (DRAFT, for ratification)

> **Status: DRAFT — the first step of the "one composable engine" direction (agreed 2026-07-22).**
> Supersedes the flat-exercise shape in `PROGRAM-CARTRIDGE-SPEC.md` once ratified. This draft is
> designed *backwards from the hardest real case* (Apex legacy `playbook.csv` P1-D1) so we can see
> it hold before propagating it to the cartridges, the validator, and the authoring kit.

---

## The core idea

A training day is not a flat list of exercises — it's an **ordered list of blocks**, and each block
has a **`kind`** that decides its item shape and (later) its render widget:

```
cartridge → days[] → day.blocks[] → block.kind + block.items[]
```

- A **generalist** cartridge = one or two blocks (e.g. a single `strength` block). The thin format
  I built this session becomes the *degenerate case* — nothing is lost.
- A **combat** cartridge = many block kinds (mobility + strength + conditioning + cooldown).
- **Segments are curation, not code:** a "segment" is a curated bundle of block kinds + a theme.
  Same engine renders all of them.

**Why this shape:** each `kind` carries exactly the fields it needs. Mobility doesn't carry
`prescription`; bag rounds don't carry `sets`; strength can carry a PAP `pair`. No global
exercise shape to pollute, and adding a capability = adding a `kind` + a widget, never a rewrite.

## Seed block kinds (derived from the two real programs — not invented)

| `kind` | Item shape (fields) | Serves |
|--------|--------------------|--------|
| `mobility` | name · dose (free text) · note · cue | warm-up / prep / rehab holds |
| `strength` | name · target · sets · reps · `prescription{}` (optional) · `pair{}` (optional PAP) · `superset` (optional) · cue | loaded work |
| `conditioning` | name · rounds · roundLength · rest · `perRound[]` · cue | bag work, intervals, circuits |
| `cooldown` | name · dose · note · cue | stretches / decompress |
| `core` | name · sets · reps · cue | trunk / accessory (your Combat OS `CoreBlock`) |

New kinds earn their place from a real program, the same rule as the intake schema. `skill`,
`recovery-studio`, etc. slot in later with zero schema churn.

## How this resolves all four original gaps

- **Block taxonomy** → the blocks array itself (generic `kind`, not a fight-locked enum). ✅
- **PAP pairing** → an optional `pair{ name, sets, reps, note }` on a strength item — first-class,
  scoped inside `strength`, invisible to every other kind. ✅
- **Round-by-round bag** → the `conditioning` kind's `rounds` + `perRound[]`. ✅
- **The single-prescription collision dissolves** → `prescription` lives per **strength item**
  (optional); mobility/conditioning/cooldown are descriptive and never touch it. A cartridge may
  declare a default strength model; items may override. ✅
- **HIGH_ALERT variants** → natural home is a block-level `variant` (STANDARD vs an alternate item
  set), but the *runtime switching* needs a tracked state input = the unbuilt **W13 injury/mobility
  profile**. **Parked** — author STANDARD now; the schema leaves the seam.

---

## PROOF — Apex legacy `playbook.csv` P1-D1, expressed in the block model

(Abbreviated items where the pattern repeats; the point is that every distinct structure has a home.)

```jsonc
{
  "day": 1,
  "label": "Day 1",
  "focus": "Lower Body — Squat & Vertical Power",
  "blocks": [
    {
      "kind": "mobility",
      "label": "Mobility & Prep",
      "items": [
        { "id": "d1-mob-1", "name": "90/90 Hip Internal/External Rotation",
          "dose": "2x60s each side", "note": "RIGHT side priority",
          "cue": "Breathe into the position, find end range" },
        { "id": "d1-mob-2", "name": "Supine Figure-4 Piriformis",
          "dose": "2x45s each side", "cue": "Cross ankle over knee, flex foot, gentle pressure" },
        { "id": "d1-mob-3", "name": "Half-Kneeling Hip Flexor + PPT",
          "dose": "2x45s each side", "note": "RIGHT side priority",
          "cue": "Squeeze glute, tuck pelvis — actively stretch psoas" }
        // HIGH_ALERT variant (5 alternate items) attaches here later via block.variant + W13
      ]
    },
    {
      "kind": "strength",
      "label": "Strength",
      "prescription": "percent-1rm",           // block-level default model
      "items": [
        { "id": "d1-str-1", "name": "Barbell Back Squat", "target": "Quads / Glutes",
          "sets": 4, "reps": "4-5", "prescription": { "percent": 0.80 },
          "pair": { "name": "Box Jump", "sets": 4, "reps": "3", "note": "PAP — full reset between reps" },
          "cue": "Controlled 3s descent, drive through heels, full depth" },
        { "id": "d1-str-2", "name": "Romanian Deadlift", "target": "Hamstrings / Glutes",
          "sets": 3, "reps": "8", "prescription": { "note": "Moderate — feel the hamstring" },
          "pair": { "name": "Broad Jump", "sets": 3, "reps": "3" },
          "cue": "Neutral spine, hip hinge, stretch at bottom" },
        { "id": "d1-str-3", "name": "Barbell Hip Thrust", "target": "Glutes",
          "sets": 3, "reps": "10", "prescription": { "note": "Full glute squeeze, 2s hold" },
          "cue": "Drive hips to ceiling, squeeze hard at top — reciprocal inhibition work" }
      ]
    },
    {
      "kind": "conditioning",
      "label": "Bag Work",
      "items": [
        { "id": "d1-bag-1", "name": "Jab-Cross Foundation",
          "rounds": 6, "roundLength": "3 min", "rest": "60s",
          "perRound": [
            "R1: Technical Jab-Cross", "R2: Jab-Cross-Hook", "R3: Double Jab-Cross",
            "R4: + Step Out", "R5: Speed Round", "R6: Power Round"
          ],
          "cue": "Stay loose. Snap the jab, rotate the hip into the cross." }
      ]
    },
    {
      "kind": "cooldown",
      "label": "Cooldown",
      "items": [
        { "id": "d1-clr-1", "name": "Pigeon Pose (Deep)", "dose": "3x90s each side",
          "note": "RIGHT hip: 3 sets, LEFT: 2", "cue": "Breathe deep, melt into the floor" },
        { "id": "d1-clr-2", "name": "Couch Stretch (Psoas/Quad)", "dose": "2x60s each side",
          "note": "RIGHT side priority", "cue": "Posterior pelvic tilt throughout" },
        { "id": "d1-clr-3", "name": "Butterfly Adductor Stretch", "dose": "2x60s",
          "cue": "Elbows press knees gently, lean chest toward feet" },
        { "id": "d1-clr-4", "name": "QL Side Bend (Standing)", "dose": "2x45s each side",
          "cue": "Arm overhead, reach across — thoracic side flexion" }
      ]
    }
  ]
}
```

**Verdict:** every distinct structure in Apex's richest day has a clean, non-awkward home. PAP,
rounds, mobility doses, and the multi-modal prescription mix all fit without a single hack. The
only thing not fully modelled is HIGH_ALERT's *runtime* — and its data seam (`block.variant`) is
identified and deliberately parked on W13.

---

## What ratifying this triggers (the ripple, in order)
1. **This proof reviewed** ← we are here.
2. Re-express the full programs as block cartridges (Apex P1 + your Foundation/Operator) = the
   real validation.
3. Rework `validateCartridge()` + tests for the block model (per-item optional prescription, kinds).
4. Promote this draft into `PROGRAM-CARTRIDGE-SPEC.md` v2 and update the authoring kit
   (INTAKE-SCHEMA / COACH-PROMPT / REVIEWER-CHECKLIST) to author *blocks*.
5. Renderer = a block-widget registry (deferred to the Train-tab build; themeable per segment).
