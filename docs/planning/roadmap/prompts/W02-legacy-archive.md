# W2 — Legacy System Archive · Tier: FAST

**Instructions for the User:** paste everything below the dashed line as the first message of a fresh session.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Task: archive the fully-superseded v1 spreadsheet system and remove verified duplicates. File moves and deletions ONLY — no content edits.

### BACKGROUND (already verified, but re-verify before acting)
- `fighters-os.gs`, `fighters-os-lite.gs`, `build_sheet.py`, `fighters-os.xlsx` at repo root are the superseded v1/v1.5 lineage.
- `scripts/fighters-os.gs` and `scripts/fighters-os-lite.gs` are byte-identical to the root copies (confirm with `git hash-object` or file hashes before deleting).
- `app/src/data/playbook.csv` is byte-identical to root `playbook.csv`, and `scripts/csv_to_js.py` reads the ROOT copy. Confirm nothing in `app/src` imports the app-side CSV (search for `playbook.csv` in `app/src`) before deleting it.

### DO NOT TOUCH
- `scripts/webhook.gs` (live), `scripts/csv_to_js.py`, `scripts/audit_playbook.py` (live dev utilities)
- Root `playbook.csv` (source of truth) and `app/src/data/playbook.js` (generated)
- `archive/camp-1/` (leave whatever is there alone)

### TASKS
1. `git mv fighters-os.gs fighters-os-lite.gs build_sheet.py fighters-os.xlsx archive/legacy-spreadsheet-system/` (create the folder).
2. `git rm scripts/fighters-os.gs scripts/fighters-os-lite.gs` (after the hash check).
3. `git rm app/src/data/playbook.csv` (after the import check).
4. Add a short `archive/legacy-spreadsheet-system/README.md` (3–5 lines): what these files were, that they're superseded by the PWA + `scripts/webhook.gs` v2, date archived.
5. `npm run build` in `app/` must still pass.
6. One commit: `chore: archive legacy spreadsheet system, remove duplicate files`.

### ACCEPTANCE
Build passes; `git status` clean; the three live scripts still in `scripts/`. If any hash/import check fails, STOP and report — do not delete.
