import { CircleCheck, CircleX } from "lucide-react";
import type { Stage } from "./stage";

// The dashboard's chip pairs (docs/design/dashboard-plan.md §3), each at least 5.7:1. Chips are only for
// stories that need a person, so they stand out; the agent's own stages are calm text.
const CHIP: Partial<Record<Stage["tone"], string>> = {
  you: "bg-[#E9F0FE] text-[#1F57C3]",
  question: "bg-[#FDF3DC] text-[#8A5300]",
  stuck: "bg-[#FDECEC] text-[#B3261E]",
  waiting: "bg-[#F0F0F0] text-[#4A4B4D]",
};

/** Where a story is: a chip when a person has to act, otherwise a quiet line with a dot or a tick. */
export function StageLabel({ stage }: { stage: Stage }) {
  const chip = CHIP[stage.tone];
  if (chip) {
    return (
      <span className={`inline-flex h-[22px] max-w-full items-center rounded-full px-2 text-[13px] leading-4 font-medium ${chip}`}>
        <span className="truncate">{stage.text}</span>
      </span>
    );
  }
  if (stage.tone === "done") {
    const Icon = stage.text === "Cancelled" ? CircleX : CircleCheck;
    return (
      <span className="inline-flex max-w-full items-center gap-1.5 text-[13px] leading-[18px] text-[var(--tx2)]">
        <Icon aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none" />
        <span className="truncate">{stage.text}</span>
      </span>
    );
  }
  // The agent is on it (a filled dot), or it's approved and waiting to start (an empty one).
  return (
    <span className="inline-flex max-w-full items-center gap-2 text-[13px] leading-[18px] text-[var(--tx)]">
      <span
        aria-hidden="true"
        className={`size-2 flex-none rounded-full ${stage.tone === "agent" ? "bg-[var(--green)]" : "border-[1.5px] border-[var(--tx2)]"}`}
      />
      <span className="truncate">{stage.text}</span>
    </span>
  );
}
