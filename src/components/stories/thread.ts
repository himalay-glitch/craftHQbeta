import type { Person, Viewer } from "@/types/dashboard";
import type { Author, Segment, StoryFacts, StoryItem, StoryThreadData, ThreadEntry } from "@/types/stories";

// Front end only: writes a believable conversation for any story from its stage, until the CraftHQ API
// sends the real one. Hand-written conversations (src/pages/stories/_threads.ts) take precedence.

const STAGE_ORDER = ["new", "planning", "approved", "in_progress", "in_review", "pull_request", "done"] as const;
const reached = (s: StoryItem, stage: (typeof STAGE_ORDER)[number]) =>
  s.status !== "cancelled" && STAGE_ORDER.indexOf(s.status as (typeof STAGE_ORDER)[number]) >= STAGE_ORDER.indexOf(stage);

export const AGENT: Author = { kind: "agent" };

/** The story's pull request (front end only): the agent opens it once the work passes its check. */
export const prNumberFor = (id: number) => 100 + id * 3;

export function personFor(initials: string | undefined, people: Person[], viewer: Viewer): Author {
  const p = people.find((x) => x.initials === initials) ?? viewer;
  return { kind: "person", name: p.name, initials: p.initials };
}

/** The first message when only a title was written (the sample's stand-in), so Story details can leave it out. */
export const titleOnlyAsk = (title: string) => `${title}. The screens are attached.`;

/** The ask, as the first message: the why, then the detail, or the title when nothing else was written. */
function askText(s: StoryItem): Segment[] {
  const parts = [s.why, s.detail].filter(Boolean) as string[];
  return [parts.length ? parts.join("\n\n") : titleOnlyAsk(s.title)];
}

/** "Today" for a day that is today, else "Nov 26": the chat's day words. */
export function dayLabel(ts: number, now = Date.now()) {
  const d = new Date(ts);
  return d.toDateString() === new Date(now).toDateString() ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function buildFacts(s: StoryItem, owner?: string): StoryFacts {
  // Built and checked: in review, or past it with its pull request.
  const review = s.status === "in_review" || s.status === "pull_request";
  const done = s.status === "done";
  const closed = done && (s.outcome === "closed" || s.pr?.state === "closed");
  return {
    preview:
      s.need === "stuck"
        ? { state: "failed", line: "Couldn’t start. Start it again." }
        : review || done
          ? { state: "ready", line: "Ready to try" }
          : { state: "not-built", line: s.status === "in_progress" ? "Ready when the build finishes" : "Built after the plan is approved" },
    checks:
      review || done
        ? { state: "passed", line: "All 214 checks passed" }
        : s.status === "in_progress"
          ? { state: "running", line: "Running with the build" }
          : { state: "none", line: "Written from the plan" },
    plan: s.status === "new" ? "Being written" : "Written",
    // Created from In review once the work is right; merged on GitHub by the one person with access, never by a robot.
    pullRequest: closed
      ? { state: "closed", line: "Closed without merging" }
      : done && s.outcome !== "done"
        ? { state: "merged", line: "Merged into main" }
        : done
          ? { state: "none", line: "Nothing to merge" }
          : s.status === "pull_request" || s.pr?.state === "open"
            ? { state: "open", line: `Open · #${s.pr?.number ?? prNumberFor(s.id)} · waiting to be merged` }
            : { state: "none", line: "Created from In review, once the work is right" },
    ownerName: owner,
    source: s.importedFrom ? `Imported from ${s.importedFrom.tool} · ${s.importedFrom.key}` : "Typed in CraftHQ",
    repository: "we-pop",
    created: s.createdAt ? dayLabel(s.createdAt) : s.updatedMinutes !== undefined && s.updatedMinutes < 60 ? "Today" : "Nov 10",
  };
}

/** `madeOn`: the day words for a story created in this browser before it kept its time ("Earlier"). */
export function buildThread(s: StoryItem, people: Person[], viewer: Viewer, madeOn?: string): StoryThreadData {
  const owner = personFor(s.owner, people, viewer);
  const ownerName = owner.kind === "person" ? owner.name : undefined;
  const first = ownerName?.split(" ")[0] ?? "the owner";
  const e: ThreadEntry[] = [];
  const id = (n: string) => `${s.id}-${n}`;

  // When it was written: today for a story just created here (it was "Nov 10" for every story, 26 Nov bug).
  const made = s.createdAt ? dayLabel(s.createdAt) : (madeOn ?? "Nov 10");
  e.push({ kind: "created", id: id("created"), at: made, by: owner });
  // Imported: where it came from, said once beside who created it.
  if (s.importedFrom) e.push({ kind: "stage", id: id("imported"), at: made, text: `Imported from ${s.importedFrom.tool} · ${s.importedFrom.key}` });
  e.push({
    kind: "message",
    id: id("ask"),
    at: made,
    author: owner,
    text: askText(s),
    files: s.files?.map((name) => ({ name, kind: /\.(png|jpe?g|webp|gif)$/i.test(name) ? "image" : "file" })),
  });

  if (s.status === "new" && !s.need) {
    return { entries: e, facts: buildFacts(s, ownerName) };
  }

  if (s.need === "triage") {
    e.push({
      kind: "message",
      id: id("triage"),
      at: "Nov 11",
      author: AGENT,
      text: ["This came in without a plan yet. Move it to planning and I’ll write one, or cancel it if it’s no longer needed."],
    });
    return { entries: e, facts: buildFacts(s, ownerName) };
  }

  e.push({ kind: "message", id: id("read"), at: "Nov 10", author: AGENT, text: ["I’ve read this. I’ll write the plan and ask here if anything is unclear."] });

  if (s.need === "decision") {
    e.push({
      kind: "question",
      id: id("q1"),
      at: "Nov 11",
      question: "Before I finish the plan: should this work for people who aren’t signed in?",
      options: ["Signed-in people only", "Everyone, signed in or not"],
    });
    return { entries: e, facts: buildFacts(s, ownerName) };
  }

  e.push({ kind: "stage", id: id("planned"), at: "Nov 11", text: "Plan written" });

  if (s.need === "planning") {
    e.push({
      kind: "message",
      id: id("plan-ready"),
      at: "Nov 11",
      author: AGENT,
      report: { outcome: "The plan is ready.", next: `${first}: read the plan, then approve it to start the build.` },
    });
    return { entries: e, facts: buildFacts(s, ownerName) };
  }

  if (s.need === "next") {
    e.push({
      kind: "message",
      id: id("next"),
      at: "Nov 12",
      author: AGENT,
      report: { outcome: "The last step finished and no next step applies.", next: "Tell me what you’d like done next." },
    });
    return { entries: e, facts: buildFacts(s, ownerName) };
  }

  if (reached(s, "approved")) e.push({ kind: "stage", id: id("approved"), at: "Nov 11", text: `Plan approved by ${ownerName ?? "the owner"}` });

  if (s.need === "stuck") {
    e.push({
      kind: "message",
      id: id("stuck"),
      at: "Nov 12",
      author: AGENT,
      report: { outcome: "The preview couldn’t start, so the build is paused.", next: "Restart it, or add a note if something has changed." },
    });
    return { entries: e, facts: buildFacts(s, ownerName) };
  }

  // While it builds, the live line at the foot of the chat names the one phase under way (no checklist here).
  if (s.status === "in_progress") {
    e.push({ kind: "stage", id: id("started"), at: "Nov 12", text: "Builder started building" });
    return { entries: e, facts: buildFacts(s, ownerName) };
  }

  if (reached(s, "in_review")) {
    e.push({ kind: "stage", id: id("started"), at: "Nov 12", text: "Builder started building" });
    e.push({ kind: "stage", id: id("verified"), at: "Nov 12", text: "Verified by Checker · it does what the story asks" });
    e.push({ kind: "stage", id: id("review"), at: "Nov 12", text: "Moved to In review" });
    e.push({
      kind: "message",
      id: id("report"),
      at: "Nov 12",
      author: AGENT,
      report: {
        outcome: "Ready for your review. All 214 automated checks passed, and Checker verified it against the story.",
        means: `“${s.title}” works as the story asks, in the preview.`,
        next: `${first}: try the preview. When it’s right, create the pull request, and it goes to the person who merges. To change it, write a note and rebuild.`,
        details: ["Checked on web and Android sizes", "Used the sample events for empty states", "No other screens were changed"],
      },
      // The build's phases, folded under the reply: 38 minutes in all.
      run: [
        { key: "plan", ms: 130_000 },
        { key: "implement", ms: 1_280_000 },
        { key: "ui-check", ms: 240_000 },
        { key: "review", ms: 330_000 },
        { key: "verify", ms: 260_000 },
        { key: "reply", ms: 40_000 },
      ],
    });
  }

  // The pull request: created from In review by a person, opened on GitHub by the PM, merged there by one person.
  const merged = s.status === "done" && (s.outcome === "merged" || s.pr?.state === "merged");
  const closed = s.status === "done" && !merged && (s.outcome === "closed" || s.pr?.state === "closed");
  const n = s.pr?.number ?? prNumberFor(s.id);
  if (s.status === "pull_request" || merged || closed) {
    e.push({ kind: "stage", id: id("pr"), at: "Nov 13", text: `Pull request created by ${ownerName ?? "the owner"} · the PM opened #${n} on GitHub` });
    // After another story merged first: what the PM asked Builder to do about it.
    if (s.pr?.merge === "conflict")
      e.push({ kind: "stage", id: id("pr-sync"), at: "Today", text: `hq-${s.pr.conflictWith ?? "?"} merged first and changed the same lines · the PM asked Builder to fit both in` });
    if (s.pr?.merge === "updating") e.push({ kind: "stage", id: id("pr-sync"), at: "Today", text: "Main moved on · the PM asked Builder to bring in the latest code" });
  }
  // Back in review with its pull request already open (a rebuild after it was created): the pull request keeps the
  // version before it until someone updates it from the review.
  if (s.status === "in_review" && s.pr?.state === "open") {
    e.push({ kind: "stage", id: id("pr"), at: "Nov 13", text: `Pull request created by ${ownerName ?? "the owner"} · the PM opened #${n} on GitHub` });
    e.push({ kind: "stage", id: id("pr-rebuilt"), at: "Nov 24", text: `Rebuilt with your note · back in review · #${n} keeps the version before it until you update it` });
  }
  if (merged) e.push({ kind: "stage", id: id("accepted"), at: "Nov 14", text: `Pull request #${n} merged on GitHub · Done` });
  else if (closed) e.push({ kind: "stage", id: id("accepted"), at: "Nov 14", text: `Pull request #${n} closed without merging · Done` });
  else if (s.status === "done") e.push({ kind: "stage", id: id("accepted"), at: "Nov 13", text: `Marked Done by ${ownerName ?? "the owner"} · nothing to merge` });

  if (s.status === "cancelled") {
    e.push({ kind: "stage", id: id("cancelled"), at: "Nov 9", text: `Cancelled by ${ownerName ?? "the owner"}` });
  }

  return { entries: e, facts: buildFacts(s, ownerName) };
}
