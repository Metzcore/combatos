# Deliverable 1 — Corrected Understanding
_Produced by the Fable 5 architect session, 2026-07-10. Every claim below was verified directly against the working tree at commit `3caf4ca` (+ uncommitted changes)._

## The headline correction

**Both backports described as "pending" in the context pack, the brief, and `docs/handoff.md` are already fully implemented and committed** (commit `3caf4ca` — "feat: implement soft delete logging, concurrent sync locks, and UI timer/HUD improvements"):

| Claimed status | Actual status | Evidence |
|---|---|---|
| Visual backport "ready to execute" | **Shipped** | Phase colors in `RoundsTimer.jsx:130`; tactical amber `#E8A020` as `--accent`/`--blue` in `index.css:14`; `volume = 1.0` in `db/index.jsx:119,121`; all 3 iOS PWA meta tags in `app/index.html:8-10` |
| "Delete Last Logged Day" — diagnostic not yet run, design fork open | **Shipped** | `deleteLastSession()` at `db/index.jsx:431`, wired into `Settings.jsx`; `webhook.gs` handles `action:'delete'` |
| "Next Day" indicator — needs day-structure analysis first | **Shipped** | `HUD.jsx:72`: `const nextDay = (lastSession.day % 6) + 1` |

**Both of the brief's explicitly-open design forks were resolved silently by that implementation** — the exact failure mode Section 8 of the brief warns against:

1. **Delete is HARD, not soft, on both ends.** Local Dexie record is deleted outright; `webhook.gs` does `log.deleteRow()`. The commit message says "soft delete" (wrong), and webhook.gs's own header says "strikes it through on delete" (also wrong — the code comments say hard deletion was chosen deliberately to avoid formatting-inheritance bugs). → Open decision **D1**.
2. **Next Day is the naive wrap the brief says it "cannot be."** `(day % 6) + 1` counts all six days, including fight-gym days. Mitigating nuance: CombatOS's fight-gym days (days 2 and 4 — `usePlaybook.js:15`) are real, loggable sessions via `FightGymDay.jsx`, so counting them is defensible, not obviously a bug. But nothing shows the question was consciously examined. → Open decision **D2**.

## Documentation claims that don't hold

- **`README.md`, `AGENTS.md`, `ARCHITECTURE.md` do not exist anywhere in the repo**, despite both the context pack and brief §0/§6 saying they were "created and accurate as of this writing." Likely drafted in another session and never written to disk (same status as the GitHub starter kit, which the brief correctly marks "drafted, not yet placed"). → Work item W4.
- **`build_error.log` is not "addressed"**: still tracked in git (`git ls-files` confirms) and not matched by any `.gitignore` rule. The `.gitignore` fix itself is modified-but-uncommitted. → W1.
- **(Historical — resolved by D5/W6)** `.gitignore` used to ignore ALL of `dev_files/` — meaning CHECKLIST.md, both backport kits, the REVAMP exploration, the priming prompts, and this roadmap were invisible to GitHub. Directly conflicted with the intended "architect writes plans into GitHub issues; workers execute" flow. → Open decision **D5**, executed in the W6 reorg: durable docs now live under tracked `docs/planning/` and `docs/reference/`; `dev_files/` remains gitignored but now holds only genuine scratch (REVAMP dumps, one-off transcripts, NOTEPAD).

## Smaller factual corrections

- **The bottom nav has 5 tabs, not 6** (HUD, Timer, Log, Playbook, Settings — `BottomNav.jsx`). The "at capacity" concern is real but one slot softer than stated. Feeds decision **D3**.
- **`papaparse` is an unused dependency.** Nothing in `app/src` imports it; the app consumes pre-generated `playbook.js`. The brief's "papaparse for CSV handling" is stale. The `usePlaybook.js` header comment ("Parses the bundled playbook.csv") is also stale.
- **`app/src/data/playbook.csv` is a redundant, byte-identical duplicate of root `playbook.csv`.** `csv_to_js.py` reads the ROOT copy and writes `playbook.js`; nothing imports the app-side CSV. Both are tracked in git. → W2.
- **`webhook.gs` header is doubly stale**: points to `src/sync/syncQueue.js` (doesn't exist — `app/src/sync/` is empty, the half-done refactor) and describes strikethrough delete (code does hard delete). → W3, W7.
- **Root `.gs` duplicates confirmed byte-identical** to `scripts/` copies (hash-verified). Safe to consolidate. → W2.
- **`database/fight-log-schema.md` exists** (mentioned in neither document) — schema notes for the FightLog sheet; relevant to the data-review task and any Supabase discussion.
- Fight-log day structure, confirmed: 6-day cycle per phase; playbook CSV defines days 1/3/5/6 (S&C); days 2/4 are fight-gym days synthesized by `usePlaybook`; 3 phases.
- `webhookUrl` is a hardcoded default in the Dexie `settings` store (`db/index.jsx:32`), not user-entered.
- `sunshine`/`goodnight` skills verified at `.agents/skills/` ✓. Remote is `github.com/Metzcore/combatos` ✓. No `.github/` folder ✓. Legacy files still at root; `archive/` holds only an empty `camp-1/` ✓.

## Continuity-file conflict check (per the goal statement's "one more thing")

STATUS.md / handoff.md / decision_log.md all confirm this priming session **is** today's priority — no conflict. The one stale instruction: handoff.md's "sequence… both pending backports into it" is superseded by the fact both shipped. The roadmap (Deliverable 2) sequences their *ratification* (D1/D2) instead of their implementation.
