# Onboarding Question Spec

**Status:** canonical question set. This is the reusable artifact — the website, or any other tool,
is only a rendering of it. Change questions here first.

**Target:** complete in **under 10 minutes**, excluding gym photos.

**Design rules:** mostly single-tap answers; free text only where it genuinely earns its place;
sensitive questions optional and neutrally worded; every question either closes an intake gate or
changes exercise selection. Nothing is asked "because it might be interesting."

---

## Gate coverage

The seven `[GATES]` in `docs/authoring/INTAKE-SCHEMA.md` must be answered or consciously deferred
before a cartridge may be authored.

| Gate | Covered by | Note |
|---|---|---|
| Training age / experience | Q4, Q5 | |
| Primary goal / archetype | Q1 | |
| Priority ranking | Q2 + Q3 | Elicited as top-2; coach confirms full order at the summary step — see §"Priority ranking" below |
| Session length + structure | Q9, Q10 | |
| Default week | Q6, Q7, Q8 | |
| Equipment available | Q13 + **gym photos** | The questionnaire deliberately does **not** ask the client to inventory a gym |
| Equipment **not** available | Q14 | |

**Why equipment is mostly out of the form:** asking a client to enumerate a commercial gym's
inventory is a fifteen-minute task on its own and they do it badly. Photos plus
`GYM-PHOTO-VISION-PROMPT.md` produce a better inventory with none of the client's time. This single
change is what makes the ten-minute target reachable.

---

## Priority ranking — elicitation note

`INTAKE-SCHEMA.md` requires a **forced rank** of competing qualities. That requirement is unchanged.

What changes is **how it is collected.** Rank-order questions degrade badly past four or five items:
respondents satisfice, anchor on whatever is listed first, and the middle ranks are unreliable. A
coach-led conversation can rank six qualities because the coach probes in real time; a cold form
cannot. Feeding a fake rank-4 into authoring is worse than honest coarse data.

So: the form collects **top two** (Q2) plus **explicit non-goals** (Q3), and the coach confirms the
working order during the summary step that already exists in the onboarding pack. The gate is
satisfied jointly, and no schema change is required.

---

## Section A — Goals *(about 2 minutes)*

Intro line: *"First, what you're actually training for. This is what I trade off against when time is
tight."*

| # | ID | Question | Type | Required | Options / notes |
|---|---|---|---|---|---|
| 1 | `goal_primary` | What are you training toward right now? In your own words. | Short text | **Yes** | Placeholder: "e.g. general strength and health, back to fighting fit, a specific event" |
| 2 | `priority_top_2` | Of these, which **two** matter most right now? | Checkbox, **max 2** | **Yes** | Strength · Conditioning & work capacity · Muscle size · Explosiveness & power · Skill & sport practice · Longevity & joint resilience |
| 3 | `not_optimising_for` | Anything you're explicitly **not** training for? | Short text | No | Helper: "Optional — rules out whole families of exercises. e.g. 'not bodybuilding'" |

---

## Section B — Your week *(about 3 minutes)*

Intro line: *"Now the week you actually live — not the ideal one."*

| # | ID | Question | Type | Required | Options / notes |
|---|---|---|---|---|---|
| 4 | `experience_level` | How long have you been training seriously? | Single choice | **Yes** | Under 1 year · 1–3 years · 3–5 years · 5–10 years · 10+ years · Returning after a long break |
| 5 | `modalities` | Which of these have you actually trained? | Checkbox | **Yes** | Weights · Calisthenics · Combat sport · Running / endurance · Classes · Team sport · Other |
| 6 | `gym_sessions_per_week` | How many **gym** sessions do you want in a normal week? | Single choice | **Yes** | 1 · 2 · 3 · 4 · 5 · 6 |
| 7 | `other_training` | Anything else in a normal week? | Checkbox + optional count | No | Sport / class · Running or cardio · Recovery day · Nothing else |
| 8 | `week_stability` | Does your week stay put, or move around? | Single choice | **Yes** | Stable — same days most weeks · Reshuffles often · Fairly unpredictable |

> **Coach note (Q8):** "reshuffles" or "unpredictable" pushes the cartridge toward full-body,
> robust day-templates with a suggested order rather than a locked rotation — decision **D10**.

---

## Section C — How a session should feel *(about 2 minutes)*

Intro line: *"A 60-minute session is usually only about 35 minutes of real work. This is so I plan
against the real number."*

| # | ID | Question | Type | Required | Options / notes |
|---|---|---|---|---|---|
| 9 | `session_minutes` | How long is a typical gym session, door to door? | Single choice | **Yes** | 30 · 45 · 60 · 75 · 90+ minutes |
| 10 | `warmup_owner` | Warm-up — do you already have one you want to keep? | Single choice | **Yes** | I have my own · Programme one for me · No preference |
| 11 | `style_preferences` | Any preference for how lifting feels? | Checkbox | No | Heavy & low rep · Moderate volume · Circuits · Machines first · Free weights · Mixed · No strong preference |
| 12 | `refusals` | Anything you simply won't do? | Short text | No | Helper: "Honoured, not argued with." |

---

## Section D — Equipment and limits *(about 3 minutes)*

Intro line: *"Last part. I'll only ever prescribe things you can actually use."*

| # | ID | Question | Type | Required | Options / notes |
|---|---|---|---|---|---|
| 13 | `train_where` | Where do you train most days? | Single choice | **Yes** | Commercial gym · Home setup · Both · Travel / hotel gyms often · Mostly outdoors |
| 14 | `equipment_unavailable` | Anything you know you **can't** or **won't** use? | Short text | **Yes** | Helper: "e.g. no trap bar, squat racks always taken at my hour, I avoid the leg press." Accepts "nothing comes to mind." |
| 15 | `limitations` | Anything hurting, under professional care, or that you're unsure about loading? | Long text | No | Helper: *"Plain language is fine — you don't need to diagnose yourself. Write 'nothing currently' if that's the case."* |
| 16 | `benchmarks` | Any numbers you already know? | Long text | No | Helper: "Approximate is fine. Missing numbers just mean we start conservatively." |
| 17 | `anything_else` | Anything else I should know? | Long text | No | |

---

## Closing screen

Not a question. After submit, show:

> **That's everything — thank you.**
> I'll read through this properly and come back to you with a short summary of what I've understood,
> so you can correct anything before I build the programme.
> If you haven't sent gym photos yet, I'll ask for those next.

---

## Handling rules

**Q15 is the sensitive one.** It must be optional, neutrally worded, and never framed as a medical
questionnaire. If the answer suggests active care, red-flag symptoms, or uncertainty about safe
loading, the coach **pauses programme design** and routes the client back to appropriate qualified
care. The form neither diagnoses nor clears anyone.

**Never mark an intake authorable on form data alone.** The gate check in n8n workflow 3 reports
what is missing; the coach decides whether a gap is consciously deferred, with a written default and
risk note in the dossier.

**Height, weight, and age are not asked.** They are non-gate anchors, they land badly cold, and the
coach can ask conversationally if a real need appears.

---

## Changing this spec

1. Edit this file first.
2. Update the gate-coverage table if a gate's coverage moved.
3. Re-render the site form to match.

Because answers are stored as a JSON document, adding or removing a question needs **no database
migration**. Keep question IDs stable — they are the join between stored answers and this spec.
