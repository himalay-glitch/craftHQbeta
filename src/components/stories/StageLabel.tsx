import { CircleCheck, CircleSlash, GitMerge, GitPullRequestClosed } from "lucide-react";
import type { Stage } from "./stage";

// The dashboard's chip pairs (docs/design/dashboard-plan.md §3), each at least 5.7:1. Chips are only for
// stories that need a person, so they stand out; the robots' own stages are calm text.
export const CHIP: Partial<Record<Stage["tone"], string>> = {
  you: "bg-[#E9F0FE] text-[#1F57C3]",
  question: "bg-[#FDF3DC] text-[#8A5300]",
  stuck: "bg-[#FDECEC] text-[#B3261E]",
  waiting: "bg-[#F0F0F0] text-[#4A4B4D]",
};

/**
 * Where a story is: a chip when a person has to act, otherwise a quiet line. Finished stories say how they ended:
 * "Merged" in the positive ink with GitMerge (DESIGN.md §3.1, §7.12), "Done" with a tick, "Cancelled" with a
 * slash (CircleX is Failed's), each with when. A robot at work shows its live line instead (LiveLine).
 */
export function StageLabel({ stage }: { stage: Stage }) {
  const chip = CHIP[stage.tone];
  if (chip) {
    return (
      <span className={`inline-flex h-5 max-w-full items-center rounded-full px-2 text-xs font-medium ${chip}`}>
        <span className="truncate">{stage.text}</span>
      </span>
    );
  }
  if (stage.tone === "done") {
    const merged = stage.outcome === "merged";
    const Icon = merged ? GitMerge : stage.outcome === "closed" ? GitPullRequestClosed : stage.outcome === "cancelled" ? CircleSlash : CircleCheck;
    return (
      <span className="inline-flex max-w-full items-center gap-1.5 text-sm text-[var(--tx2)]">
        <Icon aria-hidden="true" size={14} strokeWidth={1.75} className={`flex-none ${merged ? "text-success" : ""}`} />
        <span className={`truncate ${merged ? "font-medium text-success-ink" : ""}`}>{stage.text}</span>
        {stage.when && <span className="flex-none tabular-nums">· {stage.when}</span>}
      </span>
    );
  }
  // A robot is on it with no live run reported (a filled ink dot), or it's waiting (an empty one).
  return (
    <span className="inline-flex max-w-full items-center gap-2 text-sm text-[var(--tx)]">
      <span
        aria-hidden="true"
        className={`size-2 flex-none rounded-full ${stage.tone === "agent" ? "bg-[var(--tx)]" : "border-[1.5px] border-[var(--tx2)]"}`}
      />
      <span className="truncate">{stage.text}</span>
    </span>
  );
}
