import type { NeedKind, Story } from "@/types/dashboard";
import type { StoryAction } from "./StoryPanel";

// Each story that needs a person, as one decision: the question, the evidence, one recommended answer, quieter
// alternatives, and a note box for anything else.

export interface DecisionOption {
  label: string;
  /** What it does, shown under the buttons while this one is focused or hovered. */
  detail: string;
  /** A story action, or opening the story to read it first. */
  choice: { kind: "act"; action: StoryAction } | { kind: "open" };
  /** Said on the card as it leaves ("Rebuilding on the latest code."). */
  says: string;
}

export interface DecisionReply {
  placeholder: string;
  intent: "changes" | "question" | "note";
  says: string;
}

export interface Evidence {
  text: string;
  tone: "positive" | "negative" | "neutral";
}

export interface Decision {
  /** The question: the card's headline. */
  question: string;
  evidence: Evidence[];
  /** Three answers, the recommended one first; Other (the reply) is the fourth. */
  options: DecisionOption[];
  reply: DecisionReply;
}

const firstSentence = (text: string) => text.split(/(?<=\.)\s/)[0];
const rest = (text: string) => text.slice(firstSentence(text).length).trim();
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function decisionFor(story: Story): Decision {
  const need = story.need as NeedKind;
  switch (need) {
    case "review": {
      const c = story.checks;
      return {
        question: "It passed its checks, but main has moved on since it was built. Rebuild it before it merges?",
        evidence: [
          ...(c
            ? [{ text: `${c.passed} of ${c.total} checks passed`, tone: (c.passed === c.total ? "positive" : "negative") as Evidence["tone"] }]
            : []),
          { text: "Preview ready", tone: "neutral" },
        ],
        options: [
          {
            label: "Rebuild it",
            detail: "Merges main in, runs the checks again and refreshes the preview.",
            choice: { kind: "act", action: { type: "approve" } },
            says: "Rebuilding on the latest code.",
          },
          {
            label: "Accept as it is",
            detail: "Marks it done now, without a rebuild.",
            choice: { kind: "act", action: { type: "accept" } },
            says: "Accepted.",
          },
          { label: "Open the preview", detail: "Try it before you decide.", choice: { kind: "open" }, says: "" },
        ],
        reply: { placeholder: "Ask for changes…", intent: "changes", says: "Changes sent." },
      };
    }
    case "stuck": {
      const why = story.action ? firstSentence(story.action) : "It isn’t being picked up.";
      return {
        question: `It’s stuck: ${lower(why.replace(/\.$/, ""))}. Try again?`,
        evidence: story.action && rest(story.action) ? [{ text: rest(story.action), tone: "neutral" }] : [],
        options: [
          {
            label: "Try again",
            detail: "Restarts it and watches the run.",
            choice: { kind: "act", action: { type: "restart" } },
            says: "Restarting it.",
          },
          {
            label: "Back to planning",
            detail: "Rethink it before it’s built again.",
            choice: { kind: "act", action: { type: "plan" } },
            says: "Moved back to planning.",
          },
          {
            label: "Cancel it",
            detail: "Stops work on the story. You can undo.",
            choice: { kind: "act", action: { type: "cancel" } },
            says: "Cancelled. You can undo.",
          },
        ],
        reply: { placeholder: "Add a note…", intent: "note", says: "Note sent." },
      };
    }
    case "decision": {
      const q = story.question;
      return {
        question: q ? q.text : `${story.meta ?? "There’s an open question"} before the build can start. Keep the defaults?`,
        evidence: [
          ...(q ? [{ text: `If you don’t answer: ${q.fallback}`, tone: "neutral" as const }] : []),
          ...(story.meta ? [{ text: story.meta, tone: "neutral" as const }] : []),
        ],
        options: [
          {
            label: q ? "Keep the default" : "Keep the defaults",
            detail: q ? `Goes with “${q.fallback}” and approves the plan.` : "Approves the plan with the defaults.",
            choice: { kind: "act", action: { type: "defaults" } },
            says: "Default kept. The plan is approved.",
          },
          { label: "Read the plan", detail: "Opens the story with the whole plan.", choice: { kind: "open" }, says: "" },
          {
            label: "Cancel the story",
            detail: "Stops it before it’s built. You can undo.",
            choice: { kind: "act", action: { type: "cancel" } },
            says: "Cancelled. You can undo.",
          },
        ],
        reply: { placeholder: "Write your answer…", intent: "note", says: "Answer sent. The plan gets updated." },
      };
    }
    case "planning":
      return {
        question: "The plan is ready. Start building?",
        evidence: story.action ? [{ text: firstSentence(story.action), tone: "neutral" }] : [],
        options: [
          {
            label: "Approve the plan",
            detail: "Building starts within a minute.",
            choice: { kind: "act", action: { type: "approve" } },
            says: "Approved. Building starts within a minute.",
          },
          { label: "Read the plan", detail: "Opens the story with the whole plan.", choice: { kind: "open" }, says: "" },
          {
            label: "Cancel the story",
            detail: "Stops it before it’s built. You can undo.",
            choice: { kind: "act", action: { type: "cancel" } },
            says: "Cancelled. You can undo.",
          },
        ],
        reply: { placeholder: "Ask a question…", intent: "question", says: "Question sent. The answer comes on the story." },
      };
    case "triage":
      return {
        question: "This one is new and not planned yet. Is it worth planning?",
        evidence: [{ text: "New", tone: "neutral" }],
        options: [
          {
            label: "Plan it",
            detail: "A plan is drafted for you to approve.",
            choice: { kind: "act", action: { type: "plan" } },
            says: "Moved to planning.",
          },
          {
            label: "Close it",
            detail: "Cancels the story. You can undo.",
            choice: { kind: "act", action: { type: "cancel" } },
            says: "Closed. You can undo.",
          },
          { label: "Open the story", detail: "Read it before you decide.", choice: { kind: "open" }, says: "" },
        ],
        reply: { placeholder: "Add a note…", intent: "note", says: "Note sent." },
      };
    case "next":
      return {
        question: "No step applies to this one. What should happen next?",
        evidence: story.meta ? [{ text: story.meta, tone: "neutral" }] : [],
        options: [
          {
            label: "Move it to planning",
            detail: "It’s picked up again.",
            choice: { kind: "act", action: { type: "plan" } },
            says: "Moved to planning.",
          },
          { label: "Open the story", detail: "See where it stopped.", choice: { kind: "open" }, says: "" },
          {
            label: "Cancel the story",
            detail: "Stops work on it. You can undo.",
            choice: { kind: "act", action: { type: "cancel" } },
            says: "Cancelled. You can undo.",
          },
        ],
        reply: { placeholder: "Say what you want next…", intent: "note", says: "Note sent." },
      };
  }
}

/** The kinds of need, in the queue's order, as the See all panel names them. */
export const KINDS: { kind: NeedKind; label: string }[] = [
  { kind: "stuck", label: "Blocked" },
  { kind: "review", label: "Awaiting review" },
  { kind: "decision", label: "Decisions" },
  { kind: "planning", label: "Plans to approve" },
  { kind: "triage", label: "New stories" },
  { kind: "next", label: "What next" },
];
