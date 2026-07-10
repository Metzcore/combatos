# Daily Checklist UI/UX Specification

This document provides a comprehensive breakdown of the "Daily Checklist" UI based on the reference screenshot. Feed this to your AI to help it plan and build an accurate adaptation for your workout app.

## 1. Visual Aesthetics & Theme
* **Color Palette:**
  * **Background:** Deep dark navy/grey (approx. `#0A1929` or similar dark shades).
  * **Card Backgrounds (Groups):** Slightly lighter navy (`#132337`) with subtle borders (`#1E324A`) to create depth.
  * **Text:** White for primary text (titles, tasks), dimmed gray/blue for secondary text (timestamps, recurrence).
  * **Accents:** Muted yellow/gold (`#FFD166` or similar) for primary action buttons (Share, Import, Submit task) and icons.
  * **Alerts/Icons:** Red/Orange for streaks (🔥), light blue for specific task icons (💧).
* **Typography:** Clean, modern sans-serif font (e.g., Inter, Roboto).
* **Shapes:** Soft rounded corners (approx. `6px` - `8px` border-radius) on all cards, inputs, and buttons.

## 2. Layout Structure

The Checklist is contained within a vertical panel (likely a flexbox column with gaps).

### Header Section
* **Title:** "Daily Checklist" (Left-aligned, large font, bold).
* **Clock/Subtext:** Small digital clock display (`04:33:16`) and AM/PM indicator below the title.
* **Action Buttons:** "Share" and "Import" buttons aligned to the right. These are outlined buttons with a yellow tint and icons.

### Task Input Area
* A full-width input field with the placeholder "Describe your task".
* A square, yellow submit button with a downward arrow (↓) attached to the right side of the input field.

### Task Groups (The Core UI)
Tasks are organized into distinct groups (e.g., "General Tasks", "METZCORE", "Health & Fitness", "Self Improvement (HQ)").
* **Group Container:** Each group is a card-like block.
* **Group Header:** The name of the group acts as the title inside the card, aligned left, with a subtle separator line below it or just spacing.

### Task Item Component
Within each group, individual tasks are displayed as horizontal rows:
* **Left - Checkbox:** A rounded-square checkbox.
* **Middle - Content:**
  * **Primary Text:** The task name (can include emojis like 💧, 🧘, 🍴).
  * **Secondary Text (Subtext):** 
    * Calendar icon + "Scheduled for [Time]"
    * Sync icon (🔁) + "Daily"
    * Fire icon (🔥) + Streak number
* **Right - Actions:** A small button with three dots (`...`) for an options menu, or a trash icon for deletion.

### Footer Actions
* **"+ Create Group"** button: Full-width button with a transparent/dark background to add a new category.
* **"Add Campus Tasks"** button: Another full-width action button.

## 3. Recommended Data Model

To make this functional, the AI should implement a state model similar to this:

```json
{
  "groups": [
    {
      "id": "group_1",
      "name": "Health & Fitness",
      "tasks": [
        {
          "id": "task_1",
          "title": "Hydrate",
          "icon": "💧",
          "scheduledTime": "11:32 AM",
          "isRecurring": true,
          "recurrencePattern": "Daily",
          "streakCount": 1,
          "isCompleted": false
        }
      ]
    }
  ]
}
```

## 4. Interactive Behaviors (Vibe & Feel)
When instructing the AI to build this, emphasize these micro-interactions:
* **Hover Effects:** Task rows should slightly lighten their background on hover. Checkboxes should have a subtle border color change on hover.
* **Completion State:** Clicking the checkbox should visually indicate completion (e.g., strike-through the text, dim the row opacity, checkmark animation).
* **Responsiveness:** The layout should gracefully adapt, ensuring the secondary text wraps or truncates neatly on smaller screens.
