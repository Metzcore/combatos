# W6 — Directory Reorg Diagnostic (Report)

_Read-only survey. Branch at time of writing: `chore/hygiene-batch` (HEAD `442ffa4`). No changes made. Feeds decision D5 (RULED: move durable docs to tracked homes)._

---

## 1. Current-state map

### Root level

| item | what it is | git status | verdict |
|---|---|---|---|
| `.gitignore` | ignore rules | tracked | keep, edit (see §2) |
| `audit_playbook.py` | live tooling — validates `playbook.csv` before CSV→JS conversion | tracked | keep at root (or `scripts/`, optional) |
| `playbook.csv` | live data source for the app's playbook (feeds `csv_to_js.py`) | tracked | keep at root — do not move casually, verify no path assumes root (see Risk list) |
| `app/` | the React+Vite PWA — live code | tracked (38 files) | keep |
| `archive/legacy-spreadsheet-system/` | retired Sheets/Apps-Script system (W2 already archived it here) | tracked | keep — already correctly placed |
| `archive/camp-1/` | empty directory, no tracked files | untracked (empty, git doesn't track dirs) | investigate — if genuinely empty, remove; if it has untracked content, inventory it before the reorg branch starts |
| `database/fight-log-schema.md` | schema doc for the Sheet-backed fight log, referenced by roadmap `0.2` | tracked | **move** → `docs/reference/fight-log-schema.md` (durable reference doc, small, belongs with other reference material) |
| `scripts/csv_to_js.py` | live tooling, playbook build step | tracked | keep |
| `scripts/webhook.gs` | live tooling, Apps Script webhook source (deployed copy lives in Google, this is the source of truth copy) | tracked | keep |
| `docs/handoff.md` | session-continuity, Pending section | **untracked** | **track** — move into git per D5 |
| `docs/decision_log.md` | session-continuity, decision history | **untracked** | **track** — move into git per D5 |
| `STATUS.md` | session-continuity, 30-second orientation | **untracked** | **track** — move into git per D5 |
| `SCRATCH-NOTEPAD.md` | personal scratch, empty | ignored (`.gitignore:8`) | stays ignored — correctly scratch |
| `.agents/skills/*/SKILL.md` (2 files) | Combat-OS-scoped Claude Code skills (sunshine/goodnight) | **untracked** | **track** — these are portable-with-the-repo tooling per the decision log's own rationale ("project-scoped keeps them portable with the repo"); currently invisible on GitHub, contradicting that stated intent |
| `docs/` (dir itself) | intended home for durable docs | untracked (dir; only its 2 files are tracked/untracked individually) | keep, becomes primary docs home |
| `mcps/` | cached MCP tool-schema JSON (105 files, GitHub/Calendar/Tasks connector definitions) — appears to be tooling-generated cache, not authored content | untracked | **do not move into docs** — this is not project documentation. Recommend `.gitignore` it (or delete if regenerable) rather than track or reorganize it |
| `terminals/` | ephemeral CLI session artifacts (`.next-id` counter, numbered `.txt` transcripts of ad hoc shell scans) | untracked | scratch — **add to `.gitignore`**, do not track |
| `dev_files/` | planning/reference workspace, see full inventory in §2 | **ignored** (`.gitignore:7`) | **partially untrack per D5** — durable subset moves to `docs/`, throwaway subset stays ignored |

### Notable non-standard state (found during survey, not part of the requested inventory but relevant)

- `.claude/worktrees/agent-a1f8a5eb3dfb635e6/` is a **locked git worktree** for branch `chore/github-kit` (`git worktree list` confirms, locked). It is untracked from the main tree's perspective (`.claude/` is untracked) but is a live, separate checkout — **do not touch, move, or delete anything under `.claude/`** in the reorg; it belongs to a different, in-progress workstream.
- `.claude/settings.local.json` is untracked but matched by a **global** gitignore rule (`C:\Users\Doble P/.config/git/ignore:3`), not this repo's `.gitignore`. Leave as-is; out of scope for this repo's `.gitignore` edits.

---

## 2. Full `dev_files/` inventory (currently 100% gitignored, 0 git history on any path under it)

| item | classification | verdict |
|---|---|---|
| `CHECKLIST.md` | durable — long-arc Project A/B sequencing, actively referenced by the `sunshine`/`goodnight` skills and `ROADMAP.md` | **move** → `docs/planning/CHECKLIST.md` |
| `roadmap/00-CORRECTED-UNDERSTANDING.md` | durable — architect-session deliverable 1 | **move** → `docs/planning/roadmap/00-CORRECTED-UNDERSTANDING.md` |
| `roadmap/ROADMAP.md` | durable — the sequenced roadmap, actively in use | **move** → `docs/planning/roadmap/ROADMAP.md` |
| `roadmap/OPEN-DECISIONS.md` | durable — decision record (D1–D7), actively in use | **move** → `docs/planning/roadmap/OPEN-DECISIONS.md` |
| `roadmap/prompts/W01…W18-*.md` (18 files) | durable — per-item worker prompts, actively in use / referenced by ROADMAP.md | **move** → `docs/planning/roadmap/prompts/` (as a block) |
| `roadmap/W06-REORG-REPORT.md` | **this report** — durable once written | **move** as part of the `roadmap/` block above |
| `therealworld-app-references/checklist_ui_specification.md` | durable UI/UX reference spec, actively cited (D4, W12) | **move** → `docs/reference/therealworld-app-references/checklist_ui_specification.md` |
| `therealworld-app-references/mobile_app_architecture_spec.md` | durable UI/UX reference spec, actively cited (D3, nav-IA redesign) | **move** → `docs/reference/therealworld-app-references/mobile_app_architecture_spec.md` |
| `Priming-High-tier-model/combatos-brainstorm-brief-v2.md` | durable-ish — input brief that produced the roadmap; historical/provenance value, not actively read by future sessions | **move** → `docs/planning/priming/` (archival, keeps provenance) |
| `Priming-High-tier-model/combatos-context-pack-prompt.md` | same as above | **move** → `docs/planning/priming/` |
| `Priming-High-tier-model/combatos-goal-statement-prompt.md` | same as above | **move** → `docs/planning/priming/` |
| `combat-os-backport/AGENT_PROMPT.md` | **completed** migration-kit prompt (per STATUS.md/CHECKLIST, both backports shipped in `3caf4ca`) — historical, not active | **archive** → `archive/combat-os-backport-kit/` (mirrors how legacy-spreadsheet-system was archived in W2) |
| `combat-os-backport/FEATURE_BACKPORT_DIAGNOSTIC_PROMPT.md` | completed, historical | **archive** → `archive/combat-os-backport-kit/` |
| `combat-os-backport/MIGRATION_GUIDE.md` | completed, historical | **archive** → `archive/combat-os-backport-kit/` |
| `combat-os-backport/reference_files/*.jsx,*.css` (4 files) | completed, historical — snapshot of Apex Protocol source files used as backport reference | **archive** → `archive/combat-os-backport-kit/reference_files/` |
| `REVAMP/*.txt` (5 files) | one-off exploratory directory-tree / inventory dumps, superseded by this very report and by `ROADMAP.md`/`00-CORRECTED-UNDERSTANDING.md` | **throwaway** — safe to delete, or keep in local scratch if the developer wants provenance; recommend leaving in `dev_files/` (stays ignored) rather than promoting |
| `answers-agent_projectB_1.md` | one-off session transcript (agent Q&A) | **throwaway** — stays in `dev_files/` (ignored) |
| `answers_agent__phase_A.1.md` … `.3.md`, `answers_agent_phase_A3.1.md` | one-off session transcripts | **throwaway** — stays ignored |
| `answers_from_agent_1.1.md` … `1.5.md`, `answers_from_agent_1.md` | one-off session transcripts | **throwaway** — stays ignored |
| `apex-protocol-daily-ignition.md` | reference doc for a shipped feature (Daily Ignition) — borderline: feature already shipped and documented in commit history/CHECKLIST, but content may be useful if Project B revives Apex-specific ignition content | **judgment call** — recommend **archive** → `archive/combat-os-backport-kit/` (groups with the other Apex-derived historical material) rather than promoting to docs/, since Project A's shipped version needs no external spec anymore |
| `parse_ignition.js` | one-off script, adjunct to the ignition doc above | **throwaway/archive** — bundle with `apex-protocol-daily-ignition.md` if archived, otherwise leave in `dev_files/` |
| `NOTEPAD` | empty scratch file, explicitly gitignored by name (`.gitignore:9`) | stays ignored, stays put |

**Net effect:** `dev_files/` shrinks from 39 files to roughly 10 (REVAMP dumps, answers_* transcripts, NOTEPAD) — genuinely throwaway, correctly invisible to GitHub.

---

## 3. `docs/`, `database/`, `terminals/`, `mcps/`, `.agents/` — purpose and tracked status

| dir | purpose | tracked? | verdict |
|---|---|---|---|
| `docs/handoff.md` | session Pending-list, written/read by sunshine/goodnight skills | untracked | track (D5) |
| `docs/decision_log.md` | decision history | untracked | track (D5) |
| `database/fight-log-schema.md` | schema reference for the Sheet-backed log | tracked | move under `docs/reference/` for discoverability (currently the only doc-like content living outside `docs/`) |
| `terminals/.next-id`, `terminals/1.txt` | ad hoc PowerShell scan transcripts/counter, generated by some tool/session for one-off directory surveys | untracked | scratch — gitignore it, do not track |
| `mcps/github/…`, `mcps/google_calendar/…`, `mcps/tasks/…` (105 JSON files) | cached tool-schema definitions for connected MCP servers (GitHub, Calendar, Tasks) — machine-generated cache, not authored project documentation | untracked | gitignore (or delete if the tool regenerates it on demand) — do not fold into `docs/` |
| `.agents/skills/combatos-goodnight/SKILL.md` | Claude Code skill, session close | untracked | track (D5 rationale: "keeps them portable with the repo" only holds if actually committed) |
| `.agents/skills/combatos-sunshine/SKILL.md` | Claude Code skill, session open | untracked | track (same) |

---

## 4. Durable-but-local-only items (the D5 problem, concretely)

Everything below exists **only on this machine** today and would be lost with the laptop:

- `STATUS.md`, `docs/handoff.md`, `docs/decision_log.md` — the entire session-continuity system
- `.agents/skills/combatos-goodnight/SKILL.md`, `.agents/skills/combatos-sunshine/SKILL.md` — the skills that read/write the above
- All of `dev_files/CHECKLIST.md`, `dev_files/roadmap/**` (23 files) — the entire planning layer, including this report until it's moved
- `dev_files/therealworld-app-references/*.md` — the two UI/UX specs the developer believed were already in `docs/` (the concrete proof case named in the task)
- `dev_files/combat-os-backport/**` — historical but arguably worth preserving in the tracked `archive/` tree rather than only-local, for the same reason `archive/legacy-spreadsheet-system/` was tracked in W2

---

## 5. Proposed target structure

```
Fight-Camp/
├── .gitignore
├── STATUS.md                              (tracked — moved from untracked root)
├── audit_playbook.py
├── playbook.csv
├── app/                                   (unchanged)
├── scripts/
│   ├── csv_to_js.py
│   └── webhook.gs
├── archive/
│   ├── legacy-spreadsheet-system/         (unchanged — already correct)
│   └── combat-os-backport-kit/            (NEW — moved from dev_files/combat-os-backport/)
│       ├── AGENT_PROMPT.md
│       ├── FEATURE_BACKPORT_DIAGNOSTIC_PROMPT.md
│       ├── MIGRATION_GUIDE.md
│       ├── apex-protocol-daily-ignition.md
│       ├── parse_ignition.js
│       └── reference_files/
│           ├── RoundsTimer.jsx
│           ├── Settings.jsx
│           ├── db_index.jsx
│           └── index.css
├── docs/
│   ├── handoff.md                         (tracked — moved from untracked)
│   ├── decision_log.md                    (tracked — moved from untracked)
│   ├── planning/                          (NEW — tracked planning layer, per D5)
│   │   ├── CHECKLIST.md
│   │   ├── priming/
│   │   │   ├── combatos-brainstorm-brief-v2.md
│   │   │   ├── combatos-context-pack-prompt.md
│   │   │   └── combatos-goal-statement-prompt.md
│   │   └── roadmap/
│   │       ├── 00-CORRECTED-UNDERSTANDING.md
│   │       ├── ROADMAP.md
│   │       ├── OPEN-DECISIONS.md
│   │       ├── W06-REORG-REPORT.md
│   │       └── prompts/
│   │           └── W01…W18-*.md            (18 files, unchanged names)
│   └── reference/                          (NEW — tracked reference material, per D5)
│       ├── fight-log-schema.md             (moved from database/)
│       └── therealworld-app-references/
│           ├── checklist_ui_specification.md
│           └── mobile_app_architecture_spec.md
├── .agents/
│   └── skills/
│       ├── combatos-goodnight/SKILL.md     (tracked — moved from untracked)
│       └── combatos-sunshine/SKILL.md      (tracked — moved from untracked)
└── dev_files/                              (stays gitignored — shrinks to genuine scratch)
    ├── NOTEPAD
    ├── REVAMP/                             (one-off inventory dumps — superseded, keep or delete at will)
    ├── answers-agent_projectB_1.md
    ├── answers_agent__phase_A.1.md
    ├── answers_agent__phase_A.2.md
    ├── answers_agent__phase_A.3.md
    ├── answers_agent_phase_A3.1.md
    ├── answers_from_agent_1.1.md
    ├── answers_from_agent_1.2.md
    ├── answers_from_agent_1.3.md
    ├── answers_from_agent_1.4.md
    ├── answers_from_agent_1.5.md
    └── answers_from_agent_1.md

(directories to gitignore, not track, not move into docs/)
terminals/      → scratch, add to .gitignore
mcps/           → generated cache, add to .gitignore (or delete + regenerate)
```

Note: `database/` disappears as a directory once its one file moves — fine, it only ever held one file.

### `.gitignore` after the reorg

```gitignore
node_modules/
dist/
.env
.env.local
.DS_Store
.gemini/
*.log

# genuinely-local scratch — durable docs have been promoted out of dev_files/
dev_files/
SCRATCH-NOTEPAD.md
dev_files/NOTEPAD

# ephemeral session/tooling artifacts
terminals/
mcps/
```

Everything else that was untracked (`STATUS.md`, `docs/`, `.agents/`) gets **added and committed**, not ignored — that is the entire point of D5.

---

## 6. Exact commands (sequenced, for a future `chore/reorg` branch)

Assume branch `chore/reorg` already exists and is checked out (not created by this report). Run from repo root.

```bash
# --- 1. Create new tracked directory skeleton ---
mkdir -p docs/planning/priming
mkdir -p docs/planning/roadmap/prompts
mkdir -p docs/reference/therealworld-app-references
mkdir -p archive/combat-os-backport-kit/reference_files

# --- 2. Track existing untracked session-continuity files (no path change) ---
git add STATUS.md docs/handoff.md docs/decision_log.md
git add .agents/skills/combatos-goodnight/SKILL.md .agents/skills/combatos-sunshine/SKILL.md

# --- 3. Move database/ reference doc into docs/reference/ ---
git mv database/fight-log-schema.md docs/reference/fight-log-schema.md
# database/ directory now empty and disappears automatically from git's perspective

# --- 4. Un-ignore and move the durable dev_files/ planning layer ---
# (must happen in one commit with the .gitignore edit below, or git add will
#  refuse/silently skip because dev_files/ is still ignored at mv time —
#  edit .gitignore FIRST, then git add -f as a safety net, then mv)

git mv dev_files/CHECKLIST.md docs/planning/CHECKLIST.md
git mv dev_files/roadmap/00-CORRECTED-UNDERSTANDING.md docs/planning/roadmap/00-CORRECTED-UNDERSTANDING.md
git mv dev_files/roadmap/ROADMAP.md docs/planning/roadmap/ROADMAP.md
git mv dev_files/roadmap/OPEN-DECISIONS.md docs/planning/roadmap/OPEN-DECISIONS.md
git mv dev_files/roadmap/W06-REORG-REPORT.md docs/planning/roadmap/W06-REORG-REPORT.md
git mv dev_files/roadmap/prompts docs/planning/roadmap/prompts   # moves all 18 files as a block
git mv dev_files/Priming-High-tier-model/combatos-brainstorm-brief-v2.md docs/planning/priming/combatos-brainstorm-brief-v2.md
git mv dev_files/Priming-High-tier-model/combatos-context-pack-prompt.md docs/planning/priming/combatos-context-pack-prompt.md
git mv dev_files/Priming-High-tier-model/combatos-goal-statement-prompt.md docs/planning/priming/combatos-goal-statement-prompt.md
rmdir dev_files/Priming-High-tier-model dev_files/roadmap 2>/dev/null || true

# --- 5. Move the two TRW reference specs ---
git mv dev_files/therealworld-app-references/checklist_ui_specification.md docs/reference/therealworld-app-references/checklist_ui_specification.md
git mv dev_files/therealworld-app-references/mobile_app_architecture_spec.md docs/reference/therealworld-app-references/mobile_app_architecture_spec.md
rmdir dev_files/therealworld-app-references 2>/dev/null || true

# --- 6. Archive the completed backport kit (historical, tracked) ---
git mv dev_files/combat-os-backport/AGENT_PROMPT.md archive/combat-os-backport-kit/AGENT_PROMPT.md
git mv dev_files/combat-os-backport/FEATURE_BACKPORT_DIAGNOSTIC_PROMPT.md archive/combat-os-backport-kit/FEATURE_BACKPORT_DIAGNOSTIC_PROMPT.md
git mv dev_files/combat-os-backport/MIGRATION_GUIDE.md archive/combat-os-backport-kit/MIGRATION_GUIDE.md
git mv dev_files/combat-os-backport/reference_files/RoundsTimer.jsx archive/combat-os-backport-kit/reference_files/RoundsTimer.jsx
git mv dev_files/combat-os-backport/reference_files/Settings.jsx archive/combat-os-backport-kit/reference_files/Settings.jsx
git mv dev_files/combat-os-backport/reference_files/db_index.jsx archive/combat-os-backport-kit/reference_files/db_index.jsx
git mv dev_files/combat-os-backport/reference_files/index.css archive/combat-os-backport-kit/reference_files/index.css
git mv dev_files/apex-protocol-daily-ignition.md archive/combat-os-backport-kit/apex-protocol-daily-ignition.md
git mv dev_files/parse_ignition.js archive/combat-os-backport-kit/parse_ignition.js
rmdir dev_files/combat-os-backport 2>/dev/null || true

# --- 7. Edit .gitignore: narrow the dev_files/ blanket ignore, add terminals/ + mcps/ ---
# Manual edit — replace the current 8 lines with:
#   node_modules/
#   dist/
#   .env
#   .env.local
#   .DS_Store
#   .gemini/
#   *.log
#   dev_files/
#   SCRATCH-NOTEPAD.md
#   dev_files/NOTEPAD
#   terminals/
#   mcps/
# (dev_files/ rule is intentionally still blanket — everything durable has
#  already been moved OUT of it in steps 4-6, so re-ignoring the now-smaller
#  directory is safe and simpler than an allowlist.)

git add .gitignore

# --- 8. Stage everything left in dev_files/ that should stay ignored ---
# Nothing to add — it's ignored again by step 7. Verify with:
git status --ignored

# --- 9. Commit ---
git add -A
git commit -m "docs: track session-continuity and planning docs per D5, archive completed backport kit"
```

### Follow-up edits required after the moves (hardcoded-path breakage)

Searched `.agents/skills/`, `docs/`, and `dev_files/roadmap/` (pre-move) for hardcoded `dev_files/...` references. Found:

| file (post-move path) | reference to fix | fix |
|---|---|---|
| `docs/planning/roadmap/ROADMAP.md` (line ~2, ~4, ~13, ~45, ~54, ~55, ~56) | multiple `dev_files/CHECKLIST.md`, `dev_files/roadmap/prompts/`, `dev_files/therealworld-app-references/*.md` | update all to `docs/planning/CHECKLIST.md`, `docs/planning/roadmap/prompts/`, `docs/reference/therealworld-app-references/*.md` |
| `docs/planning/roadmap/OPEN-DECISIONS.md` (D5 section, D3, D4) | `dev_files/therealworld-app-references/mobile_app_architecture_spec.md`, `dev_files/therealworld-app-references/checklist_ui_specification.md`, `dev_files/CHECKLIST.md` | update paths to `docs/reference/therealworld-app-references/...` and `docs/planning/CHECKLIST.md` |
| `docs/planning/roadmap/00-CORRECTED-UNDERSTANDING.md` (line 23) | prose reference to `dev_files/` as the ignored blanket | update prose — it's no longer accurate post-reorg; note the new split (docs/planning + docs/reference tracked, dev_files/ scratch-only) |
| `docs/planning/roadmap/prompts/W04-core-docs.md` (line 7) | "do not trust older planning docs in `dev_files/`" | update to `docs/planning/` (the instruction's intent — don't trust planning docs over live code — still holds, just at the new path) |
| `docs/planning/roadmap/prompts/W06-reorg-diagnostic.md` (lines 11, 17) | references `dev_files/` inventory framing | this file is the original W6 prompt itself — leave as historical record of what was asked, OR add a note that it's superseded by `W06-REORG-REPORT.md`'s actual findings |
| `docs/planning/roadmap/prompts/W18-custom-skills.md` (line 17) | "Derive... not from planning docs in `dev_files/`" | update to `docs/planning/` |
| `.agents/skills/combatos-goodnight/SKILL.md` (line 119), `.agents/skills/combatos-sunshine/SKILL.md` (lines 3, 17, 23) | bare `CHECKLIST.md` (no path prefix) | **pre-existing bug, independent of this reorg**: both skills reference `CHECKLIST.md` as if at repo root, but it has always lived at `dev_files/CHECKLIST.md` (soon `docs/planning/CHECKLIST.md`). Fix to explicit `docs/planning/CHECKLIST.md` while editing these files for tracking anyway |
| `.agents/skills/combatos-sunshine/SKILL.md` (line 46) | "read `README.md` and `AGENTS.md`" | not a dev_files path, but note: neither file exists yet at repo root (per D6, they're pending W4) — not a reorg break, just a standing gap, flagging for awareness only |

No references to `dev_files/` were found in `app/` source code (only false-positive-free matches on `database/` and generic strings in `usePlaybook.js`/`playbook.js`, neither of which point at `dev_files` or `database/fight-log-schema.md` — the schema doc is descriptive documentation, not imported at runtime). `scripts/csv_to_js.py` and `scripts/webhook.gs` were checked and contain no references to `dev_files/`, `database/`, or `docs/`.

---

## 7. Risk list

| risk | how verified |
|---|---|
| `git mv` on files still matched by `.gitignore` (`dev_files/**`) may silently no-op or require `-f` | Confirmed via `git check-ignore -v dev_files` that the whole tree is ignored by `.gitignore:7`. Sequencing in §6 edits `.gitignore` in the same logical change; if commands are run in a different order, use `git add -f` as a safety net before `git mv`, or simply do the `.gitignore` edit (step 7) before steps 4-6 instead of after. |
| `playbook.csv` or `audit_playbook.py` assume repo-root-relative paths that could break if moved | Not moved in this proposal — left at root deliberately. Confirmed via grep that `app/src/hooks/usePlaybook.js` and `app/src/data/playbook.js` reference no `dev_files/database/scripts` paths (the app's own CSV lives inside `app/src/data/`, a separate copy already flagged as redundant in W2/ROADMAP.md line 17 — out of scope here, already handled). |
| `database/fight-log-schema.md` move breaks a reference | Grepped `app/`, `scripts/`, `.agents/skills/` for `fight-log-schema` and `database/` — zero hits outside `dev_files/roadmap/ROADMAP.md`'s prose mention of "against `database/fight-log-schema.md`" (line 12), which needs the same path-prefix fix as the other roadmap references (added to §6 table). |
| `.agents/skills/*/SKILL.md` referencing bare `CHECKLIST.md` | Confirmed via grep — pre-existing broken/ambiguous reference, not introduced by this reorg, but the reorg touches these files anyway (to track them) so it's the natural point to fix it. |
| Untracked `.claude/worktrees/agent-a1f8a5eb3dfb635e6/` locked worktree for branch `chore/github-kit` | Confirmed via `git worktree list` — it is a separate, locked, in-progress checkout. **No command in §6 touches `.claude/`.** Any reorg branch work must not merge/rebase in a way that conflicts with that worktree's pending branch; treat as fully out of scope. |
| `archive/camp-1/` — empty directory of unknown origin | Listed but not inventoried further (task scope was root/dev_files/docs/database/terminals/mcps/.agents). Flagged as needing a human look before the reorg branch runs, since its emptiness could mean either "already cleaned" or "content not yet committed and now missing." Recommend `ls -la archive/camp-1` as a first step on the reorg branch before doing anything else with it. |
| `mcps/` and `terminals/` reclassified as ignore-worthy rather than doc-worthy | Judgment call, not verified against an authoritative source — `mcps/*.json` structurally matches auto-generated MCP tool-schema caches (uniform `{name, description, inputSchema}` shape across 105 files, mirrors known MCP server tool lists), and `terminals/*.txt` contains raw PowerShell scan output with a `.next-id` counter file, consistent with session-scratch tooling rather than authored docs. If either is actually hand-maintained/durable, move to `docs/reference/` instead of gitignoring — recommend the developer confirm before running step 7. |
| Report file's own path moves in step 4 | This report is written to `dev_files/roadmap/W06-REORG-REPORT.md` per the task instructions (the one permitted write) and is included in the proposed `git mv` into `docs/planning/roadmap/` alongside its siblings — no special handling needed beyond what's already in the command block. |

---

## Summary of verdicts by volume

- **18 files** get tracked with no path change (`STATUS.md`, `docs/handoff.md`, `docs/decision_log.md`, 2 skill files, 23 roadmap/planning files minus path change... see exact list in §6)
- **9 files** move with a path change into `docs/planning/` or `docs/reference/`
- **9 files** move with a path change into `archive/combat-os-backport-kit/` (completed migration kit)
- **~15 files** stay in `dev_files/`, correctly ignored (transcripts, REVAMP dumps, NOTEPAD)
- **2 directories** (`terminals/`, `mcps/`) newly added to `.gitignore`, previously untracked-and-uncategorized
