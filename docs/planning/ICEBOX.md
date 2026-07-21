# Icebox — captured ideas, not commitments

> **What this is:** the inbox for braindumps and "wouldn't it be good if…" ideas. Landing here
> means an idea is **captured so it can't be lost** — it does **not** mean it's scheduled.
> The roadmap stays lean on purpose; this is where the raw material waits.
>
> **Governing rule (from the repo's own track record): _defer with a shape, don't drop._**
> Most good ideas become "deferred, with their design captured" (see D4 notepad, D8 standalone
> tracker) rather than either built immediately or thrown away.

## How an item leaves the icebox

At a triage pass (natural fit for `goodnight`), run each item through **three gates**. It only
earns a `ROADMAP.md` slot if it clears all three; otherwise it stays here, refined.

1. **Evidence** — is this a *validated need* (real usage pain) or a hypothesis? The gold standard
   is D8: five days of real usage decided it, not enthusiasm.
2. **Blocking** — does anything depend on it, or is it standalone? Standalone can wait.
3. **Cost × leverage** — cheap + high-leverage may jump the queue; expensive + speculative waits
   for evidence.

Anything ruled that isn't ready → record it in `OPEN-DECISIONS.md` (with rationale), don't silently drop.

---

## Current icebox (newest first)

### Track A — make the app read cartridge JSON (the rebuild core)
- **Shape:** the universal-player rebuild — app renders days/exercises/prescription-models from a
  cartridge JSON (`docs/planning/rebuild/PROGRAM-CARTRIDGE-SPEC.md`) instead of the hardcoded
  playbook. This is what truly onboards other users on their own programs.
- **Gate read:** biggest item in the whole plan; **non-blocking** for current use. Needs its own
  **planning session**, not a jump-the-queue build. Do NOT start it on the tail of another session.
- **Near-term substitute:** the CSV Program Authoring Kit already covers "author a program for the
  *current* app" (and unblocks the gym-change swap). Cartridge-JSON is the future generalization.

### Cartridge authoring "learning loop" (gap-note mechanism)
- **Shape:** when an authoring LLM hits something the app can't express, it emits a **gap note**
  rather than inventing a field (the spec already mandates this). Collect gap notes in one place;
  periodically decide whether a gap justifies a new prescription model / feature flag / field.
- **Why lightweight:** the 5 closed prescription models are the wall; the gap-note log is the
  pressure valve. Keeps the app's range growing *deliberately*, not reactively per-agent.
- **Gate read:** cheap to start (a single append-only file) but only meaningful once cartridges
  are real → pairs with Track A.

### Free live sandbox URL (second Cloudflare Pages project)
- **Shape:** second Pages project on the same repo, its production branch = a sandbox branch, so it
  deploys as Production (no Access wall) → free phone-testable URL. Manual/guided setup.
- **Gate read:** optional convenience; only worth it if you want phone testing *before* the real
  production merge. Otherwise the production merge gives you a live URL for free.

### Custom SMTP for auth emails
- **Shape:** swap Supabase's built-in (rate-limited, test-grade) email for Resend/SendGrid in Auth
  settings.
- **Gate read:** not needed for you + brother; **triggered** the moment you onboard more than a
  couple of users (else "email rate limit exceeded").

### Free-tier keep-alive (follow-on to D7) — ✅ SHIPPED 2026-07-21
- **Shape:** external cron (n8n per D7, or a GitHub Action) pinging Supabase so the free tier
  doesn't pause from inactivity.
- **Gate read:** **must exist before anyone relies on the app daily** — the go-live merge made the
  developer the daily production user, so the gate tripped.
- **Delivered:** GitHub Action `.github/workflows/supabase-keepalive.yml` (daily REST ping,
  external, no secrets, proven 200 against the live project). Operator notes in `docs/OPERATIONS.md`.

### New standalone repo + its own deployment
- **Shape:** a fresh repo deployed separately (dashboard or Wrangler; no Cloudflare connector).
- **Gate read:** explicitly **deferred until the Combat OS roadmap is complete** (developer's call).

---

## Already-deferred decisions living elsewhere (pointers, not duplicates)
- **D4** — notepad / idea-organizer: deferred-with-shape in `OPEN-DECISIONS.md`.
- **D8** — standalone tracker: deferred; revisit only on heavy sustained counted-task use.
- **D9** — off-programme activity logging: **open, unruled**; candidate input to W26.
