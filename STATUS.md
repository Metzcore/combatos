# STATUS
_Last updated: 2026-07-22 · Cartridge Viewer live + first real device feedback_

## Last session
Shipped the full Track A/Stage-2 arc in one sitting, four merged PRs: the model-agnostic Program
Authoring Kit → block-composable cartridge schema v2 (reading a second real program, Apex Protocol,
proved the v1 flat format underserved both real users) → Apex's cartridge authored + spec/kit
promoted to v2 → a read-only **Cartridge Viewer** shipped into the Train hub (new "Cartridges" tab),
live in production. Reviewed on-device: works as a first pass, but UX/UI needs real design work.

## Current focus
Track A / Stage-2. Read/render path proven live; next is a design pass on the Cartridge Viewer +
Train hub UX, informed by real on-device feedback, before going further into the interactive
(logging) renderer.

## Up next
1. Cartridge Viewer UX/UI pass: description text readability + copy quality, collapsible exercise
   blocks, section-header visual redesign (current styling reads "dated/noisy" to a new user)
2. Cartridge tagging (category grouping as the library grows — e.g. `25`, `ufcgymd1`, candidates
   `em`/`fulltransformation` need clarifying) + a way to "select/activate" a cartridge (not built yet)
3. Train hub discoverability: the 3 top tabs (Workout/Playbook/Cartridges) aren't obvious to a new
   user at first glance — needs an actual UX solution, not just visual polish
4. Bigger design initiative (own session): Playbook + Log tab UX/UI rebuild aiming for a
   best-in-class bar (reference apps TBD — Apple-tier framing, Obsidian floated); includes
   dark/light mode + a full color-system pass
5. Dev-auth-bypass for agent browser testing + Checklist/Notes backend now Supabase is live —
   floated idea: an n8n scheduled workflow syncing notes/checklist data every ~3 days, which would
   also double as the Supabase free-tier keep-alive
