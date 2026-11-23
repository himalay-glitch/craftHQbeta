# Dashboard

Version 3 · 19 Nov 2026 · branch `himalay/dashboard` · route `/dashboard`

What the dashboard is, where its look and content come from, and how it behaves. It describes the code in `src/pages/dashboard/`, `src/components/dashboard/`, `src/components/shell/` and `src/layouts/AppLayout.astro`.

## 1. Sources

| | Comes from | Notes |
|---|---|---|
| **Look** | The Asana "AI Teammates" screenshot, measured pixel by pixel (§6) | White page, a light grey top bar, 12 px cards with a faint shadow, pill filters, a hairline table |
| **Content** | The manager's prototype (`crafthq-re.html`, Dashboard view) | Its stats (Running and Queued split out, as on the live app, in place of With the agent and Done), nav links, stories, groups, wording ("story", "the agent") and New story form |
| **Data reference only** | The live app.crafthq.ai dashboard | Not used for the look |

**Scope, as agreed:** only the dashboard page is built; the nav links to the other pages lead nowhere yet. No phone-specific work beyond what's already there. No Builder render on the dashboard.

**Builds on:** the Astro move (#2), the Astro version of the design tokens (commit `091ff8b`, in #3/#4's history) and radix-ui (#8). This branch merges after them.

## 2. Layout at 1440 px

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ CraftHQ                          ( ⌕ Search            )                           (AD) │ 48 top bar #F9F9F9
├────┬─────────────────────────────────────────────────────────────────────────────────────┤
│ ▦  │ WePop                                                              ( + New story )  │ rail 56 #F9F9F9
│ ☰  │ ┌ Needs you ┐ ┌ Ready to review ┐ ┌ Stuck ┐ ┌ ● Running ┐ ┌ Queued ┐                  │ five stat cards
│ ▭  │ │ 12        │ │ 5               │ │ 2     │ │ 9         │ │ 0      │                  │
│ ▯  │ └───────────┘ └─────────────────┘ └───────┘ └───────────┘ └────────┘                  │
│    │ ( Show: Mine ⌄ ) ( Filter ⌄ )                                                       │ pills 30
│    │ ┌ Story ──────────── Status ───── Action ──────────── Owner  Waiting on  Updated ┐   │
│    │ │ hq-21 Test story    (Failed)     Preview could not…                      │       │ rows 46
│    │ │ hq-43 Creation…     (In review)  Move the story b…   (E)   You   just now │       │
│    │ │ hq-28 Crew size…    (Needs input) Answer decision…  (MS)   You     8d ago │       │
│    │ └──────────────────────────────────────────────────────────────────────┘       │
│ ⚙  │                                                                                     │
│ ◫  │ ← `[` or ◫ opens the sidebar to 176 px with labels                                  │
└────┴─────────────────────────────────────────────────────────────────────────────────────┘
                                      clicking a row opens the story panel (480 px) →
```

Beside the sidebar, content is capped at 1280 px and centred, with 32 px side padding.

## 3. Parts

### Top bar and sidebar (`TopBar`, `Sidebar`, `nav.ts`, `SearchBox`, `AvatarMenu`)
- **Top bar:** 48 px, `#F9F9F9`, sticky, the full width of the window, as in Asana. The glass wordmark on the left (24 px tall; `public/dashboard/crafthq-logo-glass.webp`, from #6), search in the middle, the account menu on the right.
- **Sidebar:** a **56 px rail** of icons (`DESIGN.md` §4.3's collapsed rail), on the same grey, under the top bar and sticky, from 1024 px. The prototype's links, each a 16 px lucide icon: Dashboard (`LayoutDashboard`), Stories (`ListTodo`), Feature pages (`PanelsTopLeft`), Docs (`BookOpen`); Settings (`Settings`) and the toggle (`PanelLeft`) are pinned to the bottom. Items are 32 px with the icon centred; hover is a 4% black fill, the current page a 6% fill with a dark icon. Hovering or focusing an icon shows its name at once, in the dark tooltip style, 12 px to its right. It's plain CSS, so it works from the first paint with no delay; every link keeps its name for screen readers.
- **Opening it:** `[` (not while typing) or the toggle opens it to 176 px with 14/20 labels beside the icons, and the choice is remembered per browser. The width is set on `<html data-sidebar>` by an inline script before the page paints, so it never jumps on load; `--sidebar-w` follows it (the toast centres with it). It's plain links in the HTML and hydrates when idle, for the toggle and `[`.
- **Below 1024 px** there's no sidebar; the same links, with their icons, are in the top bar's menu.
- **Search:** a 32 px pill field. `/` focuses it. It searches every story by title or ID, and choosing one opens its panel on the dashboard through the URL (`?story=hq-43`). Below 1024 px it collapses to an icon.
- **Account menu** (Radix): name, email, the workspace line from the prototype, Settings, Sign out (goes to `/login` until there's a sign-out endpoint).

### Stats (`SummaryCards`)
Five cards: the three that filter the table, then the agent's two. Running and Queued are separate stats, as on the live app's "Agent's turn" card (`screencapture-app-crafthq-ai-2026-11-19-14_17_03.pdf`: 1 Running · 0 Queued); they replace the prototype's "With the agent" (which showed running, with queued in its line) and "Done", the least important card. Every card does something, so each lifts on hover (the reference's raised card):

| Card | Value | Line | Click |
|---|---|---|---|
| Needs you | stories waiting on you | "3 more waiting on others" | Show: Mine, Filter: Everything |
| Ready to review | Review stories | "Test, then accept or ask for changes" | toggles Filter: Review |
| Stuck (the Stuck alert beside the label while it's above 0) | Stuck stories | "Not being picked up" | toggles Filter: Stuck |
| Running (green dot while it's above 0) | stories the agent is working on | "2 in progress, 7 in review", or "The agent is idle" | Details, With the agent tab |
| Queued | stories waiting for the agent to start | "Agent checked just now" (the loop tick) | Details, With the agent tab |

A card whose filter is on has a blue edge. Values are never coloured.

### Filters (`FilterPill`, Radix menus)
- **Show:** Mine (default: waiting on you, plus Stuck) or Team. Counts beside each option.
- **Filter:** Everything, or one group. Reads "Showing: Review" when on, as in the prototype.
- **Clear** appears when either is off its default.

### Table (`QueueTable`)
- Boxed: 1 px `#E3E3E3` edge, 12 px corners; `overflow: clip` keeps the header sticky under the top bar.
- Header 36 px, 12/16 grey. Rows 46 px, 15/22, 1 px `#E8E8E8` rules. Text starts 16 px in, level with the card labels.
- Columns: **Story** (ID and title), **Status** (the shared status pill), **Action** (the story's own instruction or its extra line; the shared "Move the story back to Approved…" line isn't repeated), **Owner** (initials), **Waiting on** (You, rtdp, Deepak Tewatia; empty for Stuck), **Updated** (sortable: newest, oldest, back to the group order).
- Default order: the prototype's groups (Stuck, Review, Decision, Planning, Triage, Say what to do next), then its own order.
- Action gives way when the table is under 1000 px (a window under about 1120 px beside the rail, 1240 px with the sidebar open), where it would be too narrow to read; Story then takes its space. The full text is in the story panel.

- No pagination or infinite scroll: the list is meant to reach zero.

**Status:** one look for the whole app, so the dashboard and Stories name a story alike: the shared `StatusPill` (`src/components/ui/`, `DESIGN.md` §7.12), with its tones and icons. A status never says "you", so the groups map to statuses (`NEED_STATUS` in `format.ts`): Stuck → **Failed** (each stopped on a failed preview or check); Review → **In review**; Decision, Planning, Triage and Say what to do next → **Needs input**, with the Action column saying what input. The groups still set the order, the Filter menu and the cards.

**Stuck alert:** Stuck is the one group nobody is moving, so its card carries an alert while the count is above 0: a 14 px red `CircleExclamationPoint` beside the label, with a red ring that grows 5 px out and fades (from 40% opacity, over the first 70% of a 2 s cycle, then a rest). With reduced motion the icon stands alone. In the rows, Stuck stories show the shared Failed pill.

### Panels (`SidePanel`, `StoryPanel`, `ActivityPanel`, `NewStoryPanel`)
- 480 px from the right, under the top bar. On screens 1024 px and wider it floats over the page with its shadow, with no scrim: the table keeps its full width underneath and stays clickable. Below that it covers the page with a scrim. Slides in over 200 ms; fades with reduced motion.
- **Story panel:** the story's facts (Status, Stage, Waiting on, Owner, Open items, Updated), "Latest from the agent", and the group's actions, worded as in the prototype: Review → Accept · Done / Ask for changes; Planning → Approve and build / Ask a question; Decision → Let the defaults stand / Answer in a note; Stuck → Restart / Add a note; Triage → Move to planning / Cancel story; Say what to do next → Add a note. Notes open a box pinned to the bottom ("Notes get a reply. Code changes only after you approve.").
- **Details panel:** the prototype's two tabs. With the agent: loop tick, Running and Queued, the running stories. Recent activity: the agent's runs, plus About and the version.
- **New story:** Title, Why, Detail, Owner and Files, as in the prototype; only Title is required.
- The open story is in the URL, so links, reloads and Back reopen it. ↑/↓ (or J/K) move between stories, Esc closes and returns focus to the row. Copy link copies the URL.

### Connecting accounts (`ConnectAccountsModal` from #4, `SetupBanner`, `setup.ts`)
- After sign-in the login form goes to `/dashboard`. Whenever GitHub or Claude isn't connected, `ConnectAccountsModal` opens on load, with the dashboard behind it.
- If someone skips it, a banner above the stats says what's missing and offers **Connect accounts**, which reopens the modal.
- The mock connections start as not connected. The GitHub step only completes under `npm run dev`, because closing its window counts as approved only there.

### After an action
The row folds away, the counts update, and a dark toast at the bottom says what happened, with **Undo** for 6 seconds (paused on hover).

### States
`?state=loading` (skeleton cards and rows), `?state=empty` ("Nothing waiting on you."), `?state=error` ("Couldn't load your stories" with Try again). A filter with no matches shows "No stories match this filter" with Show everything.

## 4. Interaction details

| Element | Rest | Hover | Timing |
|---|---|---|---|
| Sidebar item | dark label, grey icon | 4% black fill, dark icon; current: 6% fill, medium | 120 ms |
| Search, pills | 1 px `#CBCBCB` | `#B5B5B5`, fill `#F9F9F9` | 120 ms |
| Primary button | `#2F6FED` | `#2459D6`, presses down 1 px | 120 ms |
| Stat card | `#E3E3E3`, faint shadow | `#D9D9D9`, larger shadow, lifts 2 px, chevron appears | 160 ms |
| Table row | white | `#F7F7F7`; open row `#EEF3FD` | 80 ms |
| Updated header | grey | dark, sort arrow appears | 120 ms |

Focus always shows a 2 px blue outline. Every animation has a reduced-motion version. Menus and tooltips are Radix (keyboard, focus and dismissal handled).

## 5. Accessibility

Real table semantics with `aria-sort`; every row reachable with Tab and opened with Enter; panels are labelled dialogs that take and return focus; toasts are announced politely; status pills always carry words; a "Skip to content" link; text contrast at least 4.5:1 (the lowest pair is grey text on a hovered row, 4.77:1).

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

- Draft the `DESIGN.md` exception PR (§7).
- Replace the sample data (`src/pages/dashboard/_sample-data.ts`) with the CraftHQ API.
- Overlay a 2× screenshot on the reference to fine-tune type and spacing.
