# CraftHQ design system

**Version 0.1 · draft for review · 19 Nov 2026**
A shared file: change it only in its own pull request, approved by the other owner (see `CLAUDE.md`).

## Contents

0. How this document works
1. What we're designing
2. Principles
3. Foundations: colour, type, spacing, layout, shape, icons, motion
4. App shell and navigation
5. Views: list, board, calendar, timeline, tables, dashboard
6. Workflows and patterns
7. Components
8. Interaction and micro-interactions
9. Content and voice
10. Responsive behaviour
11. Accessibility
12. Implementation rules
13. Review checklist
14. Known deviations in the current code
15. Open decisions
16. Changelog

---

## 0. How this document works

- **This document is the authority.** When code, a screenshot or a mock-up disagrees with it, the document wins. Fix the code, or change the document first in its own pull request.
- **Scope.** Every screen inside the signed-in CraftHQ app. The login page and other *brand surfaces* (§1.3) share the colours, type family and voice, but use their own scale.
- **How rules are marked.** Everything is a rule unless it says **(Proposed)**, which means "do this unless you have a reason, and say why in the PR". The items in §15 are **open**: decide them together before building the parts they block.
- **How patterns are written.** Each pattern says *Use when*, *Don't use when* and *Why*. Big decisions also have **In plain words**: one sentence you can say to a client or a stakeholder.
- **Changing it.** Open a small PR that touches only this file, plus `src/app/globals.css` if tokens change, so the two never drift apart. The other owner approves it.
- **For Claude.** Before any UI work, read the sections that apply. Use tokens only (§12). If a screen needs a pattern that isn't here, stop and ask; don't invent one silently. If existing code breaks a rule, say so, and fix it only if it's in your owner's area. Run the checklist in §13 before proposing a commit.

### 0.1 The short version

If you read nothing else, follow these:

1. Whatever needs a person comes first on every screen (§2.1).
2. Never ask for an approval without showing the evidence in the same view (§2.2).
3. At most two rows of page chrome above the content (§4.5).
4. Blue means "you can act here", "selected" or "focused". Nothing else is blue (§3.1).
5. A status is an icon plus a label plus a tone, never colour alone (§7.12).
6. Robots are rounded squares and people are circles (§7.13).
7. Body text is 14 px (`text-sm`). Nothing is smaller than 12 px (§3.2).
8. Use the 4 px spacing scale and token classes only: no hex values, no `[arbitrary]` values (§12).
9. Controls are 32 px by default, rows 36 px, and touch targets 44 px (§3.3).
10. Edit in place, save automatically, and offer Undo instead of "Are you sure?" (§6.11, §6.13).
11. Details open in a side panel; the list stays where it is and the URL updates (§4.7).
12. Only robots bounce. Interface motion is quick and never overshoots (§3.7).
13. Every animation has a reduced-motion version (§3.7).
14. Use sentence case and verb-plus-object buttons. Errors say what happened and what to do next (§9).
15. The keyboard reaches everything, and Esc closes the top layer (§8.1).

---

## 1. What we're designing

### 1.1 The product

CraftHQ is a product-build command center: a robot build team that works on your code. A team connects its repository and sends tickets the way it already writes them. The **Asker** reads each ticket and returns the questions that would otherwise come up halfway through the build. The **Builder** writes the change. The **Checker** tests it independently, from the written requirement rather than from the code. Engineers then review and merge each change as a normal pull request tagged with its risk. Nothing merges without a person.

### 1.2 Who works in it

| Person | Comes to CraftHQ to… | So the interface must… |
|---|---|---|
| Engineer or engineering lead | answer the robots' questions, review pull requests, see what's in flight | put what's waiting on them first, and show requirement → checks → results before any approval |
| Product owner | write tickets, follow progress, see what shipped | make writing a ticket fast, and show progress without jargon |
| Workspace admin | connect accounts and repositories, invite people | make setup short, guided and safe to leave halfway |

### 1.3 Two kinds of surface

| | Work surfaces | Brand surfaces |
|---|---|---|
| Where | lists, boards, panels, forms, settings: about 95% of the app | login, onboarding, first-use empty states, celebrations |
| Feel | dense, calm, fast | spacious, warm, playful |
| Type | 12–24 px (§3.2) | display sizes allowed (`.hero-title`) |
| Controls | 28–32 px, `rounded-lg` | up to 54 px fields and pill buttons |
| Robots | small avatars and statuses only | plush renders and video loops |

Never bring brand-surface scale into a work surface.
**Why:** people spend hours a day in work surfaces. Big controls waste space and slow down scanning.

### 1.4 Asana as the benchmark

Asana is our bar for clarity, workflow speed and polish. It's a benchmark, not a template: we study why its patterns work and then solve the same problems our own way.

| Asana does | Why it works | CraftHQ does |
|---|---|---|
| One persistent sidebar: Home, My tasks and Inbox at the top, then Starred, Projects (filled automatically by recent use) and Teams | Orientation never changes, your own work is one click away, and a list ranked by use needs almost no upkeep. | The same shape. **Needs you** sits near the top because robots wait on people, and Projects lists the ones you used recently (§4.3). |
| Search "front and center" in a top bar, with **+ Create** at the top left | Search and create are reachable from anywhere. | Search and New live in the sidebar. There's no top bar on desktop, so the content gets the height (§4.2). |
| A project's views (Overview, List, Board, Timeline, Calendar, Dashboard) are tabs over the same tasks, and saved views become extra tabs | One set of data, many lenses, and the views never diverge. | The same, but we only offer views that fit the data (§4.5). |
| Task details open in a right pane while the list stays visible; full screen is one click away; the title stays pinned as you scroll | You never lose your place. | The same panel, plus a URL that updates, with the content ordered as an evidence trail (§4.7, §6.2). |
| Every task has exactly one assignee | Ownership is never ambiguous. | Every ticket shows who holds it right now: a robot (by its stage) or the person it's waiting for (§4.7, §7.17). |
| Enter adds the next task, unnamed tasks remove themselves, and fields edit in place | Capture first, add detail later. | The same (§6.1, §6.13). |
| Sections are groups in List and columns in Board | One mental model across views. | Stages group the list and form the board's columns (§5.1, §5.2). |
| Inbox is one triage queue, and archiving (not deleting) clears it | Reaching inbox zero is safe. | **Needs you** holds only what a person must act on (§6.5). |
| Undo toasts at the bottom left instead of "Are you sure?", with an adjustable duration | Fast and forgiving, and accessible. | The same (§6.5, §6.11). |
| Saving a view makes it the default for everyone in the project | Everyone sees the same thing, though personal views are a frequent request. | A shared default for each view, plus your own changes saved just for you, and Reset to go back (§6.3). |
| A neutral canvas, with colour kept for state and user-chosen project colours, plus a colour-blind mode | The work stands out. | Stricter: blue only for action, and tones only for status. Colour never carries meaning alone, so no separate colour-blind mode is needed (§3.1, §11). |
| An occasional, random celebration creature when a task is completed | A rare, unpredictable reward. | Not copied. Our Builder marks real milestones (a project's first merge, then its 10th, 50th and 100th), and it can be turned off (§8.6). |
| Tab+letter shortcuts for most actions | Power users move fast. | `⌘K` and single keys that can be turned off. Tab keeps its normal job of moving focus (§8.1). |
| Phone apps built around My tasks, Inbox, search and adding tasks | The desktop is for dense work. | On phones, the job is triage and capture: answer questions, check status, write a ticket (§10). |

**Never copy:**
- the Asana name, wordmark and three-dot logo
- its coral brand colour and its coral create button
- its illustration style and empty-state art
- the celebration creatures and the random-creature mechanic
- its brand line and coined names ("My tasks", "Recently assigned", "Portfolios", "Goals", "Bundles", "AI Teammates")
- its help-centre and interface copy, and its icons
- its Tab+letter shortcut scheme
- its exact layouts and measurements

Sources: help.asana.com, developers.asana.com, asana.com/inside-asana and forum.asana.com, checked in November 2026.

---

## 2. Principles

### 2.1 Whatever needs a person comes first

Robots stop when they need an answer or an approval, so the time people take to respond is what limits how fast work ships. Every screen shows what's waiting on the current person before anything else: the **Needs you** count in the sidebar, the needs-you section at the top of Home, and the callout at the top of a ticket.
**In plain words:** "The app always shows you first what the robots need from you, so work never stalls."

### 2.2 Evidence before approval

Never ask anyone to approve, merge or close a change without showing, in the same view, the requirement, the checks written for it, their results and the risk tier.
**In plain words:** "You never approve anything blind. The proof is right next to the button."

### 2.3 Work first, chrome second

The content gets the space. There are at most two rows of chrome above it, no decoration on work surfaces, and every control has to earn its place.
**In plain words:** "The screen is for your work, not for our buttons."

### 2.4 Edit where you see it

Click a title to rename it, and click a field to change it. Changes save automatically. There's no separate edit mode and no Save button for a single field.

### 2.5 Never lose your place

Details open beside the list. The URL always describes what's on screen, so links, reloading and Back all work. Filters and sorting stay as you left them.

### 2.6 Fast and forgiving

Every input gets visible feedback within 100 ms. Edits apply immediately and roll back if they fail. Reversible actions offer Undo instead of a confirmation. Anything people do often has a shortcut.

### 2.7 Colour means something

The interface is neutral by default. Blue means you can act, something is selected, or something has focus. Status tones mean state. Robot hues mean which robot. Nothing else gets colour.
**In plain words:** "When something is coloured, it's telling you something."

### 2.8 Warm crew, exact work

The plush robots bring warmth on brand surfaces and in small, rare moments. Work surfaces stay precise and quiet. Only robots bounce.
**In plain words:** "The robots have personality; your data doesn't need any."

---

## 3. Foundations

All values are CSS custom properties in `src/app/globals.css`, exposed to Tailwind through `@theme inline`. Components use the Tailwind classes, never raw values (§12). Tokens marked *new* are added by the tokens PR (§14).

### 3.1 Colour

#### Neutrals

| Token | Tailwind class | Value | Use |
|---|---|---|---|
| `--bg` | `bg-background` | `#fcfcfc` | Canvas: behind the sheets; the sidebar sits on it |
| `--card` | `bg-card` | `#ffffff` | Sheets: the content area, panels, cards, menus, modals |
| `--field-bg` | `bg-field` (*new class*) | `rgb(0 0 0 / 0.05)` | Input fills, secondary buttons, chips, skeletons |
| `--field-bg-hover` | `bg-field-hover` (*new class*) | `rgb(0 0 0 / 0.07)` | A hovered input or secondary button |
| `--hover` (*new*) | `bg-hover` | `rgb(0 0 0 / 0.04)` | Hover on rows, menu items and ghost buttons |
| `--pressed` (*new*) | `bg-pressed` | `rgb(0 0 0 / 0.07)` | Pressed controls, the current nav item, the open row |
| `--border` | `border-border` | `rgb(0 0 0 / 0.08)` | Hairlines: dividers, sheet and card edges |
| `--border-strong` (*new*) | `border-border-strong` | `rgb(0 0 0 / 0.14)` | Hovered cards, the rule under table headers |
| `--text` | `text-foreground` | `#111112` | Primary text, and icons when active (18.9:1 on white) |
| `--muted` | `text-muted-foreground` | `rgb(0 4 9 / 0.59)` | Secondary text, placeholders, default icons (5.4:1 on white, 5.2:1 on `bg-field`) |
| `--faint` | `text-faint` | `rgb(0 4 9 / 0.45)` | Disabled text and the outlines of checkboxes, radios and switches (3.3:1). Never for text people need to read |
| `--inverse` (*new*) | `bg-inverse` | `#111112` | Tooltips, toasts, the Core risk tag |
| `--on-inverse` (*new*) | `text-on-inverse` | `#ffffff` | Text and icons on the inverse surface |

#### Action blue

| Token | Tailwind class | Value | Use |
|---|---|---|---|
| `--cta` | `bg-primary` | `#2f6fed` | Primary button fill, checked controls, progress bars, drop indicators. White text on it is 4.55:1 |
| `--cta-hover` | `bg-primary-strong`, `text-primary-strong` | `#2459d6` | Primary hover, and every piece of blue text, such as links (6.0:1 on white) |
| `--selected` (*new*) | `bg-selected` | `rgb(47 111 237 / 0.08)` | Selected rows and cards when several are picked |
| `--focus` | `outline-focus` | `#2f6fed` | The focus outline |
| `--focus-ring` | (used in the field focus style) | `rgb(47 111 237 / 0.16)` | The halo around a focused input |

Rules:
- Blue appears only where you can act (primary buttons, links, toggles, checked controls), on selected items and on focus. The one exception is charts, where categorical slot 1 is blue.
- Blue is never used for status, headings, decoration, info banners or the current-location marker.
- Blue text always uses `text-primary-strong`. `#2f6fed` is for fills.
- Today, Tailwind's `primary` points at an old red. The tokens PR fixes this (§14).

Current, selected and focused look different:

| State | Look | Example |
|---|---|---|
| Current (where you are) | `bg-pressed`, `text-foreground`, medium weight | The active nav item, the active tab (foreground underline), the row whose panel is open |
| Selected (what you picked) | `bg-selected` and a checked blue checkbox | Rows picked for a bulk action |
| Focused (where the keyboard is) | 2 px `--focus` outline with a 2 px offset | Any focusable element |

#### Status tones

| Tone | Mark: dots, icons, bars | Ink: text | Tint: backgrounds | Means |
|---|---|---|---|---|
| Positive | `--success` `#16a34a` (3.3:1) | `--success-ink` `#166534` (7.1:1) | `--success-tint` `rgb(22 163 74 / 0.10)` | merged, passed, connected |
| Attention | `--warning` `#d97706` (3.2:1) | `--warning-ink` `#92400e` (7.1:1) | `--warning-tint` `rgb(217 119 6 / 0.10)` | needs a person, expiring, at risk |
| Negative | `--danger-ink` `#b91c1c` (6.5:1) | `--danger-ink` `#b91c1c` | `--danger-tint` `rgb(185 28 28 / 0.08)` | failed, error, destructive |
| Neutral | `--muted` | `--text` | `--field-bg` | draft, queued, closed, information |
| Active | `--text`, plus motion | `--text` | none | a robot is working (the robot's avatar carries the colour) |

All contrast figures are measured on white. Each ink on its own tint is at least 5.6:1.

Rules:
- There's no blue "info" tone. Information is neutral, with the `Info` icon.
- Status colour is never used on its own (§7.12).
- Marks sit on `bg-card` or `bg-background`, not on top of fills.

#### Robot identity

| Robot | Hue | Backdrop | Role |
|---|---|---|---|
| Asker | `--bot-asker` `#0b8fc9` | `--bot-asker-bg` `#e1f0ff` | reads tickets and asks first |
| Builder | `--bot-builder` `#eb6834` | `--bot-builder-bg` `#fde7e1` | builds the change |
| Checker | `--bot-checker` `#6250d6` | `--bot-checker-bg` `#ece6ff` | tests from the requirement |

The three hues are validated as a set: every pair stays distinguishable with all common types of colour blindness, and each hue is at least 3:1 on white. The backdrops match the Blender renders in `design/`.

Rules:
- Robot hues appear only on robot avatars, the working ring, and chart series that are robots.
- They're never used as text colour or for status, and people can't pick them for labels.
- The Asker's sky blue is identity, not action. It never appears on a button.

#### Categorical colours: projects, labels, chart series

| Slot | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Hue | blue | orange | aqua | yellow | magenta | green | violet | red |
| Value | `#2f6fed` | `#eb6834` | `#1baf7a` | `#eda100` | `#e87ba4` | `#008300` | `#6250d6` | `#e34948` |

The palette was validated in this order on white. Neighbouring slots stay distinguishable with red–green colour blindness (ΔE ≥ 9.1) and with normal vision (ΔE ≥ 19.6). Slots 3, 4 and 5 are under 3:1 on white, so a text label must always accompany them.

Rules:
- Assign the slots in order and never cycle back. A ninth category becomes "Other".
- Show the colour as an 8 px dot or a 16 px rounded square beside a text label, never as a fill behind text.
- Slots 2 and 7 are the Builder's and Checker's hues, so a chart never mixes robot series with other series.

#### Charts

- Pick the form first. Sometimes the answer is a single number, not a chart.
- One y-axis per chart; never two.
- Two or more series get a legend. Up to four series also get direct labels. Text uses the ink tokens, never the series colour.
- Sequential (magnitude): one blue ramp, `#cde2fb` `#9ec5f4` `#6da7ec` `#3987e5` `#256abf` `#184f95` `#0d366b` (light to dark). Ordered steps start no lighter than `#86b6ef`.
- Diverging: blue ↔ red with a grey midpoint (`#f0efec`).
- Status in a chart uses the status marks, with an icon and a label.
- Every chart has a hover tooltip and a table view of the same data.
- Gridlines use `--border`; axis labels are `text-xs` and muted.

#### Dark mode

Dark mode isn't designed yet. The app is light-only (`data-theme="light"`). The dark block in `globals.css` is a leftover from the old site, not a theme: don't use it, and don't add `dark:` classes. When dark mode is designed, every token gets a dark value as one set, and the chart colours are validated again.

**In plain words:** "We use colour sparingly, so when something is coloured it means something: blue is for things you can click, and red, amber and green tell you how the work is going."

### 3.2 Typography

- **Family:** Inter (variable, with optical sizing), loaded once in `layout.tsx`.
- **Mono:** the system mono stack (`font-mono`), for IDs, branch names, paths and code.
- **Serif** (`font-serif`): not used in the app.

| Role | Classes | Size / line height | Weight | Use |
|---|---|---|---|---|
| Caption | `text-xs` | 12 / 16 | 400 or 500 | badges, timestamps, meta, column headers, tooltips |
| Body | `text-sm` | 14 / 20 | 400 | the default: rows, menus, buttons, inputs, panels |
| Reading | `text-base` | 16 / 24 | 400 | ticket descriptions, questions and answers, comments; inputs on touch screens |
| Label | `text-sm font-medium` | 14 / 20 | 500 | form labels, nav items, buttons |
| Section heading | `text-sm font-semibold` | 14 / 20 | 600 | panel sections, card and widget titles |
| Dialog title | `text-base font-semibold` | 16 / 24 | 600 | modal and popover titles |
| Page title | `text-xl font-semibold tracking-title` | 20 / 28 | 600 | project and page names, the ticket title in the panel |
| Display | `text-2xl font-semibold tracking-title` | 24 / 32 | 600 | the Home greeting, first-use empty states |
| Metric | `text-3xl font-medium` | 30 / 36 | 500 | KPI values on dashboards |

Rules:
- Use weights 400, 500 and 600 only.
- Nothing is smaller than 12 px. No arbitrary sizes such as `text-[13px]`.
- Use `tracking-title` (*new*, −0.01em) at 20 px and up, and the default tracking everywhere else.
- Use `tabular-nums` for anything that lines up or updates: numbers in tables, counts, durations, timers. Large KPI numbers can stay proportional.
- Use sentence case. No all-caps, except acronyms such as PR, ID and UI.
- Long text runs at most about 70 characters per line (`max-w-prose`).
- In rows, titles truncate to one line. On cards they truncate to two lines (`line-clamp-2`). Either way the full text shows in a tooltip. Panels and pages never truncate titles.
- Links inside sentences are underlined. Standalone links, in lists and navigation, aren't.

**Why 14 px body text:** it's dense enough to scan long lists and large enough to read for hours, and it fits the 4 px grid with a 20 px line.

### 3.3 Spacing and sizing

The base unit is 4 px: Tailwind's spacing scale, where `1` is 4 px. Use these steps: `0.5` (2 px), `1` (4), `1.5` (6), `2` (8), `3` (12), `4` (16), `5` (20), `6` (24), `8` (32), `10` (40), `12` (48), `16` (64). No arbitrary values.

| Spacing | Value | Where |
|---|---|---|
| Icon to label, inside a control | 6 px (`gap-1.5`) | buttons, chips |
| Between items in a row or a menu | 8 px (`gap-2`) | row cells, menu icon to label |
| Related items | 4–8 px | label to field, stacked meta |
| Groups | 16–24 px | form sections, card stacks |
| Sections | 32–48 px | page sections, dashboard rows |
| Sheet padding | 24 px on desktop, 16 px below 1024 px | the content sheet, panels, modal bodies |

Control heights:

| Size | Height | Class | Use |
|---|---|---|---|
| xs | 24 | `h-6` | controls inside rows and cards |
| sm | 28 | `h-7` | toolbars, filter chips, dense forms |
| md | 32 | `h-8` | the default for buttons, inputs, selects and menu items |
| lg | 40 | `h-10` | the main action in onboarding and first-use empty states |
| touch | 44 | `h-11` | the minimum on touch screens (`pointer-coarse:h-11`); brand surfaces |

- **Density:** list and table rows are 36 px (`h-9`). Group headers, sidebar items and menu items are 32 px. Board cards have 12 px padding and an 8 px gap.
- **Targets:** everything clickable is at least 24 × 24 px, and at least 44 × 44 px on touch screens.

### 3.4 Layout and breakpoints

The app is a canvas with sheets on it: the sidebar sits on the near-white canvas, and the content area and the detail panel are white sheets.

| Region | Size | Notes |
|---|---|---|
| Sidebar | 240 px (`w-60`); a 56 px rail (`w-14`) when collapsed | sits on the canvas, full height |
| Content sheet | the rest of the width, inset 8 px from the window edges | white, `rounded-xl`, hairline border |
| Page header | a 48 px title row, then a 40 px tabs row | inside the content sheet |
| Detail panel | 560 px by default, resizable from 440 to 760, remembered per person | a second sheet with an 8 px gap; how it opens depends on width (§4.7) |
| Top app bar | 48 px | below 1024 px only |
| Reading width | `max-w-prose` | long text |
| Settings forms | `max-w-2xl` (672 px) | settings pages |

The breakpoints are Tailwind's defaults: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536. Design at 1440 and 1280, then check 768 and 375 before every PR.

### 3.5 Shape: radius, borders, elevation, layers

Radius, using Tailwind's defaults plus one new token:

| Class | Size | Use |
|---|---|---|
| `rounded-sm` | 4 px | checkboxes, keyboard hints |
| `rounded-md` | 6 px | badges, tags, ID chips, tooltips, skeleton lines |
| `rounded-lg` | 8 px | buttons, inputs, menu items, row hover, segmented controls |
| `rounded-xl` | 12 px | cards, sheets, menus, popovers, toasts |
| `rounded-2xl` | 16 px | modals, the overlay panel, the top corners of bottom sheets |
| `rounded-full` | — | people's avatars, switches, status pills, filter chips, brand buttons |
| `rounded-robot` (*new*, 30%) | — | robot avatars |

Nested corners: the inner radius is the outer radius minus the padding, with a minimum of 4 px.

**Borders:** 1 px only (`border-border`). Separate things with one method at a time: space, a hairline or a fill, never all three. Focus is shown with an outline, never by changing a border.

**Elevation** (all *new*):

| Level | Token | Value | Use |
|---|---|---|---|
| 0 | — | none | everything resting on a sheet |
| 1 | `shadow-raised` | `0 1px 2px rgb(17 17 18 / 0.06)` | hovered interactive cards, the chosen segment |
| 2 | `shadow-popover` | `0 0 0 1px rgb(17 17 18 / 0.06), 0 8px 24px rgb(17 17 18 / 0.10)` | menus, popovers, toasts, the floating bulk bar |
| 3 | `shadow-overlay` | `0 0 0 1px rgb(17 17 18 / 0.06), 0 24px 48px rgb(17 17 18 / 0.16)` | modals, the overlay panel, bottom sheets |
| Drag | `shadow-drag` | `0 0 0 1px rgb(17 17 18 / 0.08), 0 12px 32px rgb(17 17 18 / 0.18)` | an item being dragged |

- **Scrim:** modals sit over a `--scrim` of `rgb(17 17 18 / 0.32)` (*new*). There's no scrim behind the overlay panel.
- **Layers:** content `z-0`, sticky headers `z-10`, sidebar `z-20`, overlay panel `z-30`, menus and popovers `z-40`, modals `z-50`, popovers inside modals `z-60`, toasts `z-70`, tooltips `z-80`. Never use `z-[999]`.

### 3.6 Iconography

- Use lucide-react only (1.75 is installed). Some names changed in 1.x: use `CircleExclamationPoint`, not `CircleAlert`, and `CircleQuestionMark`, not `CircleHelp`.
- **Size:** 16 px with a 1.75 stroke on work surfaces, 20 px in empty states and phone bars, and 12–14 px with a 2 stroke inside badges.
- **Colour:** `currentColor`. Icons are muted by default, and foreground when hovered, active or selected. Status icons use the tone's mark colour, and icons inside primary buttons are white.
- Pair icons with a label by default. Use icon-only buttons just for universal actions (close, more, search, add, back, copy, expand), and always give them an `aria-label` and a tooltip.

One icon per concept:

| Concept | Icon |
|---|---|
| Home | `House` |
| Needs you | `Inbox` |
| Project | `FolderKanban` |
| Search | `Search` |
| New | `Plus` |
| Filter / Sort / Group | `ListFilter` / `ArrowUpDown` / `Rows3` |
| More | `Ellipsis` |
| Close / Back | `X` / `ArrowLeft` |
| Opens outside CraftHQ | `ArrowUpRight` |
| Copy | `Copy` |
| Expand the panel | `Maximize2` |
| Toggle the sidebar | `PanelLeft` |
| Settings | `Settings` |
| Connections | `Plug` |
| Question | `MessageCircleQuestionMark` |
| Pull request / Merged | `GitPullRequest` / `GitMerge` |
| Passed / Failed | `CircleCheck` / `CircleX` |
| Needs attention | `CircleExclamationPoint` |
| Robot working | `LoaderCircle` |
| Draft / Queued / Closed | `CircleDashed` / `Circle` / `CircleSlash` |
| Requirement | `FileText` |
| Information | `Info` |
| Drag handle | `GripVertical` |
| Locked | `Lock` |
| Help | `CircleQuestionMark` |
| Star | `Star` |

- **Custom icons:** only when lucide has nothing suitable. Draw them on a 24-unit grid with round caps and joins and a matching stroke.
- **Outside services:** use the official logo from each company's brand guidelines, unmodified, at 20–24 px. Never redraw or recolour a logo, and never use one as decoration.
- **The CraftHQ mark** (`CraftHQLogo`) appears once in the app, at the top of the sidebar. Robot avatars are covered in §7.13.

### 3.7 Motion

Tokens (all *new*):

| Token | Value | Use |
|---|---|---|
| `--duration-instant` | 100 ms | hover, press, colour changes |
| `--duration-fast` | 150 ms | fades, tooltips, exits |
| `--duration-base` | 200 ms | menus, popovers, toasts, list inserts |
| `--duration-slow` | 300 ms | modals, panels, sheets |
| `--duration-playful` | 450 ms | robot moments only |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | things entering |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | things leaving |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | things moving across the screen |
| `--ease-plush` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | robots only (it overshoots) |

| Element | Enter | Exit |
|---|---|---|
| Menu, popover | fade, a 4 px slide from the trigger and scale 0.98 → 1; 200 ms, ease-out | fade; 150 ms, ease-in |
| Tooltip | fade, 150 ms, after a 500 ms delay | fade, 100 ms |
| Modal | fade and scale 0.98 → 1, 200 ms; the scrim fades in over 200 ms | 150 ms |
| Panel, sheet | slides in from its edge; 300 ms, ease-out | 200 ms, ease-in |
| Toast | slides up 8 px and fades in, 200 ms | fade, 150 ms |
| Row insert, remove, reorder | height and fade (framer-motion `layout`), 200 ms | 150 ms |
| Status change | the icon cross-fades in 150 ms; the row highlight fades over 600 ms | — |

Rules:
- Exits are faster than entrances.
- Animate `transform` and `opacity`, and use framer-motion `layout` for list changes. Don't animate width, height, top or left directly.
- Only robots bounce (`--ease-plush`). Interface motion never overshoots.
- Nothing loops on a work surface except the working indicator in the panel and in the Home "Working now" widget (§8.5), plus the skeleton pulse.
- Page content doesn't animate in when a page loads.
- **Reduced motion** (`prefers-reduced-motion: reduce`): movement becomes a fade of 150 ms or less, or nothing. Loops stop, and robot videos show their posters, as `RebusBot` already does.

---

## 4. App shell and navigation

### 4.1 Objects and vocabulary (Proposed)

A workspace contains projects. Projects contain tickets, tickets contain requirements, and each requirement has checks. A ticket can also have questions, a change and a pull request. People and robots are members of a workspace, and connections link it to outside services.

| Word in the UI | Means | Don't say |
|---|---|---|
| Workspace | a company's CraftHQ | instance, org, tenant |
| Project | one product or repository the robots work on | repo (in labels), board |
| Ticket | one piece of requested work | task, issue, job, story |
| Requirement | one testable statement in a ticket, with an ID | spec line, AC |
| Question | something the Asker needs a person to decide | blocker, clarification |
| Check | an independent test written from a requirement | eval, test case (in labels) |
| Pull request (PR) | the change handed to engineers | MR, patch, diff |
| Risk tier | UI-only, Logic or Core | severity, priority |
| Fitting | the one-time step where CraftHQ learns a repository's architecture, conventions and tests | onboarding, indexing, training |
| Ledger | a project's recorded rules | memory, knowledge base |
| Connection | a linked outside account | integration, plugin |
| Robot | the Asker, the Builder or the Checker | AI, bot, agent, model names |

### 4.2 Shell

```
┌──────────────┬───────────────────────────────────────────┬────────────────────┐
│ Sidebar 240  │ Content sheet                             │ Detail panel 560   │
│ (canvas)     │ ┌───────────────────────────────────────┐ │ (sheet)            │
│ ◉ Acme     ▾ │ │ ▣ Project name   [Share][New ticket]⋯ │ │ CHQ-142  ● Status  │
│ ⌕ Search  ⌘K │ │ List  Board  Calendar   Filter Sort ⋯ │ │ Ticket title       │
│ + New ticket │ │───────────────────────────────────────│ │                    │
│ Home         │ │ content                               │ │ evidence trail     │
│ Needs you  3 │ │                                       │ │                    │
│ Projects     │ │                                       │ │ comments           │
│ …            │ └───────────────────────────────────────┘ │ [composer]         │
└──────────────┴───────────────────────────────────────────┴────────────────────┘
```

There's no global top bar on desktop. The global actions (Search, New, Needs you) live in the sidebar.
**Why:** vertical space is the scarcest thing in list and board work, and this keeps the chrome to two rows. Below 1024 px a 48 px top app bar appears instead (§10).

### 4.3 Sidebar

Order, from top to bottom:
1. **Workspace switcher:** the CraftHQ mark, the workspace name and a chevron. Its menu holds workspace settings and the workspace switch.
2. **Search** (`⌘K`), drawn as a field.
3. **New ticket** (`C`), a secondary button with `Plus`.
4. **Home.**
5. **Needs you,** with an attention count badge when anything is waiting.
6. **My tickets** (Proposed): tickets you wrote or follow.
7. **Starred,** shown only when something is starred.
8. **Projects:** a section header with `+`, then the projects you used most recently (up to 10, each shown as a colour square and a name), then **All projects**. The section collapses.
9. **Pinned at the bottom:** Connections, Settings, Help, and your avatar. The avatar menu holds profile, preferences, keyboard shortcuts and sign out.

Spec:
- **Items:** 32 px, `rounded-lg`, 8 px padding, a muted 16 px icon, an 8 px gap, label in `text-sm font-medium`.
- **Section headers:** `text-xs font-medium text-muted-foreground`, with a chevron.
- **States:** hover is `bg-hover`; the current item is `bg-pressed` with foreground text.
- **Scrolling:** the middle scrolls, and the top and bottom groups stay put.
- **Counts:** muted `text-xs` numbers. Only Needs you uses the attention badge.
- **Reordering:** starred items and projects reorder by drag, and also with "Move up" and "Move down" in their ⋯ menu.
- **Collapse:** `[` or the `PanelLeft` button toggles a 56 px rail of icons with tooltips, where Needs you shows a dot. The choice is remembered per person.
- **Keep it short:** no more than seven items above Projects. Don't add a top-level item without updating this document.

### 4.4 Workspaces and projects

- The workspace name is always visible at the top of the sidebar. Switching workspace reloads everything in the new context and lands on its Home.
- Switch projects from the sidebar or from `⌘K`, where recent projects come first.
- A new project takes the next unused categorical colour, shown as a 16 px rounded square.
- Teams (Proposed, later): if a workspace needs teams, they become a sidebar section above Projects, like Starred.

### 4.5 Page header

- **Row 1, the title row (48 px):** the project's colour square and its name (`text-xl font-semibold`, editable in place). On the right: a facepile of members (people as circles, robots as rounded squares), Share, the page's primary action (such as New ticket) and More (⋯).
- **Row 2, tabs and view controls (40 px):** view tabs on the left (List, Board, Calendar, Timeline, Dashboard, offering only the views that fit the data). On the right: Filter, Sort, Group, Display (⋯, for columns and density) and search-in-view (`Search`, which expands into a field).
- **Filter chips:** active filters add a 32 px chip bar under row 2 until they're cleared.
- The header stays fixed while the content scrolls, and it holds at most one primary button.

### 4.6 Main content

- Lists, boards, calendars and timelines use the full width of the sheet.
- Reading pages, such as a ticket opened full page, center a column of `max-w-3xl`.
- Settings pages have a 200 px subnav on the left (`w-50`) and forms of `max-w-2xl`.
- Scrolling happens inside the content sheet, not the window, so the sidebar and the header stay put.

### 4.7 Detail panel

**Use when:** viewing or editing one item while keeping the list in view.
**Don't use when:** a multi-step setup (use a modal), comparing two items (use the full page), or settings (use a page).

Behaviour:
- It opens on a click, or on Enter when a row or card has focus. The open row shows `bg-pressed`.
- The URL updates (for example `?ticket=CHQ-142`, or a nested route), so reloading, sharing and Back all reopen the same state.
- Esc or ✕ closes it and returns focus to the row. With the panel open, `J` and `K` move to the next or previous ticket in the current view's order.
- It's resizable from its left edge, from 440 to 760 px, and the width is remembered. Expand (`Maximize2`) opens the full page.
- Its placement depends on the window width:
  - 1536 px and wider: it docks beside the list, and the list narrows.
  - 1024 to 1535 px: it floats over the right side of the list with `shadow-overlay` and no scrim, and the list stays usable.
  - Below 1024 px: it goes full screen, with Back.
- It isn't modal, so focus isn't trapped inside it. `F6` moves between the sidebar, the content and the panel (Proposed).

Anatomy, from top to bottom:
1. **Bar (48 px):** the ticket ID (mono; click to copy) and the status pill. On the right: Copy link, Expand, More, Close.
2. **Title:** `text-xl font-semibold`, editable in place, wraps. When it scrolls out of view, the bar shows it instead.
3. **Needs-you callout,** when the person viewing has something to do: an attention tint that says exactly what's needed and offers the action ("Answer 2 questions", "Review pull request"). When the ticket is waiting on someone else, a neutral line says who it's waiting for.
4. **Pipeline strip:** Asker → Builder → Checker → Review → Merged (§7.17).
5. **Properties:** two columns. Each label is 120 px wide in muted `text-sm`; each value is `text-sm` and editable on click. The properties are Status, Project, Requested by, Risk tier, Labels, Created and Updated.
6. **Description:** `text-base`, editable in place.
7. **Evidence trail** (§6.2).
8. **Activity and comments,** with the composer pinned to the bottom (`⌘Enter` sends).

### 4.8 URLs and state

- Every view, filter set, sort order and open item has a URL. Copy link copies exactly what you're looking at.
- Your changes to a view (filters, sort, grouping, columns, density) are saved just for you, on top of that view's shared default (§6.3).
- Unsent comments and answers are kept per ticket until they're sent or discarded.

---

## 5. Views

### 5.1 List, the default view for tickets

**Use when:** scanning, sorting and editing many tickets. It's the default view.
**Don't use when:** the question is about flow across stages (use the board) or about dates (use the calendar or timeline).

Anatomy:
- **Column header (32 px, sticky):** muted `text-xs font-medium` labels. Sortable columns show `ArrowUpDown` on hover and the sort direction when active.
- **Group header (32 px):** a chevron, the group name, a count, and `+` on hover. Lists group by stage by default.
- **Row (36 px),** from left to right:
  - a checkbox, shown on hover, on focus, or whenever any row is selected
  - the status icon
  - the ID, in muted mono `text-xs`
  - the title, which fills the space and truncates
  - labels
  - the risk tag
  - the robot's or person's avatar
  - the time it was updated, in muted `text-xs`, right-aligned

  People choose the columns in Display.
- **Add row** at the end of each group: `+ New ticket`.

Behaviour:
- A click or Enter opens the panel. A right-click opens the same menu as ⋯.
- **Inline add:** type a title and press Enter to create the ticket and start a new blank row. Esc on an empty row cancels.
- **Manual order:** a drag handle (`GripVertical`) appears on hover, but only when the sort is Manual.
- **Live updates:** robot updates change rows in place with a 600 ms highlight. A row never moves while it's under the pointer or has keyboard focus. If an update would re-sort it, it moves when the pointer leaves the list.
- **Filters:** the open item stays visible until the panel closes, even if an edit means it no longer matches the filters.
- **Finished work** (Proposed): Merged and Closed tickets older than 14 days are hidden by default. Display → Show all brings them back.
- **Collapsed groups** stay collapsed until you open them again.
- **Keyboard:** ↑/↓ or `J`/`K` move, Enter opens, `X` selects, Shift with ↑/↓ extends the selection, `⌘A` selects everything in the view, and Esc clears.
- **Empty:** empty groups are hidden by default (Display → Show empty groups). For an empty view, see §6.7.
- **Loading:** 8 skeleton rows with the same columns.
- **Phone:** two-line rows (the title, then status, ID and avatar), with no columns.

### 5.2 Board

**Use when:** seeing how work flows through the stages, with up to about 50 cards per column.
**Don't use when:** comparing many fields (use a list or table), or when the grouping field has more than 8 values.

Anatomy:
- **Columns:** 288 px wide (`w-72`) with a 12 px gap and no fill. Each has a sticky header with its name, a count, `+` (if people may add cards there) and ⋯.
- **Card:** `bg-card`, a hairline border, `rounded-xl`, 12 px padding, and an 8 px gap between cards.
  - Top line: the ID and the risk tag (`text-xs`).
  - Title: `text-sm`, two lines at most.
  - Footer, with no more than four items: labels, the avatar (with its working ring), the checks summary ("11/12" with a tone icon), and the count of open questions (attention).
- **Hover:** `border-border-strong` with `shadow-raised`.

Behaviour:
- **Dragging cards:** people can drag a card into a column only when they're allowed to set that stage, such as Closed. The stages CraftHQ sets itself (Asking, Building, Checking, Merged) aren't drop targets: they dim and show a not-allowed cursor.
  **Why:** robots own their stages, so nobody can drag a card to "Merged" and fake progress.
- **Collapsing:** a column collapses to a 40 px strip showing its name vertically and its count, and stays collapsed until you open it again.
- **Scrolling:** the board scrolls horizontally. Shift with the mouse wheel scrolls sideways, and dragging near an edge scrolls automatically.
- **Phone:** one column per screen (85% of the width) with snapping, and a column switcher at the top.

### 5.3 Calendar

**Use when:** items have a date that people set, such as a target date or a release.
**Don't use when:** showing when robots did things (use Activity), or items without dates.

- **Month and week views,** month by default. Today's date number sits in an inverse circle, not a blue one, and weekend day numbers are muted.
- **Cells:** up to three chips, then "+N more". A chip is a 20 px `text-xs` line: status icon, title (truncated), project colour dot.
- **Unscheduled:** a drawer on the right holds items without a date. Drag one onto a day to set its date, or use "Set date…" in its menu.
- **Adding:** click an empty part of a day to add a ticket with that date. Weekends can be hidden (Display).
- **Keyboard:** the arrow keys move between days, and Enter opens that day's list.
- **Phone:** an agenda list, grouped by day.

### 5.4 Timeline (Proposed, later)

**Use when:** planned work with start dates, end dates and dependencies.
**Don't use when:** items lack dates, or there are fewer than about five of them (use a list).

- **Names:** a list on the left, scrolling in step with the chart.
- **Bars:** 24 px tall, `rounded-md`, neutral (`bg-field`), with the status icon. A selected bar is `bg-selected`.
- **Today:** a 1 px `--text` line labelled "Today". Zoom levels are weeks, months and quarters.
- **Dependencies:** 1 px muted lines with arrowheads. A conflicting dependency turns the line negative.
- **Milestones:** 12 px diamonds.
- **Editing:** drag a bar to move it, or drag its edges to resize it. Both also work from the item's menu ("Change dates…").
- **Unscheduled:** a tray on the right, as on the calendar.
- **Phone:** not offered. Show a list sorted by date, with a note.

### 5.5 Tables

For settings, admin lists, connections and the detail tables on dashboards.

**Use when:** comparing several fields across many rows.
**Don't use when:** there are fewer than about five rows (use a list), or the content is narrative (use cards).

- **Header row:** 32 px, muted `text-xs font-medium` in sentence case, with a `border-border-strong` rule underneath.
- **Rows:** 36 px with 12 px cell padding and a hairline between rows. No zebra stripes.
- **Alignment:** text and dates on the left, numbers on the right with `tabular-nums`. Statuses show as pills, and actions sit in a final ⋯ column.
- **Sorting:** click a header to cycle through ascending, descending and none.
- **Wide tables:** the first column stays put when scrolling sideways.
- **Long tables:** with more than about 100 rows in a work view, virtualise the rows. Numbered pages are only for audit and admin tables.
- **Selection:** a checkbox column (§6.10).
- **Phone:** horizontal scrolling with the first column fixed, or a stacked card per row when there are four fields or fewer.

### 5.6 Dashboard and Home

The dashboard area owns these screens; these are the shared patterns.

The purpose is to answer three questions within five seconds: what needs me, what's moving and what shipped.

- **Grid:** 12 columns with a 16 px gap (24 px at 1280 px and wider). Order: Needs you, Working now, Recently merged, Project health.
- **Widget:** `bg-card`, a hairline border, `rounded-xl`, 16 px padding, no shadow. The header has the title (`text-sm font-semibold`), an optional "View all" and ⋯. Each widget loads on its own, with its own skeleton and its own error state.
- **KPI tile:**
  - a label in muted `text-xs`
  - the value in `text-3xl font-medium`
  - the change: an arrow icon with text, in the positive or negative ink only when "up" has an agreed meaning, and neutral otherwise
  - an optional sparkline

  Never colour the value. No more than six tiles.
- **Charts:** follow §3.1 Charts. Each chart's title names the one question it answers ("Checks passing, last 30 days").
- **New workspace:** the first-use state is a setup checklist with the Builder: Connect your accounts, Connect a repository, Write your first ticket. The first step opens `ConnectAccountsModal`.

**Don't:** use decorative charts or auto-rotating content, use more than one chart type for the same question, or show numbers without a unit or a time range.

---

## 6. Workflows and patterns

### 6.1 Creating a ticket

**Entry points:** New ticket in the sidebar (`C` from anywhere), the primary action in the page header, `+ New ticket` at the end of a list group or board column, and "New ticket" in `⌘K`.

- **Quick-create modal** (`max-w-xl`):
  - **Fields:** Title (required), Description (`text-base`, grows as you type), Project (defaults to the current one), Labels (optional).
  - **Footer:** a "Create more" toggle that keeps the modal open, then Cancel and **Create ticket** (`⌘Enter`).
- **Defaults come from context:** the current project, the group or column the ticket was started from (if people may set it), or the calendar day.
- **Inline create** in a list takes a title only. Enter creates the ticket and starts the next row. An empty new row disappears when you leave it. Pasting several lines creates one ticket per line (Proposed).
- **After creating,** a toast says "CHQ-142 created" with **Open**.
- **Validation:** only the title is required. Errors appear next to the field when the form is submitted, and nothing typed is ever lost.

**Don't:** use a wizard, require more than the title, or open a full page just to create a ticket.

### 6.2 Ticket details: the evidence trail

The panel and the ticket page show the work in the order it happens, so the proof always sits above any approval:

1. **Requirements:** one row each, with the ID chip, the statement, a result icon (passed, failed or not run) and the number of checks.
2. **Questions** from the Asker: one card each.
   - Each card shows the Asker's avatar, the question (`text-base`), the options if the Asker offered any (as a radio list), an answer field and **Send answer**.
   - An unanswered question shows an attention mark and "Needs your answer".
   - An answered question collapses to the answer, who gave it and when. It can be reopened.
3. **Change:** the Builder's status, the branch (mono) and the elapsed time while building.
4. **Checks:** a summary line ("11 passed · 1 failed"), then the checks grouped by requirement ID, failed ones first. Each shows its result, its duration and "View log".
5. **Pull request:** the title, the repository and branch (mono), the risk tier tag, the state (Open, Approved, Merged or Closed) and **Review on GitHub** (`ArrowUpRight`; opens a new tab).
6. **Activity:** robot events as compact one-line entries (muted `text-xs` with a small robot avatar), and people's comments as full entries. A toggle switches to "Comments only".

Any approve, merge or "mark done" control sits next to the checks summary and the risk tier (§2.2).

### 6.3 Filter, sort, group and saved views

- **Filter:** the Filter button opens a popover.
  - Quick filters sit at the top: Needs me, Mine, Failed checks, Updated this week.
  - Below them, "Add filter" builds a filter from a field, a condition and a value.
  - Active filters appear as chips under the header, the button shows a count, and "Clear" removes them all.
- **Sort:** one field and a direction, chosen from a menu. "Manual" is offered where drag ordering exists.
- **Group:** by one field. Groups collapse, and empty groups are hidden by default.
- **Persistence:** every view has a shared default. Your own changes to its filters, sort, grouping and columns are saved just for you, on the server. Changing the default for everyone is a separate, deliberate action ("Save as default for everyone"). Filters are also in the URL, so a link shows the same thing.
  **Why:** a shared default keeps a team looking at the same thing, and personal changes stop people fighting over it.
- **Saved views** (Proposed): "Save as view" adds a named tab.
- **Reset:** Display → Reset view returns you to the shared default.
- **No results:** "No tickets match these filters", with **Clear filters**.

**Don't:** put filter controls inside column headers (filters live in one place), or silently hide the item that's open.

### 6.4 Search and the command palette

- **Opening it:** `⌘K` or `Ctrl K` opens the palette (`max-w-2xl`, 20% from the top, `shadow-overlay`, with the scrim). `/` focuses search-in-view instead.
- **Before typing:** it shows recent items and common actions.
- **While typing:** results are grouped as Tickets, Projects, People and robots, and Actions (New ticket, Connect GitHub, Settings…).
- **Result rows (40 px):** an icon or avatar, the title with the matching text in `font-semibold`, muted meta (project · ID), and ↵ or a shortcut on the right.
- **IDs:** typing an exact ticket ID puts that ticket first.
- **Keys:** ↑/↓ move, Enter opens, `⌘Enter` opens in a new tab, Esc closes.
- **Speed:** results arrive within about 150 ms of a pause in typing, with skeleton rows after 300 ms.
- **No results:** "No results for "…"", with suggestions: check the spelling, or try a ticket ID.

Search-in-view filters the current list as you type. It's separate from global search.

### 6.5 Notifications

Pick the channel by what the person has to do:

| Channel | For | Lasts | Example |
|---|---|---|---|
| Needs you | anything that's blocked until a person acts | until it's done or archived | "Asker has 2 questions on CHQ-142" · "PR ready for review" · "GitHub connection expired" |
| Toast | the result of your own action | 5 s by default (errors 8 s), paused on hover or focus; Preferences can make toasts last 10 s or stay until dismissed | "Ticket closed · Undo" |
| Banner | a state of the page or workspace that persists | until it's resolved | "Claude isn't connected, so robots can't start work. · Connect Claude" |
| Inline message | feedback on one field or section | until it's fixed | a field error; a section that failed to load |
| Modal | a decision needed before going on | until it's answered | "Disconnect GitHub?" |
| Badge | a count | live | Needs you 3 |
| Browser notification | Needs you items only, and only if people opt in | — | — |

Rules:
- Robot events never show as toasts, because toasts interrupt. They update in place, and they go to Needs you only when a person must act.
- One toast at a time; the rest queue.
- One banner per page. Negative beats attention, which beats neutral.

**Needs you items:**
- Each item shows the avatar, a summary (`text-sm`, with the ticket title in medium), the project, the time, and one inline action (Answer, Review or Reconnect). Archive appears on hover (`E`).
- Items are grouped by ticket, newest first.
- Unread items have a 6 px foreground dot and a medium-weight title.
- "Archive all" offers Undo.

**Toasts:**
- Inverse surface, `rounded-xl`, at most `w-90`.
- They sit at the bottom left of the content sheet, 24 px in, so they never cover the sidebar. On phones they sit at the bottom, full width, above the safe area.
- `text-sm`, with one action (`font-medium`, underlined on hover) and ✕.
- They use `role="status"`, and errors use `role="alert"`.

### 6.6 Connections

Follow this pattern in onboarding, in Settings → Connections and in `ConnectAccountsModal`.

- **Row:** the official logo (24 px), the name (`text-sm font-semibold`) with one muted line on what CraftHQ does with it, the status, and the action.
- **States:**

| State | Shows | Action |
|---|---|---|
| Not connected | "Not connected", muted (plus "Required" when it's needed) | **Connect**: primary for the next required one, secondary otherwise |
| Connecting | a spinner and "Waiting for GitHub…" | Cancel |
| Connected | a positive check and "Connected as @name" | ⋯ → Manage, Disconnect |
| Needs attention | an attention icon and the reason ("Access expired", "Missing repository access") | **Reconnect** |
| Failed | a negative inline message: what happened and what to do next | Try again |

- **Order:** required connections first, then optional ones. Show progress in words ("1 of 2 required connected").
- **Before connecting,** say in up to three plain bullets what CraftHQ will be able to do, with a link to the details.
- **OAuth:** open the provider in a popup (or redirect, on phones).
  - If the popup is blocked, show "Open GitHub sign-in" as a link.
  - Cancelling or failing returns to Not connected with an inline message. It's never a dead end.
- **Sign in, then paste a code** (how Claude connects):
  - **Sign in with Claude** opens the provider's page in a new tab. The row then shows a code field, "Paste the code from Claude's sign-in page", in mono with pasting allowed, and **Connect**. Enter also submits.
  - The code is the one the provider's page shows after the person signs in. Never ask for a sign-in code from an email: that belongs on the provider's own page, and asking for it looks like phishing.
  - A wrong code says "That code didn't work. Check it, or sign in again to get a new one." An expired code says "That code has expired. Sign in again to get a new one." Both offer **Sign in again**.
- **Keys,** if a service uses one:
  - Use a password-style mono field, and allow pasting.
  - After saving, show only the last four characters ("•••• 9fA2"), with **Replace key**.
  - Validate the key on save, and give a specific error if it fails.
  - Never show the full key again, and never put it in logs, URLs or analytics.
- **Disconnect:** a confirm modal that names the consequence ("Robots will stop opening pull requests in this workspace").
- **The modal:**
  - It takes `open` and `onClose`, and can be closed at any time. Finished connections stay connected.
  - A scrim click closes it only when nothing is in progress.
  - Width: `max-w-xl`, or `max-w-3xl` for more than four services.
  - Footer (Proposed): "Do this later", then **Done**, which becomes available once the required connections are made.

### 6.7 Empty states

| Type | When | Shows |
|---|---|---|
| First use | nothing here yet | a robot render (96 px, on its `--bot-*-bg` backdrop), a title, one sentence, one primary action |
| All clear | a queue is empty because the work is done | a small robot render (64 px), a title, a sentence, no action |
| No results | filters or search hide everything | a muted 20 px `Search` or `ListFilter` icon, a title, **Clear filters** |
| Blocked | a prerequisite is missing | an icon, what's missing and why, and the action (**Connect Claude**) |
| No access | permissions | `Lock`, and who can give access |
| Error | loading failed | see §6.9 |

Examples:
- **First use:** "No tickets yet" / "Write a ticket the way you usually do. The Asker reads it first and asks about anything that's unclear." / **New ticket**
- **All clear, on Needs you:** "Nothing needs you" / "The robots will ask here when they need you."

Rules:
- Centre the empty state in its area, at most 360 px wide (`max-w-90`).
- Never leave a dead end, and never show fake data.
- Robot renders appear only in first-use and all-clear states. Today, only the Builder has a render (§15).

### 6.8 Loading

- **Under 300 ms:** show nothing new, and keep the previous content on screen.
- **Over 300 ms:** show skeletons shaped like the final layout (`bg-field`, `rounded-md`, pulsing over 1.5 s, and static with reduced motion).
- **Buttons that are waiting:** a spinner replaces the leading icon, the width stays the same, the button is disabled, and it has `aria-busy="true"`.
- **Edits are optimistic:** apply them straight away. If one fails, roll it back and show a toast with **Retry**.
- **Robot work** takes minutes or hours, so it's a status, not loading. Show the stage and the elapsed time ("Building · 4m"), and the steps when they're known. No spinner may run unlabelled for more than 10 seconds.
- **The shell** (sidebar and header) never disappears; content streams in.
- **Revisits** (Proposed) show the last data straight away from a local cache, then refresh it in place.

**Don't:** use full-page spinners, block the screen with an overlay for non-destructive actions, or show skeletons for things that load in under 300 ms.

### 6.9 Errors and offline

- **Field:** a message under the field (`text-sm`, danger ink, `CircleExclamationPoint`), linked with `aria-describedby`. On submit, focus moves to the first invalid field.
- **Section:** "Couldn't load checks." with **Retry**, inside that section. The rest of the page keeps working.
- **Page:** a message with **Retry** and "Go to Home", inside the content sheet. The shell stays.
- **Offline:** a banner saying "You're offline. Changes will sync when you're back." Actions that need the server are disabled, with a tooltip saying why.
- **Robot failures** are product states, not errors. Show the status (Failed), what failed and the next step ("Retry build", "Edit requirement").
- **Technical detail,** such as error codes and request IDs, goes in a "Details" disclosure with **Copy details**, never in the headline.

### 6.10 Selecting many

- The checkbox appears on a row or card on hover and on focus, and on every row once one is selected.
- **Keys:** `X` toggles the focused row, Shift-click selects a range, `⌘`- or `Ctrl`-click toggles one, `⌘A` selects everything in the view, and Esc clears.
- **Selected items** are `bg-selected` with a checked blue checkbox.
- **Bulk bar:** a floating bar appears at the bottom centre (`shadow-popover`, `rounded-xl`): "3 selected", then Status, Labels, Move, Close, ⋯ and ✕.
- Reversible bulk actions give a toast with Undo. Destructive ones ask for confirmation, with the count ("Delete 3 tickets?").

### 6.11 Undo or confirm

| Action | Pattern |
|---|---|
| Reversible: move, relabel, close, archive, reorder | Do it straight away, with a toast offering **Undo**. |
| Hard to reverse, or affects outside systems: disconnect a service, cancel a running build, remove a person | A confirm modal. Its title names the action and the object ("Disconnect GitHub?"), one sentence gives the consequence, and the buttons are **Cancel** and a danger button with the same verb. |
| Permanent and large: delete a project or a workspace | A confirm modal, and the person types the name to enable the button. |

**Never:** use "Are you sure?" as a title, or ask for confirmation when Undo could handle it.

### 6.12 Drag and drop

- **What you grab:** in lists, a `GripVertical` handle that appears on hover; on boards, the whole card. The cursor shows `grab`, then `grabbing`.
- **Lifted item:** `shadow-drag` and scale 1.02, with no rotation. Its old place holds a `bg-field` placeholder of the same height.
- **Drop indicator:** a 2 px blue line with a 6 px circle at its start. Invalid targets dim and show a not-allowed cursor.
- **Auto-scroll:** within 48 px of an edge.
- **Without dragging:** every drag has a menu alternative ("Move to…", "Move up", "Move down", "Set date…").
- **Screen readers:** announce the result ("Moved CHQ-142 to Closed").

### 6.13 Inline editing and autosave

- **Click to edit:** editable text shows `bg-hover` and a text cursor on hover.
- **Single line:** Enter saves, Esc reverts, and leaving the field saves.
- **Multiple lines:** `⌘Enter` saves and Esc reverts.
- **Saving:** changes save automatically. Show "Saving…" then "Saved" in the panel bar only when saving takes more than a second.
- **Conflicts** (Proposed): if someone else changed the same field in the meantime, show both versions and let the person choose.
- **Explicit Save:** use Save and Cancel buttons only for forms whose fields must apply together, such as a settings section or a connection's setup.

### 6.14 Forms

- **Layout:** one column, with labels above the fields. Page forms are `max-w-2xl`.
- **Groups:** related fields sit under a `text-sm font-semibold` heading, with 24 px between groups.
- **Optional fields:** mark them "(optional)", and don't mark the required ones.
- **Buttons:** in modals, at the bottom right (Cancel, then the primary). In page forms, the primary sits at the bottom left, under the fields.
- **Browser behaviour:** use the browser's `autocomplete` values, and never block pasting.

---

## 7. Components

These are the shared building blocks. Where they live, and who owns them, is decision 5 in §15.

### 7.1 Button

| Variant | Look | Use |
|---|---|---|
| Primary | `bg-primary` with white text; hover `bg-primary-strong` | the one main action in a view or modal |
| Secondary | `bg-field` with foreground text; hover `bg-field-hover` | most actions |
| Ghost | transparent with muted text; hover `bg-hover` with foreground text | toolbars, low-emphasis actions |
| Danger | `bg-danger` with white text; hover `bg-danger-hover` (*new*, `#991b1b`) | only the confirming button in a destructive confirm modal |
| Link | `text-primary-strong`, underlined on hover | navigation inside text |

- **Sizes:** sm 28 px (`px-2.5`), md 32 px (`px-3`), lg 40 px (`px-4`). Text is `text-sm font-medium`, with a 16 px icon and `gap-1.5`, and the shape is `rounded-lg`. On brand surfaces, buttons are 44 px pills, as on the login page.
- **States:**
  - hover
  - pressed: `translate-y-px`, as on the login page
  - focus-visible: the focus outline
  - disabled: `opacity-50` and no hover, with a tooltip or helper text saying why
  - loading: see §6.8
- **Rules:**
  - One primary per view.
  - The label is a verb plus an object.
  - A button that opens a menu ends with `ChevronDown`.
  - Full width only on phones and on brand surfaces.

**Don't:** put two primary buttons side by side, make secondary buttons blue, use a button to navigate (use a link), or disable a button without explaining why.

### 7.2 Icon button

A 24, 28 or 32 px square in the ghost style, with a 16 px icon. An `aria-label` is required, and the tooltip shows the label and the shortcut. Toggle buttons use `aria-pressed` and show `bg-pressed` when on.

### 7.3 Text field and text area

- **Look:** fields are filled, which is CraftHQ's signature.
  - `bg-field` with no border, `rounded-lg`, 32 px tall (md) or 28 px (sm), with `px-3`.
  - Text is `text-sm`, or `text-base` on touch screens (`pointer-coarse:text-base`) so iOS doesn't zoom in.
- **Hover:** `bg-field-hover`.
- **Focus:** a white fill, a 1.5 px `--focus` ring and a 4 px `--focus-ring` halo: the login field's focus, scaled down.
- **Label and help text:** the label sits above the field (`text-sm font-medium`, with a 6 px gap) and help text below it (muted `text-sm`). An error replaces the help text.
- **Placeholder:** an example, never the label. App forms always show labels; only the login page hides them.
- **Text area:** starts at 3 lines, grows to 12, then scrolls.
- **Disabled:** `text-faint`, with no hover. **Read-only:** no fill, and the text can still be selected.
- **Validation:** validate on submit, then live while the person fixes the problem. Don't flag an empty field the moment someone tabs past it.
- **Contrast:** field edges are soft by design (the fill isn't 3:1). The visible label and the 4.5:1 focus ring identify the field.

**Don't:** use outlined fields, floating labels, or a placeholder as the label.

### 7.4 Select, combobox and pickers

- **Select,** for up to about 7 options: a field-style trigger with `ChevronDown` that opens a listbox.
- **Combobox,** for more options or remote data: type to filter, then ↑/↓ and Enter. It shows "No matches", and "Create '…'" where creating is allowed.
- **Multi-select:** chips sit inside the field and Backspace removes the last one. Show three chips, then "+2".
- **Date picker:** a popover with quick choices (Today, Tomorrow, Next week, No date) above a month grid. Typed dates are accepted, and the week starts according to the locale.
- **People picker:** avatar, name and email, with you listed first.

**Don't:** use a select for two or three options that would fit as a segmented control or radio buttons.

### 7.5 Checkbox, radio and switch

- **Checkbox:** 16 px, `rounded-sm`, with a 1.5 px `--faint` outline (3.3:1). When checked or indeterminate: `bg-primary` with a white `Check` or dash.
- **Radio:** a 16 px circle. When selected: `bg-primary` with a white 6 px dot.
- **Switch:** 32 × 18 px with a 14 px thumb. Off is a `--faint` track; on is `bg-primary`.
- **Labels** sit to the right in `text-sm`, with an 8 px gap. The label is clickable, and the hit area is at least 24 px.

Use a switch for a setting that takes effect straight away, and a checkbox for a choice saved with a form.

### 7.6 Menu (dropdown and context menu)

- **Container:** `bg-card`, `rounded-xl`, `shadow-popover`, 4 px padding, 180–320 px wide, at most 60vh tall (then it scrolls).
- **Items (32 px):** `rounded-lg`, 8 px padding, a muted 16 px icon, the label in `text-sm`, and a shortcut hint (Kbd) or `ChevronRight` on the right.
  - The hover and keyboard highlight is `bg-hover`.
  - Menus where you pick an option keep a 16 px check column on the left.
- **Groups** are split by a hairline with 4 px of space, and can have a muted `text-xs` label.
- **Destructive items** go last, after a divider, in danger ink with their icon.
- **Keys:**
  - ↑/↓ and Home/End move.
  - Typing a letter jumps to the matching item.
  - Enter or Space chooses.
  - → opens a submenu; ← or Esc closes it.
  - Tab closes the menu and moves on.
  - A menu opened from the keyboard highlights its first item.
- **Placement:** below the trigger, aligned to its start, with a 4 px gap. The menu flips when there's no room.
- **Right-click menus** for an object have the same items as its ⋯ menu. No action exists only in a right-click menu.

**Don't:** put more than about 12 items in a menu, nest submenus more than one level, or use a menu as navigation.

### 7.7 Popover

Interactive content anchored to a trigger, such as the filter builder, the date picker or the people picker. It uses the menu's container, with 12–16 px padding. Focus moves into it. Esc or a click outside closes it, and focus returns to the trigger.

### 7.8 Tooltip

- **Look:** inverse (`bg-inverse`, `text-on-inverse`, `text-xs`), `rounded-md`, with 4 × 8 px padding. It shows the label and the shortcut.
- **Timing:** it appears after 500 ms on hover, and straight away on keyboard focus.
- **Limits:** a tooltip is never interactive, never the only place important information lives, and isn't used on touch screens.

### 7.9 Modal (dialog)

**Use when:** a short, focused task or decision has to be finished or dismissed before going on: quick create, connecting accounts, confirmations.
**Don't use when:** people need to see it while they work (use the panel), for long settings (use a page), or from inside another modal. Never stack modals; switch steps inside one modal instead.

| Size | Class | Use |
|---|---|---|
| Confirm | `max-w-sm` (384 px) | confirmations |
| Form | `max-w-xl` (576 px) | quick create, connect accounts |
| Wide | `max-w-3xl` (768 px) | two-column content, many services |
| Palette | `max-w-2xl` (672 px) | `⌘K` |

**Anatomy:**
- **Header:** the title (`text-base font-semibold`), an optional muted description, and ✕.
- **Body:** 24 px padding; it scrolls inside the modal.
- **Footer:** 16 × 24 px padding, with the buttons on the right: Cancel, then the primary. A hairline sits above the footer only when the body scrolls.

**Behaviour:**
- It's centred on a scrim.
- Focus goes to the first field, or to Cancel in a confirmation.
- Esc closes it, asking first if typed content would be lost. A scrim click closes it only if nothing would be lost.
- Focus returns to the trigger when it closes, and the page behind doesn't scroll.
- It's labelled by its title (`aria-labelledby`).

**Motion and phones:** motion follows §3.7. On phones, a modal becomes a bottom sheet (full width, `rounded-2xl` top corners, at most 90dvh, with a fixed footer), or goes full screen for long forms.

**Implementation:** build it on the native `<dialog>` element with `showModal()`, which gives focus containment, Esc and the top layer for free, unless decision 4 in §15 picks a library. Props: `open` and `onClose`.

### 7.10 Panel and drawer

- **The detail panel** isn't modal (§4.7).
- **Drawers** are modal: they slide in from an edge, with a scrim and contained focus. They're used for the sidebar and for filters on phones.

### 7.11 Tabs and segmented control

- **View tabs** (header row 2): `text-sm font-medium`, muted, turning foreground for the current tab, which gets a 2 px foreground underline on the row's bottom edge. Extra tabs go under "More". ←/→ move between tabs, and Enter or Space opens one.
- **Segmented control,** for two to four modes such as Month and Week: a `bg-field` track, `rounded-lg`, with 2 px padding. The chosen segment is `bg-card` with `shadow-raised`.

**Don't:** use tabs for sequential steps, or show more than seven tabs.

### 7.12 Status, risk, IDs, labels and counts

**Status pill:** the tone's icon (12 px) and a label (`text-xs font-medium`) on the tone's tint, in the tone's ink. `rounded-full`, 20 px tall, `px-2`. In dense rows the status icon can stand on its own, because every status has a distinct shape, an accessible name and a tooltip with the label.

Ticket statuses (Proposed):

| Status | Tone | Icon | Means |
|---|---|---|---|
| Draft | Neutral | `CircleDashed` | written, not started |
| Asking | Active | `LoaderCircle` (with the Asker's avatar) | the Asker is reading the ticket |
| Needs input | Attention | `CircleExclamationPoint` | waiting for a person's answer or decision |
| Building | Active | `LoaderCircle` (with the Builder's avatar) | the Builder is writing the change |
| Checking | Active | `LoaderCircle` (with the Checker's avatar) | the Checker is testing against the requirements |
| In review | Attention | `GitPullRequest` | the pull request is waiting for an engineer |
| Merged | Positive | `GitMerge` | the change is merged |
| Failed | Negative | `CircleX` | a build or check failed and needs a decision |
| Closed | Neutral | `CircleSlash` | closed without merging |

Every new status must belong to one of the five tones. A status never says "you": what it means can't depend on who's looking. "Needs you" is the name of a person's own queue, not a status.

**Risk tier tag:** `text-xs font-medium`, `rounded-md`, 20 px tall. Emphasis comes from weight, not colour, so a risk tag never competes with a status:

| Tier | Look |
|---|---|
| UI-only | a hairline outline with muted text |
| Logic | `bg-field` with foreground text |
| Core | `bg-inverse` with white text |

Its tooltip explains how much review each tier needs.

**ID chip:** `font-mono text-xs`, `bg-field`, `rounded-md`, `px-1.5`. Clicking it copies the ID and shows a "Copied" tooltip. Formats such as `CHQ-142` are examples only.

**Labels:** an 8 px categorical dot and foreground `text-xs` text, `rounded-full`, on `bg-field`, 20 px tall.

**Count badge:** `text-xs font-medium tabular-nums`, at least 18 × 18 px, `rounded-full`, muted on `bg-field`. The Needs you count uses the attention tint and ink.

**Don't:** colour a status word without its icon, put more than three badges on a row, or make a badge act as a button.

### 7.13 Avatars

- **People** are circles: a photo, or two initials (`font-medium`, foreground) on `bg-pressed`.
- **Robots** are rounded squares (`rounded-robot`, 30%). At 24 px and up, the avatar is the plush render on its backdrop colour. Below 24 px, it's the backdrop colour with the robot's initial (A, B or C) in foreground.
  **Why shapes:** you can tell a person from a robot at a glance, whatever the colours, including if you're colour-blind.
- **Sizes:** 16, 20, 24, 32, 40, 64 and 96 px (`size-4` to `size-24`).
- **Working ring:** a 2 px ring in the robot's hue with a rotating gap (1.2 s, linear). It spins only in the open panel and in the Home "Working now" widget. Everywhere else, and with reduced motion, it's static.
- **Facepile:** up to four avatars, then "+N". They overlap by 4 px, with a 2 px `--card` ring.
- **Names:** an avatar always has the name nearby or in a tooltip. Its `alt` or `aria-label` is the name ("Builder").

### 7.14 Toast

See §6.5.

### 7.15 Banner and inline alert

- **Banner:** at the top of the content sheet, full width, at least 40 px tall. The tone's tint and icon, the message in foreground `text-sm`, an optional small secondary action, and ✕ if it can be dismissed.
- **Inline alert:** the same anatomy inside a form or section, `rounded-lg`, with 12 px padding. The login page's error block is the brand-scale version.

### 7.16 Card

- **Look:** `bg-card`, a hairline border, `rounded-xl`, with 12 px padding (board) or 16 px (dashboard).
- **Interactive cards:** hover shows `border-border-strong` with `shadow-raised`. The whole card is one link, and any other actions inside it are real buttons.

**Don't:** put cards inside cards, or give a shadow to a card that can't be clicked.

### 7.17 Progress

- **Spinner:** 16 px (12 px in badges, 20 px on its own), with a 1.5 px stroke turning every 0.8 s. It's white inside primary buttons. A spinner appears only inside the control that's waiting, or next to a label ("Connecting…").
- **Progress bar:** 4 px, `rounded-full`, with a `bg-field` track and a `bg-primary` fill. Determinate only, with a label ("3 of 5").
- **Pipeline strip:** Asker → Builder → Checker → Review → Merged, as five small steps. It shows where a ticket is and who holds it:
  - A finished step shows the robot's avatar with a positive check.
  - The current step shows the avatar with its working ring. Review shows the reviewer's avatar, or `GitPullRequest`.
  - A step still to come is muted.
- **Skeleton:** see §6.8.

### 7.18 Keyboard hint (Kbd)

`text-xs font-medium`, at least 18 × 18 px, `px-1`, `rounded-sm`, muted on `bg-field`. It shows ⌘ on a Mac and Ctrl elsewhere.

### 7.19 Divider

1 px of `border-border`. In toolbars, dividers are vertical and 16 px tall.

---

## 8. Interaction and micro-interactions

### 8.1 Keyboard

| Keys | What they do |
|---|---|
| `⌘K` / `Ctrl K` | command palette and search |
| `/` | search in this view |
| `C` | new ticket |
| `G` then `H` | go to Home |
| `G` then `N` | go to Needs you |
| `[` | collapse or expand the sidebar |
| `?` | show every shortcut |
| Esc | close the top layer; clear the selection |
| ↑ ↓ or `J` `K` | move through a list or board |
| Enter | open |
| `X` | select |
| Shift + ↑ ↓ | extend the selection |
| `⌘A` | select everything in the view |
| `E` | archive (in Needs you) |
| `J` / `K` with the panel open | next / previous ticket |
| `⌘Enter` | send a comment or answer; submit a modal |

Rules:
- Single-key shortcuts never fire while you're typing, and people can turn them off in Preferences (WCAG 2.1.4).
- Every shortcut has a visible control that does the same thing.
- Menus and tooltips show the shortcuts.
- Never override browser or operating-system shortcuts.

### 8.2 States every control defines

Default, hover (on pointer devices only), pressed, focus-visible, selected or checked (where it applies), disabled and loading. Hover and press change fills over 100 ms, not borders or shadows (cards are the exception).

### 8.3 Actions revealed on hover

Hover can reveal secondary actions on rows and cards (the checkbox, ⋯, the drag handle) only if those actions also:
- appear on keyboard focus (`focus-within`)
- are always visible on touch screens
- exist in the ⋯ menu

### 8.4 Live updates

Robots change things while people are watching:
- Update items in place, with a 600 ms highlight (`bg-hover`, fading out).
- Never move a row under the pointer or under focus, and never steal focus.
- Announce changes to screen readers (politely) only for the item that's open in the panel.

### 8.5 Robots at work

The working ring (§7.13), the status label and the elapsed time show that a robot is busy. Idle robots don't move. Video loops (`RebusBot`) are for brand surfaces only.

### 8.6 Moments of completion

- **When a pull request merges:** the status icon morphs into `GitMerge` (150 ms), and the row or card gets a 600 ms positive-tint highlight.
- **Celebration** (Proposed): at real milestones only (a project's first merged pull request, then its 10th, 50th and 100th), the Builder hops up from the bottom-right corner (`--ease-plush`, 1.2 s at most) and leaves again. It plays for whoever is looking at that project or at Home at the time.
  **Why milestones, not chance:** a celebration should mark something that actually happened. Random surprise rewards are Asana's mechanic, not ours.
  - It never covers anything you need to click (`pointer-events: none`).
  - It's off with reduced motion, and people can turn it off in Preferences.
  - It's ours: no borrowed creatures.
- **Sound:** none.

### 8.7 Response times

Show visible feedback within 100 ms of any input. Show progress for anything that takes more than a second. After 10 seconds, explain what's happening, and let the person leave and come back later.

---

## 9. Content and voice

### 9.1 Voice

Calm, precise and plain. Write like a senior engineer helping a colleague: be specific, be honest about uncertainty, and skip the hype. Robots report facts ("Checker ran 12 checks. 1 failed."), not feelings.

### 9.2 Rules

- **Case:** sentence case everywhere: titles, buttons, tabs, menu items and labels.
- **Buttons:** a verb plus an object, such as "Connect GitHub", "Send answer" or "Create ticket". Never "OK", "Yes", "Submit" or "Click here".
- **Words:** one word per concept, taken from §4.1.
- **Robots:** use their names, capitalised and without "the": "Builder is working on this." The general word is "robot". Never use "AI", "bot" or "agent" in the UI.
- **Never in the UI:** internal tool or method names, AI model names, other customers' names, or internal IDs and codenames.
  - Outside services go by their public names, such as Claude and GitHub.
  - If you're not sure a word is public, ask before shipping it.
- **Errors:** say what happened, why (if you know), and what to do next. No blame, no "Oops", never "Something went wrong" on its own, and no error codes in the headline.
- **Empty states:** say what this place is for and how to start.
- **Confirmations:** "Disconnect GitHub?", then one sentence of consequence, then a "Disconnect GitHub" button.
- **Numbers:** numerals, plural-aware ("1 question", "3 questions"), formatted with `Intl`.
- **Time:**
  - "just now", "5 min ago" and "2 h ago" for the last day
  - then "Yesterday"
  - then a weekday within the past week ("Mon")
  - then "Nov 12", or "Nov 12, 2025" for another year

  The full date and time are in a tooltip. Durations look like "4m 12s" and "2h 5m".
- **Spelling:** US English in the UI (Proposed).
- **No exclamation marks,** except in a celebration.

### 9.3 Examples

| Don't | Do |
|---|---|
| Oops! Something went wrong. | Couldn't load checks. Check your connection and try again. |
| sign-in failed | Sign-in failed. Check your email and password. |
| Submit | Create ticket |
| Are you sure? | Disconnect GitHub? Robots will stop opening pull requests. |
| The AI is generating code… | Builder is writing the change · 4m |
| No data | No tickets yet. Write one the way you usually do. |

---

## 10. Responsive behaviour

Desktop first: design at 1440 and 1280 px, then make 768 and 375 px work before the PR. On phones, the job is triage and capture: answering questions, checking status and writing tickets. Planning views stay on bigger screens.

| | Phone (< 768) | Tablet (768–1023) | Small desktop (1024–1535) | Desktop (≥ 1536) |
|---|---|---|---|---|
| Sidebar | a drawer with a scrim | a drawer, or the rail in landscape | expanded (the rail is optional) | expanded |
| Top app bar (48 px) | menu, title, search, new | the same | — | — |
| Detail panel | full screen, with Back | a full-screen sheet | overlay | docked |
| Modal | a bottom sheet, or full screen | centred | centred | centred |
| List | two-line rows | fewer columns | all columns | all columns |
| Board | one column per screen, snapping | 2–3 columns | all | all |
| Calendar | agenda | month | month | month, with Unscheduled |
| Timeline | not offered | read-only | full | full |
| Tables | first column fixed, or cards | scrolling | full | full |

On touch screens:
- Targets are 44 px.
- Nothing is hover-only.
- Field text is 16 px.
- Respect the safe-area insets.
- No gesture works without a button that does the same thing.

---

## 11. Accessibility

The target is WCAG 2.2 AA.

- **Contrast:** text needs at least 4.5:1 (3:1 at 24 px and up). Controls, meaningful icons and focus indicators need at least 3:1. The token pairs in §3.1 are verified; check any new pairing.
- **Never colour alone:** status is an icon plus a label, risk uses words, robots and people differ by shape and name, and links inside text are underlined.
- **Keyboard:**
  - Everything works without a mouse, and the tab order is logical.
  - Focus is always visible: never remove the outline without a replacement.
  - There's a "Skip to content" link.
  - Arrow keys move inside lists, menus and tabs (roving focus, following the ARIA Authoring Practices).
- **Focus management:** overlays take focus and give it back. After an item is deleted, focus moves to the next one.
- **Semantics:**
  - Use landmarks: `nav`, `main`, and `aside` for the panel.
  - Headings go in order.
  - Buttons do things and links go places.
  - Status updates go through `aria-live="polite"`.
- **Targets:** at least 24 × 24 px (2.5.8), and 44 × 44 px on touch screens.
- **Alternatives:** dragging always has a non-drag alternative (2.5.7), and single-key shortcuts can be turned off (2.1.4).
- **Timing:** toasts pause on hover and focus, and people can make them last longer or stay until dismissed (2.2.1).
- **Colour blindness:** there's no separate colour-blind mode, because colour never carries meaning alone and the palettes are validated for the common types of colour blindness.
- **Motion:** `prefers-reduced-motion` is respected everywhere, and nothing flashes more than three times a second.
- **Zoom:** the app is usable at 200%, and the shell reflows at 320 px wide (wide tables may scroll).
- **Forms:** visible labels, errors tied to their fields, `autocomplete` values, and pasting allowed.
- **Media:** robot videos are muted and `aria-hidden`, with posters for reduced motion.
- **Test every UI PR:**
  - keyboard only
  - a quick VoiceOver pass
  - axe (or Lighthouse) with no violations
  - 200% zoom

---

## 12. Implementation rules

- **Tokens only.** Components contain no hex or `rgb()` colours, no arbitrary values (`h-[54px]`, `text-[13px]`, `z-[999]`) and no hand-made shadows. The login page was built before this document, so it's exempt until its owner migrates it (§14).
- **Classes to use:**
  - surfaces: `bg-background`, `bg-card`, `bg-field`, `bg-field-hover`, `bg-hover`, `bg-pressed`, `bg-selected`, `bg-inverse`
  - text: `text-foreground`, `text-muted-foreground`, `text-faint`, `text-on-inverse`, `text-primary-strong`
  - borders: `border-border`, `border-border-strong`
  - action: `bg-primary`, `bg-primary-strong`
  - shadows: `shadow-raised`, `shadow-popover`, `shadow-overlay`, `shadow-drag`
  - other: the tone tokens, `rounded-robot`, `tracking-title`

  The tokens PR adds the ones that don't exist yet (§14).
- **Changing tokens:** one shared-file PR that updates `globals.css` and this document together.
- **Shared building blocks** (Proposed): build each component in §7 once and reuse it.
  - Where they live is decision 5 in §15. Until that's settled, ask before creating a shared component.
  - Area code (dashboard, connect-accounts) uses them through their props (`variant`, `size`), and doesn't restyle them with `className` overrides.
- **Component API:**
  - Use named exports, and the props `variant`, `size`, `disabled` and `loading`.
  - Overlays take `open` and `onClose`, the same contract as `ConnectAccountsModal`.
  - `ref` is a normal prop in React 19.
  - Add `"use client"` only where it's needed.
- **Icons:** `import { X } from "lucide-react"`, with `size={16} strokeWidth={1.75}`, and `aria-hidden` when decorative.
- **Motion:**
  - Use CSS transitions for hover, press and colour.
  - Use framer-motion for entering and leaving (`AnimatePresence`), list `layout` changes and robot moments.
  - Take durations and easings from §3.7.
  - Every animation checks for reduced motion (`useReducedMotion()` or the media query).
- **Images and media:** `next/image` with `unoptimized` (see `CLAUDE.md`). Videos ship as `.webm` and `.mp4`, with a poster.
- **Next.js 16:** follow `AGENTS.md`. Keep the shell static and stream the content (Suspense), so navigating never blanks the app.
- **Dependencies:** nothing is added without asking (`CLAUDE.md` rule 4), and that includes UI libraries.
- **Before a PR:**
  - lint and build
  - screenshots at 375, 768 and 1280 px in the PR description
  - a keyboard check and a reduced-motion check

---

## 13. Review checklist

Copy this into every UI pull request:

- [ ] Tokens only: no hex, `rgb()`, arbitrary sizes or arbitrary z-index
- [ ] The type scale, sentence case and the §4.1 vocabulary
- [ ] At most one primary action per view
- [ ] Hover, pressed, focus-visible, disabled, loading, empty and error states all exist
- [ ] The keyboard reaches everything, Esc closes, and shortcuts don't fire while typing
- [ ] Focus is visible, and returns when overlays close
- [ ] Nothing relies on colour alone
- [ ] New colour pairings are checked for contrast
- [ ] Reduced motion is handled, and nothing loops on work surfaces except the allowed indicators
- [ ] It works at 375, 768 and 1280 px, with 44 px targets on touch screens
- [ ] No loading indicator under 300 ms, and skeletons match the layout
- [ ] Copy: verb-plus-object buttons, errors that say what happened and what to do, no internal terms or model names
- [ ] Only files in my area changed, and shared changes are in their own PR
- [ ] Screenshots attached (desktop and phone)

---

## 14. Known deviations in the current code

| Where | What | Fix | Who |
|---|---|---|---|
| `globals.css` | Tailwind's `primary` points at the old red `--accent` (`#e33637`), while CraftHQ blue lives in `--cta` | in the tokens PR: point `primary` at `--cta`, add the new tokens from §3, and retire `--accent` and `--accent-2` (nothing uses them) | shared |
| `globals.css` | `--radius` (14 px), `--serif` and the dark block are leftovers from the old site | retire them, or keep them with a "not used" comment | shared |
| `LoginForm.tsx` | two error messages start lowercase ("sign-in failed", "network error — try again") | use sentence case (§9) | login owner |
| `LoginForm.tsx`, `login/page.tsx` | arbitrary sizes (`h-[54px]`, `rounded-[20px]`, `text-[13px]`) | allowed on a brand surface; move them to tokens when the files are next touched | login owner |
| `LoginForm.tsx` | while either field is empty, the "Sign in" button is faded (white text on pale blue, 1.63:1), but it's still clickable; §11 needs 4.5:1 | keep it full blue all the time (4.55:1), or use dark text in the faded state | login owner |
| `LoginForm.tsx` | the helper text says "instance operator", but §4.1 says to use "workspace admin" | change the copy, or change §4.1 if "instance operator" is a deliberate product term | login owner |
| `icons.tsx` | the custom `AlertCircleIcon` duplicates lucide's `CircleExclamationPoint` | swap it when the file is next touched | login owner |

---

## 15. Open decisions

| # | Decision | Recommendation | What it blocks |
|---|---|---|---|
| 1 | The word for a work item | **Ticket** (the public site talks about sending tickets) | all copy |
| 2 | The name of a person's queue | **Needs you** | sidebar, Home |
| 3 | The robots in the app | the Asker, the Builder and the Checker, each with a poster and a small avatar. The Checker and the Asker exist in `design/blender/` but aren't exported to `public/` yet | avatars, pipeline strip, empty states |
| 4 | Accessible behaviour for menus, selects, popovers and tooltips | adopt a headless library (Radix UI primitives) in one dependency PR before the first menu is built. Modals can use the native `<dialog>` now | the first menu or select |
| 5 | Where shared components live, and who owns them | `src/components/ui/`, as a shared folder listed in `CLAUDE.md` | the first shared component |
| 6 | Ticket stages and statuses | the list in §7.12 | list, board, statuses |
| 7 | List density | 36 px rows, with a 32 px compact option later | lists, tables |
| 8 | Celebrations | on, at milestones only, and can be turned off | §8.6 |
| 9 | Dark mode | after v1, designed as a full set | — |
| 10 | Spelling in the UI | US English | copy |

---

## 16. Changelog

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-11-19 | First draft: foundations, shell, views, patterns, components and rules. The Asana benchmark was checked against Asana's public help centre, developer docs, blog and forum. Proposed by shubhampatil-lab for review by himalay-glitch. |
