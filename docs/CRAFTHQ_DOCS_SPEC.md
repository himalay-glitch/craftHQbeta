# CLAUDE.md — Recreate the CraftHQ Docs ("Guide") section

> Source: captured from the live app at `https://app.crafthq.ai/docs` on 26 Nov 2026.
> Goal: rebuild the Docs section **exactly** — same routes, same layout, same components, same copy.
> All article text below is the real, final copy. Do not rewrite, shorten or "improve" it.

---

## 1. What you are building

A docs area inside the CraftHQ app with **4 articles**, one page template, a sticky left rail, and simple HTML/CSS diagrams (no images).

### Routes

| Route | Article (sidebar title) | Read time | Page H1 |
|---|---|---|---|
| `/docs` | Getting started (default — renders the same as `/docs/getting-started`) | 3 min read | Getting started |
| `/docs/getting-started` | Getting started | 3 min read | Getting started |
| `/docs/statuses` | Statuses — how work moves | 8 min read | Statuses — how work moves |
| `/docs/guide` | The full guide | 20 min read | **How to use CraftHQ** (H1 differs from sidebar title) |
| `/docs/claude-code` | Use CraftHQ from Claude Code | 6 min read | Use CraftHQ from Claude Code |

Order of articles (used for the sidebar list and Previous/Next cards): getting-started → statuses → guide → claude-code.

Neighbour-card summaries (shown under the title in the Previous/Next cards):

| Article | Summary text |
|---|---|
| Getting started | Your first story, start to finish — and the three rules that cover most of it. |
| Statuses — how work moves | The five groups of statuses, what a note does in each, and who moves a story on. |
| The full guide | Every screen and feature, in depth. |
| Use CraftHQ from Claude Code | Your own token, the crafthq CLI and its Claude Code plugin — set up in ten minutes. |

First article shows only a **Next** card; last article shows only a **Previous** card; the middle two show both.

---

## 2. Page structure (same template for every article)

```html
<header class="topbar">…app nav…</header>
<main class="content">
  <section class="guide">
    <p class="eyebrow">Guide</p>                 <!-- CSS uppercases it: "GUIDE" -->
    <h1 class="page-title">{Article H1}</h1>
    <div class="md guide-lede">{1–3 lede paragraphs}</div>

    <div class="guide-body">
      <div class="guide-rail">                   <!-- sticky left column -->
        <nav class="guide-articles">
          <p class="guide-toc-head">Articles</p>
          <ol>
            <li><a class="guide-article [active]" href="/docs/getting-started">
                  <span class="guide-article-title">Getting started</span>
                  <span class="guide-article-minutes">3 min read</span></a></li>
            … 4 items …
          </ol>
        </nav>
        <nav class="guide-toc">
          <p class="guide-toc-head">On this page</p>
          <ol><li><a href="#section-id">1. Section title</a></li> …</ol>
        </nav>
      </div>

      <div class="guide-sections">
        <article class="guide-section">
          <h2 class="guide-heading" id="1-section-slug">1. Section title</h2>
          <div class="md">…markdown-rendered content…</div>
        </article>
        … one <article> per H2 …

        <nav class="guide-neighbours">
          <a class="guide-neighbour" href="…">
            <span class="guide-neighbour-dir">Previous | Next</span>
            <span class="guide-neighbour-title">…</span>
            <span class="guide-neighbour-summary">…</span>
          </a>
        </nav>
      </div>
    </div>
  </section>
</main>
```

### Behaviour
- "On this page" links are in-page anchors (`#1-before-your-first-story`, etc.). Heading ids are slugified from the heading text (number included). `scroll-margin-top: 76px` so headings clear the sticky topbar.
- The current article in the "Articles" list gets class `active` (tinted background + accent title).
- No accordions, tabs, copy buttons or other interactive widgets inside the articles — content is static. (Verified: 0 buttons/inputs/details inside `.guide-sections` on all four pages.)
- Article content is authored as **Markdown** and rendered into `.md` containers (tables, code blocks, inline code, bold, italics, links). Diagrams/figures are custom HTML components (spec in §4).
- Links inside articles: `/docs/statuses`, `/docs/guide`, `/docs/getting-started`, `/docs/claude-code`, and `Settings › Tokens` → `/settings?tab=tokens`.

### App shell (for context — probably already exists in your app)
Sticky `header.topbar` (59px tall, translucent `--bg` at 82% + `backdrop-filter: blur(12px)`, 1px bottom border). Logo "CraftHQ" (red square icon) → `/`. Nav links: Dashboard `/`, Stories `/stories`, Routines `/routines`, Feature Pages `/pages`, Docs `/docs`, Settings `/settings`; a light/dark toggle button (aria-label "Toggle light/dark theme", ☀ icon); a "Sign out" button. On narrow screens the links collapse into a ☰ "Menu" button.

---

## 3. Design tokens

Theme is set with `data-theme="light" | "dark"` on `<html>`.

| Token | Light | Dark |
|---|---|---|
| `--accent` | `#e33637` | `#e33637` |
| `--amber` | `#ff9f43` | `#ff9f43` |
| `--bg` | `#faf9f8` | `#1b1a19` |
| `--bg-2` | `#f2f0ee` | `#201e1d` |
| `--card` | `#fff` | `#262424` |
| `--card-2` | `#f4f2f0` | `#2e2b2b` |
| `--chip` | `#f2f0ee` | `#201e1d` |
| `--border` | `#e7e4e1` | `#383534` |
| `--text` | `#201d1d` | `#f5f3f1` |
| `--muted` | `#55514f` | `#aba6a3` |
| `--faint` | `#8b8785` | `#7c7774` |
| `--radius` | `14px` | `14px` |

Fonts:
- Body: `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`, 16px
- `--serif` (H1 + section headings): `"Iowan Old Style", "Charter", "Palatino Linotype", Palatino, Georgia, serif`
- `--mono`: `ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace`

---

## 4. CSS (captured from the live site — use as-is)

```css
/* Page container: the docs page widens the app's max width */
.app:has(> .content > .guide) { --page-maxw: 1440px; }   /* default elsewhere: 1120px */
.content { max-width: var(--page-maxw); margin: 0 auto; padding: 34px 22px 90px; }

/* Header */
.eyebrow { letter-spacing: .09em; text-transform: uppercase; color: var(--accent);
  margin-bottom: 6px; font-size: 11.5px; font-weight: 700; }
.page-title { font-family: var(--serif); letter-spacing: -.01em; margin-bottom: 8px;
  font-size: 33px; font-weight: 650; line-height: 1.12; }
.guide .guide-lede { color: var(--muted); max-width: 720px; margin-bottom: 26px; font-size: 16px; }

/* Two-column body */
.guide-body { display: grid; grid-template-columns: 216px minmax(0,1fr); align-items: start; gap: 32px; }
.guide-rail { display: flex; flex-direction: column; gap: 12px; position: sticky; top: 76px; }
.guide-toc, .guide-articles { background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 14px 16px; }
.guide-toc-head { letter-spacing: .09em; text-transform: uppercase; color: var(--faint);
  margin-bottom: 8px; font-size: 11.5px; font-weight: 700; }
.guide-toc ol, .guide-articles ol { margin: 0; padding: 0; list-style: none; }
.guide-toc li + li, .guide-articles li + li { margin-top: 4px; }
.guide-toc a { color: var(--muted); padding: 3px 0; font-size: 13px; line-height: 1.35;
  text-decoration: none; display: block; }
.guide-toc a:hover { color: var(--accent); }
.guide-article { border-radius: 9px; margin: 0 -8px; padding: 6px 8px; text-decoration: none; display: block; }
.guide-article-title { color: var(--text); font-size: 13px; font-weight: 600; line-height: 1.35; display: block; }
.guide-article-minutes { color: var(--faint); margin-top: 1px; font-size: 11.5px; display: block; }
.guide-article:hover .guide-article-title { color: var(--accent); }
.guide-article.active { background: color-mix(in srgb, var(--accent) 12%, var(--card)); }
.guide-article.active .guide-article-title { color: var(--accent); }

/* Sections */
.guide-sections { max-width: 760px; }
.guide-section + .guide-section { border-top: 1px solid var(--border); margin-top: 30px; padding-top: 26px; }
.guide-heading { font-family: var(--serif); letter-spacing: -.01em; margin-bottom: 10px;
  scroll-margin-top: 76px; font-size: 23px; font-weight: 650; line-height: 1.2; }
.guide-sections .md { font-size: 15px; line-height: 1.68; }
.guide-sections .md p { max-width: 68ch; margin: 0 0 14px; }
.guide-sections .md h3 { margin: 18px 0 6px; font-size: 1.02em; }
.guide-sections .md ul, .guide-sections .md ol { margin: 0 0 14px; }
.guide-sections .md li { margin: 4px 0; }
.guide-sections .md table { margin: 0 0 14px; }

/* Generic markdown */
.md { word-break: break-word; overflow-wrap: anywhere; line-height: 1.55; }
.md > :first-child { margin-top: 0; }  .md > :last-child { margin-bottom: 0; }
.md p { margin: 0 0 8px; }
.md strong { color: var(--text); font-weight: 650; }
.md em { font-style: italic; }
.md ul, .md ol { margin: 4px 0 8px; padding-left: 1.4em; }
.md li { margin: 2px 0; }  .md li > p { margin: 0; }
.md a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
.md a:hover { text-decoration: none; }
.md code { font-family: var(--mono); background: var(--bg-2); border: 1px solid var(--border);
  border-radius: 5px; padding: 1px 5px; font-size: .9em; }
.md pre { font-family: var(--mono); background: var(--bg-2); border: 1px solid var(--border);
  border-radius: 10px; margin: 6px 0 8px; padding: 12px; font-size: 12.5px; overflow-x: auto; }
.md pre code { font-size: inherit; background: none; border: none; padding: 0; }
.md blockquote { border-left: 3px solid var(--border); color: var(--muted); margin: 6px 0 8px; padding-left: 12px; }
.md hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
.md table { border-collapse: collapse; width: 100%; margin: 6px 0 8px; font-size: .95em; display: block; overflow-x: auto; }
.md th, .md td { text-align: left; border: 1px solid var(--border); padding: 7px 10px; }
.md th { color: var(--faint); text-transform: uppercase; letter-spacing: .04em; background: var(--card-2); font-size: .85em; }

/* Figures (diagram container) */
.guide-figure { background: var(--chip); border: 1px solid var(--border); border-radius: var(--radius);
  margin: 4px 0 16px; padding: 16px; }
.guide-figure-caption { color: var(--faint); margin-top: 12px; font-size: 12.5px; }

/* Figure type A — linear flow (used in "The full guide" §4) */
.guide-flow { display: flex; flex-wrap: wrap; align-items: stretch; gap: 8px; }
.guide-flow-step { background: var(--card); border: 1px solid var(--border); border-radius: 10px; min-width: 108px; padding: 8px 12px; }
.guide-flow-step-name { color: var(--text); font-size: 13.5px; font-weight: 650; }
.guide-flow-step-who { color: var(--muted); margin-top: 2px; font-size: 11.5px; }
.guide-flow-arrow { color: var(--faint); align-self: center; font-size: 13px; }
.guide-flow-aside { color: var(--muted); margin-top: 10px; font-size: 12.5px; }

/* Figure type B — two cards side by side (used in "The full guide" §8) */
.guide-pair-lead { color: var(--faint); margin-bottom: 10px; font-size: 12.5px; }
.guide-pair { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; }
.guide-pair-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
.guide-pair-title { margin-bottom: 6px; font-size: 13.5px; font-weight: 650; }
.guide-pair-list { color: var(--muted); margin: 0; padding: 0; font-size: 12.8px; line-height: 1.5; list-style: none; }
.guide-pair-list li + li { margin-top: 4px; }

/* Figure type C — status groups with colour-coded movers (used in "Statuses" §1) */
.guide-groups-row { display: flex; flex-wrap: wrap; align-items: stretch; gap: 8px; }
.guide-groups-box { background: var(--card); border: 1px solid var(--border); border-radius: 10px; flex: 1 1 130px; padding: 8px 12px; }
.guide-groups-name { color: var(--text); font-size: 13.5px; font-weight: 650; }
.guide-groups-statuses { color: var(--muted); margin-top: 2px; font-size: 11.5px; }
.guide-groups-move { text-align: center; flex: 0 1 110px; align-self: center; font-size: 11px; line-height: 1.3; }
.guide-groups-arrow { font-size: 13px; }
.guide-groups-move-who { display: block; }
.guide-groups .by-you { color: color-mix(in srgb, var(--amber) 85%, var(--text)); }
.guide-groups .by-assistant { color: var(--accent); }
.guide-groups-return { border: 1px dashed color-mix(in srgb, var(--amber) 55%, var(--border));
  background: color-mix(in srgb, var(--amber) 8%, transparent); border-radius: 10px;
  margin-top: 10px; padding: 7px 10px; font-size: 12px; }

/* Previous / Next cards */
.guide-neighbours { border-top: 1px solid var(--border); display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 30px; padding-top: 26px; }
.guide-neighbour { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 12px 14px; text-decoration: none; display: block; }
.guide-neighbour:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--border)); }
.guide-neighbour-dir { letter-spacing: .09em; text-transform: uppercase; color: var(--faint); font-size: 11px; font-weight: 700; display: block; }
.guide-neighbour-title { color: var(--text); margin-top: 3px; font-size: 14px; font-weight: 650; display: block; }
.guide-neighbour:hover .guide-neighbour-title { color: var(--accent); }
.guide-neighbour-summary { color: var(--muted); margin-top: 3px; font-size: 12.5px; line-height: 1.45; display: block; }

/* Responsive */
@media (max-width: 900px) {
  .guide-body { grid-template-columns: minmax(0,1fr); gap: 20px; }   /* rail stacks above content */
  .guide-rail { position: static; }
}
@media (max-width: 520px) {
  .guide-pair { grid-template-columns: minmax(0,1fr); }
  .guide-flow-step { flex: 1 1 100%; }
  .guide-flow-arrow { display: none; }
  .guide-groups-box, .guide-groups-move { flex: 1 1 100%; }
  .guide-groups-move .guide-groups-arrow { display: none; }
  .guide-groups-move { text-align: left; }   /* last rule partly unreadable in capture — assumed */
}
```

---

## 5. Implementation notes for Claude

1. Store each article as a Markdown file (e.g. `content/docs/<slug>.md`) with front-matter: `title` (sidebar), `h1`, `minutes`, `summary`, `order`. Render the lede, the H2 sections and the figures from it. The three figures are custom components — render them with the HTML structure + class names described in §4 and in the article content below (marked `<!-- FIGURE … -->`).
2. Build the "On this page" list from the article's H2s (note: in the Claude Code article the first item, "Who it is for", has no number).
3. Build Articles list and Previous/Next from the routes table in §1.
4. Code blocks in the Claude Code article are shell (`sh`); keep them monospace, no syntax colours needed, no copy button (the live page has none).
5. Tables use the `.md table` styling: uppercase, faint, small header row on `--card-2`.
6. Everything must work in light and dark themes using only the tokens above.
7. Acceptance check: each page's H1, lede, section headings, tables, figures and Previous/Next cards match the content below word for word.

---

## 6. Article content (exact copy)

Notation used below:
- `### PAGE H1:` = the page's `<h1 class="page-title">`. `####` headings = the `<h2 class="guide-heading">` section headings (one `<article class="guide-section">` each).
- `{#id}` after a heading = the heading's `id` attribute (anchor target).
- `<!-- … -->` = notes for you about structure/components; not visible text.
- "ON THIS PAGE" blocks = the TOC entries for the rail (`label → #anchor`).


---

<!-- ===================== ARTICLE: /docs/getting-started (also /docs) ===================== -->

### PAGE H1: Getting started

<!-- lede -->
Five minutes, start to finish. You describe a piece of work as a **story**; the assistant plans it, you say go, it builds and checks its own work, and you review the result. You steer with two things only: the story's **Status** and its **notes**.


<!-- TOC -->
1. Before your first story → #1-before-your-first-story
2. Your first story, in five steps → #2-your-first-story-in-five-steps
3. The statuses at a glance → #3-the-statuses-at-a-glance
4. Three rules that cover most of it → #4-three-rules-that-cover-most-of-it
5. Where next → #5-where-next

#### 1. Before your first story {#1-before-your-first-story}

Two one-time connections, both under **Settings**:

- **Claude account** — the assistant works on *your* Claude subscription. Until you connect it, your stories wait with nobody to pick them up.
- **GitHub** — link your account (or save a personal access token) so pull requests can be opened in your name.

#### 2. Your first story, in five steps {#2-your-first-story-in-five-steps}

1. **Create it.** At the top of **Stories**: a title, a few plain sentences about what you want, any files or screenshots that help — then **Add story**. It starts as **New**, and it is **yours**: your own assistant is the one that will work on it. (Filing it for a colleague? Pick their name in the **Mine** box before you add it, and their assistant picks it up instead.)
2. **Let it be planned.** Within a minute the assistant picks it up, writes a plan on the story's page, moves it to **Planning**, and may ask you questions — you will find them in the story's **Decisions** panel and under *Needs you* on the Dashboard. Nothing is built yet.
3. **Talk it through.** Add notes — corrections, constraints, "what about…". Each note gets the plan revised and handed back to you. Answer the decisions; an unanswered one is the most common reason work stands still.
4. **Say go.** Set **Status → Approved**. That single change is what starts the build. The story moves to **In progress** by itself, and the badge reads *Claude · working*.
5. **Review.** When the work has passed an independent check it comes back as **In review**, with a pull request (and a preview, where the project has one).
   - A question? Write a note — you get an answer, and nothing is changed.
   - Want changes? Write what to change, then set **Status → Approved** again.
   - Happy? Merge the pull request and set **Status → Done**.

#### 3. The statuses at a glance {#3-the-statuses-at-a-glance}

| Group | Statuses | What a note does | What moves it on |
|---|---|---|---|
| **Thinking** — no code is touched | New, Planning | The plan is revised | **You** set Approved |
| **Go** | Approved | — | The assistant starts, and moves it to In progress |
| **Building and checking** | In progress | You get an answer; nothing you wrote is lost | The assistant moves it to In review once it has passed an independent check |
| **Your review** | In review | You get an answer — code is *not* changed | **You**: Approved again for changes, Done to accept |
| **Closed** | Done, Cancelled | — | — |

The full explanation, with the questions people actually ask, is in [Statuses — how work moves](/docs/statuses).

#### 4. Three rules that cover most of it {#4-three-rules-that-cover-most-of-it}

- **A note never changes code.** Only **Approved** starts building — the first time, and every time you want changes after a review.
- **Read the badge.** *You · …* means the story is waiting for you (a plan to read, a question to answer, work to review). *Claude · …* means it is not.
- **Clear your side of the board.** The Dashboard gathers everything that needs you in one place. Work only stalls when a decision or a review sits unanswered.

#### 5. Where next {#5-where-next}

- [Statuses — how work moves](/docs/statuses) — eight minutes, the whole life of a story and what each status means for you.
- [The full guide](/docs/guide) — every screen and feature, for when you want the detail.

<!-- nav.guide-neighbours -->
NEXT → [Statuses — how work moves](/docs/statuses) — "The five groups of statuses, what a note does in each, and who moves a story on."

---

<!-- ===================== ARTICLE: /docs/statuses ===================== -->

### PAGE H1: Statuses — how work moves

<!-- lede (div.md.guide-lede) — 3 paragraphs -->
A story is always in exactly one of seven statuses. They fall into five groups, and the group — not the individual status — tells you what will happen when you write a note or change the status. This page explains each group, who moves a story from one to the next, and the questions people ask most.

One rule sits under everything else: **a note is a conversation; a status is an instruction.** Notes are read and answered in every open status (not on a closed story — see §6). Building starts only when a story is **Approved**.

A status says what you asked for; it does not say what is running. The story's status menu shows both — *Approved · Queued*, *Approved · Building*, *In review · Checking* — so you can tell an instruction that is waiting from work that is under way (§7).

<!-- ON THIS PAGE -->
1. The five groups → #1-the-five-groups
2. Thinking — New and Planning → #2-thinking-new-and-planning
3. Go — Approved → #3-go-approved
4. Building and checking — In progress → #4-building-and-checking-in-progress
5. Your review — In review → #5-your-review-in-review
6. Closed — Done and Cancelled → #6-closed-done-and-cancelled
7. Who moves what → #7-who-moves-what
8. Questions people ask → #8-questions-people-ask

#### 1. The five groups {#1-the-five-groups}

| Group | Statuses | In one line |
|---|---|---|
| **Thinking** | New · Planning | The plan is being worked out. No code is touched, however many notes you write. |
| **Go** | Approved | Your instruction to build. It lasts until a builder picks the story up and moves it on — and the menu says what it is waiting for: a free slot, a sign-in, a pause, a builder that is not running, or other work on the story finishing. |
| **Building and checking** | In progress | The assistant is building, then a second, independent agent checks the result. |
| **Your review** | In review | The work passed its check and is waiting for you. |
| **Closed** | Done · Cancelled | Finished, or not going to happen. Nothing picks these up. |

<!-- FIGURE (figure.guide-figure > div.guide-groups) — a horizontal flow diagram built in HTML/CSS, NOT an image.
     Row (div.guide-groups-row) of 5 boxes (div.guide-groups-box, each = .guide-groups-name + .guide-groups-statuses)
     with an arrow connector (div.guide-groups-move, containing span.guide-groups-arrow "→" + span.guide-groups-move-who label)
     between each pair. Connector modifier class: .by-you (AMBER) or .by-assistant (RED).
-->
[ Thinking | New · Planning ]  —→ you approve (by-you, amber) →
[ Go | Approved ]  —→ the assistant starts (by-assistant, red) →
[ Building and checking | In progress ]  —→ the assistant, after an independent check (by-assistant, red) →
[ Your review | In review ]  —→ you accept (by-you, amber) →
[ Closed | Done · Cancelled ]

Return line under the row (p.guide-groups-return.by-you, amber): "↩ **Your review** back to **Go** — you want changes → Approved again"

Caption (figcaption.guide-figure-caption): "Amber moves are yours — approving a plan, accepting the result, asking for changes. Red ones are the assistant's, and it never makes yours for you."

#### 2. Thinking — New and Planning {#2-thinking-new-and-planning}

**What it is for.** Working out *what* will be built before anything is. A story you create starts as **New**. Where an assistant plans on this instance, it picks the story up — the description you wrote is the first input — writes a plan on the story's page, raises the questions it cannot answer itself as **Decisions**, and moves the story to **Planning**. New does not mean a plan is being written: the menu says *Run open* when one is, and otherwise "nothing has been planned yet".

**What a note does here.** It revises the plan. Write a correction, a constraint, a "have you considered…": the assistant re-reads the thread, updates the page and hands the story back to you, usually with *Ready to approve* once nothing is open. Answering a decision does the same. You can go round this loop as many times as you like — nothing is built, and no file in your repository changes.

**Moving it back to Planning** (from a later status) asks for nothing by itself: a plan is written in answer to input. Write a note saying what should change — the menu's hint says so.

**What moves it on.** Only you: set **Status → Approved**.

**Who is waiting for whom.** *You · planning* — a plan is waiting for you to read. *You · decision* — a question is waiting for your answer. *Claude · queued* or *Claude · working* — your note or answer is being dealt with.

#### 3. Go — Approved {#3-go-approved}

**What it is for.** The one instruction that means *build this*. When a builder is running on the instance, it picks the story up, makes a working branch for it, and moves it to **In progress** itself.

Until then the menu says what the story is waiting for — it promises no timing:

- *Approved · Waiting to start* — nothing stands in the way; a builder has not picked it up yet. If the instance's runner has not checked in lately, the menu says that instead.
- *Approved · Paused* — the assistant is paused by a usage limit; nothing starts until the pause ends.
- *Approved · Queued* — every building slot is busy; it starts when one is free.
- *Approved · Waiting for sign-in* — a job stopped because the person it runs as must sign in again (Settings → Claude account). Sign in, choose **Clear the stopped job** in the menu, then approve again.
- *Approved · Needs you* with "a job stopped and its outcome is unknown" — an earlier build stopped without saying how it ended. Nothing new starts beside it (it might have pushed half its work). Check the branch, then say what happened in the menu: **It finished** or **It did not finish**.
- *Approved · Run open* — an assistant's loop has opened a run on the story. CraftHQ can't tell whether the session behind it is working or still waiting for a free slot, so the menu stays open: you can replan or cancel. The loop acts on the current status when it can next check; it can miss a move that was overwritten or reversed before that check.
- Other work on the story is still finishing (a check, a reply, a run left open): with the instance's own runner, an approval made meanwhile is kept and the build starts when that work ends. A wrapper's loop decides from the story's status as it finds it, so a late report from the finishing work can still move the story on — if your approval is lost that way, approve again.

**Building again is always a new approval.** A stopped job is settled, never re-run: its instructions were written from the story as it was then. Once it is settled, choose **Approved** (from Approved itself: move the story to Planning, then approve it again) and the new build starts from the story as it is now — including the comments you wrote since the last build.

**Approved is also how you ask for changes later.** See the review group below.

#### 4. Building and checking — In progress {#4-building-and-checking-in-progress}

**What happens, in order.**

1. **Build.** The assistant implements the plan on the story's own branch, running the project's fast checks as it goes.
2. **A look at the screen**, when the change touches what a browser shows: a separate pass opens the running app, takes screenshots and attaches them to the story.
3. **Independent verification.** A second agent — not the one that built it — checks the real behaviour against what the story asked for, runs the project's checks, and confirms no test was deleted or weakened to make things pass.
4. If it passes, the assistant moves the story to **In review**. If it does not, you get the findings and a decision: fix and re-run, or accept as is.

**What a note does here.** If a build is running when you write, your note is read after this round, not mid-sentence; it does not redirect work already under way. If the round **stopped** and handed the story back, what a note does depends on how the instance builds, and the line above the comment box says which:

- with the unattended runner, a note starts **one more build round**, and that build is given your comments since the last build;
- with an interactive assistant, a note gets **a reply** only — to build again, choose **Approved**.

**If it stops and asks.** The assistant decides small, reversible things itself. When it raises one anyway, the story's **Decisions** panel shows it as *Decided by the assistant — <its choice>*, already in effect, with **Confirm** and **Overturn**. It asks you only about choices that are hard to undo or that reach beyond this story. While such a decision is open the work is parked; **answering it resumes the work** — you do not need to touch the status.

**What moves it on.** The assistant, not you. Moving a story to In review by hand skips the independent check.

#### 5. Your review — In review {#5-your-review-in-review}

**What it is for.** The work is finished, has passed its check, and is on your desk: a pull request to read, screenshots, a preview to open where the project has one, and the evidence from the verification.

**What a note does here — the part people get wrong.** A note in review is answered, and it never changes the code. The assistant replies in the thread and may update the story's pages; it does not change code and does not move the story. This is deliberate. A review is where you ask "why did you do it this way?" and "what happens if…?", and a question should not quietly turn into a new commit on a pull request you are in the middle of reading.

**Review comments on the pull request itself are different.** Where the instance watches pull requests, feedback left *on the pull request* (not in the story's thread) can start a fix round on its own. The status menu says so on such an instance.

**To get changes made:**

1. Write a note saying what should change.
2. Set **Status → Approved**.

The assistant rebuilds on the **same branch** with your note in front of it, the work is independently checked again, and the story returns to In review with the pull request updated. Write the note *first*: an interactive assistant reads the thread when it starts, and the unattended runner's build is given the comments written since the last build as they stand when it is queued — so a note added after you re-approve may only be seen on the next round.

**To accept:** merge the pull request (the assistant never merges), then set **Status → Done**.

#### 6. Closed — Done and Cancelled {#6-closed-done-and-cancelled}

**Done** is yours to set when you are satisfied; **Cancelled** when the work will not happen after all. Neither is picked up by anything: a note on a closed story is kept, but not answered. Closing a story also cancels the instance runner's work on it that was still waiting to start. A wrapper's loop drops its pending work when it can check and finds the story still closed; a pause can delay this, and a closure reversed before the check can be missed. A closed story keeps its whole history — notes, decisions, pages, runs — and can be reopened by setting its status again.

#### 7. Who moves what {#7-who-moves-what}

| From → to | Who | How |
|---|---|---|
| New → Planning | The assistant | By itself, once it has written a first plan |
| Planning → Approved | **You** | Status → Approved |
| Approved → In progress | The assistant | By itself, when it starts building |
| In progress → In review | The assistant | Only after the independent check passes |
| In review → Approved | **You** | When you want changes (with a note saying what) |
| In review → Done | **You** | After merging the pull request |
| anything → Cancelled | **You** | When the work is not going to happen |

The two hand-offs that matter are both yours: approving a plan, and accepting the result.

**The status menu on a story** says what each choice does — *Replies & Planning* (nothing is built), *Changes the code*, *Closes* — and offers only the moves that make sense from where the story is:

| The story is | Shown as | You can choose |
|---|---|---|
| New | New (*New · Run open* while an assistant's run is open on it) | Planning · Approved · Cancelled |
| Planning | Planning | Approved · Cancelled |
| Approved, build not started yet | Approved · Waiting to start / Paused / Queued / Waiting for sign-in | Planning · Cancelled |
| Approved or In progress, the instance's runner holds a job | Approved · Building / Checking / Verifying | Nothing — the menu is **locked** |
| Approved or In progress, an assistant's run is open | Approved · Run open | Planning · Cancelled (and Approved from In progress) — an open run alone never locks the menu |
| Approved or In progress, a run open for over 12 hours | Approved · Run still open | The usual choices; a new build waits until the run is closed |
| In progress, next round not started yet | Approved · Waiting to start | Approved (try again) · Planning · Cancelled |
| In progress, stopped and waiting for you | Approved · Needs you | Approved (try again) · Planning · Cancelled |
| In review | In review (*In review · Checking* while the full check runs) | Approved (rebuild) · Planning · Done · Cancelled |
| Done or Cancelled | Done / Cancelled | Planning · Approved (either reopens it) |

What is under way is named for what it is: *Building* for a build or a review round on its pull request, *Checking* for the project's checks, *Verifying* for the independent verification, and *Run open* (with its lane, e.g. "verify") for an assistant's run — which may be working or still waiting for a free slot. Where no assistant replies or plans on the instance, the menu says so rather than promising a reply.

**The lock.** Only while the instance's own runner holds a job on an approved or in-progress story, the menu still opens, says why, and offers nothing. It unlocks by itself the moment that job ends. An assistant's open run never locks it, nor does a round that fails, stops to ask you something, is waiting for a slot or a sign-in, or has not started yet — so you can replan or cancel then.

**When a run is left open.** A run opened over 12 hours ago that is still open is shown as *Run still open*. CraftHQ cannot tell whether it is still working — its age does not prove it stopped — so it does not close it for you: the loop that opened it closes its own stale runs (if that loop is no longer running, start it again). The story is not locked meanwhile: you can withdraw or cancel it, or approve it — but no new build starts beside the open run.

**Changes are checked when they are saved.** The menu sends each change together with the status and the version of the story it was showing. If the story moved in the meantime — another tab, another person, a build that started, even a move away and back to the same status — nothing is changed, the menu says so, and the page catches up. For the instance's own runner, a change you make also cancels the story's jobs that were still waiting to start, so a build it queued for an approval you have just withdrawn never runs. Every approval opens a new **build round**, and a move that ends the round — withdrawn, closed or approved again, from any tool — also stops that round's runner builds, even one already running; nothing such an ended build finishes can move the story or post to it.

A wrapper's own loop (assistant sessions working on the story through the older status API) is not fenced this way yet. It reads the story's status as it finds it when it next checks — it is not told of each change — and a report one of its sessions was already writing is not checked against your change: it can still set a status or post a note after it. If that undoes your change, set the status again. Connected tools that use the older status API still set statuses as before.

#### 8. Questions people ask {#8-questions-people-ask}

**I commented on a story in review and nothing was built. Why?** Because a note never changes code. Where an assistant replies on the instance, you will have received a reply. Set the status back to **Approved** to have your comments acted on.

**Do I have to move a story back to Planning to discuss it again?** No. Notes are answered in every open status. Move it back to Planning only if you want the *plan* reworked and the page rewritten before anything more is built — and say in a note what should change.

**Can I approve with decisions still open?** You can — nothing stops you. But an open question is exactly where the work may stop and wait for you, so answer the ones that matter before you approve.

**How fast does work start?** An interactive assistant is woken by your note, answer or status change rather than by a timer, so when it is running and not paused, work normally starts in well under a minute. The menu shows the blockers CraftHQ knows, such as a recorded pause or a runner job waiting for sign-in. For a wrapper session, *Run open* cannot distinguish waiting for a free slot from execution. The story page refreshes itself; a *Claude · working* badge means a recent run is recorded, not that the dispatcher has delivered it.

**What does "Claude · queued" mean if it stays?** The ball is with the assistant, and the badge has no live run to count. The menu may show a known blocker, but it cannot always identify the reason for an interactive loop's wait. Once that loop opens a run, the badge can read *Claude · working* even while its session is still waiting for capacity; use the menu's *Run open* explanation.

**Who is "the assistant", exactly?** Each person has their own: it runs on your own Claude subscription and works on the stories that are yours — every story has an owner: whoever filed it (or promoted it from Intake), or whoever it was handed to. Your colleague's stories are picked up by theirs, and your assistant cannot write on them. To move a story from one assistant to the other, change its owner: the new owner's assistant picks it up within seconds.

**Can the assistant create stories?** No. It can *propose* one — in a note, or as an item in Intake — and a person decides whether it becomes a story.

New here? [Getting started](/docs/getting-started) walks through a first story in five steps. For every screen and feature in depth, see [the full guide](/docs/guide).

<!-- nav.guide-neighbours -->
PREVIOUS → [Getting started](/docs/getting-started) — "Your first story, start to finish — and the three rules that cover most of it."
NEXT → [The full guide](/docs/guide) — "Every screen and feature, in depth."

---

<!-- ===================== ARTICLE: /docs/guide ===================== -->

### PAGE H1: How to use CraftHQ
<!-- NOTE: the sidebar/article list calls this page "The full guide" (20 min read) but its H1 is "How to use CraftHQ". -->

<!-- lede -->
This is the whole thing, start to end, for someone who opened CraftHQ today. Read it once and you will know what every page is for and what is being asked of you.

It is written as a guide, not a reference. Nothing here assumes you write code. In a hurry? [Getting started](/docs/getting-started) is the five-minute version, and [Statuses — how work moves](/docs/statuses) explains the one thing people get wrong most often.

<!-- ON THIS PAGE -->
1. What CraftHQ is → #1-what-crafthq-is
2. Finding your way around → #2-finding-your-way-around
3. A story is one piece of work → #3-a-story-is-one-piece-of-work
4. The statuses, and who moves them → #4-the-statuses-and-who-moves-them
5. Whose turn it is → #5-whose-turn-it-is
6. Notes — how you talk to the assistant → #6-notes-how-you-talk-to-the-assistant
7. Decisions — the questions only you can answer → #7-decisions-the-questions-only-you-can-answer
8. The two pages on a story → #8-the-two-pages-on-a-story
9. Chat — asking in your own words → #9-chat-asking-in-your-own-words
10. Previews — seeing it run before you say yes → #10-previews-seeing-it-run-before-you-say-yes
11. Pull requests — where the work lands → #11-pull-requests-where-the-work-lands
12. Settings and your account → #12-settings-and-your-account
13. Who can see and do what → #13-who-can-see-and-do-what

#### 1. What CraftHQ is {#1-what-crafthq-is}

CraftHQ is where you watch a piece of software being built, and where you say what you want.

Most of the building is done by an assistant working in the background. CraftHQ is the place the two of you meet: you say what you need, it does the work, and the result comes back here for you to look at.

So the app is not a to-do list, and it is not a chat window with some project management stapled on. It is a record of work in flight. Every piece of work has a page, and that page always tells you two things — where the work has got to, and whether anything is waiting on you.

That second thing is the one to hold on to. The single most useful habit in CraftHQ is to ask: *is anything sitting in my court?* The app is built to answer that in one glance.

What CraftHQ does not do is make decisions for you. It will not approve its own work, it will not decide what matters, and it will not merge anything because it thinks it is ready. Those moments are yours, and the app is careful to hand them to you rather than route around you.

#### 2. Finding your way around {#2-finding-your-way-around}

Everything lives behind the bar across the top. On a narrow screen the bar folds into a **Menu** button, and everything below is in there instead.

Most people see five links: **Dashboard**, **Stories**, **Feature Pages**, **Docs** and **Settings**.

**Dashboard** is the board, and the page to open if you only ever open one. On the left, a rail that stays put: **Agent's turn** — what the assistant is *running* and what is *queued* behind it — then **Stories by status** and **Recent activity**. Open questions are not listed here: each one shows on its story (a story with one waiting reads **You · decision** under **Needs you**), and every open question is on the **Decisions** page. On the right, **Needs you**: every story that is waiting for something only you can give. Beside the heading is a small version badge, so you can always say which release you are looking at.

**Stories** is the full list of work. A story is one piece of work — section 3 is all about them.

**Feature Pages** collects the written pages that belong to the work: the plain plan, and the technical detail behind it. Section 8.

**Docs** is these articles. **Settings** is your own account and, if you administer the project, its people. Section 12.

Some links are switched off until a project wants them: **Standup** (the assistant's daily summaries), **Decisions** (every open question in one list), **Ideas** (drop a one-line idea for later), **Intake** (things raised from outside, waiting for a person to turn them into stories) and **Report** (how the work has been flowing). They are turned on per project by whoever operates your instance. Nothing is deleted when a link is hidden — the page still works if you have its address. **Chat** — the tab in the top bar, and the Chat button inside a story — appears only on instances where it has been switched on (section 9). Docs and Settings can never be hidden.

If you belong to more than one project, a switcher appears in the bar. Everything you see — stories, decisions, pages — belongs to the project you have selected.

There is also a light/dark toggle. It remembers your choice on that device.

**Finding a story.** Both the Dashboard and Stories have a **Search stories** box. It looks in titles, descriptions, notes and decisions, and each result says *why* it matched. Press **/** from anywhere to jump into it; **Esc** clears it. Next to it, **Show** narrows the list to **Mine**, the whole **Team**, **Unassigned**, or one person's stories — the Dashboard opens on *Mine*, the Stories page on *Team* — and **Sort** orders it by story number or by what changed last.

**Getting around without the mouse.** Press **?** anywhere to see the shortcuts for *your* bar. Each tab has its own letter after **g** — **g** then **d** for the Dashboard, **g** then **s** for Stories, **g** then **p** for Feature Pages — and the sheet lists exactly the tabs you have. **Ctrl+K** (**⌘K** on a Mac) opens a box you can type a page name into instead, if you would rather not learn letters. **Esc** closes whatever is open.

A few more worth knowing. On the Stories page and the Dashboard's *Needs you* list, **j** and **k** move down and up the stories and **Enter** opens the one you are on. **a** puts the cursor in the first question waiting for your answer on the page you are on. And **Ctrl+Enter** (**⌘Enter**) sends whatever you are typing — a note, an answer, a chat message — from any box in the app.

The single letters only work when you are not typing in a box, so they never swallow a word. If you use speech input, or would rather they did not fire at all, turn them off with the switch at the bottom of the **?** sheet: the Ctrl-combinations keep working.

**Keys not responding?** A browser extension that adds its own keyboard shortcuts — Vimium is the common one — catches **g**, **j**, **k**, **?** and **/** before the page sees them. Press **g** then **s** in a private window to check; to fix it, add this site to the extension's excluded sites (in Vimium: *Options → Excluded URLs and keys*). **Ctrl+K** keeps working either way.

#### 3. A story is one piece of work {#3-a-story-is-one-piece-of-work}

A story is the unit everything else hangs off. It has a title, a short statement of intent, whatever detail has been gathered, and a status.

Open one and you get its whole life on a single page: a one-line note on where it stands, its written pages, the conversation between you and the assistant, any questions waiting for you, its preview and pull request, its files, and a history of everything that has happened to it.

**Stories are created by people.** Write one yourself at the top of the Stories page: a title, optionally the one-line *intent* and some detail, and any files that help — then **Add story**. Or turn an idea into one from Ideas or Intake. The assistant can *suggest* a story — in a note, or as an item in Intake — but it cannot create one; a person always decides what goes on the list.

However a story starts, it starts small and unapproved. It gets fleshed out before anyone builds anything, and you are the one who says when it is ready.

**Every story has an owner.** A story you file is yours, unless you pick a colleague in the **Mine** box as you file it; a story you promote from Intake is yours too. The chip near the top names who it is assigned to, and the pencil beside it hands it to somebody else — there is no "nobody" to pick, so a story is never left without an owner. On lists the owner is a small circle with their initials, with a dot while their assistant is working on it. The owner matters: each person has their own assistant, running on their own account, and it works on *their* stories — and only theirs: it cannot write on a colleague's story.

A few older stories may still say *Unassigned* — they were filed before this rule. The **Show → Unassigned** filter finds them; open one and pick its owner.

Near the top is also a short status line — a single sentence saying where the work is. It is meant to be the honest headline. You can write it yourself with the pencil beside it, and the assistant rewrites it as things move.

**Files.** Drop a file anywhere on a story, or use **Files** in the bar at the top of the page. Screenshots show as thumbnails; everything else is a download. Images, PDFs, HTML, text, CSV, JSON, zip and Office files are accepted, up to 10 MB each. If a file is refused, the page says why. An image you have attached can be shown inline in a note.

#### 4. The statuses, and who moves them {#4-the-statuses-and-who-moves-them}

A story is always in exactly one of seven states.

**New** means it exists but nobody has worked out what it really is yet.

**Planning** means it is being thought through: what will be delivered, why, and what has to be settled first. The result is written down on the story's specification page.

**Approved** is your word. It means: yes, build this. Nothing is built before it.

**In progress** means the assistant is building it right now.

**In review** means the work is finished and has already survived an independent check. It is now on your desk to look at.

**Done** means you are satisfied and the story is closed.

**Cancelled** means it will not happen after all.

[Statuses — how work moves](/docs/statuses) groups these seven and goes through what each one means for you. The diagram below shows who moves a story on from each state. The short version is that the two hand-offs that matter are yours: approving a plan, and closing a finished piece of work.

One honest caveat. CraftHQ *shows* the state of the work — it does not enforce it. Any status can be set by anyone on the project, and there is nothing to stop you dragging a story anywhere. The flow below is how work actually moves, not a rule the app polices.

<!-- FIGURE (figure.guide-figure > div.guide-flow) — horizontal HTML/CSS flow, NOT an image.
     6 steps (div.guide-flow-step = .guide-flow-step-name + .guide-flow-step-who) separated by span.guide-flow-arrow "→". -->
[ **New** — the assistant works it into a plan ] →
[ **Planning** — you approve, once the plan is right ] →
[ **Approved** — the assistant picks it up ] →
[ **In progress** — it moves on only after an independent check ] →
[ **In review** — you look at it, then close it ] →
[ **Done** — finished ]

Aside under the flow (p.guide-flow-aside): "**Cancelled** sits outside the line: you can set it at any point, and it means the work will not happen."

Caption (figcaption.guide-figure-caption): "Nothing here is locked. CraftHQ shows the state of the work; it does not police it, so anyone on the project can set any status. The order above is how the work actually flows."

#### 5. Whose turn it is {#5-whose-turn-it-is}

Beside every story is a small badge saying whose court the ball is in. It is the fastest thing on the page to read, and it is never a guess.

When it is your turn, the badge says so and why: **You · triage**, **You · planning** (a plan is waiting to be read), **You · decision** (a question is waiting for your answer), **You · review** (finished work is waiting for your look).

When it is the assistant's turn, it says that instead: **Claude · queued** (it has the ball and has not started yet — normally a matter of seconds), **Claude · working**, or **Claude · checking** while the project's automatic checks run.

The turn flips by itself as things happen. Writing a note passes the ball to the assistant. The assistant replying passes it back to you. Answering a question passes it on. Approving a story puts it in the assistant's court.

You do not need to reload to see any of this. A story page re-reads itself every ten seconds while the ball is with the assistant and every minute otherwise, and the Dashboard every minute — without disturbing a note you are half-way through typing. A tab you are not looking at pauses, and catches up the moment you return.

If you want a single rule for using CraftHQ well, it is this: clear your side of the board. Work only stalls when a question or a review sits unanswered.

#### 6. Notes — how you talk to the assistant {#6-notes-how-you-talk-to-the-assistant}

Every story has a notes thread, under the heading **Notes / Direction**. The box is at the top and the thread runs newest-first beneath it, each entry marked as coming from a person or from the assistant.

Use it for anything you would say to a colleague working on the task. Correct a misunderstanding. Add a constraint you forgot. Ask what is going on. Say the thing you want done differently.

A note is never blocking and never formal. You can write one at any point, in any status, and you do not need permission or a particular moment.

What a note *does* depends on where the story is. While a story is being planned, a note gets the plan revised. Once it is being built or is in review, a note gets an answer — **it never changes code by itself.** To have finished work changed, say what you want in a note and set the status back to **Approved**. The statuses article explains why.

Markdown works in a note — lists, bold, links, headings — and so do images. If you have attached a screenshot to the story, you can point at it from your note and it shows up inline.

Two things to know. First, who a note is from is decided by who is signed in, not by whatever the text claims. Second, writing one flips the turn to the assistant, so the board updates the moment you hit send.

#### 7. Decisions — the questions only you can answer {#7-decisions-the-questions-only-you-can-answer}

Sometimes the work reaches a fork that is not the assistant's to choose. Those become **decisions**: a question, put to you, with the story it belongs to.

A decision is not a status update dressed as a question. The assistant settles small, easily reversed choices itself. When it raises one of those anyway, it is not parked: the story's **Decisions** panel shows it as *Decided by the assistant — <its choice>*, already in effect, and you can **Confirm** it or **Overturn** it (saying what to do instead). It asks you only when a choice is hard to undo or reaches beyond the story in front of it — and it always arrives with the evidence behind it, often a page you can read first.

**Where you find them.** On the story itself, in its **Decisions** panel; on the Dashboard, where a story with an open question sits under *Needs you*; and, if your project shows it, on the **Decisions** tab, which lists every open question in one place.

Answering one is quick. If the question offers lettered options, pick one — that fills the answer box and you can still type over it. Add anything you want to say, and submit. Your answer is the record. The assistant treats it as binding and picks the work back up from there — you do not need to change the status.

Three labels help you triage a pile of them: how urgent it is (*Now*, *Today*, *This week*), how far a wrong call would reach (*Local*, *Module*, *Global*), and who it is written for (*For business* or *For engineering*). Open questions are sorted most urgent first.

There is one case where a question does not simply wait for you. If a question is easily reversible, and it came with a stated default and a stated timer, and that timer runs out, the default is taken and the work continues. Nothing is hidden when that happens: on the story's Decisions panel the question moves to **Proceeded**, and you either **Confirm** the default or **Reverse** it. Reversing one requires you to say what should have happened instead. Proceeded questions show on the story, not on the Decisions tab — so glance at a story's panel when you come back to it.

This only happens for reversible things, only with a default written down in advance, and only after the clock has really run out. Anything that cannot be undone waits for you, however long that takes.

#### 8. The two pages on a story {#8-the-two-pages-on-a-story}

Alongside the conversation, a story carries written pages — the considered version of what is happening, kept up to date as the work moves.

There are two kinds, and they are for different readers. The **specification** is for you: what will be delivered, why it matters, what you still have to settle, and how you will know it is done. The **engineering page** is the technical twin: the approach, the trade-offs, the decisions and the evidence.

Both open from the story with a single click, in a panel over the page, and from there in a tab of their own.

You are never expected to write either of them. They are published by the assistant and rewritten as the work changes; your part is to read the specification before you approve, and to say so in a note if it has got something wrong.

A page keeps its history. When a page is republished, the version it replaced is kept — the last five of them — and you can put an earlier one back. You will find that under **Feature Pages**: open the page there and look for *Version history*.

<!-- FIGURE (figure.guide-figure) — lead line p.guide-pair-lead, then div.guide-pair = two side-by-side cards (div.guide-pair-card, each with div.guide-pair-title + bullet list). -->
Lead: "One story · up to two pages"

Card 1 — **Specification**
- What will be delivered, in plain words
- Why it matters
- What you still have to settle
- How you will know it is done
- **Read this one before you approve.**

Card 2 — **Engineering page**
- How it is being built
- The approach, and what it trades away
- The decisions behind it, with the evidence
- Diagrams and internals
- Read this one when you want the detail.

Caption: "Both are written for you and published by the assistant — you never have to write one. A story may have neither, either or both."

#### 9. Chat — asking in your own words {#9-chat-asking-in-your-own-words}

Chat is **off unless the people who run your instance have switched it on**. If there is no **Chat** button in the bar at the top of a story, your instance does not use it — you steer the work with the story's status and its notes, and nothing is missing. The rest of this section is for instances that have it.

Where it is on, every story has its own chat. Press **Chat** in the bar at the top of a story and a panel opens beside your work, already knowing which story, which code and which pages you are talking about. Use it when a note is too slow — when you want to work something through in a back-and-forth.

Type into the box and press Enter to send. Shift+Enter gives you a new line instead.

What happens next is a **turn**: one message from you, one piece of work in response. While it runs, the header says so, and a **Stop** button appears beside the composer. Stopping is immediate and complete — nothing the work started carries on behind your back.

A turn does real work in a real copy of the project, so it takes as long as it takes. You do not have to sit and watch. Come back and the transcript is there.

If you want to see how it got somewhere, there is a **Steps** toggle in the header that shows the individual steps of a turn. It is off by default, because most of the time the answer is the point.

Some instances also have a **Chat** tab in the top bar: the same thing without a story, for when you do not yet know what the story is. It has its own switch, and is off unless the people who run your instance have turned it on.

Occasionally chat tells you it cannot start. The usual reasons are that the project has no workspace configured yet, or that the account the work runs on has hit its usage window. The message says which, and what to do about it.

#### 10. Previews — seeing it run before you say yes {#10-previews-seeing-it-run-before-you-say-yes}

Reading that something works is not the same as watching it work. A story can start a **preview**: the actual build from that story, running, on its own address you can open.

You will find it on the story page. Press **Start preview** and the strip shows **building**, then **up** with the link once the build is genuinely answering. That is a measured fact, not an optimistic one. A project gets ten minutes to build and then a minute to start answering; if it does not, the strip says **failed** and shows the reason.

The address is the story's own — `hq-` and the story's number, in front of your CraftHQ address. On a hosted machine it sits behind the same sign-in as CraftHQ itself.

If the build has a login screen of its own, the strip shows a **Sign in** box while the preview is up: the login to use, and a password you can **Reveal** and **Copy**. It belongs to that one preview and disappears when the preview ends.

A preview is temporary. It runs for four hours and then shuts itself down, so nothing is left running and forgotten. If you need longer, **Extend** gives you another four hours; you can do that once. **Stop** ends it immediately when you are finished. A machine runs three previews at a time; if you are the fourth, the message names the ones you could stop.

When you have looked at it and you are happy, press **Approve preview**. That is a real record: a named person opened this build, looked at it, and signed off. Only a preview that is actually up can be approved, and only once.

Previews need a project that has been set up for them. If the strip tells you something is missing, ask whoever administers the project.

#### 11. Pull requests — where the work lands {#11-pull-requests-where-the-work-lands}

Finished work reaches your code as a **pull request**, and the story keeps track of it under **Pull request**. Until there is one it says *Not opened yet.* After that, each pull request is a link, with its state — **Draft**, **Open**, **Merged** or **Closed without merging** — and who confirmed that state, and when. A story normally has one pull request, or one per repository when the work spans two.

CraftHQ does not watch your repository, so the state is whatever a person last said it was: when you merge, set it to *Merged* here too. The assistant may report that it opened a pull request; only a person can move its state after that.

**The assistant never merges.** It works on a branch, and its access is limited to pushing that branch and opening the pull request. Reviewing and merging are yours, with whatever rules your repository already has.

#### 12. Settings and your account {#12-settings-and-your-account}

Settings holds the things that are yours, plus the project's people if you administer it.

**Claude account** is the account the assistant's work runs on — your own. It tells you which account is connected, and lets you connect one: you sign in on the provider's own page, in a new tab, and paste back the one-time code. CraftHQ never sees your password, and never reads the credential it stores for you. Until this is connected, your stories have nobody to work on them.

**Profile** is your display name — what the board shows on your stories, and the name your assistant's commits carry.

**GitHub** has two parts. Linking your account means pull requests raised for your work are attributed to you rather than to a nameless service. And **Your own GitHub token** lets you store a personal access token: when you have one, CraftHQ pushes and opens pull requests with it instead of through the CraftHQ-AI GitHub App — for organisations that prefer not to install the app. CraftHQ checks the token when you save it and shows, per repository, whether it can push a branch and open a pull request. It is stored encrypted and never shown again.

**Tokens** are your personal access tokens — how the `crafthq` CLI and its Claude Code plugin sign in as you. Everyone has this tab: create one per computer, copy it once; it lasts 90 days, or until you revoke it here. The whole setup is in [Use CraftHQ from Claude Code](/docs/claude-code).

If you administer the project, you also get **People** — the project's people and their invitations — and **Repositories**, who may read and write which repository.

If a tab is not yours to use, CraftHQ says so plainly and points you at an administrator rather than showing you a page that does not work.

Which links appear in the top bar is a project setting, not a personal one, and it is changed by whoever operates the instance rather than from this page.

#### 13. Who can see and do what {#13-who-can-see-and-do-what}

Access in CraftHQ is per project. Everything you see belongs to a project you are a member of, and a project you are not in does not merely refuse you — it does not appear to exist at all. That is deliberate.

Within a project there are two levels. Most people are **members**: they can do all the day-to-day work described in this guide — write stories, leave notes, answer decisions, run previews, approve work. **Admins** can additionally invite people and change what someone else may do.

Separately, your account carries a **discipline**: business, engineering, or both. It gates nothing. All it changes is how things are written for you — whether a summary leads with outcomes in plain language or goes into technical detail.

Finally, the people who run the instance itself are staff. They have an **Admin** tab that nobody else sees — for everyone else it does not exist at all.

Everything in this guide is available to every signed-in person, whatever their role. If something looks missing, it is more likely to be a hidden link than a permission — try the Dashboard first, and ask an administrator if it really is not there.

<!-- nav.guide-neighbours -->
PREVIOUS → [Statuses — how work moves](/docs/statuses) — "The five groups of statuses, what a note does in each, and who moves a story on."
NEXT → [Use CraftHQ from Claude Code](/docs/claude-code) — "Your own token, the crafthq CLI and its Claude Code plugin — set up in ten minutes."

---

<!-- ===================== ARTICLE: /docs/claude-code ===================== -->

### PAGE H1: Use CraftHQ from Claude Code

<!-- lede -->
CraftHQ has a command-line tool, `crafthq`, and a plugin for Claude Code that comes with it. With them you can see what needs you, read a story, tell its assistant something, answer decisions, approve or move work and open the pull request — from your terminal, or by asking Claude in plain words. It signs in as **you**, so it shows and does exactly what you could do here in the browser, and nothing more.

Setting it up takes about ten minutes, once per computer.

<!-- ON THIS PAGE  (note: first item is un-numbered) -->
Who it is for → #who-it-is-for
1. Create your token → #1-create-your-token
2. Install the CLI and the plugin → #2-install-the-cli-and-the-plugin
3. Sign in → #3-sign-in
4. First commands → #4-first-commands
5. What you can do from Claude Code → #5-what-you-can-do-from-claude-code
6. How long things last → #6-how-long-things-last
7. Troubleshooting → #7-troubleshooting
8. What stays in the browser → #8-what-stays-in-the-browser

#### Who it is for {#who-it-is-for}

Anyone on a CraftHQ project who works in Claude Code or a terminal — business or engineering, member or admin. You do not need anybody's permission to start: every person creates their own token.

| You need | Check |
|---|---|
| A CraftHQ account you can sign in with here | you are reading this |
| **Claude Code** | `claude --version` |
| **Node.js 18 or newer** (the CLI and plugin are Node programs) | `node --version` |
| **cloudflared** — only if this instance sits behind Cloudflare Access (you see a Cloudflare sign-in page before CraftHQ's own). **app.crafthq.ai does not** once it is public: skip cloudflared there | `cloudflared --version` |

Install cloudflared on macOS with `brew install cloudflared`; on Linux use Cloudflare's package for your distribution. On Windows, use WSL — the CLI is tested on macOS and Linux.

#### 1. Create your token {#1-create-your-token}

Open [Settings › Tokens](/settings/tokens), give the token a name (the computer it is for — *laptop*, say) and press **Create token**. Copy the `chq_…` value straight away: it is shown **once**, and only its name and first letters stay visible afterwards.
<!-- link href above is inferred (rendered as a red underlined link) — point it at your Settings › Tokens route -->

- A token **lasts 90 days** from the day you create it, or until you revoke it. The Tokens tab shows the date each one ends; make a new one before then and run `crafthq login` again (step 3).
- Treat it like a password. Never paste it into a chat, a story note or a ticket.
- Make one per computer, so you can revoke one without touching the others.

Right under the new token, the Tokens tab repeats the next three steps with this instance's address already filled in.

#### 2. Install the CLI and the plugin {#2-install-the-cli-and-the-plugin}

Download the CLI from this instance. **Settings › Tokens** shows a *Download the CLI* link when the instance offers it. From a terminal you can fetch the same file with your token instead (`read -rs` keeps the token out of your shell history):

```sh
read -rs CRAFTHQ_TOKEN   # paste your chq_… token, then press Enter
printf 'Authorization: Bearer %s\n' "$CRAFTHQ_TOKEN" |
  cloudflared access curl https://app.crafthq.ai/api/v2/cli/bundle -H @- -o crafthq-cli.tgz
unset CRAFTHQ_TOKEN
```

The header goes in on standard input (`-H @-`), so the token is never on a command line where another program on the computer could read it.

(Not behind Cloudflare Access? Use plain `curl` with the same arguments. Given a service token instead — see step 3 — add its two `CF-Access-Client-…` headers to plain `curl`.)

Then unpack it and run the install script inside. It puts `crafthq` on your PATH and adds the plugin to Claude Code:

```sh
mkdir -p ~/.crafthq/cli
tar -xzf crafthq-cli.tgz -C ~/.crafthq/cli
sh ~/.crafthq/cli/install.sh
```

Open a new terminal afterwards (and restart Claude Code if it was running), then check that `command -v crafthq` prints a path.

If there is no download link and the command answers *no CLI bundle on this instance*, this instance does not offer the CLI yet — ask whoever runs it.

#### 3. Sign in {#3-sign-in}

First, if this instance sits behind Cloudflare Access, sign in to Cloudflare as yourself. A browser opens; use the same login you use for this website. (No Cloudflare sign-in page before CraftHQ's own — app.crafthq.ai once it is public? Skip this, and use `--access none` below.)

```sh
cloudflared access login https://app.crafthq.ai
```

Then sign the CLI in. `--instance` is a short name you choose for this CraftHQ (it is how you pick it if you ever use more than one). The CLI asks for your token at a hidden prompt, checks it with CraftHQ and saves it only on your computer, readable only by you.

```sh
crafthq login --instance app --url https://app.crafthq.ai --access cloudflared
```

How the CLI gets past Cloudflare Access is the `--access` option:

| `--access` | When |
|---|---|
| `cloudflared` | the usual case: this instance sits behind Cloudflare Access and lets you in as yourself (the `cloudflared access login` above) |
| `service-token --access-env FILE` | whoever runs the instance gave you an Access **service token** instead. Put its two lines (`CF_ACCESS_CLIENT_ID=…`, `CF_ACCESS_CLIENT_SECRET=…`) in a file only you can read (`chmod 600 FILE`) and name that file; the CLI never stores the secret itself |
| `none` | not behind Cloudflare Access (app.crafthq.ai once it is public) — also clears an access saved by an earlier login |

`crafthq setup login --url https://app.crafthq.ai` prints the exact login line for an instance.

#### 4. First commands {#4-first-commands}

```sh
crafthq whoami          # who you are, and your projects
crafthq inbox           # what needs you, and why
crafthq board --mine    # your stories: open · in progress · in review · blocked
crafthq story 102       # one story: spec, plan, last run, CI, preview, PR, whose turn
crafthq tell 102 "Use the 7-day window, not 30"   # a note the story's assistant reads
crafthq decide 41 B     # answer decision 41 with option B — final, like in the browser
```

Story ids can be written `102` or `hq-102`. Add `--json` to any command for a script.

In Claude Code you can type `/crafthq:inbox` or `/crafthq:story 102`, or just ask: *"what needs me in CraftHQ?"*, *"summarise hq-102's plan"*. Before anything that changes CraftHQ runs, Claude Code asks your permission (unless you have told it to allow that tool).

#### 5. What you can do from Claude Code {#5-what-you-can-do-from-claude-code}

Your role comes from your CraftHQ account; the CLI never adds to it.

| You are | From Claude Code and the CLI | Still in the browser |
|---|---|---|
| **Member** (business) | inbox, board, a story and its notes and files, tell, decide, approve · pause · re-run · move status, new and edit stories, attach files, promote and import intake, Create PR | previews, re-assigning a story, the Changes screen, Settings |
| **Member** (engineering) | the same; Create PR needs your GitHub connected first (Settings › GitHub) | the same |
| **Project admin** | the same as a member; the intake also shows colleagues' private imports, read only | People, Repositories, the project's tracker mapping |
| **Staff** (the people who run the instance) | the same, plus switching a project's loop features | everything under Admin |

Every member of a project may move, comment on and approve every story in it — one shared board. A project you are not in reads as "not found".

Whoever runs the instance can switch the CLI off for a project (Admin › the project › Loop features › *CLI and plugin*). Where it is off, every command but `whoami` and `features` refuses, and says so.

#### 6. How long things last {#6-how-long-things-last}

| What | How long | When it ends |
|---|---|---|
| **Your token** | 90 days from when you create it | the date shown in Settings › Tokens, or earlier if you revoke it there or your account is disabled. Leaving a project only takes that project out of what it reaches |
| **Your Cloudflare sign-in** (instances behind Cloudflare Access) | as long as the instance's Access session — set by whoever runs it, often 7 to 30 days | commands answer *blocked by Cloudflare Access*: run `cloudflared access login https://app.crafthq.ai` again |
| **Your sign-in on this website** | 30 days, renewed while you use it | sign in again |

#### 7. Troubleshooting {#7-troubleshooting}

| You see | What it means | Do this |
|---|---|---|
| `blocked by Cloudflare Access` | your Cloudflare sign-in is missing or has run out | `cloudflared access login https://app.crafthq.ai` |
| `CraftHQ rejected the token (401)` | the token is wrong, was revoked, or reached its 90 days | create a new one in Settings › Tokens, then `crafthq login --instance app` again |
| `… not found or not a member` | a wrong id, or a story outside your projects | check the id with `crafthq board` |
| `CraftHQ CLI tools are turned off for …` | the CLI is switched off for that project | ask whoever runs the instance; don't work around it |
| `work is under way on hq-…` | a build is running, so the status is locked | wait, or `crafthq tell` it |
| `no CLI bundle on this instance` | this instance offers no download | ask whoever runs it for the CLI |
| `crafthq: command not found` | the install did not reach this terminal's PATH | open a new terminal; if it persists, run `sh ~/.crafthq/cli/install.sh` again |
| `/crafthq:…` commands missing in Claude Code | Claude Code has not loaded the plugin yet | restart Claude Code; if they are still missing, run the install script again |
| `… passes Cloudflare Access with cloudflared, which is not installed` | cloudflared is missing | install it, then sign in (step 3) |

**Lost a computer?** Revoke its token in Settings › Tokens straight away. On a computer you still have, `crafthq logout` removes the token from it — revoke it here too.

#### 8. What stays in the browser {#8-what-stays-in-the-browser}

Use the website for these:

- starting, stopping, extending or approving a **preview**;
- **re-assigning** a story, or choosing its owner when you create it;
- the **Changes** screen (the diff) and reading a spec or engineering page in full (the CLI shows an excerpt and a link);
- **Settings** — your Claude account, GitHub, issue tracker, profile and tokens — and, for admins, People and Repositories.

New to CraftHQ itself? Start with [Getting started](/docs/getting-started).

<!-- nav.guide-neighbours (last article: only a PREVIOUS card) -->
PREVIOUS → [The full guide](/docs/guide) — "Every screen and feature, in depth."
