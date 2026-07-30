# STATUS
_Last updated: 2026-07-30 · A11 Plan reference experience accepted locally_

## Last session
A11's Plan/Library exercise-reference phase is complete locally. The file-backed catalogue now has
seven curated references and ten cartridge annotations; Plan and Library Preview render a
fail-safe, direct-open `WATCH DEMO` link with separate publisher attribution only when an item has
a valid canonical `exerciseId`. Unreferenced items keep their original layout.

The developer accepted the feature in localhost testing, then accepted a bounded Train/Plan visual
polish combining a raised day slab, recessed block wells, full-height semantic section spines,
stronger exercise hierarchy, accessible metadata contrast, a refined Watch Demo chip, and a
Train-only active-tab wash. Today workout behavior and styling remain outside this slice.

Local commits:

- `0db2f54` · seeded the exercise-reference catalogue and cartridge annotations
- `ad8a8cc` · added Plan/Library demonstration links and focused tests
- `f51f94f` · added the accepted hybrid Plan/TRAIN visual polish

Independent final evidence: 43 test files / 867 tests pass, the production PWA build succeeds,
PWA precache remains 11 entries, and developer localhost acceptance passed. No Dexie, Supabase,
authentication, payload, webhook/Sheets, PWA-configuration, dependency, `%1RM`/e1RM, or n8n
change was made.

## Current focus
Branch `codex/kimi-trial-1` contains the accepted A7 and A11 local work and is not pushed or merged
into `main`.

A11's approved architecture remains: cartridge `item.id` is the prescription-slot identity;
optional canonical `exerciseId` resolves against a separate bundled catalogue; references are
manually curated, file-backed, offline-safe, and absent by default. Plan/Library adoption is now
proven. Today adoption remains a separate decision because substitution behavior and mid-workout
density require their own bounded slice.

The generic “Your own 10-min warm-up routine” is technically capable of showing Watch Demo through
the existing mobility renderer, but it has no `exerciseId` yet. A curated routine identity and
approved source are still required before a link should appear.

Local environment state is intentional: `.env.local` remains gitignored for localhost Supabase
authentication, and the intentional deletion of `app/.env.example` remains outside the app-work
commits.

## Up next
1. Decide whether A11 should adopt references in Today; diagnostic/plan first, with substitution
   links hidden unless the performed exercise has its own canonical reference
2. Curate and annotate an approved warm-up routine reference as a separate data-only A11 slice
3. Use the accepted Plan links in real training before expanding the catalogue further
4. Revisit A12 Academy / Exercise Guides IA only after enough real A11 usage
5. Push/review/merge the accepted local branch when ready
6. Rotate the temporary Supabase developer password once app work is finished
