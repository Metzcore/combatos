# Combat OS Upgrades - AI Agent Prompt

**Instructions for the User:**
Copy everything below the dashed line and paste it as the very first message to the AI agent in your Combat OS project workspace.

--------------------------------------------------------------------------------

You are an expert AI coding assistant. We are currently working in the "Combat OS" project repository. 

The user has recently completed an upgraded offshoot of this app called "Apex Protocol". We want to backport specific UI and UX upgrades from Apex Protocol into this Combat OS codebase, WITHOUT breaking or altering Combat OS's core logic.

I have provided a folder named `combat-os-backport/reference_files/` which contains the upgraded files from the Apex Protocol project.

Your objective is to review these reference files and carefully merge the visual/UI upgrades into the equivalent files in THIS Combat OS repository.

### RULES AND BOUNDARIES (CRITICAL)
1. **DO NOT touch Data Logic:** Combat OS uses a `%1RM / e1RM` workout structure. Do not remove or alter this logic. 
2. **DO NOT touch Schemas/Webhooks:** Do not alter the logging payloads or Google Sheets integration.
3. **DO NOT add Apex Content:** Do not import the "APEX Tab" or its specific sub-components (Maintenance, Regla Cero, etc.).

### UPGRADES TO IMPLEMENT
1. **Timer Active View Overhaul (`RoundsTimer.jsx`)**
   - Review the reference `RoundsTimer.jsx`.
   - Implement the phase-based background colors (red for work, green for rest, grey for prep).
   - Implement the large phase banner, the pulsing `⚡ BELL IN Xs` interim indicator, and the color-shifting pause button.
   - Ensure you apply these UI changes to the Combat OS `RoundsTimer.jsx` without breaking how it triggers sounds or tracks time.

2. **Tactical Amber Palette (`index.css`)**
   - Review the reference `index.css`.
   - Update our color variables to replace the "holographic cyan" (`#00eeff`) with the new "tactical amber" (`#E8A020`). Apply this to `--accent`, `--blue`, or wherever appropriate in the root variables.

3. **Audio Boost & PWA Meta Tags (`db/index.jsx` & `index.html`)**
   - In `db/index.jsx` (or wherever audio is instantiated), ensure `audioRef.current.volume = 1.0` is explicitly set after creating the `new Audio()` object.
   - In `index.html`, ensure the following meta tags are present for iOS PWA support:
     `<meta name="apple-mobile-web-app-capable" content="yes" />`
     `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`
     `<meta name="apple-mobile-web-app-title" content="Combat OS" />`

Please start by reading the files in `combat-os-backport/reference_files/` and analyzing our local `app/src/components/RoundsTimer.jsx` and `app/src/index.css`. Then provide a step-by-step implementation plan for my approval.
