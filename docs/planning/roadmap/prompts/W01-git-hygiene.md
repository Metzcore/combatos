# W1 — Git Hygiene · Tier: FAST (Gemini 3.5 Flash / Composer 2.5)

**Instructions for the User:** paste everything below the dashed line as the first message of a fresh session in the Combat OS repo.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo at `C:\Users\jmfg9\Documents\Fitness\Fight-Camp\`. This is a small, surgical git-hygiene task. Make ONLY the changes listed.

### DO NOT TOUCH
- Any file under `app/src/` except `app/package.json` / lockfile as described below
- `scripts/webhook.gs`, `playbook.csv`, anything else

### TASKS
1. The working tree has an uncommitted `.gitignore` change. Read the current `.gitignore`, confirm it ignores `dev_files/`, `SCRATCH-NOTEPAD.md`, and standard build artifacts, then ADD a rule for `*.log`.
2. `app/build_error.log` is tracked in git but is a stray build artifact. Untrack it without deleting locally: `git rm --cached app/build_error.log`.
3. `papaparse` is listed in `app/package.json` dependencies but nothing in `app/src` imports it (verify this yourself with a search before acting). Remove it: `npm uninstall papaparse` in `app/`.
4. Run `npm run build` in `app/` to confirm the build still passes.
5. Commit everything as one commit: `chore: fix gitignore, untrack build log, drop unused papaparse dep`.

### ACCEPTANCE
- `git status` clean after commit; `git ls-files app/build_error.log` returns nothing; build passes.
- If ANY step surprises you (e.g. papaparse IS imported somewhere), stop and report instead of proceeding.
