# STATUS
_Last updated: 2026-07-31 · Track A/Track B integration and workspace consolidation_

## Last session
The accepted Kimi application work was merged into `main` through PR #62: A7 follow-ups, the A11
exercise-reference experience, Today/Plan visual refinements, and W15.1 Timer “Instrument Strata.”
Verification passed: 47 test files / 933 tests, production PWA build, GitHub CI, and Cloudflare PR
preview. The Timer was also successful in real training use.

Track B documentation was reconciled and merged separately through PR #63. The standalone
onboarding site now lives in `CombatOS-Onboarding` and has a clean local checkpoint at `a223b9e`;
its UI builds, but auth, answer persistence, notifications, and deployment are not implemented.

The permanent layout is now two repositories: `Fight-Camp` for Combat OS and
`CombatOS-Onboarding` for onboarding. Temporary Git worktrees were removed. No Supabase migration
was applied.

## Current focus
`main` is clean at `9547366`. Track A is integrated; A11’s optional generic warm-up reference was
deliberately skipped, and W15.1 is complete and real-use validated.

## Up next
1. Choose one new Combat OS roadmap item and create a short-lived branch from `main`
2. Remove the empty `Fight-Camp-kimi-trial` directory after the previous task releases it
3. Continue the onboarding site as a separate repository when ready
4. Review the onboarding migration’s privacy/security gates before applying anything
5. Rotate the temporary Supabase developer password after app work is finished
