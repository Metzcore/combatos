## Current state (one line)
This session was documentation-only, both PRs now merged: PR #54 codified the AI collaboration
workflow (docs/engineering/AI-WORKFLOW.md) and truthed-up AGENTS/CLAUDE/skills; PR #55 reconciled
the reference docs (ROADMAP/OPEN-DECISIONS/README/ARCHITECTURE) with live state. No app code,
schema, or tests changed. A6.5 remains diagnostic-stage: neither the Codex/Sol diagnostic nor the
Claude diagnostic is approved.

## Pending

- [ ] **A6.5 — reconcile the Codex/Sol diagnostic, the Claude diagnostic, and the cross-provider
      review findings into one final plan (read-only; stop for approval).** Neither existing
      diagnostic is approved. The final plan must specify how it handles the following confirmed
      requirements (durable capture — these details are not in the repo elsewhere), then stop for
      approval before any implementation:
      - a versioned, discriminated temporary workout-draft representation covering every check,
        performed value, substitution, note and relevant UI state (kept separate from the
        permanent logged-session payload);
      - a draft identity carrying cartridge / version / selected-day-template / optional-phase /
        owner identity (exact property names to be settled in the plan);
      - hydration protection — autosave must not run until the stored draft has loaded, so default
        state cannot overwrite it on mount;
      - stale-write invalidation — a save scheduled before a log/discard must not recreate a
        cleared draft;
      - atomic successful-local-log clearing — the draft is cleared together with the
        session/syncQueue writes, not as a separable step;
      - owner-scoped loading that fails closed when the row's owner != the resolved user
        (account switch / sign-out);
      - bounded-loss flushing across visibilitychange + pagehide + unmount (not a zero-loss claim);
      - explicit keep/discard/switch handling when day/phase/cartridge changes with a live draft;
      - incompatible-but-readable draft → explicit state; unparseable → fail closed;
      - additive Dexie v4 (restate prior stores verbatim) + an upgrade test proving existing
        tables survive.
      Sign-out event handling (explicit signOut vs the SIGNED_OUT auth event) is an architecture
      question for the plan, not a new product decision.
- [ ] **Rotate the developer Supabase password-login user's password:** replace the temporary
      placeholder with something long and random.
- [ ] **Lock the permanent cartridge-session payload:** resolve prescribed/performed/substituted
      representation and per-session versus per-set shape after the relevant W26 decision work.
      Outside A6.5's scope.
- [ ] **A7 — interactive cartridge renderer:** start only after A6.5 and the payload lock.
- [ ] **Future independent diagnostics:** Exercise Reference layer (A11), then Academy/Exercise
      Guides IA (A12); Log-hub redesign (W26) remains separate.
