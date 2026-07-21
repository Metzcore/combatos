# Reviewer Checklist — the coaching-sanity gate before a cartridge ships

> **What this is:** the review a cartridge must pass before it's assigned to a person. It has two
> deliberately separate halves:
>
> - **Part A — Structural validation:** deterministic, mechanical, **automatable**. Today it's a
>   checklist (and a small Node script already implements most of it); it is the seed of a future
>   `validateCartridge()` function. A machine can — and eventually should — run this unattended.
> - **Part B — Coaching-sanity judgment:** qualitative. Needs a coach (LLM or human) for now.
>   This is what a schema validator can never catch: a cartridge can be perfectly well-formed and
>   still be a bad program.
>
> This split exists so that when onboarding is automated, Part A lifts into code and only Part B
> needs a model in the loop. Version 1 (2026-07-22).

---

## Part A — Structural validation (deterministic → automatable)

Every item must pass. These mirror the spec's validation rules plus basic integrity.

- [ ] **Parses** as valid JSON.
- [ ] `cartridgeId`, `label`, and `prescription` are present.
- [ ] `prescription` is one of the five models (`percent-1rm` · `rpe` · `straight-sets` ·
      `time-distance` · `bodyweight`).
- [ ] `days[]` covers `1..cycle.dayCount` with **no gaps and no duplicates**.
- [ ] Every `training` day has **≥1 exercise**; `rest`/`recovery` days have none.
- [ ] Exercise `id`s are **unique** within the cartridge.
- [ ] Each exercise's `prescription` object **matches the declared model** (for `rpe`: an `rpe` or
      `rir` value on every exercise).
- [ ] `superset` labels, where used, group **≥2** exercises.
- [ ] Any `features` referenced are **known flags** (currently `hipScoreRouting`, `bagWork`).
- [ ] Every exercise has a non-empty `name`, `sets`, `reps`, and `cue`.

> **Automation note:** the check `node -e "..."` used during authoring already covers JSON parse,
> gaps/dupes, empty training days, duplicate ids, and prescription presence. Formalising Part A as
> `validateCartridge(cartridge) → errors[]` is the clean next step and a natural first unit-tested
> module for the rebuilt app.

---

## Part B — Coaching-sanity judgment (LLM / human for now)

Each is a question to answer, not a box to blindly tick. Flag anything that isn't a clear pass.

- [ ] **Goal fit** — does the program actually serve the stated goal and priority ranking? (A
      strength-first athlete shouldn't get a bodybuilding split.)
- [ ] **Pattern balance** — across the week: squat, hinge, single-leg, vertical + horizontal push,
      vertical + horizontal pull, anti-movement core, power. Any glaring hole or redundancy?
- [ ] **Volume vs time** — does each session realistically fit the *work* window (not the total
      session time)? Count the sets × rest, not the exercise list.
- [ ] **Weekly fatigue** — does total load make sense alongside the person's sport/classes? Is the
      program duplicating conditioning the sport already provides?
- [ ] **Equipment reality** — is every exercise doable with the listed available equipment? Are all
      gaps handled by a stated substitution + wishlist entry, with nothing blocked on a purchase?
- [ ] **Injury / medical respect** — are contraindicated loads avoided for this person's state? If
      rebuilding, is this appropriately a corrective/foundation phase?
- [ ] **Longevity** — are loads RPE-appropriate (not gratuitously near-max) unless a max is the
      explicit, healthy, on-purpose goal?
- [ ] **Power done right** — is explosive work prescribed by quality (low reps, far from failure,
      "stop when speed drops"), not by effort-to-failure?
- [ ] **Pull bias for strikers / anterior-dominant athletes** — is the push:pull ratio sane?
- [ ] **Cues coach** — does each cue carry a sentence of *why*, not just technique?
- [ ] **Phase awareness** — is this a sensible single phase, and is the next phase (and the signal
      to switch) named?
- [ ] **Dislikes honoured** — are the person's stated refusals actually absent from the program?

---

## Verdict
- **Part A** must be 100% pass (it's mechanical — a fail is a bug).
- **Part B** flags are judgment calls: resolve or consciously accept each before shipping. Record
  any accepted flags in the cartridge's rationale so the decision is visible.
