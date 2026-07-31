# Pilot Onboarding Pack — Draft

**Status:** draft for coach review only.

> **Channel note:** this pack predates the approved Track B delivery design. Its dossier templates,
> clarification loop, and readiness checklist remain reusable, but its Slack-specific client copy is
> historical. `ONBOARDING-QUESTION-SPEC.md` is the canonical client questionnaire and
> `ONBOARDING-SYSTEM-DESIGN.md` owns the current site, Telegram, and WhatsApp workflow.

This file is **not** a completed client record, **not** medical advice, and **not** an authored program. It is a reusable, generic onboarding pack the coach may adapt for a new Combat OS coaching pilot. Use the neutral handle **PILOT-01** in every repository artifact and coach-facing summary. Map the handle to a real person only outside Git.

Nothing in this pack diagnoses, treats, or replaces clinical care. Where answers suggest pain under active medical care, red-flag symptoms, or uncertainty about safe loading, the coach pauses program design and routes the person back to an appropriate qualified professional.

---

## 1. Client-facing welcome and expectations

*Paste or lightly adapt into Slack. Tone: calm, specific, human.*

---

Hi — welcome.

I’m building your training plan as a **one-to-one coaching pilot** around how you actually train, not around an imaginary perfect gym or schedule.

**What this is for**
A short intake so I can design a realistic first phase of training that fits your goals, week, equipment, and any limits that matter. Honest answers and practical constraints make a better plan than polished ones.

**Effort**
Usually a few short message exchanges (or one focused form pass) over a few days. You can answer in stages. Questions are welcome at any time.

**What I will do**
- Design around your **real** equipment and **real** weekly availability
- Rank trade-offs when time is tight (you help choose what matters most)
- Summarise my understanding back to you for correction before any program is written

**What I will not do**
- Promise specific results, timelines, or body-composition outcomes
- Pressure you to train through pain or override clinical advice
- Replace a doctor, physio, or other qualified care

**Please flag early**
If you have pain that changes how you move, are under active medical or rehab care, or feel unsure whether something is safe to train around — say so in plain language. You do not need to diagnose yourself. I will design within those boundaries, or pause and ask you to check with your clinician when that is the right call.

When you are ready, I will send the first short section (goals and priorities). No rush.

---

## 2. Client-facing onboarding sequence

Turn this into staged Slack messages or a form. Each section lists:

- **Client-facing questions** (exact wording the coach can send)
- **Why I am asking** (optional one-liner for the client)
- **Coach-only resolve** (what the answer should settle)
- **Hard gate?** — maps to `[GATES]` in `docs/authoring/INTAKE-SCHEMA.md`

**Hard gates before authoring (all must be answered or consciously deferred by the coach):**

| Gate | Intake-schema field |
|------|---------------------|
| Training age / experience | §1 Athlete snapshot |
| Primary goal / archetype | §2 Identity & goals |
| Priority ranking | §2 Identity & goals |
| Session length + structure | §3 Session shape |
| Default week | §4 Weekly structure |
| Equipment available | §5 Facility & equipment |
| Equipment **not** available | §5 Facility & equipment |

Everything else may proceed with stated coach defaults if the client cannot or will not answer.

### Sequence overview

1. Goals, priorities, and what success looks like
2. Current training and realistic weekly availability
3. Session time, preferences, dislikes, and constraints
4. Gym and home-equipment inventory
5. Recovery context and relevant limitations
6. Current benchmarks and training preferences
7. Final confirmation of the coach’s understanding

---

### Section 1 — Goals, priorities, and success

**Hard gate?** Yes — primary goal and priority ranking.

**Client-facing message**

> **Section 1 of 7 — Goals (about 5 minutes)**
> *Why I am asking:* so the plan serves what you care about when time is limited, not a generic template.

1. In your own words, what are you training **toward** right now? (e.g. sport performance, general strength and health, a race, returning after time off — whatever is true for you.)
2. Rank these qualities **1 = most important … last = least**, and add or rename items if needed:
   - Strength
   - Conditioning / work capacity
   - Muscle size / physique
   - Explosiveness / power
   - Skill / sport practice
   - Longevity / joint resilience
   - Other: ___
3. What would “this is working” look like in **8–12 weeks**? Keep it concrete and modest (energy, confidence under load, a skill, a number you care about — not a guarantee).
4. What are you **explicitly not** optimising for? (e.g. “not bodybuilding,” “not marathon training.”)
5. Time horizon: are you peaking for a **date/event**, building **sustainably**, or something in between? If an event, what is the rough window (no need for private detail)?

**Coach-only resolve**

- Primary goal / archetype in the client’s language (`[GATES]`)
- Forced priority order for trade-offs (`[GATES]`)
- Explicit non-goals (rules out whole exercise families)
- Ethos: peak-for-a-date vs longevity default (loading strategy)

---

### Section 2 — Current training and weekly availability

**Hard gate?** Yes — training age/experience and default week.

**Client-facing message**

> **Section 2 of 7 — Your week and experience (about 5–8 minutes)**
> *Why I am asking:* so session count and type match a week you can actually live, not an ideal calendar.

1. Roughly how long have you been training seriously, and in **which** modalities? (weights, calisthenics, combat sport, running, classes, etc.)
2. What does a **typical current week** look like? List each training day by type if you can (e.g. lift, class, sparring, run, rest).
3. **Default week going forward** — how many of each session type do you want in a normal week? Example format:
   - Strength / gym: __×
   - Sport / class / skill: __×
   - Conditioning (if separate): __×
   - Recovery / easy: __×
   - Full rest: __×
4. How much does the real week **reshuffle**? (stable order vs days move around)
5. When a day moves or you miss one, what usually gets dropped first?
6. Optional: height / weight / age — only if you are comfortable sharing. Used only as coarse anchors for load expectations, never for shame or public display.

**Coach-only resolve**

- Training age / experience → volume and exercise selection (`[GATES]`)
- Default week composition (`[GATES]`)
- Flex vs locked order → full-body/robust structure vs split (aligns with D10 / coach doctrine)
- Optional anthropometrics (non-gate; omit from cartridge user-facing copy)

---

### Section 3 — Session time, preferences, dislikes, constraints

**Hard gate?** Yes — session length + structure.

**Client-facing message**

> **Section 3 of 7 — How a session should feel (about 5 minutes)**
> *Why I am asking:* a “60-minute session” is often only ~30–40 minutes of hard work after warm-up, rest, and changeovers.

1. Total time you can give a typical gym session: **__ minutes**. How do you usually split warm-up / work / cool-down?
2. Preferred training style when lifting (pick any that fit): heavy and low-rep · moderate volume · circuits · machines-first · free weights · mixed · no strong preference.
3. Warm-up: do you already have a routine you want to keep, or should I program prep?
4. Exercises or formats you **will not do** (honoured, not argued): ___
5. Any schedule constraints that shape sessions (late nights only, no weekends, kids, work travel patterns — only what affects programming)?
6. Noise, crowding, or shared-space limits that change exercise choice?

**Coach-only resolve**

- Session length + structure → real **work window** (`[GATES]`)
- Style preferences and refusals (Part B: dislikes honoured)
- Warm-up ownership
- Practical constraints that block certain supersets or session shapes

---

### Section 4 — Gym and home equipment inventory

**Hard gate?** Yes — available **and** not available.

Use this section together with **Part 3** (photo brief). Photos are evidence; confirmation is still required.

**Client-facing message**

> **Section 4 of 7 — Equipment (about 5 minutes + photos when ready)**
> *Why I am asking:* I will only prescribe what you can actually use. Missing kit is normal — we substitute.

1. Where do you train most days? (commercial gym / hotel / home / mixed)
2. List what you **know you can use** regularly: racks, bars, dumbbells, cables, machines (names if known), cardio options, bags, turf, outdoor space, etc.
3. List what is **not available or impractical** for you (e.g. no trap bar, no landmine, no sled, no boxes, no free Olympic platform).
4. Home or travel kit you **actually use** (not “might buy”): ___
5. Layout: does moving between free weights, machines, and turf/cardio make supersets across zones unrealistic?
6. Anything crowded or time-limited (e.g. only one squat rack at peak hour)?

**Coach-only resolve**

- Available inventory (`[GATES]`)
- Explicit unavailable list (`[GATES]`) — never prescribe absent equipment
- Layout / crowding constraints for chaining exercises
- Living inventory seed for later swaps
- Confidence flags → clarify with photos (Part 3) before authoring

---

### Section 5 — Recovery context and relevant limitations

**Hard gate?** No — but **coach review required** before authoring if active medical care, significant pain, or uncertainty is present. Do not invent diagnoses. Do not collect unnecessary private detail.

**Client-facing message**

> **Section 5 of 7 — Recovery and limits (answer only what you are comfortable sharing)**
> *Why I am asking:* so the plan respects how you recover and any boundaries your body or clinician has already set. This is not a medical exam.

1. Recovery tools you **use** (optional): sauna, cold, massage, physio sessions, none, other — only if relevant to planning.
2. Should an easy recovery day be a normal part of the week you want logged? (yes / no / sometimes)
3. Limitations that change exercise choice — free text is fine. For each, a simple severity note helps (e.g. “occasional annoyance” / “changes how I load” / “currently avoiding”). You may write **“none currently.”**
4. Are you under **active care** (physio, chiropractor, sports med, etc.) with guidance that affects training? If yes, what have they cleared or restricted, in their words if you know them?
5. Anything you are **uncertain** about loading (you do not need to self-diagnose — flag it and we will keep the plan conservative or wait for clinical clarity)?

**Coach-only resolve**

- Recovery resources and whether recovery is a session type
- Injury/limitation free-text entries + severity; support “none currently”
- Active medical care → consider corrective/foundation phase; avoid contraindicated loading
- Red-flag / refer path: if symptoms or care boundaries are unclear, **do not author a heavy phase**; summarise for coach review and ask the client to check with their clinician
- Keep detail at the level needed to coach safely; do not store raw clinical documents in Git or in a cartridge

---

### Section 6 — Benchmarks and training preferences

**Hard gate?** No — improves load anchoring; coach may proceed with conservative defaults.

**Client-facing message**

> **Section 6 of 7 — Numbers and preferences (optional but useful)**
> *Why I am asking:* real numbers beat guesses. Missing numbers just mean we start more conservatively.

1. Current benchmarks you actually do (examples — only what is real for you): squat or leg press for reps; hinge or pull variation; press; pull-up or row max; a conditioning marker. Approximate is fine.
2. Anything you **prefer not to do** as a max test (e.g. no 1RM deadlift) — we will not force it.
3. Load style preference if any: “I like training to a number” · “I don’t want percentages” · “no strong preference” (default: coach chooses per exercise).
4. If you already follow a program, does it use % of 1RM? Do you have tested maxes on file?

**Coach-only resolve**

- Load anchors and known gaps
- Preference vs coach-chosen prescription (RPE/RIR / dual-coded %1RM+RPE / note)
- “Don’t do X by preference” → honour in exercise selection

---

### Section 7 — Confirmation of the coach’s understanding

**Hard gate?** Process gate before **authoring** (not an intake-schema `[GATES]` field). Client confirmation is required before cartridge authoring for this pilot workflow.

**Client-facing message (after coach writes a short summary)**

> **Section 7 of 7 — Quick confirmation**
> Below is my understanding of your goals, week, equipment, and limits in plain language.
> Please reply with:
> - **Looks right**
> - or **Corrections:** (list anything wrong or missing)
>
> I will not write the first program draft until this is confirmed or consciously deferred by agreement.

**Coach-only resolve**

- Shared mental model before authoring
- Corrections become a dossier `clarification` / new `intake` revision
- Approval of direction ≠ medical clearance

---

### Slack staging tips (coach)

- Send **one section at a time** unless the client prefers a single form.
- After Sections 1–3, send a mid-loop summary of goals + week + session length.
- After Section 4 + photos, confirm inventory before Section 5 deep-dives.
- Do **not** paste raw medical detail into group channels; keep PILOT-01 summaries private.
- Record structured decisions in the dossier (Part 4), not the full chat log.

---

## 3. Gym-photo and equipment-inventory brief

### 3A. Client-facing photo request (paste into Slack)

---

When you have a few minutes at the gym (or home setup), could you send photos? They help me prescribe only what you can actually use.

**Please send:**

1. **Wide shots** of each area you can train in (free weights, machines, cables, cardio, functional/turf, outdoor/conditioning if you use it). Natural light if possible; no need for perfect composition.
2. **Close-ups** of any machine that is unfamiliar, branded, or hard to name — include the **label plate** and visible adjustment points when you can.
3. **Cardio / conditioning options** you might use (bikes, rower, ski-erg, bags, sleds, etc.), even if only sometimes.
4. **Home equipment** you genuinely use (not a shopping list).
5. A short note on anything that is **unavailable or impractical** for you (broken, always taken, membership restriction, “I won’t use this”).
6. Anything about **layout or crowding** that makes moving between zones for supersets unrealistic.

You do not need every angle. Rough and complete beats perfect and partial.

I will treat photo-based guesses as a **draft only**. I will ask you to confirm anything uncertain before it shapes the plan.

---

### 3B. Coach-only inventory template

Case handle: **PILOT-01**
Revision type: `gym_inventory`
Inventory status legend: `available` | `unavailable` | `uncertain` | `impractical`
Confirmation: AI image analysis = **draft only** until client or coach marks `client_confirmed` or `excluded`.

| Item / station | Status | Substitution if needed | Layout constraint | Evidence / photo ref | Confidence (low/med/high) | Client confirmed? (Y/N/pending) | Notes |
|----------------|--------|------------------------|-------------------|----------------------|---------------------------|---------------------------------|-------|
| e.g. Squat rack | | | | | | | |
| e.g. Trap bar | | | | | | | |
| e.g. Cable station | | | | | | | |
| e.g. Leg press | | | | | | | |
| e.g. DB range | | | | | | | |
| e.g. Bag / conditioning | | | | | | | |
| Home kit | | | | | | | |

**Summary fields**

- Zones present:
- Zones absent:
- Cross-zone supersets practical? (Y/N/partial)
- Peak-hour constraints:
- Confirmed available list (for handoff):
- Confirmed unavailable list (for handoff):
- Uncertain items still open:
- Wishlist (nice-to-have, never blocks program):

**Rules**

- Author and compilation handoff may use only **confirmed** equipment plus **explicitly approved** substitutions.
- A photograph is evidence of possible equipment, not proof it is free, safe, or correctly adjusted at the client’s training time.
- Do not invent machine names or exercise IDs from blurry labels — mark `uncertain` and ask.

---

## 4. Coach dossier and clarification loop

Maps to the logical `CoachingCase` / `CoachingCaseRevision` contract in `PILOT-COACHING-DATA-ARCHITECTURE-DIAGNOSTIC.md`. This template is for **coach-owned structured notes** (private store or offline working file). **Do not commit filled dossiers with personal data to Git.**

### 4A. Case header

```text
CoachingCase
  handle: PILOT-01
  status: intake_requested | intake_received | clarification_required |
          gym_inventory_confirmed | coach_draft_ready | client_review |
          approved_for_compilation | compiled | validated | deployed | assigned
  coach_owner: (coach only, outside Git)
  client_profile_id: (optional; only after authenticated app user exists)
  contact: (restricted; never copy into a cartridge or this repo)
  consent_recorded_at: (pilot policy deferred — leave blank unless coach records privately)
  created_at / updated_at:
  final_cartridge_id: (empty until deployment)
```

### 4B. Intake-gate status

| Gate | Status (answered / deferred / unclear) | Notes |
|------|----------------------------------------|-------|
| Training age / experience | | |
| Primary goal / archetype | | |
| Priority ranking | | |
| Session length + structure | | |
| Default week | | |
| Equipment available | | |
| Equipment not available | | |

Authoring is blocked while any row is **unclear** unless the coach **consciously defers** with a written default and risk note.

### 4C. Structured intake summary (revision type: `intake`)

```text
goals:
  primary:
  priority_rank: []
  not_optimising_for:
  time_horizon:
  success_8_12_weeks:

training_context:
  experience:
  current_week:
  default_week:
  week_flex: stable | reshuffles | mixed
  session_length_min:
  work_window_estimate_min:
  warm_up_owner: client | coach
  style_preferences:
  refusals:

equipment:
  available: []
  unavailable: []
  home_or_travel: []
  layout_constraints:

recovery_and_limits:
  recovery_resources:
  recovery_as_session_type: yes | no | sometimes
  limitations: [{ text, severity }] or none_currently
  active_professional_care: no | yes (boundary summary only)
  coach_review_flag: none | pause_for_clinical_clarity

benchmarks_and_prefs:
  benchmarks: []
  load_style_preference: none | numbers | no_percentages
  existing_percent_based_program: yes | no | unknown
```

### 4D. Confirmed gym inventory (revision type: `gym_inventory`)

Paste the filled Part 3B summary. Link asset IDs privately if stored; **do not** put raw photos in the handoff.

### 4E. Open questions and client feedback

```text
open_questions: []
client_feedback: []   # structured; not raw Slack export
pending_corrections: []
```

### 4F. Coach brief (revision type: `coach_brief`)

```text
constraints:           # non-negotiables from intake + inventory
priorities:            # ordered qualities and trade-offs
exercise_selection_implications:
phase_intent:          # e.g. foundation/corrective | strength | mixed
structure_bias:        # full-body vs split; why
sport_support_notes:   # S&C supports sport; does not duplicate it
substitutions_approved: []
next_phase_hypothesis:
risks_and_conscious_defaults: []
```

### 4G. Final client confirmation (revision type: `client_feedback` or `approval`)

```text
summary_sent_to_client: (short plain-language summary, no clinical dump)
client_response: looks_right | corrections
corrections_applied: []
approved_for_compilation: yes | no
date:
```

### 4H. Safe `compilation_handoff` (revision type: `compilation_handoff`)

Include **only** what the authoring kit needs. **Exclude:** name, email, phone, photos, raw chat, detailed health history, contact identity.

```text
compilation_handoff:
  case_handle: PILOT-01
  intended_cartridge_id: (proposed kebab-id; not invented exerciseIds)
  confirmed_constraints:
  confirmed_equipment_available: []
  confirmed_equipment_unavailable: []
  approved_substitutions: []
  weekly_structure:
  session_work_window_min:
  goals_and_priority_rank:
  phase_intent:
  refusals:
  limitation_coaching_boundaries: (minimal operational bullets only)
  prescription_guidance:
  open_wishlist: []
```

### 4I. Clarification loop (simple)

```text
1. Client answers (Slack, staged)
2. Coach writes structured summary → intake / gym_inventory revision
3. Coach sends plain-language summary to client
4. Client corrects or confirms
5. Coach records client_feedback revision; bumps revision_number
6. Repeat until gates clear and client confirms direction
7. Coach completes coach_brief
8. On approval → compilation_handoff only
9. Then — and only then — use docs/authoring kit to draft a cartridge
```

The coach records **concise structured decisions**, not raw Slack chat, as the durable case record.

---

## 5. Proposed doctrine improvements — not yet adopted

These items are **proposals only**. They do **not** change `COACH-PROMPT.md`, `INTAKE-SCHEMA.md`, or `REVIEWER-CHECKLIST.md` until the coach independently reviews and explicitly adopts them. Model research is not final authority; uncertainty is labelled.

### Proposal A — Explicit pre-authoring “pause / refer” rule

| Field | Content |
|-------|---------|
| **Observed gap** | The kit requires respect for injuries and active care, but the intake schema has no standard client wording or coach stop-rule for when **not** to author a progressive phase. |
| **Conservative proposed rule** | If the client reports symptoms of possible cardiovascular, metabolic, or renal disease relevance, unexplained chest pain/dizziness/syncope with exertion, or is under care with unclear loading clearance, mark `coach_review_flag: pause_for_clinical_clarity`, do not author a heavy or high-intensity phase, and ask the client to follow their clinician’s guidance before progression. Coaching continues only within clearly cleared boundaries. |
| **Evidence type** | Professional guideline / position literature on exercise preparticipation screening (referral when history/symptoms and desired intensity warrant medical clearance). |
| **Source** | Riebe D et al., Updating ACSM’s Recommendations for Exercise Preparticipation Health Screening. *Med Sci Sports Exerc.* 2015;47(11):2473–2479. Summary materials: https://www.exerciseismedicine.org/assets/page_documents/ACSM%20Preparticipation%20Screening%20Guidelines.pdf |
| **Established vs preference** | **Established practice** to use screening algorithms and medical referral where indicated; **coaching preference** on exact Slack wording and pilot-scale documentation. This pack is **not** a full ACSM screening implementation. |
| **Affects** | Intake (optional section language) + coach prompt (hard stop) + reviewer checklist (injury/medical respect). **None active until adopted.** |

### Proposal B — Equipment confidence and client confirmation as an intake gate companion

| Field | Content |
|-------|---------|
| **Observed gap** | Intake gates cover available / not available, but not **confidence**, photo evidence, or client confirmation. The pilot architecture diagnostic describes this; the authoring kit files do not. |
| **Conservative proposed rule** | Before compilation, every prescribed equipment class must be `client_confirmed` or covered by an approved substitution. `uncertain` items never appear as required kit in `requirements.equipment`. |
| **Evidence type** | Process / safety-of-implementation (coaching operations), aligned with existing doctrine “honour the equipment list exactly.” |
| **Source** | Existing kit doctrine in `COACH-PROMPT.md` §4; pilot workflow in `PILOT-COACHING-DATA-ARCHITECTURE-DIAGNOSTIC.md` (gym-photo inventory). No single clinical trial “proves” photo confirmation — this is **quality-control practice**. |
| **Established vs preference** | **Inference / coaching preference** for formal confidence fields; **established** that programs must not require absent equipment. |
| **Affects** | Intake (facility §) + reviewer checklist (equipment reality). Optional companion form only until adopted. |

### Proposal C — Capture sleep/stress only as optional volume modifiers, not diagnostics

| Field | Content |
|-------|---------|
| **Observed gap** | Recovery § focuses on facilities (sauna, etc.), not non-training recovery load that often forces volume cuts. |
| **Conservative proposed rule** | Optional one-liner: “Anything regularly limiting recovery right now (poor sleep stretch, high life stress, heavy work blocks) — only if you want the plan to account for it?” Use answers only to bias volume down or keep RPE caps conservative; never diagnose sleep disorders or mental health. |
| **Evidence type** | Training practice / recovery management; resistance-training guidelines emphasise progressive, sustainable loading rather than maximal complexity for general populations. |
| **Source** | ACSM resistance training guidance update overview (2026 position stand summary): https://acsm.org/resistance-training-guidelines-update-2026/ — full stand in *Med Sci Sports Exerc.* (overview of reviews). Treat lifestyle recovery modifiers as **coaching judgment**, not a medical sleep assessment. |
| **Established vs preference** | **Established** that recovery and progressive overload interact; **preference** on adding this exact optional question to intake. |
| **Affects** | Intake (recovery §) only if adopted; not a cartridge schema change. |

### Proposal D — Needs-analysis style “sport demand” one-liner

| Field | Content |
|-------|---------|
| **Observed gap** | Goals capture “what toward,” but not a one-line **sport demand** (e.g. striking volume already high) that would stop the coach from duplicating conditioning — doctrine #1 already says this, intake does not force the answer. |
| **Conservative proposed rule** | Optional: “In a hard sport week, what does practice already tax most — power, lactic conditioning, impact, grip, mileage, etc.?” Use to subtract duplicated stressors from the S&C block. |
| **Evidence type** | Professional S&C practice (needs analysis as first step in program design). |
| **Source** | NSCA educational materials on needs analysis, e.g. https://www.nsca.com/education/articles/kinetic-select/needs-analysis-for-injury-prevention/ and tactical/athlete needs-analysis articles on NSCA.com. |
| **Established vs preference** | **Established** needs-analysis concept in S&C; **preference** on exact optional wording. |
| **Affects** | Intake (goals or weekly structure) + coach prompt reinforcement; none until adopted. |

### Explicitly **not** proposed here

- Inventing new cartridge block kinds, `exerciseId` values, or schema fields
- Silent edits to the authoring kit
- Automated Slack import of raw health chat
- Treating AI gym-photo vision as confirmed inventory

---

## 6. PILOT-01 readiness checklist

**Case handle:** PILOT-01

Use this as a one-page gate from **onboarding → authoring**. Tick only when true. “Consciously deferred” requires a written default and risk note in the dossier.

| # | Ready when… | Done |
|---|-------------|------|
| 1 | All intake **[GATES]** answered **or** consciously deferred by the coach (training age; primary goal; priority ranking; session length/structure; default week; equipment available; equipment not available) | ☐ |
| 2 | Gym inventory confirmed; unavailable kit explicit; layout/crowding constraints understood; uncertain items resolved or excluded | ☐ |
| 3 | Active limitations and any professional-care boundaries captured at the **minimum level needed to coach safely** (or “none currently”); pause/refer flags cleared or plan stays inside cleared bounds | ☐ |
| 4 | Schedule and session duration are realistic; estimated **work window** noted | ☐ |
| 5 | Goals and trade-offs are ranked; explicit non-goals recorded | ☐ |
| 6 | Coach brief complete (constraints, priorities, exercise-selection implications, phase intent) | ☐ |
| 7 | Client has confirmed the coach’s plain-language summary (or agreed corrections applied and re-confirmed) | ☐ |
| 8 | `compilation_handoff` contains **no** personal contact details, raw photographs, or raw conversation — only minimised program-design inputs under handle PILOT-01 | ☐ |
| 9 | **Only then** may the existing authoring kit (`INTAKE` answers + handoff + `COACH-PROMPT.md` + `PROGRAM-CARTRIDGE-SPEC.md`) be used to create a **cartridge draft**; then Part A validate + Part B review before assign | ☐ |

**Stop lines**

- Do not author while any hard gate is unclear without a conscious deferral note.
- Do not put PILOT-01 personal data, photos, or Slack exports into Git or into cartridge JSON.
- Do not invent `exerciseId`s, external exercise URLs, or new block kinds during pilot onboarding.
- This checklist does not grant medical clearance and does not replace clinical advice.

---

## Document control

| Item | Value |
|------|--------|
| Deliverable | `docs/planning/rebuild/PILOT-ONBOARDING-PACK-DRAFT.md` |
| Pilot identifier | PILOT-01 only |
| Authoring kit | Unchanged by this draft |
| Next human step | Coach reviews this pack; adopts or rejects Part 5 proposals; runs a real intake **outside** the repository |

---

*End of draft.*
