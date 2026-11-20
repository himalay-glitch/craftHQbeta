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
}

const FOR_YOU: Record<Exclude<NeedKind, "stuck" | "decision">, string> = {
  review: "Ready for you to review",
  planning: "Approve the plan",
  triage: "Decide whether to plan it",
  next: "Tell the agent what to do next",
};

// What each status means when nobody has to act (the statuses guide, §2–6). New is not a plan being written,
// and In review is work that has already passed its check: neither says the agent is busy.
const WITH_AGENT: Record<StoryStatus, string> = {
  new: "Not planned yet",
  planning: "Agent is planning",
  approved: "Waiting to start",
  in_progress: "Agent is building",
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

export function storyStage(s: StoryItem): Stage {
  if (s.need === "stuck") return { text: "Stuck: not being picked up", tone: "stuck" };
  if (s.need && s.waitingOn && s.waitingOn !== "You") return { text: `Waiting on ${s.waitingOn}`, tone: "waiting" };
  if (s.need === "decision") return { text: questionsForYou(s.meta), tone: "question" };
  if (s.need) return { text: FOR_YOU[s.need], tone: "you" };
  const finished = s.status === "done" || s.status === "cancelled";
  // Only planning and building have the agent at work; the rest wait (an empty dot).
  const idle = s.status === "new" || s.status === "approved" || s.status === "in_review";
  return { text: WITH_AGENT[s.status], tone: finished ? "done" : idle ? "queued" : "agent" };
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
  { key: "building", label: "Building", hint: "The agent builds; another checks", statuses: ["in_progress"] },
  { key: "review", label: "In review", hint: "Checked, waiting for you", statuses: ["in_review"] },
  { key: "done", label: "Done", hint: "Finished, or not going to happen", statuses: ["done", "cancelled"] },
];

/** The board column a status sits in, by name; "Cancelled" for cancelled stories. */
export const columnLabel = (status: StoryStatus) =>
  status === "cancelled" ? "Cancelled" : (COLUMNS.find((c) => c.statuses.includes(status))?.label ?? "Planning");

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
 *  then the most recently updated. */
export function storyColumns(stories: StoryItem[], justAdded: number[]): StoryColumn[] {
  const fresh = new Map(justAdded.map((id, i) => [id, i]));
  // Just created (on this visit, or anywhere a moment ago and not picked up yet) goes to the top.
  const freshRank = (s: StoryItem) => fresh.get(s.id) ?? (s.status === "new" && s.updatedMinutes === 0 ? FAR - 1 : FAR);
  return COLUMNS.map((col) => {
    const indexed = stories.filter((s) => col.statuses.includes(s.status)).map((s, i) => ({ s, i }));
    indexed.sort(
      (a, b) =>
        freshRank(a.s) - freshRank(b.s) ||
        needRank(a.s) - needRank(b.s) ||
        (a.s.updatedMinutes ?? FAR) - (b.s.updatedMinutes ?? FAR) ||
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

// ---- The status menu: the moves a person can make from where the story is (statuses guide §7) ----

/** What a person can set. New, In progress and In review are the agent's moves, never offered. */
export type StatusMove = "planning" | "approved" | "done" | "cancelled";

export interface MoveOption {
  move: StatusMove;
  label: string;
  /** What choosing it does, in one line. */
  hint: string;
}

/** The menu's groups, named for what a choice does (statuses guide §7). */
export const MOVE_GROUP: Record<StatusMove, string> = {
  planning: "Replies & planning · nothing is built",
  approved: "Changes the code",
  done: "Closes",
  cancelled: "Closes",
};

/** The moves that make sense from a status, in the menu's order. `stopped`: a build stopped and needs a person. */
export function statusMoves(status: StoryStatus, stopped = false): MoveOption[] {
  const planning: MoveOption =
    status === "new"
      ? { move: "planning", label: "Planning", hint: "The agent writes a plan from your description." }
      : { move: "planning", label: "Back to Planning", hint: "Rework the plan first. Then say in a note what should change." };
  const approved: MoveOption =
    status === "new" || status === "planning"
      ? { move: "approved", label: "Approved", hint: "Build it. The agent starts on its own branch." }
      : status === "in_review"
        ? { move: "approved", label: "Approved · rebuild", hint: "Rebuilds with your notes since the last build, then checks again." }
        : status === "done" || status === "cancelled"
          ? { move: "approved", label: "Approved · reopen", hint: "Reopens it and builds again from the story as it is now." }
          : { move: "approved", label: "Approved · try again", hint: "A new build from the story as it is now." };
  const done: MoveOption = { move: "done", label: "Done", hint: "Merge the pull request first. The agent never merges." };
  const cancelled: MoveOption = { move: "cancelled", label: "Cancelled", hint: "The work won’t happen. Nothing picks it up." };

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
