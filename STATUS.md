# STATUS
_Last updated: 2026-07-22 · A9a live; A9b metadata complete and verified_

## Last session
Closed out the Cartridge Viewer's first on-device feedback: shipped a UX pass (quiet block
sub-headers, collapsible days so a full week fits on one screen, a collapsed "About this program"
disclosure, tab-contrast fix) — merged. Also built a dev-only password sign-in so agents and the
developer can skip the magic-link email round-trip on localhost, verified fully stripped from the
production bundle. Diagnosed a Supabase email-rate-limit scare during dev-user setup via the auth
logs — confirmed nothing was broken, just the free-tier email throttle. Closed out remaining git
housekeeping (archived the superseded CHECKLIST.md); `main` is now caught up with all four PRs.
Kicked off research for the next real feature (A9: cartridge tagging + select/activate) — two
prompts sent out, one for design/UX inspiration, one for a DB-connected agent to ground options
against the actual Supabase schema and cartridge code. A documentation-only planning pass then
resolved the Train direction and recorded it in `docs/planning/rebuild/TRAIN-EXPERIENCE-PLAN.md`:
Today / Plan / Library, coach-controlled availability, one active cartridge, local unfinished
drafts, and A6.5 as an explicit prerequisite to A7.

## Current focus
Track A / Stage-2. The Cartridge Viewer's UX debt is cleared and the Train product direction is
documented. A9a is now live: `user_cartridges` records coach-managed availability,
`profiles.assigned_cartridge` is constrained to one available program, and profile permissions are
narrowed. The three initial accounts are assigned and RLS isolation is proven. No Train UI changed.
A9b is now complete on its isolated branch: schema v3, structured benefit-led
metadata, authoring kit, validator/tests, and all canonical/bundled cartridges agree. The approved
Library list→detail direction is captured in `TRAIN-EXPERIENCE-PLAN.md`; A9c is next.

## Up next
1. A9c — account access loader and user-scoped offline cache; no visual redesign
2. Rotate the dev Supabase user's password (currently a placeholder, set during setup) to something
   long/random — low severity but a real loose end
3. A10 — specify Today / Plan / Library on phone and responsive web; no new main-nav button
4. A6.5 — local durable active-workout draft before A7; permanent payload remains gated on W26
5. Bigger design initiative: Log tab UX/UI rebuild, then Checklist/Notes backend + n8n sync idea
