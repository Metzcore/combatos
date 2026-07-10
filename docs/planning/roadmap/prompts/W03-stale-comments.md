# W3 — Stale Comment Truth-Up · Tier: FAST

**Instructions for the User:** paste everything below the dashed line as the first message of a fresh session.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Task: fix two misleading doc comments. **Comments only — if your diff touches a single line of executable code, you have failed the task.**

### CONTEXT
1. `scripts/webhook.gs` header (lines ~1–15) is wrong twice: it says the script "strikes through" rows on delete (the code does a hard `deleteRow()`), and it tells the reader to set `WEBHOOK_URL` in `src/sync/syncQueue.js` (that file doesn't exist; the URL lives as the `webhookUrl` default in `app/src/db/index.jsx`).
2. `app/src/hooks/usePlaybook.js` header says it "Parses the bundled playbook.csv" — it actually imports pre-generated `../data/playbook.js` (built by `scripts/csv_to_js.py` from root `playbook.csv`).

### DO NOT TOUCH
- Any executable line in either file. Webhook logic, payload shapes, and delete behavior are under a hard guardrail — this task documents current behavior, it does not change it.

### TASKS
1. Rewrite the `webhook.gs` header to accurately describe: hard row deletion on `action:'delete'`, and where `webhookUrl` actually lives.
2. Fix the `usePlaybook.js` header to describe the real data flow (CSV → csv_to_js.py → playbook.js → import).
3. Note in the webhook.gs header that the deployed Apps Script copy must be manually redeployed if this file ever changes functionally (comments alone need no redeploy).
4. Commit: `docs: correct stale headers in webhook.gs and usePlaybook.js`.

### ACCEPTANCE
`git diff` shows changes to comment lines only, in exactly those two files.
