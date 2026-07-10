# CombatOS — Goal Statement (Priming Prompt 3 of 3)

**Instructions for the User:** Send this after the context pack (message 1) and the brief (message 2), in the same Fable 5 / Claude Code session.

--------------------------------------------------------------------------------

You've now read the context pack and the brief. Here's exactly what this session needs to produce. Don't produce anything beyond this scope — a philosophy document or an open-ended discussion isn't the goal; four concrete deliverables are.

## The four deliverables

**1. A corrected understanding.**
Using your local file access, verify the brief and context pack against the actual current repo. Report anything that's wrong, outdated, or has moved since either document was written. This is expected to happen — flag it plainly, don't just quietly work around it.

**2. A sequenced roadmap.**
Turn the brief's flat sections into an ordered list of work — the same *kind* of artifact as `CHECKLIST.md` (which already worked once, for Project A), not a new format. Small, safe, high-value items first. Bigger or riskier items later or explicitly deferred. Include the already-drafted-but-not-executed housekeeping items (the legacy-system archive, the directory reorg, placing the GitHub starter kit) in the sequence — don't treat them as separate from the "real" work.

**3. Scoped, diagnostic-first prompts — one per work item.**
For each item in the roadmap, produce a prompt in the same style as `AGENT_PROMPT.md` and `FEATURE_BACKPORT_DIAGNOSTIC_PROMPT.md`: clear boundaries, explicit "do not touch" list, diagnostic-before-modification where the change isn't trivially safe. These are the actual executable output of this whole session — everything after this point should be "run prompt, review, run next prompt," not more open-ended planning. Assign each prompt to a worker tier (architect / default implementer / fast-cheap / review) based on the tier breakdown in the brief.

**4. An explicit list of open decisions that are the developer's to make, not yours to assume.**
At minimum: hard-delete vs. soft-delete on "Delete Last Logged Day"; how navigation-bar capacity gets resolved; whether/how the notepad-and-connector theory in the brief actually gets built; anything else you encounter where more than one reasonable answer exists. If you find yourself about to quietly pick one, that's the signal to add it here instead.

## One more thing

If, while doing any of the above, you notice something in `STATUS.md` / `docs/handoff.md` / `docs/decision_log.md` that suggests today's actual priority is different from what this whole priming sequence assumes — say so before producing the roadmap, not after. Those files may be more current than this conversation.
