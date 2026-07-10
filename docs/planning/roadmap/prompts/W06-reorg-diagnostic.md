# W6 — Directory Reorg Diagnostic · Tier: IMPL (read-only)

> NOTE: executed — findings and final structure in ../W06-REORG-REPORT.md. Paths in this prompt reflect the pre-reorg layout.

**Instructions for the User:** paste everything below the dashed line into a fresh session. This is READ-ONLY — the output is a report, not changes. Its findings feed decision D5 (should the planning layer be tracked in git?).

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. **READ-ONLY DIAGNOSTIC — make zero changes.** Survey the repo layout and produce a reorganization proposal.

### SURVEY
1. Inventory root-level files/folders and classify each: live code / live tooling / planning-and-session docs / personal scratch / legacy (post-W2 state) / unknown.
2. Inventory `dev_files/` fully (it is gitignored — note that in the report): which contents are durable project knowledge (CHECKLIST.md, roadmap/, backport kit) vs. one-off transcripts (answers_*.md) vs. scratch.
3. Inventory `docs/`, `database/`, `terminals/`, `mcps/`, `.agents/` — what each is for, whether tracked.
4. Check what is tracked vs. ignored vs. untracked (`git status`, `.gitignore`), and flag anything durable that exists ONLY on this machine.

### REPORT (the deliverable)
1. **Current-state map** — one line per root item: what it is, tracked?, verdict (keep / move / archive / ignore).
2. **Proposed target structure** — a concrete tree. Constraints: `docs/` for durable docs (handoff/decision_log stay put); a home for planning docs IF the developer chooses to track them (present both a "tracked in docs/planning/" and a "stays local in dev_files/" variant — the choice is decision D5, not yours); `dev_files/` reduced to genuinely-local scratch; no moves that break `scripts/csv_to_js.py`, `app/` paths, or the `.agents/skills` location.
3. **Exact commands** (`git mv` etc.) for each variant, sequenced, with a note on anything that needs a follow-up edit (e.g. paths referenced inside skills or docs).
4. **Risk list** — anything where a move could break something, with how you verified.

Do not execute anything. End with the report.
