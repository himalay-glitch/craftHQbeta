---
# The live site's Docs, word for word (docs/CRAFTHQ_DOCS_SPEC.md §6). `title` is the name in the
# Articles list, `h1` the page's heading, `summary` the line on the Previous/Next cards, `order` the
# position. Below: the intro, then one `## ` heading per section; each section's link is made from
# its heading's words ("1. Before your first story" → #1-before-your-first-story).
title: "Statuses: how work moves"
h1: "Statuses: how work moves"
minutes: 8
summary: "The five groups of statuses, what a note does in each, and who moves a story on."
order: 2
---

A story is always in exactly one of seven statuses. They fall into five groups, and the group (not the individual status) tells you what will happen when you write a note or change the status. This page explains each group, who moves a story from one to the next, and the questions people ask most.

One rule sits under everything else: **a note is a conversation; a status is an instruction.** Notes are read and answered in every open status (not on a closed story; see §6). Building starts only when a story is **Approved**.

A status says what you asked for; it does not say what is running. The story's status menu shows both (*Approved · Queued*, *Approved · Building*, *In review · Checking*), so you can tell an instruction that is waiting from work that is under way (§7).

## 1. The five groups

| Group | Statuses | In one line |
|---|---|---|
| **Thinking** | New · Planning | The plan is being worked out. No code is touched, however many notes you write. |
| **Go** | Approved | Your instruction to build. It lasts until a builder picks the story up and moves it on, and the menu says what it is waiting for: a free slot, a sign-in, a pause, a builder that is not running, or other work on the story finishing. |
| **Building and checking** | In progress | The assistant is building, then a second, independent agent checks the result. |
| **Your review** | In review | The work passed its check and is waiting for you. |
| **Closed** | Done · Cancelled | Finished, or not going to happen. Nothing picks these up. |

<figure class="guide-figure">
  <div class="guide-groups">
    <div class="guide-groups-row">
      <div class="guide-groups-box"><div class="guide-groups-name">Thinking</div><div class="guide-groups-statuses">New · Planning</div></div>
      <div class="guide-groups-move by-you"><span class="guide-groups-arrow" aria-hidden="true">→</span><span class="guide-groups-move-who">you approve</span></div>
      <div class="guide-groups-box"><div class="guide-groups-name">Go</div><div class="guide-groups-statuses">Approved</div></div>
      <div class="guide-groups-move by-assistant"><span class="guide-groups-arrow" aria-hidden="true">→</span><span class="guide-groups-move-who">the assistant starts</span></div>
      <div class="guide-groups-box"><div class="guide-groups-name">Building and checking</div><div class="guide-groups-statuses">In progress</div></div>
      <div class="guide-groups-move by-assistant"><span class="guide-groups-arrow" aria-hidden="true">→</span><span class="guide-groups-move-who">the assistant, after an independent check</span></div>
      <div class="guide-groups-box"><div class="guide-groups-name">Your review</div><div class="guide-groups-statuses">In review</div></div>
      <div class="guide-groups-move by-you"><span class="guide-groups-arrow" aria-hidden="true">→</span><span class="guide-groups-move-who">you accept</span></div>
      <div class="guide-groups-box"><div class="guide-groups-name">Closed</div><div class="guide-groups-statuses">Done · Cancelled</div></div>
    </div>
    <p class="guide-groups-return by-you">↩ <strong>Your review</strong> back to <strong>Go</strong>: you want changes → Approved again</p>
  </div>
  <figcaption class="guide-figure-caption">Amber moves are yours: approving a plan, accepting the result, asking for changes. Red ones are the assistant's, and it never makes yours for you.</figcaption>
</figure>

## 2. Thinking: New and Planning

**What it is for.** Working out *what* will be built before anything is. A story you create starts as **New**. Where an assistant plans on this instance, it picks the story up (the description you wrote is the first input), writes a plan on the story's page, raises the questions it cannot answer itself as **Decisions**, and moves the story to **Planning**. New does not mean a plan is being written: the menu says *Run open* when one is, and otherwise "nothing has been planned yet".

**What a note does here.** It revises the plan. Write a correction, a constraint, a "have you considered…": the assistant re-reads the thread, updates the page and hands the story back to you, usually with *Ready to approve* once nothing is open. Answering a decision does the same. You can go round this loop as many times as you like: nothing is built, and no file in your repository changes.

**Moving it back to Planning** (from a later status) asks for nothing by itself: a plan is written in answer to input. Write a note saying what should change; the menu's hint says so.

**What moves it on.** Only you: set **Status → Approved**.

**Who is waiting for whom.** *You · planning*: a plan is waiting for you to read. *You · decision*: a question is waiting for your answer. *Claude · queued* or *Claude · working*: your note or answer is being dealt with.

## 3. Go: Approved

**What it is for.** The one instruction that means *build this*. When a builder is running on the instance, it picks the story up, makes a working branch for it, and moves it to **In progress** itself.

Until then the menu says what the story is waiting for; it promises no timing:

- *Approved · Waiting to start*: nothing stands in the way; a builder has not picked it up yet. If the instance's runner has not checked in lately, the menu says that instead.
- *Approved · Paused*: the assistant is paused by a usage limit; nothing starts until the pause ends.
- *Approved · Queued*: every building slot is busy; it starts when one is free.
- *Approved · Waiting for sign-in*: a job stopped because the person it runs as must sign in again (Settings → Claude account). Sign in, choose **Clear the stopped job** in the menu, then approve again.
- *Approved · Needs you* with "a job stopped and its outcome is unknown": an earlier build stopped without saying how it ended. Nothing new starts beside it (it might have pushed half its work). Check the branch, then say what happened in the menu: **It finished** or **It did not finish**.
- *Approved · Run open*: an assistant's loop has opened a run on the story. CraftHQ can't tell whether the session behind it is working or still waiting for a free slot, so the menu stays open: you can replan or cancel. The loop acts on the current status when it can next check; it can miss a move that was overwritten or reversed before that check.
- Other work on the story is still finishing (a check, a reply, a run left open): with the instance's own runner, an approval made meanwhile is kept and the build starts when that work ends. A wrapper's loop decides from the story's status as it finds it, so a late report from the finishing work can still move the story on; if your approval is lost that way, approve again.

**Building again is always a new approval.** A stopped job is settled, never re-run: its instructions were written from the story as it was then. Once it is settled, choose **Approved** (from Approved itself: move the story to Planning, then approve it again) and the new build starts from the story as it is now, including the comments you wrote since the last build.

**Approved is also how you ask for changes later.** See the review group below.

## 4. Building and checking: In progress

**What happens, in order.**

1. **Build.** The assistant implements the plan on the story's own branch, running the project's fast checks as it goes.
2. **A look at the screen**, when the change touches what a browser shows: a separate pass opens the running app, takes screenshots and attaches them to the story.
3. **Independent verification.** A second agent (not the one that built it) checks the real behaviour against what the story asked for, runs the project's checks, and confirms no test was deleted or weakened to make things pass.
4. If it passes, the assistant moves the story to **In review**. If it does not, you get the findings and a decision: fix and re-run, or accept as is.

**What a note does here.** If a build is running when you write, your note is read after this round, not mid-sentence; it does not redirect work already under way. If the round **stopped** and handed the story back, what a note does depends on how the instance builds, and the line above the comment box says which:

- with the unattended runner, a note starts **one more build round**, and that build is given your comments since the last build;
- with an interactive assistant, a note gets **a reply** only; to build again, choose **Approved**.

**If it stops and asks.** The assistant decides small, reversible things itself. When it raises one anyway, the story's **Decisions** panel shows it as *Decided by the assistant: \<its choice>*, already in effect, with **Confirm** and **Overturn**. It asks you only about choices that are hard to undo or that reach beyond this story. While such a decision is open the work is parked; **answering it resumes the work**; you do not need to touch the status.

**What moves it on.** The assistant, not you. Moving a story to In review by hand skips the independent check.

## 5. Your review: In review

**What it is for.** The work is finished, has passed its check, and is on your desk: a pull request to read, screenshots, a preview to open where the project has one, and the evidence from the verification.

**What a note does here: the part people get wrong.** A note in review is answered, and it never changes the code. The assistant replies in the thread and may update the story's pages; it does not change code and does not move the story. This is deliberate. A review is where you ask "why did you do it this way?" and "what happens if…?", and a question should not quietly turn into a new commit on a pull request you are in the middle of reading.

**Review comments on the pull request itself are different.** Where the instance watches pull requests, feedback left *on the pull request* (not in the story's thread) can start a fix round on its own. The status menu says so on such an instance.

**To get changes made:**

1. Write a note saying what should change.
2. Set **Status → Approved**.

The assistant rebuilds on the **same branch** with your note in front of it, the work is independently checked again, and the story returns to In review with the pull request updated. Write the note *first*: an interactive assistant reads the thread when it starts, and the unattended runner's build is given the comments written since the last build as they stand when it is queued, so a note added after you re-approve may only be seen on the next round.

**To accept:** merge the pull request (the assistant never merges), then set **Status → Done**.

## 6. Closed: Done and Cancelled

**Done** is yours to set when you are satisfied; **Cancelled** when the work will not happen after all. Neither is picked up by anything: a note on a closed story is kept, but not answered. Closing a story also cancels the instance runner's work on it that was still waiting to start. A wrapper's loop drops its pending work when it can check and finds the story still closed; a pause can delay this, and a closure reversed before the check can be missed. A closed story keeps its whole history (notes, decisions, pages, runs) and can be reopened by setting its status again.

## 7. Who moves what

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

**The status menu on a story** says what each choice does (*Replies & Planning* [nothing is built], *Changes the code*, *Closes*) and offers only the moves that make sense from where the story is:

| The story is | Shown as | You can choose |
|---|---|---|
| New | New (*New · Run open* while an assistant's run is open on it) | Planning · Approved · Cancelled |
| Planning | Planning | Approved · Cancelled |
| Approved, build not started yet | Approved · Waiting to start / Paused / Queued / Waiting for sign-in | Planning · Cancelled |
| Approved or In progress, the instance's runner holds a job | Approved · Building / Checking / Verifying | Nothing: the menu is **locked** |
| Approved or In progress, an assistant's run is open | Approved · Run open | Planning · Cancelled (and Approved from In progress); an open run alone never locks the menu |
| Approved or In progress, a run open for over 12 hours | Approved · Run still open | The usual choices; a new build waits until the run is closed |
| In progress, next round not started yet | Approved · Waiting to start | Approved (try again) · Planning · Cancelled |
| In progress, stopped and waiting for you | Approved · Needs you | Approved (try again) · Planning · Cancelled |
| In review | In review (*In review · Checking* while the full check runs) | Approved (rebuild) · Planning · Done · Cancelled |
| Done or Cancelled | Done / Cancelled | Planning · Approved (either reopens it) |

What is under way is named for what it is: *Building* for a build or a review round on its pull request, *Checking* for the project's checks, *Verifying* for the independent verification, and *Run open* (with its lane, e.g. "verify") for an assistant's run, which may be working or still waiting for a free slot. Where no assistant replies or plans on the instance, the menu says so rather than promising a reply.

**The lock.** Only while the instance's own runner holds a job on an approved or in-progress story, the menu still opens, says why, and offers nothing. It unlocks by itself the moment that job ends. An assistant's open run never locks it, nor does a round that fails, stops to ask you something, is waiting for a slot or a sign-in, or has not started yet, so you can replan or cancel then.

**When a run is left open.** A run opened over 12 hours ago that is still open is shown as *Run still open*. CraftHQ cannot tell whether it is still working (its age does not prove it stopped), so it does not close it for you: the loop that opened it closes its own stale runs (if that loop is no longer running, start it again). The story is not locked meanwhile: you can withdraw or cancel it, or approve it, but no new build starts beside the open run.

**Changes are checked when they are saved.** The menu sends each change together with the status and the version of the story it was showing. If the story moved in the meantime (another tab, another person, a build that started, even a move away and back to the same status), nothing is changed, the menu says so, and the page catches up. For the instance's own runner, a change you make also cancels the story's jobs that were still waiting to start, so a build it queued for an approval you have just withdrawn never runs. Every approval opens a new **build round**, and a move that ends the round (withdrawn, closed or approved again, from any tool) also stops that round's runner builds, even one already running; nothing such an ended build finishes can move the story or post to it.

A wrapper's own loop (assistant sessions working on the story through the older status API) is not fenced this way yet. It reads the story's status as it finds it when it next checks (it is not told of each change), and a report one of its sessions was already writing is not checked against your change: it can still set a status or post a note after it. If that undoes your change, set the status again. Connected tools that use the older status API still set statuses as before.

## 8. Questions people ask

**I commented on a story in review and nothing was built. Why?** Because a note never changes code. Where an assistant replies on the instance, you will have received a reply. Set the status back to **Approved** to have your comments acted on.

**Do I have to move a story back to Planning to discuss it again?** No. Notes are answered in every open status. Move it back to Planning only if you want the *plan* reworked and the page rewritten before anything more is built, and say in a note what should change.

**Can I approve with decisions still open?** You can; nothing stops you. But an open question is exactly where the work may stop and wait for you, so answer the ones that matter before you approve.

**How fast does work start?** An interactive assistant is woken by your note, answer or status change rather than by a timer, so when it is running and not paused, work normally starts in well under a minute. The menu shows the blockers CraftHQ knows, such as a recorded pause or a runner job waiting for sign-in. For a wrapper session, *Run open* cannot distinguish waiting for a free slot from execution. The story page refreshes itself; a *Claude · working* badge means a recent run is recorded, not that the dispatcher has delivered it.

**What does "Claude · queued" mean if it stays?** The ball is with the assistant, and the badge has no live run to count. The menu may show a known blocker, but it cannot always identify the reason for an interactive loop's wait. Once that loop opens a run, the badge can read *Claude · working* even while its session is still waiting for capacity; use the menu's *Run open* explanation.

**Who is "the assistant", exactly?** Each person has their own: it runs on your own Claude subscription and works on the stories that are yours; every story has an owner: whoever filed it (or promoted it from Intake), or whoever it was handed to. Your colleague's stories are picked up by theirs, and your assistant cannot write on them. To move a story from one assistant to the other, change its owner: the new owner's assistant picks it up within seconds.

**Can the assistant create stories?** No. It can *propose* one (in a note, or as an item in Intake), and a person decides whether it becomes a story.

New here? [Getting started](/docs/getting-started) walks through a first story in five steps. For every screen and feature in depth, see [the full guide](/docs/guide).
