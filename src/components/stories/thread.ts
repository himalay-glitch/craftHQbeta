import type { Person, Viewer } from "@/types/dashboard";
import type { Author, Segment, StoryFacts, StoryItem, StoryThreadData, ThreadEntry } from "@/types/stories";

// Front end only: writes a believable conversation for any story from its stage, until the CraftHQ API
// sends the real one. Hand-written conversations (src/pages/stories/_threads.ts) take precedence.

const STAGE_ORDER = ["new", "planning", "approved", "in_progress", "in_review", "done"] as const;
const reached = (s: StoryItem, stage: (typeof STAGE_ORDER)[number]) =>
  s.status !== "cancelled" && STAGE_ORDER.indexOf(s.status as (typeof STAGE_ORDER)[number]) >= STAGE_ORDER.indexOf(stage);

export const AGENT: Author = { kind: "agent" };

/** The story's pull request (front end only): the agent opens it once the work passes its check. */
export const prNumberFor = (id: number) => 100 + id * 3;

export function personFor(initials: string | undefined, people: Person[], viewer: Viewer): Author {
  const p = people.find((x) => x.initials === initials) ?? viewer;
  return { kind: "person", name: p.name, initials: p.initials };
}

/** The ask, as the first message: the why, then the detail, or the title when nothing else was written. */
function askText(s: StoryItem): Segment[] {
  const parts = [s.why, s.detail].filter(Boolean) as string[];
  return [parts.length ? parts.join("\n\n") : `${s.title}. The screens are attached.`];
}

export function buildFacts(s: StoryItem, owner?: string): StoryFacts {
  const review = s.status === "in_review";
  const done = s.status === "done";
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
    // Opened by the agent when the work passes its check; merged by a person, never by the agent.
    pullRequest: done
      ? { state: "merged", line: "Merged into main" }
      : review
        ? { state: "open", line: `Open · #${prNumberFor(s.id)} · waiting for you to merge` }
        : { state: "none", line: "Opens when the work passes its check" },
    ownerName: owner,
    source: "Typed in CraftHQ",
    repository: "we-pop",
    created: s.updatedMinutes !== undefined && s.updatedMinutes < 60 ? "Today" : "Nov 10",
  };
}

export function buildThread(s: StoryItem, people: Person[], viewer: Viewer): StoryThreadData {
  const owner = personFor(s.owner, people, viewer);
  const ownerName = owner.kind === "person" ? owner.name : undefined;
  const first = ownerName?.split(" ")[0] ?? "the owner";
  const e: ThreadEntry[] = [];
  const id = (n: string) => `${s.id}-${n}`;

  e.push({ kind: "created", id: id("created"), at: "Nov 10", by: owner });
  e.push({
    kind: "message",
    id: id("ask"),
    at: "Nov 10",
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

  if (s.status === "in_progress") {
    e.push({
      kind: "run",
      id: id("build"),
      at: "Nov 12",
      summary: "Building · 4 of 6 steps",
      steps: ["Read the plan", "Change the screens", "Add sample data", "Write the checks", "Run the checks", "Build the preview"],
      running: true,
      done: 4,
    });
    return { entries: e, facts: buildFacts(s, ownerName) };
  }

  if (reached(s, "in_review")) {
    e.push({
      kind: "run",
      id: id("build"),
      at: "Nov 12",
      summary: "Built in 38m · 6 steps",
      steps: ["Read the plan", "Changed the screens", "Added sample data", "Wrote the checks", "Ran 214 checks: all passed", "Built the preview"],
    });
    e.push({ kind: "stage", id: id("verified"), at: "Nov 12", text: "Checked by a second agent · it does what the story asks" });
    e.push({ kind: "stage", id: id("pr"), at: "Nov 12", text: `Pull request #${prNumberFor(s.id)} opened` });
    e.push({ kind: "stage", id: id("review"), at: "Nov 12", text: "Moved to In review" });
    e.push({
      kind: "message",
      id: id("report"),
      at: "Nov 12",
      author: AGENT,
      report: {
        outcome: "Ready for your review. All 214 automated checks passed, and a second agent checked it against the story.",
        means: `“${s.title}” works as the story asks, in the preview.`,
        next: `${first}: try the preview and read pull request #${prNumberFor(s.id)}. To accept, merge it and mark the story Done; to change it, write a note and rebuild.`,
        details: ["Checked on web and Android sizes", "Used the sample events for empty states", "No other screens were changed"],
      },
    });
  }

  if (s.status === "done") {
    e.push({ kind: "stage", id: id("accepted"), at: "Nov 13", text: `Pull request merged · marked Done by ${ownerName ?? "the owner"}` });
  }

  if (s.status === "cancelled") {
    e.push({ kind: "stage", id: id("cancelled"), at: "Nov 9", text: `Cancelled by ${ownerName ?? "the owner"}` });
  }

  return { entries: e, facts: buildFacts(s, ownerName) };
}
