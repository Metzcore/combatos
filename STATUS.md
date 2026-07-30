# STATUS
_Last updated: 2026-07-30 · A11 Plan/Library/Today reference experience accepted locally_

## Last session
A11's file-backed exercise-reference experience is now proven across Plan, Library Preview, and
the active Today workout. The catalogue carries seven curated references and ten cartridge
annotations. Plan/Library show a fail-safe `WATCH DEMO` action with publisher attribution; Today
uses the same primary-video resolver through a compact 48px `DEMO` external link.

Today links render across the mobility/cooldown, strength/core, conditioning, and shared superset
header paths. Missing references render nothing. A free-text exercise substitution hides the
prescribed exercise's video rather than guessing a replacement; reverting restores the prescribed
link. The developer verified link visibility, navigation, layout, and substitution behavior in
localhost acceptance. The accepted screenshot is preserved at
`archive/Snippets-for-review/▶ DEMO ↗.png`.

Local A11 commits:

- `0faf87e` · added the exercise-reference foundation
- `0db2f54` · seeded the catalogue and cartridge annotations
- `ad8a8cc` · added Plan/Library demonstration links
- `f51f94f` · added the accepted hybrid Plan/TRAIN visual polish
- `e027388` · recorded Plan acceptance in the roadmap
- `f104028` · added and accepted Today demonstration links

Independent final evidence: 44 test files / 893 tests pass, the production PWA build succeeds,
PWA precache remains 11 entries, and developer localhost acceptance passed. No Dexie, Supabase,
authentication, payload, webhook/Sheets, PWA-configuration, dependency, `%1RM`/e1RM, or n8n
change was made.

## Current focus
Branch `codex/kimi-trial-1` contains the accepted A7 and A11 local work and is not pushed or merged
into `main`.

A11's identity architecture remains unchanged: cartridge `item.id` is the prescription-slot
identity; optional canonical `exerciseId` resolves against a manually curated, bundled catalogue;
references are offline-available metadata and absent by default. Functional adoption is proven in
Plan, Library, and Today.

The next implementation experiment is a protected, frontend-only Kimi K3 redesign of the active
Today workout. Its worker packet is
`docs/planning/roadmap/prompts/A11-TODAY-UX-UI-EXPERIMENT-KIMI.md`. Kimi may make broad
presentational decisions inside Today but may not touch workout logic, persistence, Supabase,
Dexie, payloads, webhooks, programme data, dependencies, navigation, or PWA configuration.

The generic “Your own 10-min warm-up routine” is technically capable of showing DEMO through the
mobility renderer, but it has no `exerciseId` yet. A curated routine identity and approved source
remain the only incomplete A11 reference slice.

Local environment state is intentional: `.env.local` remains gitignored for localhost Supabase
authentication, and the intentional deletion of `app/.env.example` remains outside the app-work
commits.

## Up next
1. Run the protected Kimi K3 Today UX/UI experiment, then Codex-review and device-test it
2. Curate and annotate an approved warm-up routine reference as a separate data-only A11 slice
3. Use the accepted reference links in real training before expanding the catalogue further
4. Revisit A12 Academy / Exercise Guides IA only after enough real A11 usage
5. Push/review/merge the accepted local branch when ready
6. Rotate the temporary Supabase developer password once app work is finished
