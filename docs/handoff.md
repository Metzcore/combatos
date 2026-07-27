## Current state (one line)
A6.5 durable active-workout drafts are merged through PR #57 and deployed on `origin/main` at
`1687451`. The final suite passes 450/450 tests and the production build is clean. Android
acceptance passed every reported scenario, including Reset; sign-out and active-draft survival
across a later PWA update were not exercised on-device.

## Pending

- [ ] **Complete the relevant W26 decision work and lock the permanent cartridge-session
      payload:** resolve prescribed/performed/substituted representation and per-session versus
      per-set shape.
- [ ] **A7 — interactive cartridge renderer:** start only after the payload lock; A6.5 is complete.
- [ ] **Future independent diagnostic:** Exercise Reference layer (A11), followed later by
      Academy / Exercise Guides IA (A12).
- [ ] **Still outside the current train-renderer sequence:** D9 remains open; optional later
      device checks can cover sign-out and active-draft survival across a PWA update.
- [ ] **After the app work is finished, rotate the developer Supabase password-login user's
      password:** replace the temporary placeholder with something long and random.
