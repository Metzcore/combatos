# Gym Photo → Equipment Inventory Prompt

**Status:** coach tool. Paste the block below into any vision-capable model along with the client's
gym photos. Output is a **draft inventory only** — it is never authoritative until confirmed.

**Why this exists:** it keeps equipment inventory out of the client questionnaire (saving them ten
minutes of bad guessing) and out of Supabase Storage (avoiding the client-upload gate entirely).
Photos arrive over WhatsApp; nothing is uploaded to any system we own.

**Before pasting:** strip or avoid images containing other gym members' faces, the client's face, or
anything identifying. Use `PILOT-01` — never the client's name.

---

## What to ask the client for

Send this over WhatsApp:

> When you have a few minutes at the gym, could you send me some photos? It means I'll only ever
> prescribe things you can actually use.
>
> - **Wide shots** of each area you'd train in — free weights, machines, cables, cardio, any
>   turf or functional space
> - **Close-ups** of anything unfamiliar or branded, including the label plate if it's visible
> - **Cardio and conditioning** options, even ones you only sometimes use
> - **Home equipment** you genuinely use — not things you're planning to buy
> - A quick note on anything **unavailable or impractical** — broken, always taken, or you just
>   won't use it
> - Anything about **layout or crowding** that makes moving between areas annoying
>
> Rough and complete beats perfect and partial. No need for every angle.

---

## The prompt

```text
You are helping a strength and conditioning coach build an equipment inventory from photographs
of a client's gym. The client is referred to only as PILOT-01.

Analyse the attached photographs and produce a DRAFT inventory. This draft will be reviewed by the
coach and confirmed with the client before it is used. It is not a final record.

RULES

1. Report only what is visibly present. Do not infer equipment that "a gym like this would have."
2. If you cannot identify a machine confidently, say so and describe what you can see
   (approximate function, visible label text, cable/plate/selectorised). Never guess a brand or
   model name from a blurry label.
3. A photograph is evidence that equipment may exist. It is NOT evidence that the equipment is
   free at the client's training time, in working order, correctly adjustable for them, or safe
   for them to use. Never state or imply otherwise.
4. Do not recommend exercises, write a programme, or judge whether the gym is "good."
5. Do not invent identifiers, exercise IDs, or catalogue references of any kind.
6. If a photograph contains a person's face or anything identifying, note that it should be
   excluded and do not describe the person.

OUTPUT

First, a table with exactly these columns:

| Item / station | Status | Substitution if needed | Layout constraint | Evidence / photo ref | Confidence | Client confirmed? | Notes |

- Status is one of: available | unavailable | uncertain | impractical
- Confidence is one of: low | medium | high
- Client confirmed? is always "pending" in this draft
- Evidence / photo ref should identify which image the item came from

Then these summary fields:

- Zones present:
- Zones absent or not pictured:
- Cross-zone supersets practical? (yes / no / partial / cannot tell)
- Apparent crowding or peak-hour constraints:
- Items needing client confirmation (list every "uncertain" row):
- Questions the coach should ask the client:

End with a one-line statement of what the photographs did NOT show, so the coach knows the gaps.
```

---

## After running it

1. **Review every `uncertain` row.** Ask the client only about those — not about everything.
2. **Ask about restrictions the photos cannot reveal:** membership limits, peak-hour availability,
   anything broken, anything they simply won't use.
3. **Record the confirmed result** as the `gym_inventory` revision in the coach dossier
   (`PILOT-ONBOARDING-PACK-DRAFT.md`, Part 3B and Part 4D).
4. **Only confirmed equipment**, plus explicitly approved substitutions, may reach the
   `compilation_handoff` and the authoring kit.

**Never pass raw photographs into the compilation handoff.** The handoff carries confirmed
constraints and equipment lists only — no images, no contact details, no raw conversation.

---

## Retention

For the friends-and-family pilot, photos stay in WhatsApp and are not copied into this repository or
into Supabase. That is a deliberate, coach-accepted trade for pilot speed.

⚠️ **Revisit before the first paying client.** At that point decide a retention period, whether
images move into a private Supabase Storage bucket with case-linked metadata, and what gets deleted
after inventory confirmation.
