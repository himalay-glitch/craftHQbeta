import { useEffect, useState } from "react";
import type { AskCard, AskRefusal, ThreadEntry } from "@/types/stories";
import chat from "./chat.module.css";
import { DecisionCard, Question } from "./StoryThread";

// The message box's own frame (StoryComposer), so the decision reads as sitting in its place.
const FRAME =
  "w-full rounded-[20px] border border-[var(--card-line)] bg-white p-4";

interface DecisionDockProps {
  /** The decision card ("Needs your OK", "Stuck"), when that's what waits. */
  ask: AskCard | null;
  /** Otherwise the agent's open question. */
  question?: Extract<ThreadEntry, { kind: "question" }>;
  refusal?: AskRefusal;
  onAnswer: (entryId: string, option: number, text?: string) => void;
  /** The question's "Read more in the plan". */
  onReadMore?: () => void;
  onSkip?: () => void;
  /** "Ask a question": the message box comes back, with the way back to this. */
  onWrite: () => void;
  /** Which decision this is. The first time it shows it rises a beat after the robot's message lands; coming back to
   *  it ("Back to the decision") it rises at once, with no wait. */
  seen?: string;
}

/** Decisions that have already risen into place on this visit. */
const risen = new Set<string>();

/**
 * While a decision waits on you, it takes the message box's place (Shubham, 26 Nov: "I can still type and send; that
 * shouldn't happen"). The conversation above stays fully readable; nothing covers it. You decide here, or write first
 * on purpose: "Ask a question" at the end of the card's buttons ("Ask for changes" and the card's own "Ask a question"
 * do the same). Nothing sits under the card (Shubham, 26 Nov: no line under the box).
 */
export function DecisionDock({ ask, question, refusal, onAnswer, onSkip, onWrite, onReadMore, seen }: DecisionDockProps) {
  const [again] = useState(() => (seen ? risen.has(seen) : false));
  useEffect(() => {
    if (seen) risen.add(seen);
  }, [seen]);
  // A card whose own buttons already open the box ("Ask a question", "Write to the agent") needs no second way.
  const writes = /^(Ask a question|Write to the agent)$/.test(ask?.secondary?.label ?? "");
  return (
    <div className={again ? chat.riseNow : chat.rise}>
      {question ? (
        <Question
          entry={question}
          onAnswer={(o, text) => onAnswer(question.id, o, text)}
          onSkip={onSkip}
          onAsk={onWrite}
          onReadMore={onReadMore}
          className={FRAME}
        />
      ) : ask ? (
        <DecisionCard ask={ask} refusal={refusal} onAsk={writes ? undefined : onWrite} className={FRAME} />
      ) : null}
    </div>
  );
}
