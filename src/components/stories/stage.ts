import type { NeedKind, StoryStatus } from "@/types/dashboard";
import type { StoryItem } from "@/types/stories";

// Where a story is, in plain words, for people who don't know the pipeline's stage names.
// The dashboard's stages and needs stay the source of truth; this only words and orders them.

/** you: a person can act now (blue). question: the agent asked something (amber). stuck: red.
 *  waiting: a teammate's turn (grey). agent: the agent is working on it. queued: nobody is working on it
 *  (not planned yet, approved and not started, or checked and waiting for review).
 *  done: finished or cancelled. The first four are chips; the rest are calm text. */
export type StageTone = "you" | "question" | "stuck" | "waiting" | "agent" | "queued" | "done";

export interface Stage {
  text: string;
  tone: StageTone;
  /** Finished stories: which mark goes with the words (GitMerge, a tick, or a slash for cancelled). */
  outcome?: "merged" | "done" | "cancelled";
  /** When it finished, after the words: "Merged · 9d ago". */
  when?: string;
}

const FOR_YOU: Record<Exclude<NeedKind, "stuck" | "decision">, string> = {
  review: "Ready for you to review",
  planning: "Approve the plan",
  triage: "Decide whether to plan it",
  next: "Tell Builder what to do next",
};

// What each status means when nobody has to act (the statuses guide, §2–6). New is not a plan being written,
// and In review is work that has already passed its check: neither says the agent is busy.
const WITH_AGENT: Record<StoryStatus, string> = {
  new: "Not planned yet",
  planning: "Asker is planning the work",
  approved: "Waiting to start",
  in_progress: "Builder is making the change",
  in_review: "Checked · ready for review",
  done: "Done",
  cancelled: "Cancelled",
};

/** The seven statuses by name, as the story's status menu shows them. */
export const STATUS_LABEL: Record<StoryStatus, string> = {
  new: "New",
  planning: "Planning",
  approved: "Approved",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
  cancelled: "Cancelled",
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "1 open question" or "3 open questions" in the story's extra line becomes "3 questions for you". */
function questionsForYou(meta?: string) {
  const n = Number(meta?.match(/^(\d+) open question/)?.[1]);
  return n ? `${plural(n, "question", "questions")} for you` : "A question for you";
}

/** What `storyStage` reads: a whole story, or a stories-list row. */
export type StageInput = Pick<StoryItem, "need" | "waitingOn" | "meta" | "status" | "outcome" | "pr" | "updated">;

export function storyStage(s: StageInput): Stage {
  if (s.need === "stuck") return { text: "Stuck: not being picked up", tone: "stuck" };
  if (s.need && s.waitingOn && s.waitingOn !== "You") return { text: `Waiting on ${s.waitingOn}`, tone: "waiting" };
  if (s.need === "decision") return { text: questionsForYou(s.meta), tone: "question" };
  if (s.need) return { text: FOR_YOU[s.need], tone: "you" };
  // Finished: merged (its pull request went in), done without one, or cancelled; with when (DESIGN.md §7.12).
  if (s.status === "cancelled") return { text: "Cancelled", tone: "done", outcome: "cancelled", when: s.updated };
  if (s.status === "done") {
    const merged = s.outcome === "merged" || s.pr?.state === "merged";
    return { text: merged ? "Merged" : "Done", tone: "done", outcome: merged ? "merged" : "done", when: s.updated };
  }
  // Only planning and building have a robot at work; the rest wait (an empty dot).
  const idle = s.status === "new" || s.status === "approved" || s.status === "in_review";
  return { text: WITH_AGENT[s.status], tone: idle ? "queued" : "agent" };
}

// ---- Columns: the statuses guide's five groups, left to right, in plain words ----

export type ColumnKey = "planning" | "ready" | "building" | "review" | "done";

export interface Column {
  key: ColumnKey;
  label: string;
  /** One line under the name, so the board explains itself. */
  hint: string;
  statuses: StoryStatus[];
}

export const COLUMNS: Column[] = [
  { key: "planning", label: "Planning", hint: "A plan first; nothing is built", statuses: ["new", "planning"] },
  { key: "ready", label: "Ready to build", hint: "Approved, waiting to start", statuses: ["approved"] },
  { key: "building", label: "Building", hint: "Builder builds, Checker checks", statuses: ["in_progress"] },
  { key: "review", label: "In review", hint: "Checked; waiting for a review", statuses: ["in_review"] },
  { key: "done", label: "Done", hint: "Merged, or closed by a person", statuses: ["done", "cancelled"] },
];

/** The board column a status sits in, by name; "Cancelled" for cancelled stories. */
export const columnLabel = (status: StoryStatus) =>
  status === "cancelled" ? "Cancelled" : (COLUMNS.find((c) => c.statuses.includes(status))?.label ?? "Planning");

/** A move that waits while someone's pointer, focus or open menu is in a lane it touches (DESIGN.md §8.4): the
 *  lane it's shown in, how it will land, and the story as it was, so it keeps its place until it moves. */
export interface Hold {
  lane: ColumnKey;
  kind: "move" | "merge";
  was: StoryItem;
}

export interface StoryColumn extends Column {
  stories: StoryItem[];
}

const FAR = Number.MAX_SAFE_INTEGER;

/** Stuck first, then what waits on you, then on a teammate, then the agent's own. */
function needRank(s: StoryItem) {
  if (s.need === "stuck") return 0;
  if (s.need && (s.waitingOn ?? "You") === "You") return 1;
  return s.need ? 2 : 3;
}

/** Every column, in order, even when empty. Within one: just created here first, then what needs a person,
 *  then the most recently updated (a story that just moved here is "just now", so it lands on top of its group).
 *  `held`: stories kept in the lane they're leaving while someone's pointer or focus is there (DESIGN.md §8.4).
 *  `recent`: stories moved on this visit, newest first: each lands on top of its group. */
export function storyColumns(stories: StoryItem[], justAdded: number[], held?: Map<number, Hold>, recent: number[] = []): StoryColumn[] {
  // Moved on this visit, newest first: a story that just arrived goes on top of its group (it's on screen).
  const moved = new Map(recent.map((id, i) => [id, i]));
  const fresh = new Map(justAdded.map((id, i) => [id, i]));
  // Just created (on this visit, or anywhere a moment ago and not picked up yet) goes to the top.
  const freshRank = (s: StoryItem) => fresh.get(s.id) ?? (s.status === "new" && s.updatedMinutes === 0 ? FAR - 1 : FAR);
  return COLUMNS.map((col) => {
    const inLane = (s: StoryItem) => (held?.has(s.id) ? held.get(s.id)?.lane === col.key : col.statuses.includes(s.status));
    // A held story sorts as it was, so nothing shifts under the pointer while it waits.
    const key = (s: StoryItem) => held?.get(s.id)?.was ?? s;
    const indexed = stories.filter(inLane).map((s, i) => ({ s, k: key(s), i }));
    indexed.sort(
      (a, b) =>
        freshRank(a.k) - freshRank(b.k) ||
        needRank(a.k) - needRank(b.k) ||
        (held?.has(a.s.id) ? FAR : (moved.get(a.s.id) ?? FAR)) - (held?.has(b.s.id) ? FAR : (moved.get(b.s.id) ?? FAR)) ||
        (a.k.updatedMinutes ?? FAR) - (b.k.updatedMinutes ?? FAR) ||
        a.i - b.i,
    );
    return { ...col, stories: indexed.map((x) => x.s) };
  });
}

/** "240 KB", "3.2 MB". */
export function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---- The story's ⋯ menu: the status moves a person can make from where the story is (statuses guide §7) ----

/** What a person can set. New, In progress and In review are the robots' moves, never offered. */
export type StatusMove = "planning" | "approved" | "done" | "cancelled";

/** A menu item: a verb and its object (DESIGN.md §9.2). What it does is said after you choose it (the toast,
 *  or the confirm), not on the item. `icon` tells a fresh build apart from picking up again. */
export interface MoveOption {
  move: StatusMove;
  label: string;
  icon: "plan" | "build" | "rebuild" | "reopen" | "done" | "cancel";
}

/** The moves that make sense from a status, in the menu's order. `stopped`: a build stopped and needs a person. */
export function statusMoves(status: StoryStatus, stopped = false): MoveOption[] {
  const planning: MoveOption = { move: "planning", label: status === "new" ? "Move to Planning" : "Move back to Planning", icon: "plan" };
  const approved: MoveOption =
    status === "new" || status === "planning"
      ? { move: "approved", label: "Approve and build", icon: "build" }
      : status === "in_review"
        ? { move: "approved", label: "Rebuild with my notes", icon: "rebuild" }
        : status === "done" || status === "cancelled"
          ? { move: "approved", label: "Reopen story", icon: "reopen" }
          : { move: "approved", label: "Start a new build", icon: "rebuild" };
  const done: MoveOption = { move: "done", label: "Mark as Done", icon: "done" };
  const cancelled: MoveOption = { move: "cancelled", label: "Cancel story", icon: "cancel" };

  switch (status) {
    case "new":
      return [planning, approved, cancelled];
    case "planning":
      return [approved, cancelled];
    case "approved":
      return stopped ? [planning, approved, cancelled] : [planning, cancelled];
    case "in_progress":
      return [planning, approved, cancelled];
    case "in_review":
      return [planning, approved, done, cancelled];
    case "done":
    case "cancelled":
      return [planning, approved];
  }
}
