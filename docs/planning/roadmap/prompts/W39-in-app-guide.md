# W39 — In-App Guide (More › Guide) · Tier: IMPL, then REVIEW
_Written 2026-10-02. Context: a new client has nowhere to learn what the app does. More › About &
Help holds three paragraphs about data storage, and nothing explains the five hubs, their sub-tabs,
or how to do common tasks. The developer wants a resource a client can rely on whenever they
have a question about the app, with no video. Runs after W38 and W34 so it documents both on day
one._

**Instructions for the User:** paste everything below the dashed line into a fresh session.
Diagnostic-first: the agent must present its plan — **including every article's full text** —
before changing anything.

--------------------------------------------------------------------------------

You are working in the **Combat OS (Fight-Camp)** repo. Read repo-root `AGENTS.md` first and obey
its hard rules; read the `combatos-conventions` and `mobile-interaction-ux` skills in
`.agents/skills/`. Task: an in-app guide. Nothing else.

## WHY IT IS SHAPED THIS WAY (research, 2026-10-02 — do not relitigate)
- Nielsen Norman Group: swipe-through onboarding tutorials are skipped, forgotten, make the app look
  more complicated than it is, and did not improve task performance in their studies. Help the user
  **pulls** when needed beats help **pushed** at them. Good help is searchable, task-focused, lists
  concrete steps, and is short. (nngroup.com — "Mobile-App Onboarding", "Help and Documentation")
- Hevy, a market-leading workout logger, uses exactly this model: a help centre with a Beginner's
  Guide, "Learn about Hevy" feature articles, Settings guides and FAQs — and no forced tour.

## THE DECIDED SCOPE (developer rulings, 2026-10-02)

**1. A new "Guide" entry, first in the More menu** (`utils/moreNav.js`), blurb along the lines of
"How to use Combat OS". "About & Help" becomes "About"; its "How this works" card moves into the
guide. Android hardware Back must work inside the guide exactly as it does on the other More
screens (W29's `useMoreBackNavigation`).

**2. Content is bundled data, not fetched.** One content module (e.g.
`app/src/data/guide/guideContent.js`) — articles with `id`, `section`, `title`, `summary`, `steps`
and/or `body`, and `keywords`. Bundled, so it works offline and ships in the same version as the
features it describes. No CMS, no remote fetch, no Markdown-rendering dependency.

**3. Five sections:**
1. **Start here** — install (link to W38's guidance), sign in, your programme, log your first
   workout.
2. **The app, hub by hub** — Train (Today / Plan / Library), Timer (Basic / Custom Rounds), Log
   (History / Overview), Checklist (Checklist / Notes), More (each screen). For each: what it is
   for and what you can do there.
3. **How do I…** — short task articles: log a workout; log for a past day (W34); swap an
   exercise; watch a demo; log a rest/recovery day; see my progress; record my weight; back up my
   data; reset a forgotten password; install the app; get the latest version.
4. **Troubleshooting** — "Couldn't load your plan"; "I don't see a new feature" (close fully and
   reopen, or W40's Restart banner once it exists); "My checklist/notes aren't on my other phone"
   (they stay on the device — D15, and a full backup is the only copy); moving to a new phone; one
   account per device (D15).
5. **What's new** — dated, plain-language entries, newest first. Start with the changes since
   2026-09-23 that a client would notice (password sign-in, password recovery, install guidance,
   past-day logging). W40 links here.

**4. Search** over title, summary, keywords and body — plain case-insensitive substring, the same
idea as Notes search. No fuzzy-search dependency.

**5. One first-run pointer.** A single dismissible card on Today: "New here? Start with the guide."
Tapping it opens the guide; tapping or dismissing it removes it **forever on that device**. It is a
local UI preference (settings or `localStorage`) — decide in the diagnostic, and do **not** add a
Dexie store or bump the schema for it. Never shown in the middle of an active workout.

**6. Copy rules.** Written for a client, not a developer: second person, plain words, verbs first,
numbered steps. Describe only what the shipped code does **today** — derive every claim from the
live components, not from roadmap entries or prompts. Where a feature is not built yet, the guide
says nothing about it.

**7. The standing upkeep rule — lands in this PR.** Add to `AGENTS.md` ("Other things worth
knowing") and to `.github/pull_request_template.md` a checklist line: **any PR that changes
something a user can see updates the matching guide article (and What's new) in the same PR, or
states why none applies.** This rule is a developer ruling of 2026-10-02; it waits for W39 only so
it never points at a guide that does not exist.

## EXPLICITLY OUT OF SCOPE
- A swipe-through tour, coach marks, or overlays (ruled out by the research above).
- Contextual "?" links from individual screens into articles — a sensible later item once the
  content exists; note candidate screens in the diagnostic.
- Videos, images of other apps, remote content, analytics on what users read.
- Renaming the app's in-app branding ("Fighter's OS") — separate decision (see W38).

## DO NOT TOUCH
- Dexie schema, `syncQueue`, webhook payloads, `scripts/webhook.gs`, `playbook.js`, `%1RM` math.
- Auth, sync, cartridge access.
- `package.json` / lockfile. Zero new dependencies.

## PHASE 1 — DIAGNOSTIC (report, then STOP for approval)
1. A walk of the live app (dev sign-in, `combatos-verify` on port 5180) listing every hub, sub-tab
   and More screen, with what each actually does — the factual basis for the content.
2. **The full text of every article**, for the developer to approve. This is the deliverable; the
   UI around it is small.
3. The content-module shape, the search approach, and how Back navigation works inside the guide.
4. Where the first-run "dismissed" flag lives, and why that choice needs no schema change.
5. Exact diff plan. Nothing else.

## PHASE 2 — IMPLEMENT (only after approval)
- `npm ci` only. `npm test` and `npm run build` both green, with real counts cited.
- Tests in house style for the pure parts: search (matches title/keywords/body, case-insensitive,
  empty query returns everything), content integrity (unique ids, every article in a known section,
  no empty steps), and the first-run card's show/hide decision. **Never hardcode a Dexie version
  number in a test.**
- Browser check at 375px: More shows Guide first; each section opens; search narrows results;
  Android-style Back returns guide → More → hub; the first-run card shows once and stays gone after
  dismissal and a reload.

## MANUAL CHECKLIST FOR THE DEVELOPER (real hardware)
- Read every article on your phone as a client would. Anything you had to ask about is a missing
  article.
- Hardware Back inside the guide on Android (installed app).
- The first-run card on a fresh install (separate device or browser profile — D15).

Commit: `feat(more): in-app guide for clients (W39)`.
