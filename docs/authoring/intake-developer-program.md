# Intake — Developer's Combat OS Program (Cartridge #1)

> **What this is:** the authoring intake for your first live cartridge. I pre-filled everything
> you told me on 2026-07-21. **Fill the lines marked `FILL →`** and correct anything I got wrong,
> then hand it back and I'll author the cartridge JSON against
> [`PROGRAM-CARTRIDGE-SPEC.md`](../planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md).
>
> This file also doubles as the first real test of the reusable intake schema — once it's proven
> on your fill, its structure gets lifted into `docs/authoring/INTAKE-SCHEMA.md` (the kit template).

---

## 1. Athlete snapshot
- **Height:** 167–168 cm
- **Weight:** 67 kg
- **Physique:** lean, visible abs
- **Age:** `30`
- **Training age / experience:** `10 years weights, 6 years calisthenics, 4 years boxing and kickboxing `
- **Current benchmarks** (these anchor prescribed loads — the more the better):
  - Pull-ups: **20 strict, unbroken**
  - Weighted pull-up: **6 clean @ +20 kg**
  - Back squat: **3×6 @ 80 kg** (60 kg + 20 kg bar), perfect technique, 2 min rest
  - Deadlift: **not performed** (by preference)
  - Press / push benchmark (bench, OHP, etc.): `bench press: 60 kg+ 20kg bar - 3 reps max; OHP 20kg +20g  bar max 3 sets 8 reps each`
  - Conditioning benchmark (bag rounds, run time, etc.): `12 rounds 3minutes a round 1 min rest between each round`
  - Anything else worth anchoring: `FILL →push ups max in one set 30, i like to work in the bag following courses from trainers ive bought, or make my own. i emphasise long term body sustainability. the goal is to preserve myself at a realistically high level of performance. smart, long term approach.`

## 2. Identity & goals
- **Archetype:** tactical operator — "James Bond / Bruce Lee / Tyson / Zambidis." Agile, mobile,
  fast, explosive, superior **relative** strength, lean, balanced, technique, punch power, timing.
- **Explicitly NOT:** bodybuilding / mass focus.
- **Standing goal:** i emphasise long term body sustainability. the goal is to preserve myself at a realistically high level of performance. smart, long term approach. yet maintain near-fight condition year-round (one fight so far; none scheduled).
- **Priority ranking** (optional — helps the coach trade off when time is tight): `relative strength > conditioning/fighting skills > explosiveness > hypertrophy`
  

## 3. Session shape & preferences
- **Length:** ~45 min (10 min warm-up · ~30 min work · 5–10 min cool-down)
- **Style:** relatively fast, heavy lifts; explosive
- **Finishers:** sometimes abs or bag rounds (now have a proper bag section)
- **Warm-up preference:** `Own routine, takes 10 min` (fixed routine you like, or coach's choice each day?)
- **Dislikes / refuses:**  · `nothing so far, only limited by equipment` 

## 4. Weekly structure  ⟵ key design input (this is the spec fork)
**Default 7-day week you described:**
- 3 × Strength & Conditioning days
- 3 × Fight sessions / UFC-gym classes
- 1 × Pick day (your choice)

> **Note (design):** this is a **default, not a fixed rotation.** Real weeks flex (e.g. 2 S&C +
> 4 fight, or reshuffled by life) and you still want to log whatever you actually did. We'll rule
> on how the cartridge models this (pool + suggested week vs fixed rotation) when authoring.

- **Preferred default order, if any:** `do not label by days, rather kee doing numbers., so day 1, day 2, etc. ` (e.g. Mon S&C · Tue Fight · Wed S&C · …)
- **The 3 S&C days — same session repeated, or 3 different focuses?** `this is where the science comes in. my specic focus is been descirbed above. so that means, that this is where the cartridges have to make sense science backed. The current playbook for cobatos was developed by a smimilar questionnaire, and me braindumping what i like. thats how we ended up with supersets. but turns out that right notw this gym setting doesnt fit supersettings type of workouts. except for things that are in the astro such as slamming bags, slamming balls, combat ropes, that thing you drag, assault bikes, rowers, ski-ergs. the all conventional equipment, some others more advanced such as standing calf machine, a nice ab machine, a lower back machine, they dont have belt with a chain so id hav to buy one. same for the landmine attachment i might have to buy one so for now those exercises can be skipped. i dont know how to train for fight sports with conventional equipment. whats the science of it, dont know. yet i like to look symetrical tho. as long as the muscle group is worked in a balanced way the symetry will come.`

- **Fight days — which classes / formats?** `Keep as it is, because i can leave in notesn and the way its constructed works for me at least, but if UX wise theres something that can be improved im happy to implement`

- **Pick day — what does it usually become?** `recovery, but now that ufc gym has classes, it could be a class such as a yoga class. or a recovery studio session`

## 5. Facility & equipment — UFC Gym Dublin 1 (Championship membership, unlimited)
**Available:**
- Modern, new commercial machines (full set)
- Proper heavy-bag section
- Unlimited classes
- 5 min from home (distance is a win)

**NOT available** (vs your old gym — the coach must avoid prescribing these):
- ✗ No dip station
- ✗ No trap bar
- ✗ No landmine attachment
- ✗ No plyo boxes
- ✗ No yoga / stability ball
- ⚠ Jump / "astro" turf area is **separate** from the weights floor (so plyo + lifting inside one
  45-min block is awkward — coach should account for this)

**Machine / equipment inventory — LIVING LIST (grows every session):**
> When a prescribed exercise has no machine, you swap the name in-app; next session tell me the
> machine and I append it here. Over time this becomes your gym's real exercise library.
>
> **Confirmed corrections (2026-07-22):** (1) No hip-thrust setup — but a **single-leg glute
> machine** (elbows supported, grab handles) is present and preferred; used as the posterior-chain
> anchor in both cartridges. (2) Face-pull / rear-delt / cuff area flagged as a personal weak point
> to prioritise. (3) Chiropractic spinal adjustments in progress (cleared to train) → Phase-1
> Foundation block avoids heavy axial barbell loading.
- `Here is the complete, consolidated inventory combining all your gym photos.
```markdown
# Gym Equipment Inventory (UFC Gym)

## 1. Cardio & Endurance
* **Treadmills** (BH Fitness / Movemia Series - bank of 10+ units)
* **Elliptical / Cross Trainers**
* **Indoor Upright Exercise Bikes**
* **Air / Fan Bikes**
* **Stair Climbers / Stepmasters**
* **Rowing Machines** (Concept2 / BH Fitness RowErgs)

---

## 2. Free Weights & Racks
* **Power Racks / Half Racks** (equipped with Olympic barbells, pull-up handles, and plate storage)
* **Olympic Lifting & Deadlift Platforms** (integrated wooden platform floors)
* **Olympic Flat Bench Press Stations**
* **Adjustable & Flat Benches**
* **Dumbbell Rack & Set**
* **Olympic Barbells & Weight Plates** (bumper plates and cast iron plates)

---

## 3. Selectorized / Pin-Loaded Cable Machines
* **Multi-Station Cable Jungle / Crossover Tower:**
  * High-to-Low Adjustable Cable Pulley Columns
  * Lat Pulldown Stations
  * Seated Cable Row Stations
  * Multi-Grip Pull-Up Bars
* **Seated Abdominal / Torso Machine** (BH Fitness S10 Series)
* **Seated Leg Press Machine** (Pin-Loaded)
* **Seated Leg Extension Machine**
* **Seated / Prone Leg Curl Machine**
* **Seated Cable Fly / Rear Delt Machine**
* **Chest Press & Shoulder Press Pin-Loaded Machines**

---

## 4. Plate-Loaded Strength Machines
* **45-Degree Incline Leg Press** (BH Fitness PL700)
* **Incline Chest Press** (BH Fitness PL Series)
* **Declined / Flat Chest Press** (BH Fitness PL Series)
* **Seated Row / High Row Machine** (Plate-Loaded)
* **Lat Pulldown Machine** (Plate-Loaded)
* **Shoulder Press Machine** (Plate-Loaded)

---

## 5. Functional Training & Conditioning (D.U.T. Zone)
* **Sled / Turf Track Area**
* **Weight Sled / Prowler**
* **Battle Ropes**
* **Slam Balls & Medicine Balls**
* **Agility Ladders & Floor Markings**

---

## 6. Combat Sports & Martial Arts Area
* **Heavy Boxing / Punching Bags** (hanging rig)
* **Teardrop / Wrecking Bags & Wall Pads**
* **Padded Tatami Mat Area** (BJJ, wrestling, and floor work)
* **MMA Octagon / Cage Enclosure**

---

## 7. Recovery & Wellness
* **Paradox Cryotherapy Chamber / Cryo Pod**
* **RedZone / Red Light Therapy Chamber**
* **Clearlight Infrared Sauna**
* **Massage Chairs**
* **H₂O Hydration & Refill Stations**
`
  

## 6. Recovery studio (loggable recovery sessions)
**Available:**
* **Paradox Cryotherapy Chamber / Cryo Pod**
* **RedZone / Red Light Therapy Chamber**
* **Clearlight Infrared Sauna**
* **Massage Chairs**
* **H₂O Hydration & Refill Stations**

**Usage pattern:** sometimes a standalone ~15 min cold / recovery session, separate from training.
- **Make recovery a loggable day-type in the cartridge?** (my rec: **yes**) `FILL → yes`

## 7. Injuries / limitations / mobility
- `let the user type its own thing, or toggle off.also more than 1 injury. depends on dev opinion. but track intensity` anything to program around (old injuries, mobility restrictions, hip/shoulder, etc.)

## 8. Prescription model (I recommend; you confirm)
The cartridge declares ONE logging model (the five: `percent-1rm` · `rpe` · `straight-sets` ·
`time-distance` · `bodyweight`). Given "fast heavy lifts + relative strength + explosive," my lean
is **`rpe`/RIR** (autoregulates heavy days without 1RM testing and fits explosive quality work) —
but I'll give a firm recommendation once your §1 benchmarks are in.
- **Preference, if any:** `ill let you suggest. thats the science im unsure of `
