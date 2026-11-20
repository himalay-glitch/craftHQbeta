import type { NeedKind, StoryStatus } from "@/types/dashboard";
import type { StoryItem } from "@/types/stories";

// Where a story is, in plain words, for people who don't know the pipeline's stage names.
// The dashboard's stages and needs stay the source of truth; this only words and orders them.

/** you: a person can act now (blue). question: the agent asked something (amber). stuck: red.
 *  waiting: a teammate's turn (grey). agent: the agent is working on it. queued: approved, not started.
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

const WITH_AGENT: Record<StoryStatus, string> = {
  new: "Agent is reading it",
  planning: "Agent is planning",
  approved: "Waiting to start",
  in_progress: "Agent is building",
  in_review: "Agent is checking the work",
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
  return { text: WITH_AGENT[s.status], tone: finished ? "done" : s.status === "approved" ? "queued" : "agent" };
}

// ---- Columns: the agent's stages, left to right, in plain words ----

export type ColumnKey = "planning" | "ready" | "building" | "review" | "done";

export interface Column {
  key: ColumnKey;
  label: string;
  /** One line under the name, so the board explains itself. */
  hint: string;
  statuses: StoryStatus[];
}

export const COLUMNS: Column[] = [
  { key: "planning", label: "Planning", hint: "The agent writes a plan", statuses: ["new", "planning"] },
  { key: "ready", label: "Ready to build", hint: "Plan approved, waiting to start", statuses: ["approved"] },
  { key: "building", label: "Building", hint: "The agent is making the change", statuses: ["in_progress"] },
  { key: "review", label: "In review", hint: "Checked, then yours to accept", statuses: ["in_review"] },
  { key: "done", label: "Done", hint: "Accepted or cancelled", statuses: ["done", "cancelled"] },
];

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
  return COLUMNS.map((col) => {
    const indexed = stories.filter((s) => col.statuses.includes(s.status)).map((s, i) => ({ s, i }));
    indexed.sort(
      (a, b) =>
        (fresh.get(a.s.id) ?? FAR) - (fresh.get(b.s.id) ?? FAR) ||
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
