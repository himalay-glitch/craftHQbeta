# Dashboard

Version 8 · 27 Nov 2026 · branch `himalay/dashboard-deck` · route `/dashboard`

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
│    │ ┌ ⇅ Awaiting review ─┐  ╭ Needs you 14   See all ‹ › ╮      ┌ ◌ Active runs ─────┐    │
│    │ │ 5                   │  ┌──────────────────────────────┐    │ 9                   │    │
│    │ │ waiting on you      │  │ (Failed)                     │    │ 2 building · 7 in c │    │
│    │ │                     │  │ It's stuck: preview could    │    │                     │    │
│    │ │ Creation flow rev…  │  │ not start. Try again?        │    │ Test Story-add sam… │    │
│    │ │ Event Discuss tab…  │  │ Test story hq-21 · Start its…│    │ Your calendar: see… │    │
│    │ │ + 2 more            │  │ ┌──────────────────────────┐ │    │ + 6 more            │    │
│    │ ├ ✕ Need a fix ───────┤  │ │1 Try again   Recommended │ │    ├ ◷ Queued runs ──────┤    │
│    │ │ 2                   │  │ │2 Back to planning        │ │    │ 0                   │    │
│    │ │ can’t proceed witho │  │ │3 Cancel it               │ │    │ last polled just now│    │
│    │ │ Test story          │  │ │4 Other: add a note…      │ │    │ New work starts as… │    │
│    │ │ Android: change t…  │  │ └──────────────────────────┘ │    │                     │    │
│    │ └─────────────────────┘  └──────────────────────────────┘    └─────────────────────┘    │
│ ⚙  │                                                                                         │
│ ◫  │                                                                                         │
└────┴─────────────────────────────────────────────────────────────────────────────────────────┘
```

Three columns fill the width: `minmax(0, 1fr) · 528 px · minmax(0, 1fr)` from 1280 px (480 px below that), 24 px apart; the extra width is room for the tilted cards either side of the deck. The card is 440 px at every desktop width: below 1280 px the side cards fan out less and stay inside the tray's padding. The side tiles stretch to the deck's height (3 : 2 in each column), so nothing beside the deck is blank. Version 6 was the calm pass: nothing on the page says the same thing twice, there are no ids or times beside the deck, and the answers sit in one list instead of four boxes. Under 1024 px Needs you comes first, then the side cards two by two (one by one on phones). The agents live in the sidebar, so the dashboard doesn't repeat them. **When nothing needs you,** the deck cross-fades (150 ms out, 200 ms in) to the all clear.

## 3. Parts

### Top bar and sidebar (`TopBar`, `Sidebar`, `nav.ts`, `SearchBox`, `AvatarMenu`)
- **Top bar:** 48 px, `#F9F9F9`, sticky, the full width of the window, as in Asana. The CHQ mark on the left: black glass with a red glass slash on the Q, 24 px tall (`public/dashboard/crafthq-chq-{24,48,72}.webp` for 1x/2x/3x screens, shrunk from `design/renders/logo_chq_v001/out/chq_front.png`; the login header uses the same files), then a faint rule and the project's name (`AppLayout`'s `project`, the sample's until there's a session), search in the middle, the account menu on the right.
- **Sidebar:** a **56 px rail** of icons (`DESIGN.md` §4.3's collapsed rail), on the same grey, under the top bar and sticky, from 1024 px. The prototype's links, each a 16 px lucide icon: Dashboard (`LayoutDashboard`), Stories (`ListTodo`), Feature pages (`PanelsTopLeft`), Docs (`BookOpen`); Settings (`Settings`) and the toggle (`PanelLeft`) are pinned to the bottom. Items are 32 px with the icon centred; hover is a 4% black fill, the current page a 6% fill with a dark icon. Hovering or focusing an icon shows its name at once, in the dark tooltip style, 12 px to its right. It's plain CSS, so it works from the first paint with no delay; every link keeps its name for screen readers.
- **Opening it:** `[` (not while typing) or the toggle opens it to 176 px with 14/20 labels beside the icons, and the choice is remembered per browser. The width is set on `<html data-sidebar>` by an inline script before the page paints, so it never jumps on load; `--sidebar-w` follows it (the toast centres with it). It's plain links in the HTML and hydrates when idle, for the toggle and `[`.
- **Bots:** under the links, a short rule, then the five bots (PM, Builder, Designer, Checker, Fixer) as 24 px faces; a working bot has a small pulsing green dot. Hovering names it and what it's on ("Builder · Building hq-54"). Clicking opens that bot's own chat (`/ask/builder`, `/ask/designer` …; the PM's is Ask PM), which is highlighted here while it's open. Opened, they sit under a "Bots" label with their names. This replaces the old Bots tab's cards.
- **Below 1024 px** there's no sidebar; the same links, with their icons, are in the top bar's menu.
- **Search:** a 32 px pill field. `/` focuses it. It searches every story by title or ID, and choosing one opens its panel on the dashboard through the URL (`?story=hq-43`). Below 1024 px it collapses to an icon.
- **Account menu** (Radix): name, email, the workspace line from the prototype, Settings, Sign out (goes to `/login` until there's a sign-out endpoint).

### Heading
No visible title: the project's name is in the top bar, after the CHQ mark and a faint 1 × 16 px rule (12% black), at 14/20 medium; the page keeps "WePop dashboard" as its heading for screen readers. The first line holds the setup notice (when something isn't connected and it hasn't been dismissed) and **New story**, a secondary button, on the right. The notice is an amber pill as tall as the button: a plug, "GitHub isn't connected, so the agents can't start work.", **Connect GitHub**, and a × that hides it in this browser until something else is missing (a toast says Connectors in the sidebar still opens the modal).

**No page scroll on a desktop:** the page fits the window down to 1366 × 768. **Nothing moves while you browse** (27 Nov: cards of different lengths changed the tray's height, and with it the tiles and how many cards they showed): from 1024 px the row takes its height from the window, up to 680 px, never from the card on top. The card fills the height the tray gives it, its content at the top and Submit at its foot, so Submit is in the same place on every card and the tiles never resize. Its foot has 24 px, and on screens 820 px tall or less the paddings tighten (page 16, the tray 16, the card 20, the answer rows 10, the gaps 12); the tiles show as many cards as fit.

### Stats beside the deck (`StatPanel`)
Named the way engineers name CI and review states (Himalay, 27 Nov): Awaiting review, Need a fix, Active runs, Queued runs. Needs you keeps its name. The See all groups and the Details panel use the same words.

Each is a KPI tile (`DESIGN.md` §5.6): its solid indicator (`Indicator`, 20 px) and label, the number (30/36 medium), one line, then the stories behind the number as small cards (48 px, 10 px corners, white with a hairline and a soft shadow; on hover they lift 1 px). Each leads with a mark for its state: a lucide icon (16 px, 2 stroke) in a 32 px soft tile (10 px corners, a light gradient in the tone, a hairline of the tone inside, the icon in the tone's deep ink): a verified badge when all its checks passed, or a red badge alert if some failed (Awaiting review), a stop sign (Need a fix, red), a hammer while building or a flask in checks (Active runs, green). The ring drawn before blurred on standard-resolution screens. Then the title and when, and under it the ID as a small grey tag and one fact ("All 24 checks passed", "Preview could not start", "Building"). On a desktop a tile is as tall as its share of the deck's height and shows as many cards as fit, always leaving a little room at its foot; the cards are laid over that space so they never make the tile taller than the deck. Where tiles stack (under 1024 px), three. When there are more, the tile pages through them in place: on its top right, on the label's line, "1–4 of 9" and ‹ › (as Needs you's header browses the deck); the cards slide in from the side they came from (a fade with reduced motion). Nothing opens over the page for them, and "+ n more" is gone. In a tile narrower than 300 px (around 1024–1200 px windows) the pager is just its arrows, so the label keeps its room; the count is still read out. The label and number are one button, the tile's action; each card is its own button.

| Tile | Side | Number, line | Titles | Action (label and number) |
|---|---|---|---|---|
| Awaiting review | left | review stories waiting on you, "waiting on you" | when; "24 of 24 checks passed"; picking one brings its card to the top of the deck | filters the deck to reviews; again shows everything |
| Need a fix | left | stuck stories, "can't proceed without you"; red with the alert ring | why it stopped ("Preview could not start"); picking one brings its card to the top | filters the deck to them |
| Active runs | right | stories the agents are on, "2 building · 7 in checks"; green, turning | Building first (green dot), then In checks; when; each opens the story | the Details panel |
| Queued runs | right | waiting to start, "last polled just now"; grey | "New work starts as soon as it's approved." | the Details panel |

While a tile filters the deck, its border turns blue.

**Needs you is a tray** (27 Nov: the controls and the stack floated on the page around the card). The middle column is one soft surface, 3% black on whatever's behind it, a hairline border, 20 px corners, running exactly from the tiles' top edge to their bottom edge. Inside it: the header (the title and the deck's count in grey on the left; **See all**, ‹ (Back) and › (Later) on the right, as in an App Store row), then the deck, with a tilted card showing either side of it. The all clear and the messages sit in the same tray. There's no filter control: the Awaiting review and Need a fix tiles filter the deck, and only while one does, a white chip after the count names it ("Need a fix ×") and clears it.

### The stage: Needs you (`NeedsDeck`, `DecisionCard`, `decisions.ts`)
One decision at a time: the stories waiting on you, plus the ones that need a fix, in the prototype's group order (Need a fix first).

- **The card:** the status pill and when it last changed, and on the right a round ↗ button (32 px, hairline, tooltip "Open in the story's chat") that goes to the story's chat on the Stories page (`/stories/hq-21`), where the agent asked the question; it isn't a drag handle, so a swipe never starts on it. Then the question as the headline (20/28 semibold: "It passed its checks, but main has moved on since it was built. Rebuild it before it merges?"); then one quiet line: the story's title (underlined; opens the story panel), its ID and the facts, joined by " · " ("6 of 8 checks passed", "Preview ready", a sentence of context), with a failing fact in red ink. No agent is named on the card: the agents are in the sidebar.
- **Answers:** a radio list (`DESIGN.md` §6.2): four rows in one rounded list, split by hairlines. Rows 1–3 each have a radio, the answer and what it does in a grey line under it; the first says "Recommended" in blue and starts chosen. Row 4 is Other: a radio and a box ("Other: ask for changes…", "Other: add a note…"); typing in it chooses it, Esc clears it. The chosen row is pale blue. Under the list, the one button, **Submit** (off while Other is chosen and empty), with ↵ on it for keyboards, sends whichever answer is chosen. Choosing never acts by itself; the button or Enter sends. Keys: 1–4 choose, Enter sends; on a radio, the arrows move through the list.
- **The answers by kind** (`decisionFor`): Review → Rebuild it · Accept as it is; Stuck → Try again · Back to planning · Cancel it; Decision → Keep the default · Read the plan ↗; Planning → Approve the plan · Read the plan ↗; Triage → Plan it · Close it. They map to the story panel's actions.
- **Answering:** reversible, so it acts at once (`DESIGN.md` §6.11). The card says what happened (a green tick, "Rebuilding on the latest code.", the story) for 0.7 s; it lifts 28 px and fades (180 ms); the next comes forward from the right (260 ms). The toast offers **Undo**, which puts the card back on top.
- **The cards either side** (27 Nov: the old pile under the card said "top to bottom" while the deck browses left and right): the next card sits behind the top one on its right and the one before on its left, each at 95%, 24 px out to its side, 10 px lower and tilted 3.5° outward, so their corners show around the card (below 1280 px: 96%, 12 px, 8 px, 2°). Only the right one shows with two cards; none with one. › (Later) sends the top card into the left pile and the right one comes forward; ‹ (Back) does the reverse; each move is 200–260 ms, a fade with reduced motion. Only cards at rest tilt: the card you hold lifts to 1.02 and never rotates (`DESIGN.md` §6.12).
- **Browsing:** swiping only browses, so a stray swipe never approves anything: left sends the card to the back, right brings the last one back, with a "Later ›" or "‹ Back" tag fading in as you drag; the card lifts to 1.02 while held. ← → and the round arrow buttons do the same; the keys work in the deck, or anywhere while nothing else has the keyboard and no panel or menu is open. The numbers on the answers are their keys, so there's no hint line.
- **The controls** are in the tray's header (above). With one card left, ‹ and › are off.
- **See all (`NeedsPanel`):** the right-hand side panel (`SidePanel`; over the page from 1024 px, full width with a scrim below), titled Needs you with the count above and "Open one to answer it in the story's chat." Every decision on the deck as a list of small horizontal cards, grouped by kind in the queue's order. Each card: a chat mark in a soft square (blue on hover), the story's title (14/20 medium) with when on the right, and under it the ID and the question. When a group's cards all ask the same question (Awaiting review), it's said once under the group's name ("Each asks: …") and the cards show only the ID. A card is a link to the story's chat on the Stories page (`/stories/hq-21`), where the question is asked and answered. It never drops down over the card.

### All clear (`AllClear`)
`DESIGN.md` §6.7: the PM (64 px, blinking), "Nothing needs you", "The agents will ask here when they need you.", centred, at most 360 px wide, no action; plus "You answered 14 decisions" when you cleared it yourself.

### Shipped this week (removed)
Removed on 27 Nov at Himalay's call: it didn't help anyone act, and finished work already shows on the Stories board. `DESIGN.md` §5.6 still lists "what shipped" as the dashboard's third question, so the document needs a shared-file PR to match.

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
