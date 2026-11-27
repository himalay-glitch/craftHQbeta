---
# The live site's Docs, word for word (docs/CRAFTHQ_DOCS_SPEC.md §6). `title` is the name in the
# Articles list, `h1` the page's heading, `summary` the line on the Previous/Next cards, `order` the
# position. Below: the intro, then one `## ` heading per section; each section's link is made from
# its heading's words ("1. Before your first story" → #1-before-your-first-story).
title: "The full guide"
h1: "How to use CraftHQ"
minutes: 20
summary: "Every screen and feature, in depth."
order: 3
---

This is the whole thing, start to end, for someone who opened CraftHQ today. Read it once and you will know what every page is for and what is being asked of you.

It is written as a guide, not a reference. Nothing here assumes you write code. In a hurry? [Getting started](/docs/getting-started) is the five-minute version, and [Statuses: how work moves](/docs/statuses) explains the one thing people get wrong most often.

## 1. What CraftHQ is

CraftHQ is where you watch a piece of software being built, and where you say what you want.

Most of the building is done by an assistant working in the background. CraftHQ is the place the two of you meet: you say what you need, it does the work, and the result comes back here for you to look at.

So the app is not a to-do list, and it is not a chat window with some project management stapled on. It is a record of work in flight. Every piece of work has a page, and that page always tells you two things: where the work has got to, and whether anything is waiting on you.

That second thing is the one to hold on to. The single most useful habit in CraftHQ is to ask: *is anything sitting in my court?* The app is built to answer that in one glance.

What CraftHQ does not do is make decisions for you. It will not approve its own work, it will not decide what matters, and it will not merge anything because it thinks it is ready. Those moments are yours, and the app is careful to hand them to you rather than route around you.

## 2. Finding your way around

Everything lives behind the bar across the top. On a narrow screen the bar folds into a **Menu** button, and everything below is in there instead.

Most people see five links: **Dashboard**, **Stories**, **Feature Pages**, **Docs** and **Settings**.

**Dashboard** is the board, and the page to open if you only ever open one. On the left, a rail that stays put: **Agent's turn** (what the assistant is *running* and what is *queued* behind it), then **Stories by status** and **Recent activity**. Open questions are not listed here: each one shows on its story (a story with one waiting reads **You · decision** under **Needs you**), and every open question is on the **Decisions** page. On the right, **Needs you**: every story that is waiting for something only you can give. Beside the heading is a small version badge, so you can always say which release you are looking at.

**Stories** is the full list of work. A story is one piece of work; section 3 is all about them.

**Feature Pages** collects the written pages that belong to the work: the plain plan, and the technical detail behind it. Section 8.

**Docs** is these articles. **Settings** is your own account and, if you administer the project, its people. Section 12.

Some links are switched off until a project wants them: **Standup** (the assistant's daily summaries), **Decisions** (every open question in one list), **Ideas** (drop a one-line idea for later), **Intake** (things raised from outside, waiting for a person to turn them into stories) and **Report** (how the work has been flowing). They are turned on per project by whoever operates your instance. Nothing is deleted when a link is hidden; the page still works if you have its address. **Chat** (the tab in the top bar, and the Chat button inside a story) appears only on instances where it has been switched on (section 9). Docs and Settings can never be hidden.

If you belong to more than one project, a switcher appears in the bar. Everything you see (stories, decisions, pages) belongs to the project you have selected.

There is also a light/dark toggle. It remembers your choice on that device.

**Finding a story.** Both the Dashboard and Stories have a **Search stories** box. It looks in titles, descriptions, notes and decisions, and each result says *why* it matched. Press **/** from anywhere to jump into it; **Esc** clears it. Next to it, **Show** narrows the list to **Mine**, the whole **Team**, **Unassigned**, or one person's stories (the Dashboard opens on *Mine*, the Stories page on *Team*), and **Sort** orders it by story number or by what changed last.

**Getting around without the mouse.** Press **?** anywhere to see the shortcuts for *your* bar. Each tab has its own letter after **g** (**g** then **d** for the Dashboard, **g** then **s** for Stories, **g** then **p** for Feature Pages), and the sheet lists exactly the tabs you have. **Ctrl+K** (**⌘K** on a Mac) opens a box you can type a page name into instead, if you would rather not learn letters. **Esc** closes whatever is open.

A few more worth knowing. On the Stories page and the Dashboard's *Needs you* list, **j** and **k** move down and up the stories and **Enter** opens the one you are on. **a** puts the cursor in the first question waiting for your answer on the page you are on. And **Ctrl+Enter** (**⌘Enter**) sends whatever you are typing (a note, an answer, a chat message) from any box in the app.

The single letters only work when you are not typing in a box, so they never swallow a word. If you use speech input, or would rather they did not fire at all, turn them off with the switch at the bottom of the **?** sheet: the Ctrl-combinations keep working.

**Keys not responding?** A browser extension that adds its own keyboard shortcuts (Vimium is the common one) catches **g**, **j**, **k**, **?** and **/** before the page sees them. Press **g** then **s** in a private window to check; to fix it, add this site to the extension's excluded sites (in Vimium: *Options → Excluded URLs and keys*). **Ctrl+K** keeps working either way.

## 3. A story is one piece of work

A story is the unit everything else hangs off. It has a title, a short statement of intent, whatever detail has been gathered, and a status.

Open one and you get its whole life on a single page: a one-line note on where it stands, its written pages, the conversation between you and the assistant, any questions waiting for you, its preview and pull request, its files, and a history of everything that has happened to it.

**Stories are created by people.** Write one yourself at the top of the Stories page: a title, optionally the one-line *intent* and some detail, and any files that help, then **Add story**. Or turn an idea into one from Ideas or Intake. The assistant can *suggest* a story (in a note, or as an item in Intake), but it cannot create one; a person always decides what goes on the list.

However a story starts, it starts small and unapproved. It gets fleshed out before anyone builds anything, and you are the one who says when it is ready.

**Every story has an owner.** A story you file is yours, unless you pick a colleague in the **Mine** box as you file it; a story you promote from Intake is yours too. The chip near the top names who it is assigned to, and the pencil beside it hands it to somebody else; there is no "nobody" to pick, so a story is never left without an owner. On lists the owner is a small circle with their initials, with a dot while their assistant is working on it. The owner matters: each person has their own assistant, running on their own account, and it works on *their* stories, and only theirs: it cannot write on a colleague's story.

A few older stories may still say *Unassigned*; they were filed before this rule. The **Show → Unassigned** filter finds them; open one and pick its owner.

Near the top is also a short status line: a single sentence saying where the work is. It is meant to be the honest headline. You can write it yourself with the pencil beside it, and the assistant rewrites it as things move.

**Files.** Drop a file anywhere on a story, or use **Files** in the bar at the top of the page. Screenshots show as thumbnails; everything else is a download. Images, PDFs, HTML, text, CSV, JSON, zip and Office files are accepted, up to 10 MB each. If a file is refused, the page says why. An image you have attached can be shown inline in a note.

## 4. The statuses, and who moves them

A story is always in exactly one of seven states.

**New** means it exists but nobody has worked out what it really is yet.

**Planning** means it is being thought through: what will be delivered, why, and what has to be settled first. The result is written down on the story's specification page.

**Approved** is your word. It means: yes, build this. Nothing is built before it.

**In progress** means the assistant is building it right now.

**In review** means the work is finished and has already survived an independent check. It is now on your desk to look at.

**Done** means you are satisfied and the story is closed.

**Cancelled** means it will not happen after all.

[Statuses: how work moves](/docs/statuses) groups these seven and goes through what each one means for you. The diagram below shows who moves a story on from each state. The short version is that the two hand-offs that matter are yours: approving a plan, and closing a finished piece of work.

One honest caveat. CraftHQ *shows* the state of the work; it does not enforce it. Any status can be set by anyone on the project, and there is nothing to stop you dragging a story anywhere. The flow below is how work actually moves, not a rule the app polices.

<figure class="guide-figure">
  <div class="guide-flow">
    <div class="guide-flow-step"><div class="guide-flow-step-name">New</div><div class="guide-flow-step-who">the assistant works it into a plan</div></div>
    <span class="guide-flow-arrow" aria-hidden="true">→</span>
    <div class="guide-flow-step"><div class="guide-flow-step-name">Planning</div><div class="guide-flow-step-who">you approve, once the plan is right</div></div>
    <span class="guide-flow-arrow" aria-hidden="true">→</span>
    <div class="guide-flow-step"><div class="guide-flow-step-name">Approved</div><div class="guide-flow-step-who">the assistant picks it up</div></div>
    <span class="guide-flow-arrow" aria-hidden="true">→</span>
    <div class="guide-flow-step"><div class="guide-flow-step-name">In progress</div><div class="guide-flow-step-who">it moves on only after an independent check</div></div>
    <span class="guide-flow-arrow" aria-hidden="true">→</span>
    <div class="guide-flow-step"><div class="guide-flow-step-name">In review</div><div class="guide-flow-step-who">you look at it, then close it</div></div>
    <span class="guide-flow-arrow" aria-hidden="true">→</span>
    <div class="guide-flow-step"><div class="guide-flow-step-name">Done</div><div class="guide-flow-step-who">finished</div></div>
  </div>
  <p class="guide-flow-aside"><strong>Cancelled</strong> sits outside the line: you can set it at any point, and it means the work will not happen.</p>
  <figcaption class="guide-figure-caption">Nothing here is locked. CraftHQ shows the state of the work; it does not police it, so anyone on the project can set any status. The order above is how the work actually flows.</figcaption>
</figure>

## 5. Whose turn it is

Beside every story is a small badge saying whose court the ball is in. It is the fastest thing on the page to read, and it is never a guess.

When it is your turn, the badge says so and why: **You · triage**, **You · planning** (a plan is waiting to be read), **You · decision** (a question is waiting for your answer), **You · review** (finished work is waiting for your look).

When it is the assistant's turn, it says that instead: **Claude · queued** (it has the ball and has not started yet, normally a matter of seconds), **Claude · working**, or **Claude · checking** while the project's automatic checks run.

The turn flips by itself as things happen. Writing a note passes the ball to the assistant. The assistant replying passes it back to you. Answering a question passes it on. Approving a story puts it in the assistant's court.

You do not need to reload to see any of this. A story page re-reads itself every ten seconds while the ball is with the assistant and every minute otherwise, and the Dashboard every minute, without disturbing a note you are half-way through typing. A tab you are not looking at pauses, and catches up the moment you return.

If you want a single rule for using CraftHQ well, it is this: clear your side of the board. Work only stalls when a question or a review sits unanswered.

## 6. Notes: how you talk to the assistant

Every story has a notes thread, under the heading **Notes / Direction**. The box is at the top and the thread runs newest-first beneath it, each entry marked as coming from a person or from the assistant.

Use it for anything you would say to a colleague working on the task. Correct a misunderstanding. Add a constraint you forgot. Ask what is going on. Say the thing you want done differently.

A note is never blocking and never formal. You can write one at any point, in any status, and you do not need permission or a particular moment.

What a note *does* depends on where the story is. While a story is being planned, a note gets the plan revised. Once it is being built or is in review, a note gets an answer: **it never changes code by itself.** To have finished work changed, say what you want in a note and set the status back to **Approved**. The statuses article explains why.

Markdown works in a note (lists, bold, links, headings), and so do images. If you have attached a screenshot to the story, you can point at it from your note and it shows up inline.

Two things to know. First, who a note is from is decided by who is signed in, not by whatever the text claims. Second, writing one flips the turn to the assistant, so the board updates the moment you hit send.

## 7. Decisions: the questions only you can answer

Sometimes the work reaches a fork that is not the assistant's to choose. Those become **decisions**: a question, put to you, with the story it belongs to.

A decision is not a status update dressed as a question. The assistant settles small, easily reversed choices itself. When it raises one of those anyway, it is not parked: the story's **Decisions** panel shows it as *Decided by the assistant: \<its choice>*, already in effect, and you can **Confirm** it or **Overturn** it (saying what to do instead). It asks you only when a choice is hard to undo or reaches beyond the story in front of it, and it always arrives with the evidence behind it, often a page you can read first.

**Where you find them.** On the story itself, in its **Decisions** panel; on the Dashboard, where a story with an open question sits under *Needs you*; and, if your project shows it, on the **Decisions** tab, which lists every open question in one place.

Answering one is quick. If the question offers lettered options, pick one; that fills the answer box and you can still type over it. Add anything you want to say, and submit. Your answer is the record. The assistant treats it as binding and picks the work back up from there; you do not need to change the status.

Three labels help you triage a pile of them: how urgent it is (*Now*, *Today*, *This week*), how far a wrong call would reach (*Local*, *Module*, *Global*), and who it is written for (*For business* or *For engineering*). Open questions are sorted most urgent first.

There is one case where a question does not simply wait for you. If a question is easily reversible, and it came with a stated default and a stated timer, and that timer runs out, the default is taken and the work continues. Nothing is hidden when that happens: on the story's Decisions panel the question moves to **Proceeded**, and you either **Confirm** the default or **Reverse** it. Reversing one requires you to say what should have happened instead. Proceeded questions show on the story, not on the Decisions tab, so glance at a story's panel when you come back to it.

This only happens for reversible things, only with a default written down in advance, and only after the clock has really run out. Anything that cannot be undone waits for you, however long that takes.

## 8. The two pages on a story

Alongside the conversation, a story carries written pages: the considered version of what is happening, kept up to date as the work moves.

There are two kinds, and they are for different readers. The **specification** is for you: what will be delivered, why it matters, what you still have to settle, and how you will know it is done. The **engineering page** is the technical twin: the approach, the trade-offs, the decisions and the evidence.

Both open from the story with a single click, in a panel over the page, and from there in a tab of their own.

You are never expected to write either of them. They are published by the assistant and rewritten as the work changes; your part is to read the specification before you approve, and to say so in a note if it has got something wrong.

A page keeps its history. When a page is republished, the version it replaced is kept (the last five of them), and you can put an earlier one back. You will find that under **Feature Pages**: open the page there and look for *Version history*.

<figure class="guide-figure">
  <p class="guide-pair-lead">One story · up to two pages</p>
  <div class="guide-pair">
    <div class="guide-pair-card">
      <div class="guide-pair-title">Specification</div>
      <ul class="guide-pair-list">
        <li>What will be delivered, in plain words</li>
        <li>Why it matters</li>
        <li>What you still have to settle</li>
        <li>How you will know it is done</li>
        <li><strong>Read this one before you approve.</strong></li>
      </ul>
    </div>
    <div class="guide-pair-card">
      <div class="guide-pair-title">Engineering page</div>
      <ul class="guide-pair-list">
        <li>How it is being built</li>
        <li>The approach, and what it trades away</li>
        <li>The decisions behind it, with the evidence</li>
        <li>Diagrams and internals</li>
        <li>Read this one when you want the detail.</li>
      </ul>
    </div>
  </div>
  <figcaption class="guide-figure-caption">Both are written for you and published by the assistant; you never have to write one. A story may have neither, either or both.</figcaption>
</figure>

## 9. Chat: asking in your own words

Chat is **off unless the people who run your instance have switched it on**. If there is no **Chat** button in the bar at the top of a story, your instance does not use it; you steer the work with the story's status and its notes, and nothing is missing. The rest of this section is for instances that have it.

Where it is on, every story has its own chat. Press **Chat** in the bar at the top of a story and a panel opens beside your work, already knowing which story, which code and which pages you are talking about. Use it when a note is too slow: when you want to work something through in a back-and-forth.

Type into the box and press Enter to send. Shift+Enter gives you a new line instead.

What happens next is a **turn**: one message from you, one piece of work in response. While it runs, the header says so, and a **Stop** button appears beside the composer. Stopping is immediate and complete: nothing the work started carries on behind your back.

A turn does real work in a real copy of the project, so it takes as long as it takes. You do not have to sit and watch. Come back and the transcript is there.

If you want to see how it got somewhere, there is a **Steps** toggle in the header that shows the individual steps of a turn. It is off by default, because most of the time the answer is the point.

Some instances also have a **Chat** tab in the top bar: the same thing without a story, for when you do not yet know what the story is. It has its own switch, and is off unless the people who run your instance have turned it on.

Occasionally chat tells you it cannot start. The usual reasons are that the project has no workspace configured yet, or that the account the work runs on has hit its usage window. The message says which, and what to do about it.

## 10. Previews: seeing it run before you say yes

Reading that something works is not the same as watching it work. A story can start a **preview**: the actual build from that story, running, on its own address you can open.

You will find it on the story page. Press **Start preview** and the strip shows **building**, then **up** with the link once the build is genuinely answering. That is a measured fact, not an optimistic one. A project gets ten minutes to build and then a minute to start answering; if it does not, the strip says **failed** and shows the reason.

The address is the story's own: `hq-` and the story's number, in front of your CraftHQ address. On a hosted machine it sits behind the same sign-in as CraftHQ itself.

If the build has a login screen of its own, the strip shows a **Sign in** box while the preview is up: the login to use, and a password you can **Reveal** and **Copy**. It belongs to that one preview and disappears when the preview ends.

A preview is temporary. It runs for four hours and then shuts itself down, so nothing is left running and forgotten. If you need longer, **Extend** gives you another four hours; you can do that once. **Stop** ends it immediately when you are finished. A machine runs three previews at a time; if you are the fourth, the message names the ones you could stop.

When you have looked at it and you are happy, press **Approve preview**. That is a real record: a named person opened this build, looked at it, and signed off. Only a preview that is actually up can be approved, and only once.

Previews need a project that has been set up for them. If the strip tells you something is missing, ask whoever administers the project.

## 11. Pull requests: where the work lands

Finished work reaches your code as a **pull request**, and the story keeps track of it under **Pull request**. Until there is one it says *Not opened yet.* After that, each pull request is a link, with its state (**Draft**, **Open**, **Merged** or **Closed without merging**) and who confirmed that state, and when. A story normally has one pull request, or one per repository when the work spans two.

CraftHQ does not watch your repository, so the state is whatever a person last said it was: when you merge, set it to *Merged* here too. The assistant may report that it opened a pull request; only a person can move its state after that.

**The assistant never merges.** It works on a branch, and its access is limited to pushing that branch and opening the pull request. Reviewing and merging are yours, with whatever rules your repository already has.

## 12. Settings and your account

Settings holds the things that are yours, plus the project's people if you administer it.

**Claude account** is the account the assistant's work runs on: your own. It tells you which account is connected, and lets you connect one: you sign in on the provider's own page, in a new tab, and paste back the one-time code. CraftHQ never sees your password, and never reads the credential it stores for you. Until this is connected, your stories have nobody to work on them.

**Profile** is your display name: what the board shows on your stories, and the name your assistant's commits carry.

**GitHub** has two parts. Linking your account means pull requests raised for your work are attributed to you rather than to a nameless service. And **Your own GitHub token** lets you store a personal access token: when you have one, CraftHQ pushes and opens pull requests with it instead of through the CraftHQ-AI GitHub App, for organisations that prefer not to install the app. CraftHQ checks the token when you save it and shows, per repository, whether it can push a branch and open a pull request. It is stored encrypted and never shown again.

**Tokens** are your personal access tokens: how the `crafthq` CLI and its Claude Code plugin sign in as you. Everyone has this tab: create one per computer, copy it once; it lasts 90 days, or until you revoke it here. The whole setup is in [Use CraftHQ from Claude Code](/docs/claude-code).

If you administer the project, you also get **People** (the project's people and their invitations) and **Repositories**, who may read and write which repository.

If a tab is not yours to use, CraftHQ says so plainly and points you at an administrator rather than showing you a page that does not work.

Which links appear in the top bar is a project setting, not a personal one, and it is changed by whoever operates the instance rather than from this page.

## 13. Who can see and do what

Access in CraftHQ is per project. Everything you see belongs to a project you are a member of, and a project you are not in does not merely refuse you; it does not appear to exist at all. That is deliberate.

Within a project there are two levels. Most people are **members**: they can do all the day-to-day work described in this guide: write stories, leave notes, answer decisions, run previews, approve work. **Admins** can additionally invite people and change what someone else may do.

Separately, your account carries a **discipline**: business, engineering, or both. It gates nothing. All it changes is how things are written for you: whether a summary leads with outcomes in plain language or goes into technical detail.

Finally, the people who run the instance itself are staff. They have an **Admin** tab that nobody else sees; for everyone else it does not exist at all.

Everything in this guide is available to every signed-in person, whatever their role. If something looks missing, it is more likely to be a hidden link than a permission: try the Dashboard first, and ask an administrator if it really is not there.
