import type { NeedKind } from "@/types/dashboard";
import { needLabel } from "./format";

// Four tiers; every pair is at least 5.7:1 (docs/design/dashboard-plan.md, §5).
// Red: stuck. Amber: a decision is waiting. Blue: work to check or approve. Grey: give it direction.
const TONE: Record<NeedKind, string> = {
  stuck: "bg-[#FDECEC] text-[#B3261E]",
  decision: "bg-[#FDF3DC] text-[#8A5300]",
  review: "bg-[#E9F0FE] text-[#1F57C3]",
  planning: "bg-[#E9F0FE] text-[#1F57C3]",
  triage: "bg-[#F0F0F0] text-[#4A4B4D]",
  next: "bg-[#F0F0F0] text-[#4A4B4D]",
};

export function NeedChip({ need }: { need: NeedKind }) {
  return (
    <span
      className={`inline-flex h-[22px] max-w-full items-center truncate rounded-full px-2 text-[13px] leading-4 font-medium whitespace-nowrap ${TONE[need]}`}
    >
      {needLabel(need)}
    </span>
  );
}
