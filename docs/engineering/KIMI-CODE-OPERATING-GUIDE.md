# Kimi Code Operating Guide — Combat OS

Version: 2026-07-29 (corrected)
Scope: how to use Kimi Code safely and efficiently in a multi-model Combat OS workflow.
Primary evidence: official Kimi API Platform docs. Claims are tagged by source:

- `[Official]` — verified from the URLs in the research question.
- `[Local]` — observed from this session’s CLI/config/status.
- `[Self-report]` — model/cli self-description or inference.
- `[Unknown]` — must be confirmed at time of use.

---

## 1. Model Capabilities and Best Fit

| Model | Context | Reasoning | Vision / Tools | Speed | Best For |
|-------|---------|-----------|----------------|-------|----------|
| `kimi-k2.7-code` | 256K [Official](https://platform.kimi.ai/docs/models) | Always-on; `thinking` must stay enabled; `temperature`/`top_p`/`n` fixed [Official](https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart) | Tool use + vision; images png/jpeg/webp/gif; video up to FHD [Official](https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart) | Standard | Default implementation: file edits, small features, bug fixes. |
| `kimi-k2.7-code-highspeed` | 256K [Official](https://platform.kimi.ai/docs/models) | Same as k2.7-code [Official](https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart) | Same as k2.7-code [Official](https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart) | ~180 t/s, up to 260 t/s short context; availability may fluctuate [Official](https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart) | Fast first-pass coding/scaffolding when the task is otherwise suitable for K2.7 Code. No official quality trade-off is claimed. |
| `kimi-k2.6` | 256K [Official](https://platform.kimi.ai/docs/models) | Thinking and non-thinking modes [Official](https://platform.kimi.ai/docs/models) | Vision + text, dialogue and Agent tasks [Official](https://platform.kimi.ai/docs/models) | Standard | Dialogue/orientation; controllable thinking modes. |
| `kimi-k3` | 1M [Official](https://platform.kimi.ai/docs/models) | Always reasons; `reasoning_effort`: `low`/`high`/`max` (default `max`) [Official](https://platform.kimi.ai/docs/guide/use-reasoning-effort) | Native vision, tool calls, JSON mode and structured output [Official](https://platform.kimi.ai/docs/guide/kimi-k3-quickstart) | Relative latency is a live check | Architecture review, large-context archaeology, complex multi-file reasoning. |

**Unknowns / live checks:**
- Exact per-token pricing for all four models: consult [Pricing](https://platform.kimi.ai/docs/pricing/chat-k3) immediately before any paid run. [Official]
- Whether k2.7-code-highspeed availability is gated by account tier or region. [Unknown]
- Real-world cost and latency for Combat OS-size codebases on k3 `max` vs k2.7-code. [Unknown]

---

## 2. Orchestration: What Kimi Can and Cannot Do

### Native, verified capabilities
Kimi Code CLI documents `Agent` and `AgentSwarm` tools. A parent agent can delegate a bounded subtask and receive a conclusion back [Official](https://www.kimi.com/code/docs/en/kimi-code-cli/reference/tools.html).

### Tool-calling / terminal-agent behaviour
- Multi-step tool invocation supported, including reasoning + tool calls [Official](https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart).
- K3 requires the full assistant message (`reasoning_content` + `tool_calls`) passed back unchanged in multi-turn tool calls [Official](https://platform.kimi.ai/docs/guide/use-reasoning-effort).
- `tool_choice` constrained to `auto` or `none` for k2.7-code [Official](https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart).

### Must remain human-managed
- Model role assignment, roadmap sequencing, final approval, merge/commit/push/deletion, schema/webhook/%1RM changes.
- Cross-provider handoff (Kimi implementation → Anthropic/OpenAI review) and conflict resolution.

**Combat OS control:** Agent and AgentSwarm use are prohibited by default. A task packet must explicitly grant their use, define the maximum number of sub-agents, and set a spend cap. AgentSwarm is not permitted in the initial $15 trial.

### Not verified by official docs
- Persistent memory across separate Kimi sessions. Treat each session as stateless.
- Built-in project-wide planning mode or automatic cost caps inside the CLI. [Unknown]

---

## 3. Context-Efficient Working

### Prepare a bounded task packet
One-sentence objective, allowed/forbidden files, non-goals, evidence, verification command, stop condition.

### Useful snippets / screenshots
- **Frontend/UX critique:** full-screen shot plus a crop of the specific control; include device frame for phone PWA review.
- **Bug reproduction:** minimal failing command + exact error + stack trace.
- **Orientation:** relevant file tree, not the whole repo.

### What to omit
Unrelated files, dependency trees, build output, `.git` history, credentials, old chat context, speculative future work.

### When to begin a fresh task
Context feels bloated; model drifts; switching from implementation to review; before destructive/contract-affecting changes.

### Preserve useful context without treating old chat as authoritative
Write conclusions into `STATUS.md`, `docs/handoff.md`, and `docs/decision_log.md` per the sunshine/goodnight skills. Start the next task by stating the goal and referencing the handoff file; do not assume the model remembers the prior turn.

### Cache-aware API guidance (officially supported only)
Kimi API Context Caching is automatic; place fixed large contexts at the start of the `messages` array for better hit rates [Official](https://platform.kimi.ai/docs/guide/use-context-caching-feature-of-kimi-api). No manual cache or TTL management. Applies mainly to direct API integrations, not CLI prompt restructuring.

---

### Verification and configuration boundary
Use `/status` to confirm the active session model, provider, working directory, and permission mode. Do not inspect Kimi configuration files or environment variables to infer the active model: a configured default can be overridden for an individual launch or session. Use `/usage` as the live check for token, context, and quota information. [Official](https://www.kimi.com/code/docs/en/kimi-code-cli/reference/slash-commands.html)

## 4. Model-Routing Table

| Task | Preferred Model | Notes |
|------|-----------------|-------|
| Diagnostics / codebase orientation | `kimi-k3` (low effort) or `kimi-k2.6` | Large context reduces repeated file reads. Use `low` effort on k3 to save cost. |
| Small reversible implementation | `kimi-k2.7-code` | Default worker; deterministic, long-context instruction following. |
| Tests and bug reproduction | `kimi-k2.7-code` or `kimi-k2.7-code-highspeed` | Fast feedback loop; rerun verification commands locally. |
| Frontend / UX critique from screenshots | `kimi-k3` or `kimi-k2.6` | Stronger vision reasoning; k3 preferred for detailed critique. |
| Long-running implementation | `kimi-k2.7-code` | Better instruction compliance in long contexts than k2.6 [Official](https://platform.kimi.ai/docs/guide/kimi-k2-7-code-quickstart). |
| Independent / contrarian review | `o1` / `o3` / `Claude Opus` (OpenAI/Anthropic) | Kimi is the candidate worker, not the final authority. |
| Ambiguous product or architecture decisions | Human + higher-tier OpenAI/Anthropic model | Kimi can draft options; do not let it settle the decision alone. |

---

## 5. Safe Combat OS Operating Contract

1. **OpenAI/Anthropic models remain architects, contrarians, and independent reviewers.** Kimi is a candidate implementation worker only.
2. **No push, merge, deletion, commit, schema/webhook/%1RM changes, or external mutation** without an explicit task packet.
3. **Never infer authorisation from repository access.**
4. **Verify selected provider/model before each paid task.** Use `/status`; do not read configuration or secrets to infer it.
5. **Respect `AGENTS.md` hard rules:** no %1RM math, webhook shapes, Google Sheets layout, or n8n changes without explicit instruction.
6. **One surgical change per session/PR.**

---

## 6. Reusable Prompt Template

```markdown
## Objective
One-sentence goal.

## Bounded scope
- Allowed files: e.g., `app/src/components/Timer.jsx`, `app/src/stores/timerStore.js`
- Forbidden files: e.g., `scripts/webhook.gs`, `app/src/data/playbook.js`, any %1RM math
- Expected diff size: small / medium / exploratory

## Non-goals
- Do not refactor unrelated modules.
- Do not change external integrations or deployment config.

## Evidence required
- Paste error text / failing test / screenshot path.
- Link to relevant prior decision in `docs/decision_log.md` if any.

## Verification commands
Run these before and after the change:
1. `cd app && npm test -- Timer`
2. `cd app && npm run build`

## Stop condition
Stop and ask for approval before any of the following:
- changing a forbidden file,
- running `git commit`, `git push`, or deleting files,
- spending more than the per-task cap.

## Authority limits
- You may edit allowed files only.
- You may not finalise architectural decisions; present options.
- You may not touch schema/webhook/%1RM logic.

## Expected handoff
After verification, report what changed, the commands run, their results, what remains, and the next step. Do not update `STATUS.md`, `docs/handoff.md`, or `docs/decision_log.md` unless the task packet explicitly authorizes that documentation work.
```

---

## 7. $15-Trial Spend-Control Section

**Per-task cap:** $2–$3 USD equivalent in tokens.
**Cumulative-stop rule:** stop all paid Kimi work at $15 total until a human reviews and resets the budget.

**Log each task:** Date, model, task type, estimated input/output tokens, observed console cost, elapsed time, verification outcome, defects, reviewer outcome.

**Pricing rule:** do not invent prices. Immediately before every paid run, check the current Platform pricing page or console entry that applies to the selected model; the K3 pricing page must not be treated as pricing for another model.

---

## 8. Before Every Kimi Task Checklist

- [ ] Confirm active provider and model with `/status` (not configuration files).
- [ ] Check live pricing for the selected model in the Platform pricing view; do not extrapolate from another model's price page.
- [ ] Check `/usage` and record the current token/context/quota view where available.
- [ ] Confirm the task packet is bounded (allowed/forbidden files, verification, stop condition).
- [ ] Confirm this task does not touch %1RM math, webhook/schema, Google Sheets, or n8n.
- [ ] Confirm cumulative spend is below $15.
- [ ] Set a per-task token/cost cap and note it in the spend log.

### Explicit stop conditions
Stop immediately and ask for approval if:
- the active model is not the one requested,
- the task would exceed the per-task or cumulative cap,
- the task requires touching forbidden files or systems,
- verification commands fail and the fix is not obvious,
- the model proposes a change outside the bounded scope,
- the model proposes using Agent or AgentSwarm without explicit packet authority,
- you are asked to commit, push, merge, delete, or mutate external state.

---

## Unverified / Live-Check Claims

1. Exact per-token cost for `kimi-k2.7-code`, `kimi-k2.7-code-highspeed`, `kimi-k2.6`, and `kimi-k3` — check [Pricing](https://platform.kimi.ai/docs/pricing/chat-k3) at runtime.
2. Whether `kimi-k2.7-code-highspeed` is available and stable for this account/region.
3. Whether Kimi Code CLI has built-in spend tracking or hard caps.
4. Real-world latency and context-window utilisation for Combat OS on k3 vs k2.7-code.
5. Whether multi-turn tool-call behaviour differs between k2.7-code and k3 in the CLI beyond the documented API constraints.
6. Exact current price, quota, and usage-display behaviour for the selected account and model; confirm through the live Platform view and `/usage` before each paid task.
