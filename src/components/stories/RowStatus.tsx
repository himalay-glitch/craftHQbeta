import { CircleCheck, CircleSlash, GitMerge, GitPullRequest, GitPullRequestClosed } from "lucide-react";
import type { Story } from "@/types/dashboard";
import type { PhaseKey, StoryItem } from "@/types/stories";
import { runStart } from "./LiveLine";
import { sinceLabel, useMinute } from "./minute";
import { prStage } from "./stage";
import { CHIP } from "./StageLabel";
import { WorkingIndicator } from "./WorkingIndicator";

/** A list row that may have a robot at work on it, or have just finished. */
export type LiveRow = Story & Pick<StoryItem, "live" | "outcome" | "pr">;

/** The phase in one word, for a row's narrow "Next" cell; the robot's name goes in "Waiting on". */
export const PHASE_SHORT: Record<PhaseKey, string> = {
  plan: "Planning",
  implement: "Building",
  "ui-check": "Screen check",
  review: "Reviewing",
  verify: "Verifying",
  resume: "Resuming",
  reply: "Replying",
};

/** Who holds the story in each phase (DESIGN.md §3.1 robots: the Asker plans, the Checker tests, the Builder builds). */
export const PHASE_ROBOT: Record<PhaseKey, "Asker" | "Builder" | "Checker"> = {
  plan: "Asker",
  implement: "Builder",
  "ui-check": "Builder",
  review: "Builder",
  verify: "Checker",
  resume: "Builder",
  reply: "Builder",
};

/** "now", "4m", "1h 5m": the one elapsed format (minute.ts). */
export const sinceShort = sinceLabel;

/** Whose turn a row is when no person is needed: the robot at work, or the Builder for an approved story. */
export function rowWaitingOn(s: LiveRow) {
  if (s.live) return PHASE_ROBOT[s.live.phase] ?? "Builder";
  if (s.status === "approved" || s.status === "in_progress") return "Builder";
  return "";
}

/** Stable key for a row's state, so the cell crossfades when it changes. */
export const rowStateKey = (s: LiveRow) => `${s.need ?? ""}:${s.status}:${s.live?.phase ?? ""}:${s.outcome ?? ""}:${s.pr?.merge ?? ""}`;

/**
 * A row's "Next" cell when no person is needed (DESIGN.md §7.12 tones): a robot at work shows the turning mark, the
 * phase in a word and how long ("Building · 4m"); merged is GitMerge in the positive colour; done a tick; cancelled
 * a slash; approved and queued an empty dot. Rows that need a person keep their need chip.
 */
export function RowStatus({ story }: { story: LiveRow }) {
  const { now, loadedAt } = useMinute();
  if (story.live) {
    const started = runStart(story.live, loadedAt);
    const time = now && started !== undefined ? sinceShort(now - started) : null;
    return (
      <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 text-sm text-[var(--tx)]">
        <WorkingIndicator />
        <span className="truncate">{PHASE_SHORT[story.live.phase] ?? "Working"}</span>
        {time && <span className="flex-none text-xs text-[var(--tx2)] tabular-nums">· {time}</span>}
      </span>
    );
  }
  if (story.status === "pull_request") {
    // Waiting for the person who merges, or the robots keeping it mergeable (the turning mark).
    const stage = prStage(story.pr);
    // GitHub refused the update: stuck, in the stuck chip, never quiet text (hq-35, 25 Nov).
    if (stage.tone === "stuck")
      return <span className={`inline-flex h-6 max-w-full items-center truncate rounded-full px-2.5 text-xs font-medium ${CHIP.stuck}`}>{stage.text}</span>;
    return (
      <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 text-sm text-[var(--tx)]">
        {stage.tone === "agent" ? (
          <WorkingIndicator />
        ) : (
          <GitPullRequest aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
        )}
        <span className="truncate">{stage.text}</span>
      </span>
    );
  }
  if (story.status === "done") {
    const merged = story.outcome === "merged" || story.pr?.state === "merged";
    const closed = !merged && (story.outcome === "closed" || story.pr?.state === "closed");
    return merged ? (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success-ink">
        <GitMerge aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none text-success" />
        Merged
      </span>
    ) : closed ? (
      <span className="inline-flex items-center gap-1.5 text-sm text-[var(--tx2)]">
        <GitPullRequestClosed aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none" />
        Closed, not merged
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-sm text-[var(--tx2)]">
        <CircleCheck aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none" />
        Done
      </span>
    );
  }
  if (story.status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-[var(--tx2)]">
        <CircleSlash aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none" />
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-sm text-[var(--tx)]">
      <span aria-hidden="true" className={`size-2 flex-none rounded-full ${story.status === "approved" ? "border-[1.5px] border-[var(--tx2)]" : "bg-[var(--tx)]"}`} />
      {story.status === "approved" ? "Queued" : story.status === "in_progress" ? "Building" : story.status === "new" ? "Not planned yet" : "Planning"}
    </span>
  );
}
