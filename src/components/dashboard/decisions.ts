import type { BotId } from "@/types/ask";
import type { NeedKind, Story } from "@/types/dashboard";
import type { StoryAction } from "./StoryPanel";

// Each story that needs a person, as a message from the agent whose question it is: the question in its own
// words, the evidence, one recommended answer, quieter alternatives, and a reply box for anything else.

export interface DecisionOption {
  label: string;
  /** What it does, shown under the buttons while this one is focused or hovered. */
  detail: string;
  /** A story action, or opening the story to read it first. */
  choice: { kind: "act"; action: StoryAction } | { kind: "open" };
  /** The agent's reply as the card leaves ("On it. Rebuilding now."). */
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
  /** Checks: passed of total, drawn as a bar. */
  bar?: { value: number; total: number };
}

export interface Decision {
  /** The agent whose question it is. */
  agent: BotId;
  /** The question, in the agent's words: the card's headline. */
  question: string;
  evidence: Evidence[];
  /** The recommended answer first. */
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
        agent: "tester",
        question: "It passed my checks, but main has moved on since it was built. Rebuild it before it merges?",
        evidence: [
          ...(c
            ? [{ text: `${c.passed} of ${c.total} checks`, tone: (c.passed === c.total ? "positive" : "negative") as Evidence["tone"], bar: { value: c.passed, total: c.total } }]
            : []),
          { text: "Preview ready", tone: "neutral" },
        ],
        options: [
          {
            label: "Rebuild it",
            detail: "Merges main in, runs the checks again and refreshes the preview.",
            choice: { kind: "act", action: { type: "approve" } },
            says: "On it. Rebuilding on the latest code.",
          },
          {
            label: "Accept as it is",
            detail: "Marks it done now, without a rebuild.",
            choice: { kind: "act", action: { type: "accept" } },
            says: "Done. It’s accepted.",
          },
        ],
        reply: { placeholder: "Ask for changes…", intent: "changes", says: "Got it. I’ve passed that to the Developer." },
      };
    }
    case "stuck": {
      const why = story.action ? firstSentence(story.action) : "It isn’t being picked up.";
      return {
        agent: "debugger",
        question: `It’s stuck: ${lower(why.replace(/\.$/, ""))}. Want me to try again?`,
        evidence: story.action && rest(story.action) ? [{ text: rest(story.action), tone: "neutral" }] : [],
        options: [
          {
            label: "Try again",
            detail: "Restarts it; I’ll watch the run.",
            choice: { kind: "act", action: { type: "restart" } },
            says: "Restarting it now. I’ll keep an eye on it.",
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
        reply: { placeholder: "Tell the Debugger something…", intent: "note", says: "Noted. I’ll look into it." },
      };
    }
    case "decision": {
      const q = story.question;
      return {
        agent: "pm",
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
            says: "Going with the default. The plan’s approved.",
          },
          { label: "Read the plan", detail: "Opens the story with the whole plan.", choice: { kind: "open" }, says: "" },
        ],
        reply: { placeholder: "Answer the PM…", intent: "note", says: "Thanks. I’ll update the plan." },
      };
    }
    case "planning":
      return {
        agent: "pm",
        question: "The plan is ready. Shall the Developer start building?",
        evidence: story.action ? [{ text: firstSentence(story.action), tone: "neutral" }] : [],
        options: [
          {
            label: "Approve the plan",
            detail: "The Developer starts within a minute.",
            choice: { kind: "act", action: { type: "approve" } },
            says: "Approved. The Developer starts within a minute.",
          },
          { label: "Read the plan", detail: "Opens the story with the whole plan.", choice: { kind: "open" }, says: "" },
        ],
        reply: { placeholder: "Ask the PM a question…", intent: "question", says: "Good question. I’ll answer on the story." },
      };
    case "triage":
      return {
        agent: "pm",
        question: "This one’s new and not planned yet. Is it worth planning?",
        evidence: [{ text: "New", tone: "neutral" }],
        options: [
          {
            label: "Plan it",
            detail: "I’ll draft a plan for you to approve.",
            choice: { kind: "act", action: { type: "plan" } },
            says: "I’ll draft a plan.",
          },
          {
            label: "Close it",
            detail: "Cancels the story. You can undo.",
            choice: { kind: "act", action: { type: "cancel" } },
            says: "Closed. You can undo.",
          },
        ],
        reply: { placeholder: "Tell the PM something…", intent: "note", says: "Noted." },
      };
    case "next":
      return {
        agent: "pm",
        question: "No step applies to this one. What should happen next?",
        evidence: story.meta ? [{ text: story.meta, tone: "neutral" }] : [],
        options: [
          {
            label: "Move it to planning",
            detail: "I’ll pick it up again.",
            choice: { kind: "act", action: { type: "plan" } },
            says: "Picking it up again.",
          },
          { label: "Open the story", detail: "See where it stopped.", choice: { kind: "open" }, says: "" },
        ],
        reply: { placeholder: "Tell the PM what you want…", intent: "note", says: "Noted." },
      };
  }
}
