# STATUS
_Last updated: 2026-07-31 · A11 Today “Execution Strata” experience accepted locally_

## Last session
A11's file-backed exercise-reference experience is proven across Plan, Library Preview, and the
active Today workout. Plan/Library show a fail-safe `WATCH DEMO` action with publisher attribution;
Today uses the same primary-video resolver through a compact 48px `DEMO` link. Missing references
render nothing, and a free-text exercise substitution hides the prescribed video instead of
guessing a replacement.

The developer also accepted Kimi K3's protected frontend-only Today experiment, “Execution
Strata.” It translates the Plan/Library layered-material and semantic-spine language into the
execution surface: canonical session progress in the sticky header, recessed closed blocks, one
raised open block, stronger exercise/set hierarchy, a clearer Session Summary, and an integrated
Finish bar. The progress rail is only a visual reading of the existing `done/units` calculation;
no new completion rule, score, stored state, or fabricated gamification was added.

Local A11 commits:

- `0faf87e` · added the exercise-reference foundation
- `0db2f54` · seeded the catalogue and cartridge annotations
- `ad8a8cc` · added Plan/Library demonstration links
- `f51f94f` · added the accepted hybrid Plan/TRAIN visual polish
- `e027388` · recorded Plan acceptance in the roadmap
- `f104028` · added and accepted Today demonstration links
- `5fb3821` · recorded Today reference acceptance and the protected Kimi packet
- `c77ea94` · added the device-accepted Today “Execution Strata” visual pass

Independent final evidence observed 2026-07-31: 45 test files / 900 tests pass, the production PWA
build succeeds with 11 precache entries, and developer localhost acceptance passed. No Dexie,
Supabase, authentication, payload, webhook/Sheets, PWA-configuration, dependency, `%1RM`/e1RM, or
n8n change was made.

## Current focus
Branch `codex/kimi-trial-1` contains the accepted A7 and A11 local work. It is not merged into local
`main`; remote refs, PR state, CI, and deployment were not checked this session.

Roadmap position: Track A / Stage-2 is active. A1–A10 are complete. A11 remains `[~]`, but
only because the generic “Your own 10-min warm-up routine” has no curated `exerciseId` and approved
source yet. Plan, Library, Today reference adoption, and their current visual passes are accepted.
A12 Academy / Exercise Guides remains a gated architecture candidate after enough real A11 usage.

The accepted Today visual baseline is now a durable design convention: use truthful existing
progress, clear execution hierarchy, static token-derived depth, and Today-scoped selectors.
Future Kimi visual work should follow the same bounded-worker pattern and earn its own roadmap or
ICEBOX decision rather than silently expanding this slice.

Local environment state is intentional: `.env.local` remains gitignored for localhost Supabase
authentication, and the intentional deletion of `app/.env.example` remains outside app-work
commits.

## Up next
1. Decide whether to close A11 with the separate curated warm-up reference slice
2. Use the accepted Plan/Library/Today experience in real training before expanding the catalogue
3. Revisit A12 only after enough real A11 usage to justify its information architecture
4. Scope future Kimi visual passes one surface at a time; Playbook and Log already have separate
   roadmap/research context and must not be bundled casually
5. Push/review/merge the accepted local branch when ready
6. Rotate the temporary Supabase developer password once app work is finished
