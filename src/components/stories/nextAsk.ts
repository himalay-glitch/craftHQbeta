import type { NeedKind, StoryStatus } from "@/types/dashboard";
import type { Segment, ThreadEntry } from "@/types/stories";
import { letter } from "./questions";

// The message box's suggested next message (Shubham, 27 Nov: "like how Claude is using right now … the question is
// ready in the chat field, you just press Tab"). One sentence, shown faintly in the empty box once the robot has
// replied; Tab writes it in, Esc puts it away. Chosen from what the robot just said, then from where the story is.
// Sample rules until the CraftHQ API sends a suggestion with each reply; the box only shows what it's given.

export interface NextAskInput {
  status: StoryStatus;
  need?: NeedKind;
  /** Whose turn it is: "You", or a teammate's name. */
  waitingOn?: string;
  entries: ThreadEntry[];
  viewerInitials: string;
  /** The story's pull request number, for the pull request stage. */
  prNo?: number;
  /** Who merges on GitHub, by first name, or "you". */
  merger: string;
}

const words = (text?: Segment[]) =>
  (text ?? []).map((s) => (typeof s === "string" ? s : s.type === "person" ? s.name : s.type === "story" ? `hq-${s.id}` : "")).join("");

/** Follow-ups to what the robot just said, by what it talked about: the first that matches wins. */
const FOLLOW_UPS: { when: RegExp; ask: string }[] = [
  { when: /\b(conflict|clash)/i, ask: "Which places clash, and whose change stays?" },
  { when: /screenshot/i, ask: "Show the same screens at web size too" },
  { when: /\bverified\b|checks? passed/i, ask: "What did Checker try, exactly?" },
  { when: /\bpreview\b/i, ask: "Start the preview on mobile" },
  { when: /\bplan is ready\b|updated the plan/i, ask: "Explain the plan in three short lines" },
];

/** What to ask from where the story is, most useful first. */
function forStage(i: NextAskInput, entries: ThreadEntry[]): string[] {
  const yours = Boolean(i.need) && (i.waitingOn ?? "You") === "You";
  if (i.need === "stuck") return ["What went wrong, and what do you need from me to fix it?"];
  if (i.need && !yours) {
    const who = (i.waitingOn ?? "they").split(" ")[0];
    return [`What is ${who} deciding, and what happens if nobody answers?`];
  }
  if (i.need === "decision") {
    const q = [...entries].reverse().find((e): e is Extract<ThreadEntry, { kind: "question" }> => e.kind === "question" && !e.answer);
    const rec = q?.recommended?.option;
    if (q && q.number !== undefined && rec !== undefined && q.options.length > 1) {
      const other = rec === 0 ? 1 : 0;
      return [`Why ${letter(rec)} over ${letter(other)}? What would ${letter(other)} change for people?`, "Which would you pick, and why?"];
    }
    return ["Which would you pick, and why?"];
  }
  if (i.need === "planning") return ["Explain the plan in three short lines", "What will look different on the screen?"];
  if (i.need === "review") return ["What did Checker try, exactly?", "What changed since the last build?"];
  if (i.need === "triage") return ["What’s unclear about this story?"];
  if (i.need === "next") return ["What’s left to do on this story?"];
  switch (i.status) {
    case "new":
      return ["Write the plan for this story"];
    case "planning":
      return ["What should the plan change?"];
    case "approved":
      return ["When will Builder start on this?"];
    case "in_progress":
      return ["How’s the build going?"];
    case "in_review":
      return ["What changed since the last build?"];
    case "pull_request":
      return [i.merger === "you" ? `What should I check before I merge #${i.prNo}?` : `What’s left before ${i.merger} can merge #${i.prNo}?`];
    case "done":
      return ["Sum up what this story shipped, in three lines"];
    default:
      return [];
  }
}

/** The one suggestion for the message box, or null. Never one the viewer has already sent on this story. */
export function nextAsk(i: NextAskInput): string | null {
  const { entries } = i;
  const mine = (e: ThreadEntry) => e.kind === "message" && e.author.kind === "person" && e.author.initials === i.viewerInitials;
  const sent = new Set(entries.flatMap((e) => (mine(e) && e.kind === "message" ? [words(e.text).trim().toLowerCase()] : [])));

  // The robot's latest reply, when nobody has written since: what it talked about leads.
  const last = [...entries].reverse().find((e) => e.kind === "message");
  const reply = last?.kind === "message" && last.author.kind === "agent" ? last : undefined;
  const said = reply ? [words(reply.text), reply.report?.outcome, reply.report?.means, reply.report?.next].filter(Boolean).join(" ") : "";
  const followUps = said ? FOLLOW_UPS.filter((f) => f.when.test(said)).map((f) => f.ask) : [];

  return [...followUps, ...forStage(i, entries)].find((a) => !sent.has(a.toLowerCase())) ?? null;
}
