# W27 — Phase Logging Integrity · Tier: IMPL, review by coordinator
_Written 2026-07-20. A data-integrity fix on the Workout tab (HUD), reported by the developer
from real use: after moving gyms and doing an off-plan session, the phase selector made it easy
to log a session under the WRONG phase — permanently, to the append-only record. Two distinct
failure modes (see below). Builds directly on `app/src/utils/phaseUnlock.js` (W14)._

**Instructions for the User:** paste everything below the dashed line into a fresh session.
Diagnostic-first: the agent must present its plan before changing anything.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Read repo-root `AGENTS.md` first and obey
its hard rules; read the `combatos-conventions`, `mobile-interaction-ux`, and
`personal-analytics-viz` skills in `.agents/skills/`. Task: phase-logging integrity on the
Workout tab. Nothing else.

## THE BUG (two distinct failure modes, both real)

The HUD Workout tab has a **Phase** `<select>` (`app/src/components/HUD.jsx` ~line 269) whose
value determines what phase every logged session is written under — into the append-only Sheet,
irreversibly. Today:

- **Mode 1 — premature jump.** All three phases are always selectable, including phases the user
  hasn't earned. A user can select Phase 3 with zero Phase 2 sessions and log against it.
- **Mode 2 — stale selection (the reported scenario).** The "Next up" box
  (`NEXT: DAY {n}`, ~line 113) shows only the day, never the phase. A user who has earned and is
  training Phase 2, but whose selector is still on Phase 1 (forgot to change it), gets no signal —
  they log a Phase-1 session by accident. **Gating locked phases does NOT fix this** (Phase 1 is
  legitimately selectable), so the phase must be made VISIBLE where the user looks before logging.

## THE DECIDED SCOPE

**Touch A — gate the phase selector (fixes Mode 1).** Disable the `<option>`s for phases the user
has not legitimately reached, reusing `phaseUnlock.js`. Required invariant, prove it with tests:
- Phase 1 is always selectable.
- The currently-selected phase is always selectable (never disable the active value).
- A user can always climb back to the highest phase they have earned, and move freely among
  earned phases — there must be NO state where an earned phase becomes unreachable (no lockout
  trap). Because unlock counts persist and phases unlock one step at a time, this holds; verify it.
- Phases beyond the highest earned are disabled.
If the cleanest correct implementation needs a new pure helper (e.g. `highestUnlockedPhase(sessionCount)`
or `isPhaseSelectable(p, sessionCount)`), ADD it to `phaseUnlock.js` — do NOT change the existing
`phaseReady` / `isPhaseLocked` semantics (W14 and the Playbook depend on them byte-for-byte).

**Touch B — show the phase in "Next up" (fixes Mode 2, primary).** The Next-up box must display
the phase that WILL be logged (the currently-selected `phase`), e.g. `NEXT: PHASE 2 · DAY 5`;
empty state `START: PHASE 1 · DAY 1`. This surfaces a stale selector before the user logs.

**Touch C — stale-phase mismatch signal (fixes Mode 2, safety net; design it, keep it gentle).**
When the last logged session's phase differs from the currently-selected phase, show a subtle
amber warning near the selector/Next-up (tactical-amber tokens; reuse the W14 `.badge-amber`
idiom). It must resolve simply by the user correcting the selector — NOT a blocking modal, NOT a
`prompt()`, nothing that gates logging. Going back to an earlier earned phase is legitimate, so
the copy is a heads-up ("last logged Phase 2 — you're on Phase 1"), not an error. Propose the
exact placement/copy in the diagnostic.

## EXPLICITLY OUT OF SCOPE / DO NOT TOUCH
- **The Playbook tab.** W14 ruled it "signal, never gate" — it stays fully browsable. W27 is the
  Workout/HUD logging surface ONLY. Do not gate the Playbook.
- Existing `phaseReady` / `isPhaseLocked` semantics (extend the module additively if needed).
- The logging path / payload shape / webhook / Sheets / Dexie schema / %1RM. This is a UI-gating
  and display change; it must not alter what a session row contains when a valid phase is logged.
- `package.json` / lockfile (zero new dependencies).

## PHASE 1 — DIAGNOSTIC (report, then STOP for approval)
1. Quote the current selector + Next-up code and the `sessionCount` source. Confirm the gating
   invariant above with a concrete walk-through of the climb-back case (earned Phase 3 → select
   Phase 1 → return to Phase 3, all reachable).
2. Native `<select disabled option>` on mobile: confirm behavior and that the selected value can
   never be a disabled option. If a native disabled option is unreliable, propose the minimal
   alternative (existing components only).
3. Touch C design: exact trigger, placement, copy, and why it won't be noisy for legitimate
   back-navigation.
4. Test plan (pure helpers only — no component-render tests, no new deps): the gating
   invariant incl. the no-lockout-trap property, and any mismatch predicate. Premise-proof
   assertions (thresholds via the constant, per repo convention).
5. Risk list: the circular use of the mutable `phase` as its own gating reference; whether a
   data-layer log guard is warranted (recommend, don't default it in — keep W27 UI-scoped unless
   the diagnostic finds the UI gate insufficient).

## PHASE 2 — IMPLEMENT (only after approval)
- `npm ci` only; `npm test` and `npm run build` green; existing tests unmodified unless a shape
  addition is declared. Live-verify in the browser like prior W-items (selector disables the
  right options; Next-up shows the phase; mismatch badge appears/clears correctly).
- Manual checklist for the user (on-device): can't select an unearned phase · Next-up shows the
  phase · stale-phase warning appears when selector ≠ last logged phase and clears when corrected ·
  a normal same-phase session logs exactly as before.

Commit: `feat: phase logging integrity — gate selector + surface phase (W27)`.
