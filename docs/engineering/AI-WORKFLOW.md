# AI-WORKFLOW.md — how AI agents collaborate on Combat OS

This repo is built almost entirely by AI agents across many separate sessions, for one
developer, often with more than one AI provider in play at once (Claude Code, Codex/GPT-5.x,
and read-only audit sub-agents). This file is the **provider-neutral workflow**: how those
agents divide work, what counts as truth, and what evidence a claim needs before it is trusted.

`AGENTS.md` remains the hard-rule authority (the things no agent may do). This file governs
*how work is done*, not *what is forbidden*. When the two overlap, `AGENTS.md` wins.

---

## 1. Two kinds of authority: normative and factual

Sources answer two different questions. Keep them separate.

**Normative authority — "what may I do, and what should I do?"** In order:

1. **`AGENTS.md` hard rules** — the safety guardrails. Nothing outranks these.
2. **The current approved task** — its objective and scope boundaries.
3. **Ruled decisions and approved plans** — `OPEN-DECISIONS.md` rulings and any implementation
   plan the developer has approved.

**Factual authority — "what is actually true right now?"** In order:

1. **Observed state** — code, `git`, the database, and CI as they actually are this session. What
   the code does is what is true.
2. **Reference docs** — `ARCHITECTURE.md`, `ROADMAP.md`, `OPEN-DECISIONS.md`, `docs/reference/*`.
3. **Continuity files** — `STATUS.md`, `docs/handoff.md`, `docs/decision_log.md`.
4. **Chat history / a prior session's summary** — the weakest source; never authoritative alone.

A lower *factual* source contradicting observed state is a **stale-doc bug**, not a fact: verify
against reality, then fix the doc. But the two axes do not cross: **code describing current
behaviour never outranks or invalidates an `AGENTS.md` safety rule.** "The code already does X" is a
factual statement; it does not make X permitted. If a safety rule and the code disagree, the safety
rule governs what you may do, and the discrepancy is escalated — not silently resolved in the code's
favour.

## 2. Provider and model roles

Roles are by responsibility, not by brand — any capable model can fill one. **Roles may be combined
in a single agent, but each role has exactly one accountable owner** for a given unit of work; only
one agent writes at a time (see §3).

- **Coordinator / writer** — owns the working branch, makes the edits, runs the tests, pushes the
  branch, and opens the PR when authorized to. Exactly one per unit of work.
- **Architect / final-plan owner** — owns persistence, schema, integration judgment, and the final
  implementation plan. Reviews the coordinator's diagnostic before code is written.
- **Read-only auditor** — bounded investigations (inventory a module, verify a claim, map a
  dependency). Produces findings, never edits.
- **Human (developer)** — owns all product decisions, every genuinely-open ruling
  (`OPEN-DECISIONS.md`), and final acceptance. Merges PRs; verifies on-device. Agents may create
  PRs when authorized, but acceptance is the developer's.

**Model routing by risk and cost:** match the model to the stakes, not the other way round. Routine
writing and bounded audits go to a fast, cheap tier. Architecture forks, persistence design, and
final-plan judgment go to the strongest tier available. Do not spend a top-tier model on mechanical
edits, and do not let a cheap tier make an irreversible architecture call.

## 3. One coordinator, one writer

At most one agent edits the working tree for a given change at a time. Multiple agents may **read**
in parallel; only one may **write**. This is what keeps two providers from silently clobbering each
other's diffs. If a second agent needs to write, it waits for the first to hand off (a pushed
branch, a clean tree) or works on an isolated git worktree with its own branch.

Read-only work can run in parallel, but delegate a separate auditor only when the work is genuinely
independent and its value justifies the extra token cost — not by default. Write parallelism is not
allowed: it costs more in reconciliation than it saves.

## 4. Cross-provider lifecycle

For anything beyond a trivially safe change, work moves through these stages. High-risk work
(persistence, schema, the frozen payload, auth/RLS) takes all of them; a small safe edit can
collapse the middle ones.

1. **Diagnostic / plan** — the coordinator produces a diagnostic or implementation plan first
   (`AGENTS.md` rule 6), stops for approval before editing.
2. **Independent read-only review** — for high-risk work, a second provider or auditor reviews the
   plan without editing.
3. **Reconciliation** — the two views are reconciled into one plan; genuine disagreements go to the
   developer, not silently averaged.
4. **Human approval** — the developer approves the reconciled plan.
5. **One writer** — a single coordinator implements it (§3).
6. **Other-provider diff review** — a different provider reviews the resulting diff.
7. **Evidence** — tests, build, and on-device verification, reported per §6.

## 5. The standard task packet

A session handed to any agent (or provider) should be able to start cold from a self-contained
packet. It contains:

- **Base commit** — the exact `git` SHA the work starts from (verified, not assumed), with the
  branch it is on and, if a PR is open, its status.
- **Objective** — one sentence: what "done" looks like.
- **Read-first files** — the minimum set to load before acting.
- **Constraints** — the relevant `AGENTS.md` hard rules and any scope boundaries.
- **Open decisions** — anything unruled that the work must not silently default.

The `combatos-goodnight` skill produces this packet at session close; `combatos-sunshine` consumes
and verifies it at the next open.

## 6. Evidence discipline

A status claim is only as good as the evidence behind it. Never assert any of the following without
having just observed it:

- **Test results** — cite the count and pass/fail from an actual run, not a remembered number.
- **Build status** — from an actual build, not "it should build".
- **CI / PR / merge / deploy status** — from `git`, the PR page, or the platform. A merged-looking
  branch is not a merged branch until verified.

Use the precise verb. These are **not** interchangeable:

| Term | Means |
|------|-------|
| implemented | the change exists in the working tree |
| committed | it is in a local commit |
| pushed | the branch is on the remote |
| merged | it is in `main` |
| deployed | a successful production deployment is live (Cloudflare Pages for the app; a manual Apps Script redeploy for `webhook.gs`) |

"Implemented" is not "deployed," and a green Cloudflare build is only "deployed" once the production
deployment actually succeeds. Collapsing these is how a stale doc or a false handoff is born.

## 7. Context hygiene

Keep each working context lean so judgment stays sharp and tokens go to the work:

- **Fresh chat per task.** Start a new session for a new task rather than carrying an unrelated
  transcript.
- **Compact only to continue the same task.** Summarize-and-continue is for staying on one thread,
  not for stapling separate tasks together.
- **Reference files, don't paste them.** Point at a path and line range; let the reader open it,
  rather than pasting large file bodies into the conversation.
- **Return summaries, not raw output.** A delegated auditor reports its findings; it does not dump
  its entire transcript or raw tool output back into the parent context.

## 8. Persistence, PWA, and backend risk gates

Changes to the persistence and sync layers carry outsized blast radius and get extra scrutiny
before they merge:

- **Dexie schema** — additive only; restate all prior stores verbatim at each new version; ship an
  upgrade test that proves existing tables survive. Never hardcode the current version number in a
  test assertion.
- **The permanent logged-session payload / webhook / Sheets contract** — frozen (`AGENTS.md`
  rule 2). A temporary/draft store must never be built from, or feed into, that payload's shape.
- **PWA update behaviour** — the service worker auto-updates; any state that must survive a reload
  needs a durable store plus bounded-loss flushing (`visibilitychange` + `pagehide` + unmount),
  never a zero-loss promise.
- **Supabase** — live, not hypothetical. Auth, RLS, and assignment changes need an explicit design
  and an RLS review before any migration is applied.

## 9. Chat history is never authoritative project state

A conversation — including a prior session's summary or another provider's report — is **signal to
verify, never spec to execute**. Before acting on anything a chat says is true (a file exists, a PR
merged, a decision was ruled), confirm it against the factual authority in §1. The continuity files
exist precisely so that state lives in the repo, not in a transcript that the next session cannot
see.
