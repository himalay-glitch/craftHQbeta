---
# The live site's Docs, word for word (docs/CRAFTHQ_DOCS_SPEC.md §6). `title` is the name in the
# Articles list, `h1` the page's heading, `summary` the line on the Previous/Next cards, `order` the
# position. Below: the intro, then one `## ` heading per section; each section's link is made from
# its heading's words ("1. Before your first story" → #1-before-your-first-story).
title: "Getting started"
h1: "Getting started"
minutes: 3
summary: "Your first story, start to finish, and the three rules that cover most of it."
order: 1
---

Five minutes, start to finish. You describe a piece of work as a **story**; the assistant plans it, you say go, it builds and checks its own work, and you review the result. You steer with two things only: the story's **Status** and its **notes**.

## 1. Before your first story

Two one-time connections, both under **Settings**:

- **Claude account**: the assistant works on *your* Claude subscription. Until you connect it, your stories wait with nobody to pick them up.
- **GitHub**: link your account (or save a personal access token) so pull requests can be opened in your name.

## 2. Your first story, in five steps

1. **Create it.** At the top of **Stories**: a title, a few plain sentences about what you want, any files or screenshots that help, then **Add story**. It starts as **New**, and it is **yours**: your own assistant is the one that will work on it. (Filing it for a colleague? Pick their name in the **Mine** box before you add it, and their assistant picks it up instead.)
2. **Let it be planned.** Within a minute the assistant picks it up, writes a plan on the story's page, moves it to **Planning**, and may ask you questions; you will find them in the story's **Decisions** panel and under *Needs you* on the Dashboard. Nothing is built yet.
3. **Talk it through.** Add notes: corrections, constraints, "what about…". Each note gets the plan revised and handed back to you. Answer the decisions; an unanswered one is the most common reason work stands still.
4. **Say go.** Set **Status → Approved**. That single change is what starts the build. The story moves to **In progress** by itself, and the badge reads *Claude · working*.
5. **Review.** When the work has passed an independent check it comes back as **In review**, with a pull request (and a preview, where the project has one).
   - A question? Write a note: you get an answer, and nothing is changed.
   - Want changes? Write what to change, then set **Status → Approved** again.
   - Happy? Merge the pull request and set **Status → Done**.

## 3. The statuses at a glance

| Group | Statuses | What a note does | What moves it on |
|---|---|---|---|
| **Thinking**: no code is touched | New, Planning | The plan is revised | **You** set Approved |
| **Go** | Approved |  | The assistant starts, and moves it to In progress |
| **Building and checking** | In progress | You get an answer; nothing you wrote is lost | The assistant moves it to In review once it has passed an independent check |
| **Your review** | In review | You get an answer; code is *not* changed | **You**: Approved again for changes, Done to accept |
| **Closed** | Done, Cancelled |  |  |

The full explanation, with the questions people actually ask, is in [Statuses: how work moves](/docs/statuses).

## 4. Three rules that cover most of it

- **A note never changes code.** Only **Approved** starts building: the first time, and every time you want changes after a review.
- **Read the badge.** *You · …* means the story is waiting for you (a plan to read, a question to answer, work to review). *Claude · …* means it is not.
- **Clear your side of the board.** The Dashboard gathers everything that needs you in one place. Work only stalls when a decision or a review sits unanswered.

## 5. Where next

- [Statuses: how work moves](/docs/statuses): eight minutes, the whole life of a story and what each status means for you.
- [The full guide](/docs/guide): every screen and feature, for when you want the detail.
