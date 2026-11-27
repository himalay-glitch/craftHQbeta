# Dashboard

Version 7 · 27 Nov 2026 · branch `himalay/dashboard-deck` · route `/dashboard`

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
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ CHQ                                 ( ⌕ Search            )                              (J) │
├────┬─────────────────────────────────────────────────────────────────────────────────────────┤
│ ▦  │ WePop                                                                  ( + New story )  │
│ ☰  │ ⚡ GitHub isn't connected, so the agents can't start work. Connect GitHub                 │
│    │ ┌ ⇅ Ready to review ─┐   Needs you 14          (Show: All ⌄)  ┌ ◌ Running ─────────┐    │
│    │ │ 5                   │  ┌──────────────────────────────┐    │ 9                   │    │
│    │ │ waiting on you      │  │ (Failed)                     │    │ 2 building, 7 check │    │
│    │ │                     │  │ It's stuck: preview could    │    │                     │    │
│    │ │ Creation flow rev…  │  │ not start. Try again?        │    │ Test Story-add sam… │    │
│    │ │ Event Discuss tab…  │  │ Test story hq-21 · Start its…│    │ Your calendar: see… │    │
│    │ │ + 2 more            │  │ ┌──────────────────────────┐ │    │ + 6 more            │    │
│    │ ├ ✕ Stuck ────────────┤  │ │1 Try again   Recommended │ │    ├ ◷ Queued ───────────┤    │
│    │ │ 2                   │  │ │2 Back to planning        │ │    │ 0                   │    │
│    │ │ not being picked up │  │ │3 Cancel it               │ │    │ checked just now    │    │
│    │ │ Test story          │  │ │4 Other: add a note…      │ │    │ New work starts as… │    │
│    │ │ Android: change t…  │  │ └──────────────────────────┘ │    │                     │    │
│    │ └─────────────────────┘  └──────────────────────────────┘    └─────────────────────┘    │
│    │                               ‹   See all ⌄   ›                                         │
│ ⚙  │ ─────────────────────────────────────────────────────────────────────────────────────── │
│ ◫  │ (✓) Shipped this week     ⑂ Home feed: upcoming events…  2h ago  ⑂ Invite friends…  Yest. │
│    │ 4 · 6 of 43 stories done  ⑂ Profile photo upload        Tuesday ⑂ RSVP with a gu… Monday │
└────┴─────────────────────────────────────────────────────────────────────────────────────────┘
```

Three columns fill the width: `minmax(0, 1fr) · 480 px · minmax(0, 1fr)`, 24 px apart. The side tiles stretch to the deck's height (3 : 2 in each column), so nothing beside the deck is blank. Version 6 is the calm pass: nothing on the page says the same thing twice, there are no ids or times beside the deck, and the answers sit in one list instead of four boxes. Under 1024 px Needs you comes first, then the side cards two by two (one by one on phones). The agents live in the sidebar, so the dashboard doesn't repeat them. **When nothing needs you,** the deck cross-fades (150 ms out, 200 ms in) to the all clear.

## 3. Parts

### Top bar and sidebar (`TopBar`, `Sidebar`, `nav.ts`, `SearchBox`, `AvatarMenu`)
- **Top bar:** 48 px, `#F9F9F9`, sticky, the full width of the window, as in Asana. The CHQ mark on the left: black glass with a red glass slash on the Q, 24 px tall (`public/dashboard/crafthq-chq-{24,48,72}.webp` for 1x/2x/3x screens, shrunk from `design/renders/logo_chq_v001/out/chq_front.png`; the login header uses the same files), search in the middle, the account menu on the right.
- **Sidebar:** a **56 px rail** of icons (`DESIGN.md` §4.3's collapsed rail), on the same grey, under the top bar and sticky, from 1024 px. The prototype's links, each a 16 px lucide icon: Dashboard (`LayoutDashboard`), Stories (`ListTodo`), Feature pages (`PanelsTopLeft`), Docs (`BookOpen`); Settings (`Settings`) and the toggle (`PanelLeft`) are pinned to the bottom. Items are 32 px with the icon centred; hover is a 4% black fill, the current page a 6% fill with a dark icon. Hovering or focusing an icon shows its name at once, in the dark tooltip style, 12 px to its right. It's plain CSS, so it works from the first paint with no delay; every link keeps its name for screen readers.
- **Opening it:** `[` (not while typing) or the toggle opens it to 176 px with 14/20 labels beside the icons, and the choice is remembered per browser. The width is set on `<html data-sidebar>` by an inline script before the page paints, so it never jumps on load; `--sidebar-w` follows it (the toast centres with it). It's plain links in the HTML and hydrates when idle, for the toggle and `[`.
- **Bots:** under the links, a short rule, then the five bots (PM, Builder, Designer, Checker, Fixer) as 24 px faces; a working bot has a small pulsing green dot. Hovering names it and what it's on ("Builder · Building hq-54"). Clicking opens that bot's own chat (`/ask/builder`, `/ask/designer` …; the PM's is Ask PM), which is highlighted here while it's open. Opened, they sit under a "Bots" label with their names. This replaces the old Bots tab's cards.
- **Below 1024 px** there's no sidebar; the same links, with their icons, are in the top bar's menu.
- **Search:** a 32 px pill field. `/` focuses it. It searches every story by title or ID, and choosing one opens its panel on the dashboard through the URL (`?story=hq-43`). Below 1024 px it collapses to an icon.
- **Account menu** (Radix): name, email, the workspace line from the prototype, Settings, Sign out (goes to `/login` until there's a sign-out endpoint).

### Heading
The project's name (21/28) and **New story**, a secondary button: the page's one solid answer is the recommended one on the deck.

### Stats beside the deck (`StatPanel`)
Each is a KPI tile (`DESIGN.md` §5.6): its solid indicator (`Indicator`, 20 px) and label, the number (30/36 medium), one line, then up to three story titles (no ids, no times) and "+ n more". A hairline border and no shadow; no dividers and no footer rows. The label and number are one button, the tile's action; each title is its own button. Every tile reads the same way down; what's left of its height stays at its foot.

| Tile | Side | Number, line | Titles | Action (label and number) |
|---|---|---|---|---|
| Ready to review | left | review stories waiting on you, "waiting on you" | picking one brings its card to the top of the deck | filters the deck to reviews; again shows everything |
| Stuck | left | stuck stories, "not being picked up"; red with the alert ring | picking one brings its card to the top | filters the deck to stuck stories |
| Running | right | stories the agents are on, "2 building, 7 checking"; green, turning | Building first; each opens the story panel | the Details panel |
| Queued | right | waiting to start, "checked just now"; grey | "New work starts as soon as it's approved." | the Details panel |

While a tile filters the deck, its border turns blue.

**Needs you** heads the middle column: the title and the deck's count in grey, and on the right **Show: All ⌄** (`FilterPill`), which filters the deck by kind: All, then each kind that has decisions, with its count (Stuck 2, Ready to review 5, Decisions 3…). The Ready to review and Stuck tiles set the same filter.

### The stage: Needs you (`NeedsDeck`, `DecisionCard`, `decisions.ts`)
One decision at a time: the stories waiting on you, plus Stuck, in the prototype's group order (Stuck first).

- **The card:** the status pill and when it last changed; the question as the headline (20/28 semibold: "It passed its checks, but main has moved on since it was built. Rebuild it before it merges?"); then one quiet line: the story's title (underlined; opens the story panel), its ID and the facts, joined by " · " ("6 of 8 checks passed", "Preview ready", a sentence of context), with a failing fact in red ink. No agent is named on the card: the agents are in the sidebar.
- **Answers:** four rows in one rounded list, split by hairlines, the way Claude asks a question. Rows 1–3 each have a plain number (its key), the answer and what it does in a grey line under it. The first is the recommended one: a pale blue row, a blue number and "Recommended" in blue. Row 4 is Other, a box ("Other: ask for changes…", "Other: add a note…"); Enter sends what you write as a note with the right intent.
- **The answers by kind** (`decisionFor`): Review → Rebuild it · Accept as it is; Stuck → Try again · Back to planning · Cancel it; Decision → Keep the default · Read the plan ↗; Planning → Approve the plan · Read the plan ↗; Triage → Plan it · Close it. They map to the story panel's actions.
- **Answering:** reversible, so it acts at once (`DESIGN.md` §6.11). The card says what happened (a green tick, "Rebuilding on the latest code.", the story) for 0.7 s; it lifts 28 px and fades (180 ms); the next rises from the pile (240 ms). The toast offers **Undo**, which puts the card back on top.
- **The pile:** two cards under the top one, 16 and 32 px lower and a little smaller, so it reads as a deck. No rotation, ever (`DESIGN.md` §6.12).
- **Browsing:** swiping only browses, so a stray swipe never approves anything: left sends the card to the back, right brings the last one back, with a "Later ›" or "‹ Back" tag fading in as you drag; the card lifts to 1.02 while held. ← → and the round arrow buttons do the same; 1–3 answer; the keys work in the deck, or anywhere while nothing else has the keyboard and no panel or menu is open. The numbers on the answers are their keys, so there's no hint line.
- **Under the deck:** three quiet controls, centred: ‹ (Back), **See all** and › (Later). With one card left they go.
- **See all (`NeedsPanel`):** the right-hand side panel (`SidePanel`; over the page from 1024 px, full width with a scrim below), titled Needs you with the count above. Every decision on the deck, grouped by kind in the queue's order. Each row is the question (14/20 medium, two lines at most) and under it the story, ID and when; the card on top says **On top**. When a group's rows all ask the same question (Ready to review), it's said once under the group's name ("Each asks: …") and the rows lead with their stories. Picking one closes the panel and puts it on top of the deck. It never drops down over the card.

### All clear (`AllClear`)
`DESIGN.md` §6.7: the PM (64 px, blinking), "Nothing needs you", "The agents will ask here when they need you.", centred, at most 360 px wide, no action; plus "You answered 14 decisions" when you cleared it yourself.

### Shipped this week (`ShippedThisWeek`)
`DESIGN.md` §5.6's third question, what shipped: proof the work is moving, and the way to check it. It sits under a hairline, unboxed, on the columns' grid. Under the left tiles: a still, dark green check (`Indicator` tone `done`, so it never reads as running), "Shipped this week", the week's merges as a KPI number, and the project's progress ("6 of 43 stories done"). Beside it, under the deck and the right tiles: what merged, newest first, in two columns, each with a merge mark, its title and when; each opens its story. There's no timeline: the merges aren't evenly spaced in time, so points on a line would say something false. On phones it's one column, with no sideways scroll. With nothing merged: 0 and "Nothing has merged this week yet."

### Indicators (`Indicator`)
A white icon in a solid circle, in the status pills' tones (`DESIGN.md` §7.12): agents at work green `#16A34A` (turning), waiting grey `#8E8F94`, a person's turn amber `#D97706`, stuck red `#DC2626`; grey and still at 0. Every fill keeps the icon above 3:1. Values are never coloured.

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
On the deck, the card says what happened and lifts away; everywhere, the headline and the stats update and a dark toast at the bottom says what happened, with **Undo** for 6 seconds (paused on hover). Clearing the last card switches the page to its all-clear arrangement, which says how many decisions you answered.

### States
`?state=loading` (the three columns in skeleton), `?state=empty` (the all clear), `?state=error` ("Couldn't load your stories" with Try again, on the stage).

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
| Stat card | `#E3E3E3`, faint shadow | `#D9D9D9`, larger shadow, lifts 2 px, chevron appears | 160 ms |

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

**Type** (Inter): 12/16 table headers; 13/18 card labels, sub-lines, pills, chips; 15/22 table text and panel body; 21/28 medium page and panel titles; 30/36 medium tile numbers. **Spacing:** top bar 48; title 24 below it; cards 16 below the title and 16 apart, padding 12 × 16; pills 20 below the cards; table 16 below the pills; header 36; rows 46.

## 7. Where this differs from DESIGN.md

The look follows the reference rather than `DESIGN.md`'s scale. A `DESIGN.md` exception PR, for review before it's sent, will record: hex values and arbitrary sizes scoped to the dashboard; a full-width top bar above the sidebar, holding search and the account menu (§4.2 has no top bar on desktop and puts search in the sidebar); the prototype's links in the sidebar in place of §4.3's items, opening to 176 px instead of 240 px (the 56 px rail matches §4.3); the rail's names are CSS labels rather than Radix tooltips (§15 decision 4), so they show instantly and before any script; 15 px table text, 13 px labels and 46 px rows; outlined pill controls; circle avatars; the prototype's wording ("story", "the agent") instead of §4.1's.

## 8. Still to do

- Draft the `DESIGN.md` exception PR (§7), adding the deck: Needs you as one decision at a time instead of §5.6's widget list, agents' tints on cards, and "agents" for "robots".
- Replace the sample data (`src/pages/dashboard/_sample-data.ts`) with the CraftHQ API.
- Overlay a 2× screenshot on the reference to fine-tune type and spacing.
