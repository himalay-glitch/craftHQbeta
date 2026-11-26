# Dashboard

Version 5 · 26 Nov 2026 · branch `himalay/dashboard-deck` · route `/dashboard`

What the dashboard is, where its look and content come from, and how it behaves. It describes the code in `src/pages/dashboard/`, `src/components/dashboard/`, `src/components/shell/` and `src/layouts/AppLayout.astro`.

## 1. Sources

| | Comes from | Notes |
|---|---|---|
| **Look** | The Asana "AI Teammates" screenshot, measured pixel by pixel (§6) | White page, a light grey top bar, 12 px cards with a faint shadow, pill filters. Version 5 is the focus stage: one column, the team, one decision at a time |
| **Content** | The manager's prototype (`crafthq-re.html`, Dashboard view) | Its stats (Running and Queued split out, as on the live app, in place of With the agent and Done), nav links, stories, groups, wording ("story", "the agent") and New story form |
| **Data reference only** | The live app.crafthq.ai dashboard | Not used for the look |

**Scope, as agreed:** only the dashboard page is built; the nav links to the other pages lead nowhere yet. No phone-specific work beyond what's already there. No Builder render on the dashboard.

**Builds on:** the Astro move (#2), the Astro version of the design tokens (commit `091ff8b`, in #3/#4's history) and radix-ui (#8). This branch merges after them.

## 2. Layout at 1440 px

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ CHQ                              ( ⌕ Search            )                            (J) │ 48 top bar #F9F9F9
├────┬─────────────────────────────────────────────────────────────────────────────────────┤
│ ▦  │            WePop                                           ( + New story )          │ one 760 px column
│ ☰  │            14 decisions are waiting for you                                         │ 24/32: counts down
│    │            The agents are on 9 stories · 4 shipped this week                        │
│    │            ⚡ GitHub isn't connected, so the agents can't start work. Connect GitHub │ quiet setup line
│    │                                                                                     │
│    │            The team                                  ◌ 9 running  ◷ 0 queued ›      │
│    │             (PM)      (Dev)◜     (Des)      (Tes)◜     (Dbg)◜                       │ rings turn while working
│    │              PM      Developer  Designer   Tester     Debugger                      │
│    │           12 for you  Building    Free    Checking 7  2 stuck  [Asking you]         │
│    │                                                                                     │
│    │             (Dbg)                                                                   │ the agent's face on
│    │            ┌──┴─────────────────────────────────────────────┐                       │ the card's top edge
│    │            │      Debugger · asks you                        │                      │
│    │            │ It's stuck: preview could not start. Want me    │                      │ the question: 20/28
│    │            │ to try again?                                   │                      │
│    │            │ Test story  hq-21 ↗     (Failed) Start its …    │                      │ story and evidence
│    │            │ ( Try again )  ( Back to planning ) ( Cancel )  │                      │ one solid answer
│    │            │ Restarts it; I'll watch the run.                │                      │ what it does
│    │            │ [ Tell the Debugger something…              ↑ ] │                      │ reply box
│    │            └─────────────────────────────────────────────────┘                      │
│    │             └───────────────────────────────────────────────┘  ← two cards under it │
│    │            (‹)(›)  (faces) Next: Android: change the greeting…       All 14 ⌄       │
│ ⚙  │            ─────────────────────────────────────────────────────────────            │
│ ◫  │            Shipped this week                                    6 done in all       │
│    │            ●──────────●──────────●──────────●──────→                                │ the week's merges
└────┴─────────────────────────────────────────────────────────────────────────────────────┘
```

**When nothing needs you,** the stage cross-fades (150 ms out, 200 ms in) to the all clear, and the headline reads "You're all caught up". The team and the week stay where they are.

## 3. Parts

### Top bar and sidebar (`TopBar`, `Sidebar`, `nav.ts`, `SearchBox`, `AvatarMenu`)
- **Top bar:** 48 px, `#F9F9F9`, sticky, the full width of the window, as in Asana. The CHQ mark on the left: black glass with a red glass slash on the Q, 24 px tall (`public/dashboard/crafthq-chq-{24,48,72}.webp` for 1x/2x/3x screens, shrunk from `design/renders/logo_chq_v001/out/chq_front.png`; the login header uses the same files), search in the middle, the account menu on the right.
- **Sidebar:** a **56 px rail** of icons (`DESIGN.md` §4.3's collapsed rail), on the same grey, under the top bar and sticky, from 1024 px. The prototype's links, each a 16 px lucide icon: Dashboard (`LayoutDashboard`), Stories (`ListTodo`), Feature pages (`PanelsTopLeft`), Docs (`BookOpen`); Settings (`Settings`) and the toggle (`PanelLeft`) are pinned to the bottom. Items are 32 px with the icon centred; hover is a 4% black fill, the current page a 6% fill with a dark icon. Hovering or focusing an icon shows its name at once, in the dark tooltip style, 12 px to its right. It's plain CSS, so it works from the first paint with no delay; every link keeps its name for screen readers.
- **Opening it:** `[` (not while typing) or the toggle opens it to 176 px with 14/20 labels beside the icons, and the choice is remembered per browser. The width is set on `<html data-sidebar>` by an inline script before the page paints, so it never jumps on load; `--sidebar-w` follows it (the toast centres with it). It's plain links in the HTML and hydrates when idle, for the toggle and `[`.
- **Bots:** under the links, a short rule, then the five bots (PM, Builder, Designer, Checker, Fixer) as 24 px faces; a working bot has a small pulsing green dot. Hovering names it and what it's on ("Builder · Building hq-54"). Clicking opens that bot's own chat (`/ask/builder`, `/ask/designer` …; the PM's is Ask PM), which is highlighted here while it's open. Opened, they sit under a "Bots" label with their names. This replaces the old Bots tab's cards.
- **Below 1024 px** there's no sidebar; the same links, with their icons, are in the top bar's menu.
- **Search:** a 32 px pill field. `/` focuses it. It searches every story by title or ID, and choosing one opens its panel on the dashboard through the URL (`?story=hq-43`). Below 1024 px it collapses to an icon.
- **Account menu** (Radix): name, email, the workspace line from the prototype, Settings, Sign out (goes to `/login` until there's a sign-out endpoint).

### The headline
The project's name (14 px, grey) is the page's `h1`; under it the one number that matters, as a sentence: "14 decisions are waiting for you" (24/32, `DESIGN.md` §3.2 Display). It counts down as you answer, so the progress is the headline and the count isn't repeated anywhere else. Then one grey line: what's moving and what shipped. **New story** is a secondary button: the page's one solid button is the recommended answer on the deck.

### The team (`TeamStrip`)
What's moving, as the team itself: five faces (52 px renders in a 64 px ring) in the sidebar's order, each with its name and what it's on ("Building hq-54", "Checking 7", "2 stories stuck", "12 questions for you", "Free"). While an agent works, an arc of its ring turns once every 1.6 s in its own hue (`DESIGN.md` §3.1 allows agent hues on the working ring; §8.5); idle, the ring is a grey hairline; with reduced motion the arc stands still. The agent whose question is on top of the deck gets a soft grey tile and an **Asking you** tag, so the deck and the team read as one. Running and Queued keep their numbers and solid indicators in the header, which opens the Details panel. Each face opens that agent's chat. Under 640 px the strip scrolls sideways.

### The stage: Needs you (`NeedsDeck`, `DecisionCard`, `decisions.ts`)
One decision at a time: the stories waiting on you, plus Stuck, in the prototype's group order (Stuck first).

- **A card is a message from an agent:** its face (52 px, in a white ring) sits on the card's top edge, its name beside it. Its question is the headline (20/28 semibold), in its own words ("It passed my checks, but main has moved on since it was built. Rebuild it before it merges?"). Under it, the story it's about (title, ID, owner; opens the story panel) and the evidence: the status pill, short facts as chips (a checks bar, "Preview ready", the question's default), a sentence of context as plain text.
- **Answers:** the recommended one is the page's one solid button (40 px); the others are quiet outlines; what the focused or hovered one does is said under them. A reply box ("Ask for changes…", "Answer the PM…", "Tell the Debugger something…") takes anything else; Enter sends it as a note with the right intent.
- **Who asks what** (`decisionFor`): Review → the Tester (Rebuild it · Accept as it is); Stuck → the Debugger (Try again · Back to planning · Cancel it); Decision → the PM (Keep the default · Read the plan ↗); Planning → the PM (Approve the plan · Read the plan ↗); Triage → the PM (Plan it · Close it). They map to the story panel's actions.
- **Answering:** reversible, so it acts at once (`DESIGN.md` §6.11). The agent replies on the card in its own words ("On it. Rebuilding on the latest code.", with a green tick and the story) for 0.9 s; the card lifts 28 px and fades (180 ms); the next rises from the pile (240 ms). The toast offers **Undo**, which puts the card back on top.
- **The pile:** two cards under the top one, 16 and 32 px lower and a little smaller, so it reads as a deck. No rotation, ever (`DESIGN.md` §6.12).
- **Browsing:** swiping only browses, so a stray swipe never approves anything: left sends the card to the back, right brings the last one back, with a "Later ›" or "‹ Back" tag fading in as you drag; the card lifts to 1.02 while held. ← → and the round arrow buttons do the same; 1–3 answer; the keys work in the deck, or anywhere while nothing else has the keyboard and no panel or menu is open. The hint line shows only with a mouse or trackpad.
- **Under the deck:** who's next (the next three agents' faces and the next title; it's also Later) and **All 14 ⌄**, a menu of every decision grouped by who's asking, to jump to any one.

### All clear (`AllClear`)
`DESIGN.md` §6.7: the PM (64 px, blinking), "Nothing needs you", "The agents will ask here when they need you.", centred, at most 360 px wide, no action; plus "You answered 14 decisions" when you cleared it yourself.

### Shipped this week (`ShippedRibbon`)
What shipped, as one line: the week's merges as points, oldest on the left, each with its title, when and ID; the line runs on past the newest to now. The project's done count sits on the right of the heading. It scrolls sideways on phones.

### Indicators (`Indicator`)
A white icon in a solid circle, in the status pills' tones (`DESIGN.md` §7.12): agents at work green `#16A34A` (turning), waiting grey `#8E8F94`; grey and still at 0. Used for Running and Queued.

### Panels (`SidePanel`, `StoryPanel`, `ActivityPanel`, `NewStoryPanel`)
- 480 px from the right, under the top bar. On screens 1024 px and wider it floats over the page with its shadow, with no scrim: the page keeps its full width underneath and stays clickable. Below that it covers the page with a scrim. Slides in over 200 ms; fades with reduced motion.
- **Story panel:** the story's facts (Status, Stage, Waiting on, Owner, Open items, Updated), "Latest from the agent", and the group's actions, worded as in the prototype: Review → Accept · Done / Ask for changes; Planning → Approve and build / Ask a question; Decision → Let the defaults stand / Answer in a note; Stuck → Restart / Add a note; Triage → Move to planning / Cancel story; Say what to do next → Add a note. Notes open a box pinned to the bottom ("Notes get a reply. Code changes only after you approve.").
- **Details panel:** the prototype's two tabs. With the agent: loop tick, Running and Queued, the running stories. Recent activity: the agent's runs, plus About and the version.
- **New story:** Title, Why, Detail, Owner and Files, as in the prototype; only Title is required.
- The open story is in the URL, so links, reloads and Back reopen it. ↑/↓ (or J/K) move between stories in the deck's order, Esc closes and returns focus to where it was. Copy link copies the URL.

### Connecting accounts (`ConnectAccountsModal` from #4, `SetupBanner`, `setup.ts`)
- After sign-in the login form goes to `/dashboard`. Whenever GitHub or Claude isn't connected, `ConnectAccountsModal` opens on load, with the dashboard behind it.
- If someone skips it, a banner under the heading says what's missing and offers **Connect accounts**, which reopens the modal.
- The mock connections start as not connected. The GitHub step only completes under `npm run dev`, because closing its window counts as approved only there.

### After an action
On the deck, the agent replies on the card and it lifts away; everywhere, the headline and the team update and a dark toast at the bottom says what happened, with **Undo** for 6 seconds (paused on hover). Clearing the last card switches the page to its all-clear arrangement, which says how many decisions you answered.

### States
`?state=loading` (the team and the deck in skeleton), `?state=empty` (the all clear), `?state=error` ("Couldn't load your stories" with Try again, on the stage).

## 4. Interaction details

| Element | Rest | Hover | Timing |
|---|---|---|---|
| Sidebar item | dark label, grey icon | 4% black fill, dark icon; current: 6% fill, medium | 120 ms |
| Search, pills | 1 px `#CBCBCB` | `#B5B5B5`, fill `#F9F9F9` | 120 ms |
| Primary button | `#2F6FED` | `#2459D6`, presses down 1 px | 120 ms |
| Recommended answer | `#2F6FED` | `#2459D6`, presses down 1 px | 120 ms |
| Other answers | white, `#CBCBCB` edge | `#B5B5B5` edge, `#F9F9F9` fill | 120 ms |
| Reply box | `#FAFAFA`, `#E3E3E3` edge | focus: white, blue edge | 120 ms |
| Deck card | white, soft shadow | grab cursor; held: scale 1.02 | drag follows the pointer |
| Team face | transparent | `#F8F8F8` tile; asking: `#F3F3F4` with the tag | 120 ms |

Focus always shows a 2 px blue outline. Every animation has a reduced-motion version. Menus and tooltips are Radix (keyboard, focus and dismissal handled).

## 5. Accessibility

The deck is a labelled section; each card is an article named by its title, its answers are buttons with their keys (`aria-keyshortcuts`), and every swipe has a button and a key; focus moves to the next card when one leaves; panels are labelled dialogs that take and return focus; toasts are announced politely; status pills always carry words; a "Skip to content" link; text contrast at least 4.5:1 (the lowest pair is grey text on a hovered row, 4.77:1).

## 6. Measured from the reference

The screenshot is at 2×; values are halved. They live in `src/components/dashboard/tokens.module.css`, scoped to the dashboard, so `src/styles/globals.css` is untouched.

| Token | Value | Measured from |
|---|---|---|
| page / bar | `#FFFFFF` / `#F9F9F9` | content area / top bar |
| text / text-2 | `#1E1F21` / `#6D6E6F` | row text / header text, "•••", placeholder |
| line / card edge / control edge | `#E8E8E8` / `#E3E3E3` / `#CBCBCB` | row rules / card edges / pills and search |
| green | `#2F755D` | trend text |
| card radius | 12 px | corner fit |
| card shadow / hover | `0 1px 2px rgb(0 0 0/.04)` / `0 4px 12px rgb(0 0 0/.08)` | card shading / the raised card |

**Type** (Inter): 12/16 table headers; 13/18 card labels, sub-lines, pills, chips; 15/22 table text and panel body; 21/28 medium page and panel titles; 32/36 regular stat numbers. **Spacing:** top bar 48; title 24 below it; cards 16 below the title and 16 apart, padding 12 × 16; pills 20 below the cards; table 16 below the pills; header 36; rows 46.

## 7. Where this differs from DESIGN.md

The look follows the reference rather than `DESIGN.md`'s scale. A `DESIGN.md` exception PR, for review before it's sent, will record: hex values and arbitrary sizes scoped to the dashboard; a full-width top bar above the sidebar, holding search and the account menu (§4.2 has no top bar on desktop and puts search in the sidebar); the prototype's links in the sidebar in place of §4.3's items, opening to 176 px instead of 240 px (the 56 px rail matches §4.3); the rail's names are CSS labels rather than Radix tooltips (§15 decision 4), so they show instantly and before any script; 15 px table text, 13 px labels and 46 px rows; outlined pill controls; circle avatars; the prototype's wording ("story", "the agent") instead of §4.1's.

## 8. Still to do

- Draft the `DESIGN.md` exception PR (§7), adding the deck: Needs you as one decision at a time instead of §5.6's widget list, agents' tints on cards, and "agents" for "robots".
- Replace the sample data (`src/pages/dashboard/_sample-data.ts`) with the CraftHQ API.
- Overlay a 2× screenshot on the reference to fine-tune type and spacing.
