## Current state (one line)
ROADMAP.md complete through W24 (PRs #1–#30, 2026-07-18): counted checklist tasks live
and validated on-device; W18 skills complete; ARCHITECTURE.md current; D8 ruled, D9 open.

## Pending

- [ ] W25 — Notes export button: `exportNotes()` exists fully tested in `app/src/db/notes.js`, UI button missing; prompt unwritten
- [ ] W26 — Log hub redesign research — ⛔ gated on living with counted tasks; per-day tally history is a VALIDATED requirement (day-one W24 usage)
- [ ] D9 — off-programme activity logging: open, unruled; candidate input to W26
- [x] Full-backup JSON location CONFIRMED (2026-07-20): `C:\Users\jmfg9\Documents\CombatOS-backups\combatos-backup-2026-07-12 (1).json` (47 KB). This was already resolved on 2026-07-17 evening but the record was stranded on an unmerged goodnight branch; rescued into `decision_log.md`. NB: a smaller `combatos-backup-2026-07-12.json` (284 B) sits beside it — likely a partial/empty export; a fresh re-export from Settings is worth doing before any Supabase migration since the backup JSON is the migration seed.
