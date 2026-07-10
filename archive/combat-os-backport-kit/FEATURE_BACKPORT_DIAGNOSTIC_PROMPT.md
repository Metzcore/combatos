# Combat OS — Feature Backport: Diagnostic Prompt

**Instructions for the User:**
This is a DIAGNOSTIC FIRST prompt. The agent must NOT make any code changes.
Copy everything below the dashed line and paste it as the first message in the Combat OS agent session.

--------------------------------------------------------------------------------

You are an expert AI coding assistant working in the **Combat OS (Fight-Camp)** project at `C:\Users\jmfg9\Documents\Fitness\Fight-Camp\`.

This is a **READ-ONLY DIAGNOSTIC** session. Do NOT make any code changes. Your only job is to understand the current codebase and produce a detailed report so we can plan two feature backports safely.

## Context

The user has a separate "Apex Protocol" app which shares the same foundational architecture. Two features from Apex need to be brought into Combat OS:

1. **"Delete Last Logged Day" in Settings** — A button in the Settings tab that lets the user undo their most recent log. It removes the local IndexedDB record AND sends a soft-delete payload to the Google Sheets webhook.

2. **"Next Day" indicator in the HUD** — A small banner in the top HUD selector area that reads e.g. "▶ NEXT: DAY 3" (derived from the last session logged). It tells the user which day they should do next without them having to guess.

Both features exist in the reference files I have provided in: `dev_files/combat-os-backport/reference_files/`
- `db_index.jsx` — Contains `deleteLastSession()` function (search for it around line 445)
- `Settings.jsx` — Contains the UI button for the delete flow (the `handleRemoveLastDay` function)
- `HUD.jsx` from Apex is NOT provided, but the relevant next-day logic is described in detail below.

## What to READ and REPORT on

Please read the following files and answer ALL questions below. Be thorough.

### 1. Read: `app/src/db/index.jsx` (or equivalent DB/state file)
- How is the local session store currently set up? (What library? Dexie? Something else?)
- What fields does a saved session record contain? (date, dayNumber, blockId, sessionType, etc.)
- Is there already a `deleteLastSession` function or similar? If so, describe it.
- Where is the `WEBHOOK_URL` defined? Is it hardcoded or user-configurable?
- What is the exact webhook payload shape when logging a session? (What `action` field does it use if any? Does it have a `sessionId`?)

### 2. Read: `app/src/components/Settings.jsx` (or wherever Settings UI lives)
- Is there already any "danger zone" or delete functionality in the Settings tab?
- Describe the current structure of the Settings component — what sections exist?

### 3. Read: `app/src/components/HUD.jsx` (the main workout screen)
- How does the user currently select which day to train? (Day selector dropdown, buttons, or auto?)
- Is there already a "next day" or progress summary anywhere in the HUD header?
- Where is `sessionCount` or equivalent session history accessed?
- Describe the top "selector block" area — what fields does it show? (Step, Block, Week, etc.)

### 4. CRITICAL — Understand the Day Structure
This is the most important part. Combat OS has a different day structure to Apex:
- How many days are in the plan? (7? More? Less?)
- Are ALL days workout days, or are some days "fight gym" / "rest" / "recovery" days?
- What is the `dayType` or equivalent field on each day plan? What values does it take?
- How does the "next day" calculation need to work here? 
  - In Apex: simply `lastLoggedDay + 1`, wrapping from 7 back to 1.
  - In Combat OS: **Is the wrap point the same? Does the sequence include non-training days that we should still count? Or should next-day skip to the next TRAINING day?**
- Where does the day plan data live? (JSON file? Hardcoded? Hook?)

### 5. Read: The Google Apps Script (if accessible)
- Does the current Apps Script already handle an `action: 'delete'` payload? (The Apex one does a soft-delete by setting a "status" column to "CANCELLED")
- If not, we will need to redeploy the script with this capability.

## Output Format

Please produce a structured report with these headings:
1. **DB / State Layer Summary**
2. **Settings Tab — Current State**
3. **HUD Selector Block — Current State**
4. **Day Structure Analysis** (most critical)
5. **Webhook / Apps Script Capability**
6. **Implementation Risk Assessment** — Flag anything that could break when we implement these features

Do not write any code. Do not make any changes. Only diagnose and report.
