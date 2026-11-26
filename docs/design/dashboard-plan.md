# Dashboard

Version 4 · 26 Nov 2026 · branch `himalay/dashboard-deck` · route `/dashboard`

What the dashboard is, where its look and content come from, and how it behaves. It describes the code in `src/pages/dashboard/`, `src/components/dashboard/`, `src/components/shell/` and `src/layouts/AppLayout.astro`.

## 1. Sources

| | Comes from | Notes |
|---|---|---|
| **Look** | The Asana "AI Teammates" screenshot, measured pixel by pixel (§6) | White page, a light grey top bar, 12 px cards with a faint shadow, pill filters. Version 4 replaced the table with a deck of decision cards |
| **Content** | The manager's prototype (`crafthq-re.html`, Dashboard view) | Its stats (Running and Queued split out, as on the live app, in place of With the agent and Done), nav links, stories, groups, wording ("story", "the agent") and New story form |
| **Data reference only** | The live app.crafthq.ai dashboard | Not used for the look |

**Scope, as agreed:** only the dashboard page is built; the nav links to the other pages lead nowhere yet. No phone-specific work beyond what's already there. No Builder render on the dashboard.

**Builds on:** the Astro move (#2), the Astro version of the design tokens (commit `091ff8b`, in #3/#4's history) and radix-ui (#8). This branch merges after them.

## 2. Layout at 1440 px

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ CHQ                              ( ⌕ Search            )                            (J) │ 48 top bar #F9F9F9
├────┬─────────────────────────────────────────────────────────────────────────────────────┤
│ ▦  │ WePop                                                              ( + New story )  │ rail 56 #F9F9F9
│ ☰  │ 14 decisions need you · the agents are on 9 stories · 4 shipped this week           │ the page in one line
│    │ (!) Needs you 14                               ┌ Working now ───────── View all ┐  │
│    │ (All 14)(• Review 5)(• Decisions 3)(• Stuck 2) │ ┌ ◌ Running ┐ ┌ ◷ Queued ┐      │  │
│    │ ┌──────────────────────────────────────────┐   │ │ 9         │ │ 0        │      │  │
│    │ │ (Failed) hq-21              Open ↗       │   │ (Dev) Developer  Building hq-54 │  │
│    │ │ Test story                               │   │ (Tes) Tester     Checking 7     │  │
│    │ │ ┌ (Debugger) couldn't get it going ────┐ │   │ (Dbg) Debugger   Watching 2     │  │
│    │ │ │ Preview could not start. · evidence  │ │   │ (PM)  PM         Waiting on you │  │
│    │ │ └──────────────────────────────────────┘ │   └─────────────────────────────────┘  │
│    │ │ [1] Try again          Recommended       │   ┌ Shipped this week ── 6 done ───┐  │
│    │ │ [2] Back to planning                     │   │ ⑂ Home feed: upcoming events… │  │
│    │ │ [3] Cancel the story                     │   │ ⑂ Invite friends by link      │  │
│    │ │ [4] Other…                               │   └─────────────────────────────────┘  │
│    │ └──────────────────────────────────────────┘ ← two blank cards peek out below      │
│ ⚙  │ ( ‹ Back )        ● ━ • • • • •  1 of 14        ( Later › )                        │
└────┴─────────────────────────────────────────────────────────────────────────────────────┘
```

Beside the sidebar, content is capped at 1280 px and centred, with 32 px side padding. The deck takes the room left of a 360 px side column; under 1024 px the side column moves below the deck.

**When nothing needs you,** the two arrangements cross-fade (150 ms out, 200 ms in) to: an all-clear line with the PM (64 px, blinking), then Working now as a full-width board of the five agents (each with its stories), then Shipped this week laid out in a row.

## 3. Parts

### Top bar and sidebar (`TopBar`, `Sidebar`, `nav.ts`, `SearchBox`, `AvatarMenu`)
- **Top bar:** 48 px, `#F9F9F9`, sticky, the full width of the window, as in Asana. The CHQ mark on the left: black glass with a red glass slash on the Q, 24 px tall (`public/dashboard/crafthq-chq-{24,48,72}.webp` for 1x/2x/3x screens, shrunk from `design/renders/logo_chq_v001/out/chq_front.png`; the login header uses the same files), search in the middle, the account menu on the right.
- **Sidebar:** a **56 px rail** of icons (`DESIGN.md` §4.3's collapsed rail), on the same grey, under the top bar and sticky, from 1024 px. The prototype's links, each a 16 px lucide icon: Dashboard (`LayoutDashboard`), Stories (`ListTodo`), Feature pages (`PanelsTopLeft`), Docs (`BookOpen`); Settings (`Settings`) and the toggle (`PanelLeft`) are pinned to the bottom. Items are 32 px with the icon centred; hover is a 4% black fill, the current page a 6% fill with a dark icon. Hovering or focusing an icon shows its name at once, in the dark tooltip style, 12 px to its right. It's plain CSS, so it works from the first paint with no delay; every link keeps its name for screen readers.
- **Opening it:** `[` (not while typing) or the toggle opens it to 176 px with 14/20 labels beside the icons, and the choice is remembered per browser. The width is set on `<html data-sidebar>` by an inline script before the page paints, so it never jumps on load; `--sidebar-w` follows it (the toast centres with it). It's plain links in the HTML and hydrates when idle, for the toggle and `[`.
- **Bots:** under the links, a short rule, then the five bots (PM, Builder, Designer, Checker, Fixer) as 24 px faces; a working bot has a small pulsing green dot. Hovering names it and what it's on ("Builder · Building hq-54"). Clicking opens that bot's own chat (`/ask/builder`, `/ask/designer` …; the PM's is Ask PM), which is highlighted here while it's open. Opened, they sit under a "Bots" label with their names. This replaces the old Bots tab's cards.
- **Below 1024 px** there's no sidebar; the same links, with their icons, are in the top bar's menu.
- **Search:** a 32 px pill field. `/` focuses it. It searches every story by title or ID, and choosing one opens its panel on the dashboard through the URL (`?story=hq-43`). Below 1024 px it collapses to an icon.
- **Account menu** (Radix): name, email, the workspace line from the prototype, Settings, Sign out (goes to `/login` until there's a sign-out endpoint).

### Needs you (`NeedsDeck`, `DecisionCard`, `decisions.ts`)
One decision at a time, the way Claude asks: the stories waiting on you, plus Stuck, in the prototype's group order (Stuck first).

- **The card:** status pill, ID, owner and last change, with **Open ↗** to the story panel; the title (20/28); then the question, asked by the agent whose question it is, in that agent's tint (`TEAM[...].tint`), with the evidence under it (`DESIGN.md` §2.2): passed checks, "Preview ready", the open question's default, what a stuck story is waiting on. Then two or three answers, recommended first (a blue tag), each with its number key and a one-line consequence, and **Other…** to write your own.
- **Who asks what** (`decisionFor`): Review → the Tester (Rebuild on the latest code · Accept it as it is · Ask for changes); Stuck → the Debugger (Try again · Back to planning · Cancel the story); Decision → the PM (Keep the default · Answer it · Open the plan); Planning → the PM (Approve the plan · Ask a question · Open the plan); Triage → the PM (Plan it · Close it · Open the story). Answers map to the story panel's actions, so both do the same thing.
- **Answering:** a plain answer acts at once (reversible, so no confirm, `DESIGN.md` §6.11): the card says what you chose ("✓ Rebuilding") for 0.4 s, lifts 18 px and fades (150 ms), and the next card rises from behind (200 ms); the toast offers **Undo**, which puts the card back on top. Answers that need words (Ask for changes, Answer it, Other…) open a box on the card: ⌘↵ sends, Esc cancels.
- **Browsing:** swiping only browses, so a stray swipe never approves anything: drag left sends the card to the back (Later), drag right brings the last one back (Back), with a "Later ›" or "‹ Back" hint fading in as you drag. The card lifts to 1.02 while held and never rotates (`DESIGN.md` §6.12). ← → and the Back / Later buttons do the same; 1–4 answer. The keys work in the deck, or anywhere while nothing else has the keyboard and no panel is open.
- **Counts:** the header's amber indicator and count are the old Needs you card; the chips (All, Review, Decisions, Plans, Triage, Stuck, each with its tone dot and count) are the old Ready to review and Stuck cards, and filter the deck. "3 more waiting on teammates" counts the stories waiting on others.
- **Progress:** a dot per decision since the page opened: answered green, this one a blue bar, the rest grey, and "2 of 14". The dots hide under 640 px.

### Working now (`WorkingNow`)
What's moving (`DESIGN.md` §5.6). Running and Queued keep their numbers and solid indicators (green turning `LoaderCircle`, grey `Clock`), with their lines ("2 building, 7 checking"; "Checked just now"); both open the Details panel. Under them, each agent and what it's on, from the dashboard's own data: Developer (the In progress stories), Tester (the In review ones), Debugger (the stuck ones), PM (how many wait on you), Designer (free). Agents at work come first, with a pulsing green dot; each row opens that agent's chat (`/ask/<agent>`). On the board, each agent is a card listing up to three of its stories, which open the story panel.

### Shipped this week (`Shipped`)
What shipped: the week's merges, newest first (`shipped` in the sample data, also Ask PM's list), and the project's done count.

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
On the deck, the card says what you chose and lifts away; everywhere, the counts update and a dark toast at the bottom says what happened, with **Undo** for 6 seconds (paused on hover). Clearing the last card switches the page to its all-clear arrangement, which says how many decisions you answered.

### States
`?state=loading` (the deck and side column in skeleton), `?state=empty` (the all-clear arrangement), `?state=error` ("Couldn't load your stories" with Try again, beside the side column's skeleton). A chip with nothing left shows "No reviews left" with Show all.

## 4. Interaction details

| Element | Rest | Hover | Timing |
|---|---|---|---|
| Sidebar item | dark label, grey icon | 4% black fill, dark icon; current: 6% fill, medium | 120 ms |
| Search, pills | 1 px `#CBCBCB` | `#B5B5B5`, fill `#F9F9F9` | 120 ms |
| Primary button | `#2F6FED` | `#2459D6`, presses down 1 px | 120 ms |
| Answer | `#E3E3E3` edge; recommended `#C9D9FB` on `#F7FAFF` | darker edge, `#F9F9F9` fill; recommended blue edge | 120 ms |
| Chip | white, `#E3E3E3` edge | darker edge; on: dark fill, white text | 120 ms |
| Deck card | white, soft shadow | grab cursor; held: scale 1.02 | drag follows the pointer |
| Agent row | white | `#F7F7F7` | 120 ms |

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
