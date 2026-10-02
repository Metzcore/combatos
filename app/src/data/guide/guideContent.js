/**
 * data/guide/guideContent.js — the in-app Guide's content (W39).
 *
 * Plain bundled data: no fetch, no CMS, no Markdown. It ships in the same
 * version as the features it describes, and works offline.
 *
 * THE UPKEEP RULE (AGENTS.md): any PR that changes something a user can see
 * updates the matching article here — and adds a dated entry to the "What's
 * new" section — in the same PR, or states why none applies. Write only what
 * the shipped code does today; never describe a feature that is not built.
 *
 * LANGUAGE: guide prose is UK English. When an article quotes an on-screen
 * label, button or message, it quotes it EXACTLY as the app shows it, even in
 * US spelling ("Use this program"). Those quotes are converted when the app's
 * own screens are (W41).
 *
 * Article shape (rendered in this order):
 *   id        unique string
 *   section   one of GUIDE_SECTIONS[].id
 *   title     string
 *   summary   one-line lead
 *   body      string[]  paragraphs
 *   points    string[]  bullets
 *   steps     string[]  numbered steps
 *   related   string[]  ids of other articles, shown as links
 *   keywords  string[]  extra search terms (synonyms, both spellings)
 *   date      'YYYY-MM-DD'  What's new entries only; newest first
 */

export const GUIDE_SECTIONS = [
    { id: 'start', title: 'Start here', blurb: 'From a new phone to your first logged workout.' },
    { id: 'hubs', title: 'The app, hub by hub', blurb: 'What each tab is for and what you can do there.' },
    { id: 'howto', title: 'How do I…', blurb: 'Short steps for common jobs.' },
    { id: 'trouble', title: 'Troubleshooting', blurb: 'When something does not look right.' },
    { id: 'new', title: "What's new", blurb: 'Changes you will notice, newest first.' },
]

export const GUIDE_ARTICLES = [
    // ───────────────────────── Start here ─────────────────────────
    {
        id: 'start-install',
        section: 'start',
        title: 'Put Combat OS on your home screen',
        summary: 'Install it once so it opens like any other app, even with no signal at the gym.',
        body: [
            `Installing protects the app's data from being cleared automatically, and Combat OS then opens like any other app.`,
            `On an iPhone, do this before you sign in. The home screen app and Safari keep their data separately, so signing in inside Safari does not carry over to the home screen app.`,
            `Pick your phone for the steps. While Combat OS is not installed, More › About shows the same steps.`,
        ],
        related: ['how-install-iphone', 'how-install-android'],
        keywords: ['install', 'home screen', 'add to home screen', 'app', 'pwa', 'iphone', 'android', 'safari', 'chrome'],
    },
    {
        id: 'start-signin',
        section: 'start',
        title: 'Sign in',
        summary: 'Use the email address and password your coach gave you.',
        body: [
            `There is no sign-up button. Your coach creates your account.`,
            `You need a connection the first time you sign in. After that your workouts save on your phone first, so the app keeps working with no signal.`,
        ],
        steps: [
            `Open Combat OS from your home screen. On an iPhone, always use the home screen app, not Safari.`,
            `Type your email address and your password. Tap Show to check what you typed.`,
            `Tap Sign in.`,
            `If it says "Email or password is incorrect", check for typing mistakes, then see Reset a forgotten password.`,
            `If it says "Too many attempts", wait a few minutes and try again.`,
        ],
        related: ['how-reset-password'],
        keywords: ['sign in', 'log in', 'login', 'password', 'email', 'account', 'sign up', 'register', 'locked out'],
    },
    {
        id: 'start-program',
        section: 'start',
        title: 'Find your programme',
        summary: `Your coach's programme lives under Train.`,
        body: [
            `Your programme is a set of training days. Combat OS follows one active programme at a time, and shows it in the Train tab.`,
        ],
        steps: [
            `Tap Train at the bottom of the screen.`,
            `Tap Plan at the top to see your active programme. Tap a day to open it.`,
            `Tap Library at the top to see every programme available to you.`,
            `If Today says "Choose an active program", tap Open Library, tap a programme, tap Use this program, then tap Make active.`,
            `If Library says "No programs available", your coach has not made a programme available to you yet. Tell your coach.`,
        ],
        related: ['hub-train-plan', 'hub-train-library'],
        keywords: ['program', 'programme', 'plan', 'coach', 'active program', 'library', 'choose', 'switch'],
    },
    {
        id: 'start-first-workout',
        section: 'start',
        title: 'Log your first workout',
        summary: 'Start, fill in your sets, then press FINISH.',
        body: [
            `Your entries save on your phone as you go. Look for "Saved on device ✓" at the top. A locked screen or a dropped signal will not lose them.`,
        ],
        steps: [
            `Tap Train, then Today.`,
            `Check the day shown under Suggested. To train a different day, tap Choose a different day and pick one.`,
            `Tap START.`,
            `Tap a section's title to open it. For each strength or core exercise, type the kg and reps for every set.`,
            `Scroll to Session summary and tick or tap what you did.`,
            `Tap FINISH. If it asks what kind of session it was, tap the closest match.`,
            `Open Log › History to check your workout is there.`,
        ],
        related: ['how-log-workout', 'how-log-rest'],
        keywords: ['first workout', 'start', 'finish', 'log', 'today', 'begin', 'new'],
    },

    // ─────────────────── The app, hub by hub ───────────────────
    {
        id: 'hub-nav',
        section: 'hubs',
        title: 'Getting around',
        summary: 'Five tabs along the bottom, and tabs along the top of most of them.',
        body: [
            `The bar at the bottom has five tabs: Train, Timer, Log, Checklist and More. Tap one to switch. Your unfinished workout and any running timer stay put while you look at another tab. Combat OS remembers which top tab you were on, until you close the app.`,
        ],
        points: [
            `Train: Today, Plan, Library.`,
            `Timer: Basic, Custom Rounds.`,
            `Log: History, Overview.`,
            `Checklist: Checklist, Notes.`,
            `More: a list of screens (Guide, Profile, Settings, Ignition, Backup & Data, Agent, About).`,
        ],
        keywords: ['navigation', 'tabs', 'menu', 'bottom bar', 'where is', 'find'],
    },
    {
        id: 'hub-train-today',
        section: 'hubs',
        title: 'Train › Today',
        summary: 'Where you start, do and log a workout.',
        body: [
            `Before you start, Today shows the day it suggests, which is the day after the one you last logged. You can choose any day in any order. The suggestion is only a guide.`,
            `After you tap START, each section of the workout opens when you tap its title. For strength and core exercises you enter the kg and reps for every set. You can also add extra sets, see what you did last time, watch a demo, swap the exercise, or add a note.`,
            `Near the bottom you fill in a short Session summary, choose which day you are logging for, and tap FINISH.`,
            `Your entries save on your phone as you go. If you leave the app mid-workout, Today offers Continue or Discard when you come back.`,
        ],
        points: [
            `Rest and recovery days have one button: LOG REST DAY or LOG RECOVERY DAY.`,
            `Days marked Custom / Free-form (a Fight day, for example) ask what you did and for how long.`,
            `Started by mistake? Tap Discard this workout near the bottom. It clears everything you entered.`,
        ],
        related: ['how-log-workout', 'how-log-past-day', 'how-swap-exercise', 'how-watch-demo', 'how-log-rest'],
        keywords: ['today', 'workout', 'start', 'finish', 'suggested', 'sets', 'reps', 'session summary', 'continue', 'discard'],
    },
    {
        id: 'hub-train-plan',
        section: 'hubs',
        title: 'Train › Plan',
        summary: 'Look through your active programme without starting anything.',
        body: [
            `Plan shows the programme you are using: how many days it runs, what it helps you build, the equipment you need, and a "How this program works" note you can open.`,
            `Under "Program week", tap a training day to open it and see every section and exercise, with sets, reps, load guidance and coaching cues. Rest, recovery and free-form days show as a single row. Exercises that have a demo have a WATCH DEMO link.`,
            `Plan is read-only. You log workouts in Today. If your phone is offline, Plan shows the copy saved on your phone and says so.`,
        ],
        keywords: ['plan', 'program', 'programme', 'week', 'days', 'exercises', 'equipment', 'offline'],
    },
    {
        id: 'hub-train-library',
        section: 'hubs',
        title: 'Train › Library',
        summary: 'Every programme available to you, and which one is active.',
        body: [
            `Library lists the programmes your coach has made available. The one you are using is marked Active. Tap any programme to preview it. Nothing changes until you choose to switch.`,
            `To switch, open a programme, tap Use this program, then tap Make active. Your history stays. You need a connection to switch. If you have an unfinished workout, Combat OS asks whether to keep it or discard it first.`,
            `Today follows whichever programme is active.`,
        ],
        keywords: ['library', 'programs', 'programmes', 'switch program', 'change program', 'active'],
    },
    {
        id: 'hub-timer-basic',
        section: 'hubs',
        title: 'Timer › Basic',
        summary: 'A stopwatch and a rest timer.',
        body: [
            `The stopwatch counts up. Tap START or PAUSE, and RESET to clear it.`,
            `The rest timer counts down. Tap 60s, 90s, 2m or 3m to start it, then PAUSE, RESUME or CANCEL. Tap +15s or +30s to add time. When it reaches zero it rings and vibrates where your phone allows, and the card flashes.`,
            `Both timers keep running when you switch to another tab, and the screen stays awake while one is running on phones that allow it. Keep Combat OS open on screen while you time something.`,
            `Tap ⋮ on a card to move it up or down. Combat OS remembers your order.`,
        ],
        keywords: ['timer', 'stopwatch', 'rest timer', 'countdown', 'alarm', 'basic'],
    },
    {
        id: 'hub-timer-rounds',
        section: 'hubs',
        title: 'Timer › Custom Rounds',
        summary: 'A round timer for bag work, sparring and intervals.',
        body: [
            `Set up your rounds, then tap START WORKOUT. Prep is the countdown before round 1. Rounds is how many. Round is the length of each round in minutes and seconds. Rest is the break between rounds. Interim Bell rings part-way through each round every set number of seconds (0 turns it off). A one-line summary shows what you have set.`,
            `While it runs, the large clock counts down the current part. The screen shows PREPARE, WORK or REST and "ROUND 1 OF 3". A bell and vibration mark each change. Tap PAUSE or RESUME, or RESET to go back to setup. After the last round, tap FINISH.`,
            `To reuse a setup, type a name under Saved Setups and tap SAVE. Tap a saved setup to load it. Tap ✕ to delete it. It starts with 10 seconds prep, 3 rounds of 3:00, 60 seconds rest and a bell every 30 seconds.`,
        ],
        keywords: ['rounds', 'boxing timer', 'intervals', 'bell', 'prep', 'saved setups', 'custom rounds'],
    },
    {
        id: 'hub-log-history',
        section: 'hubs',
        title: 'Log › History',
        summary: 'Every workout you have logged, newest training day first.',
        body: [
            `Each logged session is a card with the date, the day name, a badge for the type of session, how complete it was (strength and conditioning days), how long it took if you entered a duration, and any notes.`,
            `A workout you logged for a past day sits under the day you trained, not the day you entered it.`,
            `History is a record to read. You cannot edit entries here. If you logged something by mistake, see Backup & Data.`,
            `Completeness is how much of the prescribed strength and core work you recorded.`,
        ],
        keywords: ['history', 'log', 'past workouts', 'completeness', 'sessions', 'record'],
    },
    {
        id: 'hub-log-overview',
        section: 'hubs',
        title: 'Log › Overview',
        summary: 'Patterns over weeks: a calendar, a trend, your activities and your weight.',
        points: [
            `Calendar: one square per day, coloured by what you trained. S is strength and conditioning, C is combat, O is other, R is rest or recovery. A dot in the corner means more than one session that day. A ring marks today. Tap a filled square for that day's breakdown. Use ‹ and › to change month.`,
            `8 weeks or 26 weeks: this switch controls the weekly completeness and activity coverage panels only. It does not change the calendar or the weight line.`,
            `Weekly completeness: one bar per week showing your average completeness. A dashed empty slot means you logged no strength and conditioning session that week. It does not mean 0%. Tap a bar for the exact figure.`,
            `Activity coverage: how often each activity (warm-up, weights, bag work and so on) was ticked across your logged workouts in the period.`,
            `Body weight: a line through your weight check-ins, with a break wherever you did not check in. It shows what you recorded and nothing else. There are no targets.`,
        ],
        related: ['how-record-weight'],
        keywords: ['overview', 'calendar', 'heatmap', 'trend', 'weekly', 'coverage', 'weight', 'progress', 'stats', 'color', 'colour'],
    },
    {
        id: 'hub-checklist',
        section: 'hubs',
        title: 'Checklist › Checklist',
        summary: 'Your daily standing orders: habits and tasks you tick off.',
        body: [
            `Tasks live in groups. Type in the box at the bottom and tap ↓ to add a task quickly. It lands in a group called General. Tap + on a group to add a task with more detail. Tap … on a group or a task for more options.`,
        ],
        points: [
            `Tick the box to mark a task done for today. Tasks set to repeat daily come back unticked after the daily reset and build a streak, shown as a flame, for each day in a row you do them.`,
            `A counted task has a + button instead of a box. Each tap adds one to today's tally. To take one off, tap … and then "− 1 today".`,
            `"Resets in" at the top counts down to your daily reset. Tap it to change the time. It starts at midnight.`,
            `A task that does not repeat disappears from the list once you tick it.`,
            `Share saves your checklist as a file. Import lets you paste a list, one task per line.`,
            `Your checklist stays on this phone only. It is never uploaded. A full backup (More › Backup & Data) is its only copy.`,
        ],
        related: ['how-backup', 'ts-other-phone'],
        keywords: ['checklist', 'tasks', 'habits', 'streak', 'groups', 'daily', 'reset', 'counted', 'repeat'],
    },
    {
        id: 'hub-notes',
        section: 'hubs',
        title: 'Checklist › Notes',
        summary: 'A notebook for debriefs and ideas, kept on this phone.',
        points: [
            `Type in the box at the bottom to capture a note fast. It lands in a group called Inbox.`,
            `Tap a note to read it, and ✎ Edit to change it. Notes save automatically as you type.`,
            `Lines that start with "- [ ]" become tick boxes when you read the note.`,
            `Add tags in the editor. Tap a tag at the top of the list to show only those notes. Search looks through titles and text.`,
            `☀ Today opens today's daily note, which starts from a template. ✎ Template changes what new daily notes start with.`,
            `Tap … on a note to pin it to the top, move it to another group or delete it.`,
            `Share saves your notes as a file.`,
            `Your notes stay on this phone only. They are never uploaded. A full backup is their only copy.`,
        ],
        related: ['how-backup', 'ts-other-phone'],
        keywords: ['notes', 'journal', 'debrief', 'tags', 'search', 'daily note', 'template', 'pin'],
    },
    {
        id: 'hub-more',
        section: 'hubs',
        title: 'More: a tour',
        summary: 'Seven screens for your account, settings and data.',
        body: [
            `Tap a row to open it. Tap ‹ at the top left, or your phone's Back button on Android, to return to the list.`,
        ],
        points: [
            `Guide: this guide.`,
            `Profile: your account, Sign Out and your weight check-in.`,
            `Settings: the Daily Ignition splash on or off.`,
            `Ignition: your saved quotes and your own quotes.`,
            `Backup & Data: back up, restore on a new phone, remove a mistaken log.`,
            `Agent: for coaches and advanced users who run their own backup address. Nothing is sent anywhere unless you set it up. If nobody gave you an address, leave it alone.`,
            `About: your data version, whether Combat OS is installed, and how to install it.`,
        ],
        keywords: ['more', 'menu', 'profile', 'settings', 'about', 'agent'],
    },
    {
        id: 'more-profile',
        section: 'hubs',
        title: 'More › Profile',
        summary: 'Your account and your weekly weight check-in.',
        body: [
            `Profile shows the email address you are signed in with, and says if you are using the app offline.`,
            `Sign Out signs you out on this phone only. Your other devices stay signed in. Signing out discards any unfinished workout on this phone and clears the saved programme, so you need a connection to load your plan when you sign in again.`,
            `The weight check-in is on the same screen. See Record my weight.`,
        ],
        related: ['how-record-weight'],
        keywords: ['profile', 'account', 'sign out', 'log out', 'email'],
    },
    {
        id: 'more-settings',
        section: 'hubs',
        title: 'More › Settings',
        summary: 'Turn the Daily Ignition splash on or off.',
        body: [
            `"Enable Daily Ignition Splash" controls the quote that appears when you open the installed app. It takes effect as soon as you tick or untick it.`,
            `App Name and App Subtitle only change a heading that programmes do not use. If you follow a programme, nothing you can see changes when you edit them, so leave them as they are. SAVE CHANGES saves those two boxes.`,
        ],
        related: ['more-ignition'],
        keywords: ['settings', 'app name', 'subtitle', 'splash', 'ignition', 'personalization', 'personalisation'],
    },
    {
        id: 'more-ignition',
        section: 'hubs',
        title: 'More › Ignition',
        summary: 'Your saved quotes, and your own quotes.',
        body: [
            `When Daily Ignition is on, the installed app shows a quote for a few seconds when you open it. Tap ✕ to close it early, or ★ to save it. Quotes do not appear when you use Combat OS in a browser tab.`,
            `More › Ignition lists your saved quotes. Tap ★ on one to remove it.`,
            `To add your own, tap Add quotes, paste one quote per line, then tap Add. Your quotes join the ones the splash picks from. Tap ✕ on one to delete it, or Reset to defaults to remove all of your own. Quotes that came with the app are never removed.`,
        ],
        keywords: ['ignition', 'quotes', 'motivation', 'splash', 'bookmark', 'saved'],
    },
    {
        id: 'more-backup',
        section: 'hubs',
        title: 'More › Backup & Data',
        summary: 'Back up everything, restore on a new phone, or remove a mistaken log.',
        points: [
            `Data Backup: EXPORT FULL BACKUP saves everything on this phone (workouts, settings, checklist and notes) as one file. "Last full backup" shows how long ago you did it.`,
            `Restore on a New Device: loads a backup file onto a new phone. It replaces matching data, so use it only on a new or empty install.`,
            `Danger Zone: Remove Last Logged Day removes the workout you entered most recently. That is the last one you logged, not necessarily the one with the latest date. It is removed from this phone and from your account. Use it only if you logged by mistake.`,
        ],
        related: ['how-backup', 'ts-new-phone'],
        keywords: ['backup', 'restore', 'export', 'data', 'delete', 'remove last', 'mistake', 'danger zone'],
    },
    {
        id: 'more-about',
        section: 'hubs',
        title: 'More › About',
        summary: 'Your data version, and whether Combat OS is installed.',
        body: [
            `About shows your data version (a number support may ask for), whether Combat OS is installed on your home screen, and Storage. Persistent means your phone has agreed not to clear Combat OS's data automatically. Best-effort means it might, so back up regularly.`,
            `If Combat OS is not installed, About also shows the install steps for your phone.`,
        ],
        related: ['start-install'],
        keywords: ['about', 'version', 'installed', 'storage', 'persistent'],
    },

    // ─────────────────────── How do I… ───────────────────────
    {
        id: 'how-log-workout',
        section: 'howto',
        title: 'Log a workout',
        summary: 'From START to FINISH.',
        body: [
            `Your entries save on your phone as you go. If you leave the app, Today offers Continue the next time you open it.`,
            `RPE or RIR boxes appear only when your programme asks for one. Warm-up, cooldown and conditioning items are guidance only, with nothing to type except an optional note. Tap "What do RPE / RIR / %1RM mean?" for a short explanation.`,
            `A set counts towards completeness once you have entered kg or reps for it.`,
        ],
        steps: [
            `Tap Train, then Today.`,
            `Check the day shown. To train a different day, tap Choose a different day.`,
            `Tap START.`,
            `Tap a section's title to open it. Under each strength or core exercise, type the kg and reps for each set. Tap + Add set if you do more sets than planned. Tap Remove on an extra set to undo it.`,
            `Optional: tap Note on an exercise to jot something down.`,
            `Scroll to Session summary. Tick Warm-up and Cooldown if you did them, tap the activities you did, and add session notes.`,
            `Check that Logging for says Today. To change it, see Log a workout for a past day.`,
            `Tap FINISH. If it asks "What kind of session was this?", tap the closest match.`,
            `Today returns to its start screen with no message. Open Log › History to check your workout is there.`,
        ],
        related: ['how-log-past-day', 'how-swap-exercise'],
        keywords: ['log workout', 'finish', 'start', 'sets', 'reps', 'kg', 'record', 'complete', 'session summary'],
    },
    {
        id: 'how-log-past-day',
        section: 'howto',
        title: 'Log a workout for a past day',
        summary: 'Forgot to log? Log it for the day you trained.',
        body: [
            `You can log back up to 14 days. You cannot pick a date in the future.`,
            `The workout appears in Log under the day you trained, even though it is recorded when you tap FINISH.`,
            `This works for training days and free-form days. Rest and recovery logging is always for today.`,
        ],
        steps: [
            `Tap Train, then Today, and tap START on the day you trained.`,
            `Fill in the workout as normal.`,
            `Scroll to Logging for, just above FINISH. Tap Yesterday, or tap Pick a date and choose the day.`,
            `Check the button now reads FINISH — LOG FOR and the day, for example MON 28 SEP.`,
            `Tap FINISH.`,
        ],
        keywords: ['past day', 'yesterday', 'forgot', 'backdate', 'late', 'previous day', 'date'],
    },
    {
        id: 'how-swap-exercise',
        section: 'howto',
        title: 'Swap an exercise',
        summary: 'Record what you did instead.',
        body: [
            `The programme's exercise stays shown as Prescribed and yours shows as Performed. Your log keeps both.`,
            `When you swap an exercise, its DEMO link is hidden, because the demo would no longer match what you did.`,
        ],
        steps: [
            `In Today, tap START, then find the exercise.`,
            `Tap Change exercise.`,
            `Type what you did instead.`,
            `Tap Save.`,
            `To go back, tap Change exercise, then Revert to prescribed.`,
        ],
        keywords: ['swap', 'change exercise', 'substitute', 'replace', 'instead', 'alternative'],
    },
    {
        id: 'how-watch-demo',
        section: 'howto',
        title: 'Watch an exercise demo',
        summary: 'Open a demo video for an exercise.',
        body: [
            `Demos open on another website, so you need a connection. Not every exercise has one. If you see no link, no demo has been added yet. In Today, the link disappears once you swap that exercise.`,
        ],
        steps: [
            `Find the exercise in Plan, Library or an active workout in Today.`,
            `Tap WATCH DEMO (Plan and Library) or DEMO (Today).`,
            `Watch the video. Leave the video page to come back to Combat OS.`,
        ],
        keywords: ['demo', 'video', 'watch', 'how to do', 'technique', 'tutorial'],
    },
    {
        id: 'how-log-rest',
        section: 'howto',
        title: 'Log a rest or recovery day',
        summary: 'One tap, for today.',
        body: [
            `Rest and recovery logging is always for today. You cannot back-date it.`,
        ],
        steps: [
            `Tap Train, then Today.`,
            `If the day shown is a rest or recovery day, tap LOG REST DAY or LOG RECOVERY DAY. If not, tap Choose a different day and pick the rest or recovery day.`,
            `Open Log › History to check it is there.`,
        ],
        keywords: ['rest day', 'recovery day', 'log rest', 'day off'],
    },
    {
        id: 'how-see-progress',
        section: 'howto',
        title: 'See my progress',
        summary: 'History for the record, Overview for patterns.',
        steps: [
            `Tap Log. History lists your workouts, newest first.`,
            `Tap Overview for patterns. Tap a filled square on the calendar to see what you trained that day.`,
            `Switch between 8 weeks and 26 weeks to change the completeness trend and activity coverage.`,
            `Scroll to Body weight to see your weight line.`,
            `To see what you lifted last time, open Today during a workout. Each exercise shows "Last:" with your previous sets.`,
        ],
        keywords: ['progress', 'stats', 'trend', 'history', 'calendar', 'last time', 'improvement'],
    },
    {
        id: 'how-record-weight',
        section: 'howto',
        title: 'Record my weight',
        summary: 'One check-in a day, in kg or lb.',
        body: [
            `Saving again on the same day updates that day's check-in. The button then reads UPDATE CHECK-IN.`,
            `Switching between kg and lb only changes how weights are shown.`,
            `Recent check-ins are listed below the box. Tap ✕ to remove one. Each shows Synced or On this device.`,
            `After your first check-in, a "Weekly weight check-in" bar appears above the bottom tabs once your last one is more than a week old. Tap Log it to jump to Profile, or Later to hide it for 7 days.`,
            `See your trend in Log › Overview › Body weight.`,
        ],
        steps: [
            `Tap More, then Profile.`,
            `Under Weight check-in, tap kg or lb.`,
            `Type your weight in the box.`,
            `Tap SAVE CHECK-IN.`,
        ],
        keywords: ['weight', 'weigh in', 'body weight', 'check-in', 'kg', 'lb', 'scale'],
    },
    {
        id: 'how-backup',
        section: 'howto',
        title: 'Back up my data',
        summary: 'Save a full copy of everything on your phone.',
        body: [
            `Your workouts also sync to your account, but your checklist and notes live only on this phone. The backup file is their only copy.`,
            `If you close the share sheet without saving, it does not count as a backup.`,
            `Back up before you move to a new phone, and regularly if you use Combat OS in a browser tab instead of installed.`,
        ],
        steps: [
            `Tap More, then Backup & Data.`,
            `Tap EXPORT FULL BACKUP.`,
            `When your phone's share sheet opens, save the file somewhere safe, such as Files, a cloud drive or an email to yourself. If sharing is not available, the file downloads instead.`,
            `Check that "Last full backup" says today.`,
        ],
        related: ['ts-new-phone'],
        keywords: ['backup', 'export', 'save data', 'copy', 'protect', 'file'],
    },
    {
        id: 'how-reset-password',
        section: 'howto',
        title: 'Reset a forgotten password',
        summary: 'Get an emailed link and choose a new password.',
        body: [
            `The link expires. If it says it has expired, ask for a new one from the sign-in screen.`,
            `Skip for now keeps your old password. The link has already signed you in.`,
            `Resetting a password signs you out on every other device, so sign in again wherever you use Combat OS.`,
            `If no email arrives, check spam, then contact your coach.`,
        ],
        steps: [
            `On the sign-in screen, type your email address.`,
            `Tap Forgotten your password?`,
            `Open the email on the same phone and tap the link.`,
            `Type your new password twice (at least 8 characters), then tap Save password.`,
            `Sign in with your new password. If you use the home screen app, open it from your home screen and sign in there.`,
        ],
        keywords: ['forgot password', 'reset', 'password', 'locked out', 'email link', `can't sign in`],
    },
    {
        id: 'how-install-iphone',
        section: 'howto',
        title: 'Install on an iPhone',
        summary: 'Add Combat OS to your home screen from Safari.',
        body: [
            `Do this before you sign in. Signing in inside Safari does not carry over to the home screen app.`,
        ],
        steps: [
            `Open Combat OS in Safari. If you opened the link inside another app, open it in Safari instead.`,
            `Tap the Share button in Safari.`,
            `Scroll down and tap Add to Home Screen.`,
            `Open Combat OS from your home screen and sign in there.`,
        ],
        keywords: ['install', 'iphone', 'ios', 'safari', 'home screen', 'add to home screen'],
    },
    {
        id: 'how-install-android',
        section: 'howto',
        title: 'Install on an Android phone',
        summary: 'Install Combat OS from Chrome.',
        body: [
            `If you do not see Install app, you may already have it. Look for Combat OS on your home screen or in your app list.`,
        ],
        steps: [
            `Open Combat OS in Chrome. If you opened the link inside another app such as Instagram, open it in Chrome instead.`,
            `Tap Install app. It shows on the sign-in screen, and on a banner at the top after you sign in. You can also use More › About.`,
            `Confirm when your phone asks.`,
            `Open Combat OS from your home screen.`,
        ],
        keywords: ['install', 'android', 'chrome', 'home screen', 'install app'],
    },
    {
        id: 'how-latest-version',
        section: 'howto',
        title: 'Get the latest version',
        summary: 'Close the app fully, then open it again.',
        body: [
            `Combat OS updates itself. You never need to reinstall it.`,
            `It downloads a new version in the background when you have a connection. The new version appears the next time you open the app from fully closed. Switching to another app and back is not enough.`,
        ],
        steps: [
            `Make sure your phone has a connection.`,
            `Close Combat OS completely. Swipe it away from your phone's list of recent apps.`,
            `Open Combat OS again from your home screen.`,
        ],
        related: ['ts-no-new-feature', 'whatsnew-guide'],
        keywords: ['update', 'latest version', 'new version', 'refresh', 'reload', 'not updating'],
    },

    // ─────────────────────── Troubleshooting ───────────────────────
    {
        id: 'ts-plan-load',
        section: 'trouble',
        title: `"Couldn't load your plan"`,
        summary: 'Combat OS could not reach your account to fetch your programme.',
        body: [
            `"Connect once to load your plan" means this phone has not saved a programme yet. Connect to the internet once. After that your plan works offline.`,
            `"Couldn't confirm your program" works the same way. Tap Retry.`,
        ],
        steps: [
            `Check that you have a signal or Wi-Fi.`,
            `Tap Retry.`,
            `If it still fails, close Combat OS fully, open it again and tap Retry.`,
            `Still stuck? Tell your coach.`,
        ],
        keywords: [`couldn't load`, 'plan', 'error', 'retry', 'connect', 'no program', 'no programme', 'offline'],
    },
    {
        id: 'ts-update-required',
        section: 'trouble',
        title: `"Update Combat OS to run this program"`,
        summary: 'Your programme needs a newer version of the app.',
        steps: [
            `Make sure your phone has a connection.`,
            `Close Combat OS completely and open it again.`,
            `Still showing? Repeat once, then tell your coach.`,
        ],
        related: ['how-latest-version'],
        keywords: ['update required', 'newer version', `can't run program`, `can't run programme`],
    },
    {
        id: 'ts-no-new-feature',
        section: 'trouble',
        title: `I don't see a new feature`,
        summary: 'The new version loads the next time you open the app from fully closed.',
        steps: [
            `Close Combat OS completely. Swipe it away from your recent apps.`,
            `Open it again from your home screen, with a connection.`,
            `Check What's new to see when the feature was added.`,
        ],
        related: ['how-latest-version'],
        keywords: ['new feature missing', 'not updated', 'old version', `can't find`],
    },
    {
        id: 'ts-finish',
        section: 'trouble',
        title: 'FINISH shows a message instead of logging',
        summary: 'A line above FINISH tells you what to fix.',
        body: [
            `Your workout is still saved on your phone. Nothing is lost.`,
        ],
        points: [
            `"You can't log a workout for a future date": change Logging for to today or an earlier day.`,
            `"That date is more than 14 days ago": pick a date from the last 14 days.`,
            `"Pick a valid date": the date box was cleared, so choose a date again.`,
            `"Duration must be a whole number of minutes": remove any decimal point.`,
            `"Could not save your latest changes" or "Could not log this session": tap FINISH again.`,
        ],
        steps: [
            `Read the message above FINISH and fix what it says.`,
            `Tap FINISH again.`,
        ],
        keywords: ['finish error', `can't log`, `won't save`, 'message', 'date', 'duration'],
    },
    {
        id: 'ts-other-phone',
        section: 'trouble',
        title: `My checklist and notes aren't on my other phone`,
        summary: 'They stay on the phone where you made them.',
        body: [
            `Your checklist and notes are never uploaded. Signing in on another phone does not bring them over.`,
            `Your workout history and weight check-ins are sent to your account as a safety copy, but Combat OS does not load them onto a different phone either.`,
            `The way to move all of it to a new phone is a full backup file. See Move to a new phone.`,
        ],
        related: ['ts-new-phone', 'how-backup'],
        keywords: ['other phone', 'missing notes', 'missing checklist', 'sync', 'not syncing', 'new device', 'history missing'],
    },
    {
        id: 'ts-new-phone',
        section: 'trouble',
        title: 'Move to a new phone',
        summary: 'A backup file brings your history, checklist and notes with you.',
        body: [
            `Your programme loads from your account when you sign in, which needs a connection.`,
            `Restore replaces matching data instead of merging, so use it only on a new or empty install.`,
            `If restore says the versions do not match, update the app on the new phone (close it fully and reopen) or make a fresh backup on the old phone.`,
        ],
        steps: [
            `On your old phone, open More › Backup & Data and tap EXPORT FULL BACKUP. Save the file where you can reach it from the new phone, such as a cloud drive or an email to yourself.`,
            `On the new phone, install Combat OS and sign in. See Start here.`,
            `Open More › Backup & Data and tap RESTORE FROM BACKUP FILE.`,
            `Choose the backup file and confirm.`,
            `Check Log › History, and the Checklist and Notes tabs.`,
        ],
        related: ['how-backup', 'start-install'],
        keywords: ['new phone', 'move', 'transfer', 'restore', 'switch phone', 'upgrade phone', 'lost phone'],
    },
    {
        id: 'ts-one-account',
        section: 'trouble',
        title: 'One account per phone',
        summary: 'Combat OS is built for one person per phone.',
        body: [
            `Your checklist, notes and settings are kept on the phone, not under your account. Signing out does not clear them. If someone else signs in on your phone, they will see your checklist and notes. If two people need Combat OS, each should use their own phone or browser profile.`,
        ],
        keywords: ['share phone', 'two accounts', 'another account', 'sign out', 'family'],
    },

    // ─────────────────────── What's new (newest first) ───────────────────────
    {
        id: 'whatsnew-guide',
        section: 'new',
        date: '2026-10-02',
        title: 'A guide inside the app',
        summary: 'More › Guide explains each tab and answers common questions.',
        body: [
            `Type in the search box to find an answer. New users also see a one-time "New here?" card on Today.`,
        ],
        keywords: ['guide', 'help', 'new'],
    },
    {
        id: 'whatsnew-past-day',
        section: 'new',
        date: '2026-10-02',
        title: 'Log a workout for a past day',
        summary: 'Forgot to log a workout? Log it for the day you trained.',
        body: [
            `During a workout, Logging for (above FINISH) lets you choose Yesterday or any date up to 14 days back. Log and Overview show it on the day you trained.`,
        ],
        related: ['how-log-past-day'],
        keywords: ['past day', 'yesterday', 'new'],
    },
    {
        id: 'whatsnew-install',
        section: 'new',
        date: '2026-10-02',
        title: 'Help installing the app',
        summary: 'Combat OS now shows how to put itself on your home screen.',
        body: [
            `You will see it on the sign-in screen, in a banner after you sign in, and in More › About. On an iPhone, add it to your home screen before you sign in.`,
        ],
        related: ['start-install'],
        keywords: ['install', 'home screen', 'new'],
    },
    {
        id: 'whatsnew-plan-load',
        section: 'new',
        date: '2026-09-30',
        title: `Fewer "Couldn't load your plan" errors after signing in`,
        summary: 'Combat OS now retries by itself before it shows the error.',
        body: [
            `Right after signing in, Today or Plan could show "Couldn't load your plan" until you tapped Retry. Combat OS now retries by itself first.`,
        ],
        keywords: ['plan', 'error', 'sign in', 'new'],
    },
    {
        id: 'whatsnew-reset',
        section: 'new',
        date: '2026-09-29',
        title: 'Reset your own password',
        summary: 'Forgotten your password? Get an emailed link from the sign-in screen.',
        body: [
            `On the sign-in screen, type your email and tap Forgotten your password? We email you a link to choose a new one.`,
        ],
        related: ['how-reset-password'],
        keywords: ['password', 'reset', 'new'],
    },
    {
        id: 'whatsnew-signout',
        section: 'new',
        date: '2026-09-29',
        title: 'Sign Out now affects only this phone',
        summary: 'Signing out no longer signs you out on your other devices.',
        body: [
            `Signing out in More › Profile used to sign you out on all your devices. It now signs you out on the phone you are using only.`,
        ],
        keywords: ['sign out', 'log out', 'new'],
    },
    {
        id: 'whatsnew-password',
        section: 'new',
        date: '2026-09-23',
        title: 'Sign in with a password',
        summary: 'Sign in with your email address and a password.',
        body: [
            `You now sign in with your email address and a password instead of an emailed link.`,
        ],
        related: ['start-signin'],
        keywords: ['password', 'sign in', 'new'],
    },
]
