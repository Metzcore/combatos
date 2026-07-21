# STATUS
_Last updated: 2026-07-21 · go-live shipped + keep-alive + Train-tab/cartridge planning_

## Last session
Took Supabase LIVE: resolved a stranded 07-20 doc-merge conflict, merged
`feat/supabase-foundation` → `main`; set Cloudflare Production env vars + the Supabase redirect
(`combatos.pages.dev`) and verified magic-link login on phone — **production now runs on Supabase,
not Sheets.** Shipped a daily free-tier keep-alive GitHub Action (proven 200 against the live
project). Then a planning pivot: opened the Track A / Stage-2 rebuild (Train + Playbook on the
cartridge model) and ruled a batch of design decisions.

## Current focus
Track A / Stage-2: rebuild the Train tab (incl. Playbook) as a universal player over a cartridge;
the developer's own new-gym program is the first cartridge. Backend (Supabase) is already live,
which de-risks it.

## Up next
1. Track A / Stage-2 build: Train + Playbook renderer on the cartridge format; first cartridge =
   the developer's new-gym program (authored via the framework, proven on self first)
2. AI authoring framework artifacts (versioned docs): intake schema · authoring "coach" prompt
   (adapts proven templates) · coaching-sanity checklist — prove on the developer's own program
3. Lock the logging payload shape (per-session vs per-set) — open decision blocking renderer code;
   gated on W26 research
4. Merge the keep-alive PR; delete the merged `feat/supabase-foundation` branch
5. D9 (off-programme logging) · W26 log-hub research (parallel) · medical disclaimer line in Settings
