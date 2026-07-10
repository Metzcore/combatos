# Mobile App Navigation Architecture Spec

This document outlines a scalable mobile navigation architecture designed to handle complex apps with many features, inspired by platforms like Discord and online academies. Feed this to your AI to help it restructure your workout app's navigation.

## 1. The Core Problem
The app currently has a bottom navigation bar limited to 5 icons, but the feature set (workouts, checklists, schedules, community, profile, etc.) exceeds this limit. We need a hierarchy that categorizes features into primary, secondary, and tertiary levels.

## 2. Global Navigation Hierarchy (The TRW / Discord Model)

Instead of trying to put every feature in the bottom bar, use a layered approach. 

### Layer 1: Primary Bottom Navigation (Max 5 Items)
These are the overarching "Hubs" of the application.
1. **Home / Dashboard:** The daily summary, quick stats, and immediate next actions.
2. **Campuses / Spaces:** A dedicated tab for different content areas or workout programs.
3. **Chats / Community:** DMs and group chats.
4. **Action Hub (Checklist/Schedule):** The primary productivity tab containing the Daily Checklist.
5. **Profile / Settings:** User stats, account settings, and preferences.

### Layer 2: The Drawer (Side Menu) or "Space" Selector
If the user taps the "Campuses / Spaces" tab from the bottom bar, the screen should utilize a Discord-style layout:
* **Left Column (Narrow):** A vertical scrolling list of icons representing different "Spaces" (e.g., Calisthenics, Weightlifting, Nutrition).
* **Right Area (Main Content):** Shows the channels, content, or specific tabs related *only* to the selected Space.

### Layer 3: Top Tab Bars (Tertiary Navigation)
When a user is inside a specific section, use a Top Tab bar (swipeable) to switch between sub-views.
* **Example in the "Action Hub":** 
  * Tab 1: Checklist (The UI defined in our Checklist Spec)
  * Tab 2: Schedule / Calendar
  * Tab 3: History / Streaks

## 3. UI/UX Component Recommendations

When adapting this to the workout app, the AI should implement:
* **Collapsible Sections (Accordions):** To save vertical space on mobile, group lists (like checklist tasks or workout exercises) into collapsible cards.
* **Floating Action Button (FAB):** Remove the "Add Task" or "Start Workout" button from the main navigation and use a Floating Action Button in the bottom right corner of the screen. This frees up screen real estate.
* **Swipe Gestures:** Allow the user to swipe left/right to navigate between the Top Tabs (e.g., swiping from the Checklist to the Schedule).
* **Bottom Sheets (Modals):** For complex interactions like adding a new task, selecting an exercise, or filtering, slide up a "Bottom Sheet" covering the lower half of the screen rather than navigating to a completely new page.

## 4. Implementation Goal
The AI's objective is to:
1. Audit the existing flat navigation structure.
2. Group the existing features into 3-5 macro categories for the Bottom Navigation.
3. Implement Top Tabs and Bottom Sheets to house the remaining features without cluttering the UI.
