# Intake Schema — the reusable interview template

> **What this is:** the model-agnostic list of what to learn about a person before authoring a
> training cartridge. Hand this (plus the person's answers) to any capable LLM alongside
> [`PROGRAM-CARTRIDGE-SPEC.md`](../planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md) (v2, block model) and
> the [`COACH-PROMPT.md`](COACH-PROMPT.md). It is plain text on purpose — it must work in Claude
> today and a self-hosted model later, with no tooling.
>
> **Provenance:** lifted from the first proven intake (`intake-developer-program.md`), which
> produced two validated cartridges (Foundation + Operator). A third cartridge (Apex Protocol,
> adapted from an existing program rather than a fresh interview) proved the schema generalizes.
> Fields are ordered by how much they shape the program. Version 2 (2026-07-22) — §8 updated for
> the block model's per-item prescription.

---

## How to use it
1. Copy the sections below into a working file for the person.
2. Fill what you know; leave the rest for the coach to interview.
3. Fields marked **[GATES]** must be answered before a cartridge can be authored. Everything else
   the coach can proceed on with stated defaults.

---

## 1. Athlete snapshot
- **Height / weight / age** — anchors load ranges and bodyweight-relative expectations.
- **Physique / body-composition note** — lean, average, returning from a layoff, etc.
- **[GATES] Training age / experience** — years and modalities (weights, calisthenics, sport).
  Beginner vs advanced changes everything about volume and exercise selection.
- **Current benchmarks** — the more the better; each one anchors a prescribed load. Capture what
  they actually do, e.g. squat for reps, press for reps, pull-up max, a conditioning benchmark.
  Note anything they **don't** do by preference (e.g. "no deadlift").

## 2. Identity & goals
- **[GATES] Primary goal / archetype** — what they're training *toward* in their own words
  (e.g. "tactical operator," "first marathon," "general health"). Concrete beats generic.
- **[GATES] Priority ranking** — force a rank of the competing qualities (e.g. relative strength
  > conditioning > explosiveness > hypertrophy). This is how the coach trades off when time is tight.
- **What they are explicitly NOT** — e.g. "not bodybuilding." Rules out whole families of choices.
- **Time horizon / ethos** — "peak for a date" vs "sustainable for decades" changes the whole
  loading strategy (see the RPE/longevity doctrine in the coach prompt).

## 3. Session shape & constraints
- **[GATES] Session length + structure** — total minutes, and the split (warm-up / work / cool-down).
  The *work* window is the real constraint (a 45-min session is often only ~25-30 min of work).
- **Training style preferences** — heavy/fast, high-rep, circuits, etc.
- **Warm-up** — own routine, or coach to program it?
- **Dislikes / refusals** — exercises they won't do; honour these, don't argue.

## 4. Weekly structure
- **[GATES] Default week** — how many of each session type in a typical week (e.g. 3 strength +
  3 sport + 1 pick).
- **How much it flexes** — do real weeks reshuffle? If yes, the coach should favour full-body /
  robustness so a missed day never skips a movement pattern, and the cartridge is authored as a
  suggested order, not a locked rotation (see decision **D10**).
- **What each session type usually is** — the strength days' split, the sport/class formats, what
  a "pick" or "recovery" day becomes.

## 5. Facility & equipment
- **[GATES] What's available** — the real inventory. Note key stations (racks, machines, cables,
  cardio, functional/turf zone, combat area).
- **[GATES] What's NOT available** — explicitly list missing kit (no trap bar, no landmine, no
  boxes, etc.). The coach must never prescribe absent equipment.
- **Layout quirks** — e.g. a jump/turf zone separate from the weights floor makes supersetting
  across zones impractical; note anything that constrains how exercises chain together.
- **Living equipment inventory** — a running list that grows every session. When a prescribed
  exercise has no machine, the person swaps the name in-app; next session that machine gets
  appended here. Over time this becomes the person's real exercise library.

## 6. Recovery resources
- **What's available** — sauna, cold plunge, cryo, massage, etc.
- **Should recovery be a loggable day/session type?** — usually yes; lets a short training week be
  supplemented honestly.

## 7. Injuries, limitations & medical
- **Injury field shape (ruled 2026-07-22):** free text (injuries are too individual for a
  dropdown), **supports multiple entries**, each with an **intensity/severity** note, and a
  **"none currently"** default. The person can also toggle the whole section off.
- **Active medical care** — e.g. under a physio/chiropractor. If cleared to train but rebuilding,
  the coach should program a **corrective/foundation phase** (avoid contraindicated loading;
  prioritise the undertrained stabilisers) before a heavy block.

## 8. Prescription style
- **v2 note:** the cartridge spec no longer fixes one prescription model per program — the coach
  chooses per exercise (RPE/RIR, %1RM, added load, or a plain descriptive note), and can mix
  styles freely within one cartridge. This is a coaching decision made during authoring, not an
  intake answer — most people don't know which style fits which lift.
- **Capture only if the person has a strong preference** (e.g. "I like training to a number,"
  or "I don't want to think about percentages"). Otherwise leave this to the coach.
- **If adapting an existing program** (not a fresh interview — e.g. a sibling's current workout),
  capture whether it already uses %1RM. If so and no tested max is on file, the coach should
  dual-code load as `{ percent, rpe }` rather than blocking on missing data (see COACH-PROMPT
  doctrine #8).

---

## Notes for whoever maintains this schema
- Keep it **field-oriented, not app-oriented** — it describes a person, never a UI.
- A filled intake is the single input that most determines program quality. When program quality
  disappoints, suspect the intake before the coach prompt.
- New fields earn their place only if a real authoring run needed them. Don't pre-add speculative fields.
