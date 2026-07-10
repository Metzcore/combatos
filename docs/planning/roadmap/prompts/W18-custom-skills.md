# W18 — Custom Claude Skills · Tier: ARCH/IMPL · optional, parallel-safe

**Instructions for the User:** run whenever convenient — nothing depends on this and it depends on nothing. One session per skill is fine.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Task: author project skills that standardize judgment across the multi-model worker pool. HARD CAP: 4 skills. These live alongside the existing `combatos-sunshine` / `combatos-goodnight` skills in `.agents/skills/` — read both existing SKILL.md files first and match their format and tone exactly.

### THE FOUR CANDIDATES (from the brief — confirm the set with the user before writing)
1. **combatos-conventions** — the standing guardrails (never touch %1RM/e1RM; never alter webhook payloads; never import Apex content; never hand-edit playbook.js; never disrupt n8n; diagnostic-before-modification; one change per session), the data pipeline, the Dexie store map, the day structure (6-day, days 2/4 fight-gym, 3 phases). This is the highest-value one — write it first.
2. **pwa-offline-first** — judgment for service-worker/vite-plugin-pwa/Dexie work: update flows, cache pitfalls, IndexedDB schema-bump safety, install/manifest behavior on Android + iOS.
3. **mobile-interaction-ux** — portrait-phone-first judgment: touch targets, one-hand reach, collapse patterns, glanceability during a workout (sweaty hands, phone on the floor — the real usage context).
4. **personal-analytics-viz** — judgment for W9-style stats surfaces: small-multiples over dashboards, trends over totals, honest handling of sparse personal data.

### RULES
- Each skill: a SKILL.md with frontmatter matching the existing skills' format; concise (a skill is judgment, not documentation — link to README/ARCHITECTURE for facts once W4 lands, don't duplicate them).
- Derive every CombatOS-specific fact from the live repo, not from planning docs in `docs/planning/`.
- No new tooling, no code changes.

Commit per skill: `chore: add <name> skill`.
