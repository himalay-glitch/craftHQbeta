import type { BotId } from "@/types/ask";
import type { NeedKind, Story } from "@/types/dashboard";
import type { StoryAction } from "./StoryPanel";

// Each story that needs a person, as one decision on the Needs you deck: who's asking, the question, the evidence,
// and two or three answers with the recommended one first, then "Other…" to write your own (the way Claude asks).

/** What picking an answer does: a story action, a note you write first, or opening the story for the details. */
export type DecisionChoice =
  | { kind: "act"; action: StoryAction }
  | { kind: "write"; intent: "changes" | "question" | "note"; placeholder: string }
  | { kind: "open" };

export interface DecisionOption {
  label: string;
  detail: string;
  choice: DecisionChoice;
  /** Said on the card as it leaves: "Rebuilding", "Approved". */
  done: string;
}

export type EvidenceTone = "positive" | "negative" | "neutral";

export interface Decision {
  /** The agent whose question it is. */
  agent: BotId;
  /** "checked it", "couldn't fix it": after the agent's name. */
  asks: string;
  question: string;
  evidence: { text: string; tone: EvidenceTone }[];
  /** The recommended answer first. */
  options: DecisionOption[];
}

const OTHER_PLACEHOLDER = "Tell the agents what you want instead…";

/** "Other…": write your own answer; it goes on the story as a note. */
export const OTHER: DecisionOption = {
  label: "Other…",
  detail: "Write your own answer",
  choice: { kind: "write", intent: "note", placeholder: OTHER_PLACEHOLDER },
  done: "Note sent",
};

const firstSentence = (text: string) => text.split(/(?<=\.)\s/)[0];

export function decisionFor(story: Story): Decision {
  const need = story.need as NeedKind;
  switch (need) {
    case "review": {
      const c = story.checks;
      return {
        agent: "tester",
        asks: "checked it",
        question: "It’s ready for you. Main has moved on since it was built, so it needs a rebuild before it can merge.",
        evidence: [
          ...(c ? [{ text: `${c.passed} of ${c.total} checks passed`, tone: (c.passed === c.total ? "positive" : "negative") as EvidenceTone }] : []),
          { text: "Preview ready", tone: "neutral" },
          { text: "Main moved on", tone: "neutral" },
        ],
        options: [
          {
            label: "Rebuild on the latest code",
            detail: "Merge main in, run the checks again and refresh the preview",
            choice: { kind: "act", action: { type: "approve" } },
            done: "Rebuilding",
          },
          {
            label: "Accept it as it is",
            detail: "Mark it done now, without a rebuild",
            choice: { kind: "act", action: { type: "accept" } },
            done: "Accepted",
          },
          {
            label: "Ask for changes",
            detail: "Tell the Developer what to change",
            choice: { kind: "write", intent: "changes", placeholder: "What should change?" },
            done: "Changes sent",
          },
        ],
      };
    }
    case "stuck":
      return {
        agent: "debugger",
        asks: "couldn’t get it going",
        question: story.action ? firstSentence(story.action) : "It stopped and isn’t being picked up.",
        evidence: [
          { text: "Not being picked up", tone: "negative" },
          ...(story.action && story.action !== firstSentence(story.action)
            ? [{ text: story.action.slice(firstSentence(story.action).length).trim(), tone: "neutral" as EvidenceTone }]
            : []),
        ],
        options: [
          {
            label: "Try again",
            detail: "Restart it; the Debugger watches the run",
            choice: { kind: "act", action: { type: "restart" } },
            done: "Restarted",
          },
          {
            label: "Back to planning",
            detail: "Rethink it before it’s built again",
            choice: { kind: "act", action: { type: "plan" } },
            done: "Moved to planning",
          },
          {
            label: "Cancel the story",
            detail: "Stop work on it; you can undo",
            choice: { kind: "act", action: { type: "cancel" } },
            done: "Cancelled",
          },
        ],
      };
    case "decision": {
      const q = story.question;
      return {
        agent: "pm",
        asks: "needs an answer",
        question: q ? q.text : `${story.meta ?? "An open question"} before the build can start.`,
        evidence: [
          ...(q ? [{ text: `Default: ${q.fallback}`, tone: "neutral" as EvidenceTone }] : []),
          ...(story.meta ? [{ text: story.meta, tone: "neutral" as EvidenceTone }] : []),
        ],
        options: [
          {
            label: q ? "Keep the default" : "Keep the defaults",
            detail: q ? `Go with “${q.fallback}” and approve the plan` : "Approve the plan with the defaults",
            choice: { kind: "act", action: { type: "defaults" } },
            done: "Approved",
          },
          {
            label: "Answer it",
            detail: "Write your answer; the PM updates the plan",
            choice: { kind: "write", intent: "note", placeholder: "Your answer…" },
            done: "Answer sent",
          },
          { label: "Open the plan", detail: "Read the whole plan first", choice: { kind: "open" }, done: "" },
        ],
      };
    }
    case "planning":
      return {
        agent: "pm",
        asks: "wrote a plan",
        question: "The plan is ready. Start building?",
        evidence: story.action ? [{ text: firstSentence(story.action), tone: "neutral" }] : [],
        options: [
          {
            label: "Approve the plan",
            detail: "The Developer starts within a minute",
            choice: { kind: "act", action: { type: "approve" } },
            done: "Approved",
          },
          {
            label: "Ask a question",
            detail: "The PM answers on the story",
            choice: { kind: "write", intent: "question", placeholder: "What do you want to know?" },
            done: "Question sent",
          },
          { label: "Open the plan", detail: "Read the whole plan first", choice: { kind: "open" }, done: "" },
        ],
      };
    case "triage":
      return {
        agent: "pm",
        asks: "found a new story",
        question: "It isn’t planned yet. Is it worth planning?",
        evidence: [{ text: "New, not planned", tone: "neutral" }],
        options: [
          {
            label: "Plan it",
            detail: "The PM drafts a plan for you to approve",
            choice: { kind: "act", action: { type: "plan" } },
            done: "Planning",
          },
          {
            label: "Close it",
            detail: "Cancel the story; you can undo",
            choice: { kind: "act", action: { type: "cancel" } },
            done: "Closed",
          },
          { label: "Open the story", detail: "Read it before you decide", choice: { kind: "open" }, done: "" },
        ],
      };
    case "next":
      return {
        agent: "pm",
        asks: "needs a next step",
        question: "No step applies. What should happen next?",
        evidence: story.meta ? [{ text: story.meta, tone: "neutral" }] : [],
        options: [
          {
            label: "Move it to planning",
            detail: "The PM picks it up again",
            choice: { kind: "act", action: { type: "plan" } },
            done: "Planning",
          },
          { label: "Open the story", detail: "See where it stopped", choice: { kind: "open" }, done: "" },
        ],
      };
  }
}

/** The deck's filter chips: each kind of need, the tone of its dot, and its name on a chip. */
export const KINDS: { kind: NeedKind; label: string; tone: "attention" | "negative" }[] = [
  { kind: "review", label: "Review", tone: "attention" },
  { kind: "decision", label: "Decisions", tone: "attention" },
  { kind: "planning", label: "Plans", tone: "attention" },
  { kind: "triage", label: "Triage", tone: "attention" },
  { kind: "stuck", label: "Stuck", tone: "negative" },
];
