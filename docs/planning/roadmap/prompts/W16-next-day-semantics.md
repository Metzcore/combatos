# W16 — Next-Day Semantics Rework · Tier: IMPL · ⛔ GATED ON DECISION D2

**Instructions for the User:** run ONLY if you decided in D2 that the current behavior (count every day, `(day % 6) + 1`) is NOT what you want. Fill in the decision where marked ⟨D2⟩ below before pasting.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. The HUD's Next Day indicator currently computes `(lastSession.day % 6) + 1` at `app/src/components/HUD.jsx:72` — a plain 6-day wrap counting fight-gym days (2 and 4). The developer has decided the desired semantics are:

**⟨D2: state the chosen rule here — e.g. "skip to the next S&C training day (1→3, 3→5, 5→6, 6→1), fight-gym days are self-scheduled" — or another rule⟩**

### DO NOT TOUCH
- Logging, payloads, phase logic. Day-plan data (playbook) is read-only.
- The day SELECTOR itself — the user can still pick any day; only the suggestion changes.

### TASKS
1. Extract the calculation into a pure function (if W7 already did, modify that function) and implement the decided rule. Day-type knowledge comes from the same source `usePlaybook` uses (days absent from the playbook = fight-gym).
2. Update/replace the W7 unit tests to pin the NEW rule, covering every day 1–6 and the phase-boundary wrap.
3. Consider: what should the indicator show right after a fight-gym day is logged? Cover it in tests per the decided rule.
4. Build + tests green.

Commit: `feat: next-day indicator follows decided day-progression rule (D2)`.
