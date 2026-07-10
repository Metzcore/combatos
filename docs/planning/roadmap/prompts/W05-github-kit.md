# W5 — GitHub Starter Kit · Tier: FAST

**Instructions for the User:** if you can find the previously-drafted kit (D6), give it to the agent alongside this prompt; otherwise the agent creates it fresh. Paste everything below the dashed line into a fresh session.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo (remote: `github.com/Metzcore/combatos`, default branch `main`). Task: create the `.github/` folder contents. Nothing else.

### DO NOT TOUCH
- Anything outside `.github/`.

### TASKS
1. `.github/ISSUE_TEMPLATE/bug_report.md` — fields: what happened, expected, steps, device (Android PWA / desktop browser), tab/component.
2. `.github/ISSUE_TEMPLATE/feature_request.md` — fields: problem, proposed shape, which roadmap item (W##) it relates to if any, guardrails it must respect.
3. `.github/pull_request_template.md` — checklist: scoped to one roadmap item; `npm run build` passes; no changes to %1RM logic, webhook payloads, or generated `playbook.js` unless the item explicitly allows it; STATUS/handoff updated if session-closing.
4. `.github/workflows/build-check.yml` — on push + PR to `main`: checkout, setup-node (LTS, cache npm with `app/package-lock.json`), `npm ci` and `npm run build` in `app/`. Build check only — no tests, no deploy (Cloudflare Pages handles deploys separately; do not touch that).
5. Commit: `chore: add GitHub issue/PR templates and CI build check`. Push, then confirm the workflow actually runs green on GitHub before finishing.

### ACCEPTANCE
Workflow green on the real remote. If the push or the run fails, diagnose and fix — don't hand back a red pipeline.
