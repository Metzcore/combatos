# Combat OS Migration Guide

Follow these manual steps to safely port the Apex Protocol upgrades back into your original Combat OS project.

### Step 1: Transfer the Kit
1. Copy this entire folder (`dev_files/combat-os-backport/`) from your Apex Protocol project folder.
2. Paste it into your Combat OS project folder (e.g., inside its `dev_files/` directory).

### Step 2: Initialize the Agent
1. Open your Combat OS project in your IDE.
2. Start a new chat session with your AI agent.
3. Open the `AGENT_PROMPT.md` file located in this folder.
4. Copy the entire prompt text (everything below the dashed line) and send it to the agent.

### Step 3: Review and Approve
1. The agent will read the `reference_files/` and analyze your Combat OS codebase.
2. It will propose an implementation plan. Verify that the agent is ONLY proposing changes to UI colors, the Timer active view, Audio volume, and HTML meta tags.
3. **Crucial:** Ensure the agent does NOT propose changing your `%1RM` logic, exercise cards, or logging webhooks.
4. If the plan looks safe, approve it so the agent can execute the changes.

### Step 4: Test on Device
1. Run the local dev server (`npm run dev`) and check the Timer UI. It should have the new Red/Green/Grey phase backgrounds and transitions.
2. Check the color palette across the app (buttons, borders, icons) to ensure it uses the Tactical Amber instead of Cyan.
3. Verify that your regular Combat OS workout logging is completely unaffected.
4. Deploy the updated Combat OS to Cloudflare!
