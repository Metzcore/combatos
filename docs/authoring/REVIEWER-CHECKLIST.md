# Reviewer Checklist — the coaching-sanity gate before a cartridge ships

> **What this is:** the review a cartridge must pass before it's assigned to a person. It has two
> deliberately separate halves:
>
> - **Part A — Structural validation:** deterministic, mechanical, **automated**. Implemented in
>   `app/src/utils/validateCartridge.js` (tested, `npm test` in `app/`) against the block model in
>   `docs/planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md` v2. Run it — don't hand-check Part A.
> - **Part B — Coaching-sanity judgment:** qualitative. Needs a coach (LLM or human) for now.
>   This is what a schema validator can never catch: a cartridge can be perfectly well-formed and
>   still be a bad program.
>
> Version 2 (2026-07-22) — updated for the block-composable model.

---

## Part A — Structural validation (automated — run, don't hand-check)

`validateCartridge(cartridge)` returns an array of error strings; empty array = structurally
valid. It enforces:

- [ ] Parses as valid JSON.
- [ ] `cartridgeId` and `label` are present.
- [ ] `cycle.dayCount` is a positive number.
- [ ] `days[]` covers `1..cycle.dayCount` with no gaps, no duplicates, none out of range.
- [ ] Every day's `type` is one of `training` · `rest` · `recovery` · `custom`.
- [ ] `training` days have ≥1 block; `rest`/`recovery` days have none.
- [ ] Every block has a known `kind` (`mobility` · `strength` · `conditioning` · `cooldown` ·
      `core`) and ≥1 item.
- [ ] Every item has an `id` (**unique across the whole cartridge**, not just its block) and a
      `name`.
- [ ] Kind-specific shape: `mobility`/`cooldown` need `dose`; `strength`/`core` need `sets` +
      `reps` (`prescription` must be an object if present; `pair` must have a `name` if present);
      `conditioning` needs numeric `rounds` (`perRound` must be an array if present).
- [ ] `superset` labels, where used, group ≥2 items.
- [ ] Any `features` referenced are known flags (currently `hipScoreRouting`, `bagWork`).

**Regression guard:** every authored cartridge in `cartridges/` is asserted clean in
`app/src/utils/validateCartridge.test.js` — a new cartridge should be added to that guard.

---

## Part B — Coaching-sanity judgment (LLM / human for now)

Each is a question to answer, not a box to blindly tick. Flag anything that isn't a clear pass.

- [ ] **Goal fit** — does the program actually serve the stated goal and priority ranking? (A
      strength-first athlete shouldn't get a bodybuilding split.)
- [ ] **Block selection is deliberate, not padded** — does each day carry the block kinds it
      actually needs (no `mobility` block that's really just a placeholder, no `conditioning`
      block bolted on for the sake of it)? A simple program having only `strength` blocks is fine.
- [ ] **Pattern balance** — across the week: squat, hinge, single-leg, vertical + horizontal push,
      vertical + horizontal pull, anti-movement core, power. Any glaring hole or redundancy?
- [ ] **Volume vs time** — does each session realistically fit the *work* window (not the total
      session time)? Count the sets × rest, not the item list.
- [ ] **Weekly fatigue** — does total load make sense alongside the person's sport/classes? Is the
      program duplicating conditioning the sport already provides?
- [ ] **Equipment reality** — is every item doable with the listed available equipment? Are all
      gaps handled by a stated substitution + wishlist entry, with nothing blocked on a purchase?
- [ ] **Injury / medical respect** — are contraindicated loads avoided for this person's state? If
      rebuilding, is this appropriately a corrective/foundation phase?
- [ ] **Longevity** — are loads RPE-appropriate (not gratuitously near-max) unless a max is the
      explicit, healthy, on-purpose goal?
- [ ] **Prescription choice per item makes sense** — RPE/RIR for autoregulated work, `{ percent,
      rpe }` dual-coding only where a %1RM lift lacks a tested max, descriptive `{ note }` where
      neither fits. Mobility/cooldown items should NOT carry a `prescription` — they're dosed, not
      graded.
- [ ] **PAP pairs are genuine potentiation, not padding** — a `pair` should be a fast, low-fatigue
      explosive movement that complements the main lift's pattern, not an arbitrary extra exercise.
- [ ] **Conditioning rounds reflect real structure** — `rounds`/`roundLength`/`perRound` should
      describe an actual round-by-round progression when the source material supports it, not a
      vague "do some cardio" placeholder.
- [ ] **Power done right** — is explosive work prescribed by quality (low reps, far from failure,
      "stop when speed drops"), not by effort-to-failure?
- [ ] **Pull bias for strikers / anterior-dominant athletes** — is the push:pull ratio sane?
- [ ] **Cues coach** — does each item's cue carry a sentence of *why*, not just technique?
- [ ] **Phase awareness** — is this a sensible single phase, and is the next phase (and the signal
      to switch) named?
- [ ] **Dislikes honoured** — are the person's stated refusals actually absent from the program?
- [ ] **No state-conditional content smuggled in** — an injury-flare alternate routine (e.g.
      STANDARD vs HIGH_ALERT) should NOT be modelled as cartridge data; that needs W13. If the
      source material has one, it should be intentionally left out, not silently dropped.

---

## Verdict
- **Part A** must be 100% pass — run `npm test` (or call `validateCartridge` directly); a fail is
  a bug, not a judgment call.
- **Part B** flags are judgment calls: resolve or consciously accept each before shipping. Record
  any accepted flags in the cartridge's rationale so the decision is visible.
