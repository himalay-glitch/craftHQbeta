import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, CircleSlash, GitMerge } from "lucide-react";
import { Tip } from "@/components/dashboard/Tip";
import type { LiveRun, StoryItem } from "@/types/stories";
import { liveSpoken, runStart } from "./LiveLine";
import { useMinute } from "./minute";
import { PHASE_SHORT, rowStateKey, sinceShort } from "./RowStatus";
import { storyStage } from "./stage";
import { CHIP } from "./StageLabel";
import { WorkingIndicator } from "./WorkingIndicator";

const PILL = "inline-flex h-[22px] max-w-full min-w-0 items-center gap-1.5 rounded-full px-2 text-[12px] leading-4";
const OUTLINE = `${PILL} border border-[var(--card-line)] bg-white`;

/** Short words for the robots' own stages when no live run is reported. */
const SHORT: Partial<Record<StoryItem["status"], string>> = { planning: "Planning", in_progress: "Building" };

/** A robot at work: the turning mark, the phase in a word, and how long ("Building · 4m"). Hovering shows who and what
 *  in full ("Builder is making the change · 4m"); the card's screen-reader summary says the same. */
function LivePill({ story }: { story: StoryItem & { live: LiveRun } }) {
  const { now, loadedAt } = useMinute();
  const live = story.live;
  const started = runStart(live, loadedAt);
  const time = now && started !== undefined ? sinceShort(now - started) : null;
  return (
    <Tip label={time ? `${liveSpoken(live)} · ${time}` : liveSpoken(live)}>
      <span className={`${OUTLINE} text-[var(--tx)]`}>
        <WorkingIndicator />
        <span className="truncate">{PHASE_SHORT[live.phase] ?? "Working"}</span>
        {time && <span className="flex-none text-[var(--tx2)] tabular-nums">· {time}</span>}
      </span>
    </Tip>
  );
}

/**
 * A board card's one status chip. A person's turn keeps its tinted chip ("Approve the plan", "1 question for you");
 * everything else is an outlined chip: a robot at work (it turns), merged (GitMerge, positive ink), done, cancelled,
 * or a quiet stage ("Waiting to start"). DESIGN.md §7.12: tints only where someone must act; green only for merged.
 */
export function CardStatus({ story }: { story: StoryItem }) {
  // A change made in place (a new phase, a robot finishing) crossfades over 150 ms; nothing animates on load.
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.span
        key={rowStateKey(story)}
        className="flex min-w-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.15 } }}
        exit={{ opacity: 0, transition: { duration: 0.1 } }}
      >
        <StatusChip story={story} />
      </motion.span>
    </AnimatePresence>
  );
}

function StatusChip({ story }: { story: StoryItem }) {
  if (story.live) return <LivePill story={{ ...story, live: story.live }} />;
  const stage = storyStage(story);
  const chip = CHIP[stage.tone];
  if (chip) {
    return (
      <span className={`${PILL} font-medium ${chip}`}>
        <span className="truncate">{stage.text}</span>
      </span>
    );
  }
  if (stage.tone === "done") {
    const merged = stage.outcome === "merged";
    const Icon = merged ? GitMerge : stage.outcome === "cancelled" ? CircleSlash : CircleCheck;
    return (
      <span className={`${OUTLINE} ${merged ? "font-medium text-success-ink" : "text-[var(--tx2)]"}`}>
        <Icon aria-hidden="true" size={12} strokeWidth={2} className={`flex-none ${merged ? "text-success" : ""}`} />
        <span className="truncate">{stage.text}</span>
      </span>
    );
  }
  const working = stage.tone === "agent";
  return (
    <span className={`${OUTLINE} text-[var(--tx)]`}>
      <span aria-hidden="true" className={`size-1.5 flex-none rounded-full ${working ? "bg-[var(--tx)]" : "border border-[var(--tx2)]"}`} />
      <span className="truncate">{(working && SHORT[story.status]) || stage.text}</span>
    </span>
  );
}
