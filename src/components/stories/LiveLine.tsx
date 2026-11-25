import { AnimatePresence, motion } from "framer-motion";
import type { LiveRun, PhaseKey } from "@/types/stories";
import { sinceLabel, useMinute } from "./minute";
import { WorkingIndicator } from "./WorkingIndicator";

/** What the robot is doing, by its name (DESIGN.md §9.2: never "agent"; §9.3: "Builder is writing the change ·
 *  4m"). The Asker reads stories and plans, the Builder builds, the Checker tests (§3.1 robot colours). */
export const LIVE_WORDS: Record<PhaseKey, string> = {
  plan: "Asker is planning the work",
  implement: "Builder is making the change",
  "ui-check": "Builder is checking the screens",
  review: "Builder is reviewing its work",
  verify: "Checker is verifying the change",
  resume: "Builder is picking up where it left off",
  reply: "PM is writing a reply",
};

/** "Builder is making the change, started 4 minutes ago": for a card's or row's screen-reader summary. */
export function liveSpoken(live: LiveRun) {
  return LIVE_WORDS[live.phase] ?? "Builder is working on this";
}

/** A run's start, once the clock is running: the sample's "minutes ago" count from when the page first read it. */
export function runStart(live: LiveRun, loadedAt: number) {
  if (live.startedAt !== undefined) return live.startedAt;
  return loadedAt ? loadedAt - (live.minutesAgo ?? 0) * 60_000 : undefined;
}

/**
 * A robot at work on a story, on its card or row: the turning mark, what it's doing, and for how long, in whole
 * minutes (one clock for the page, so every line rolls over together). Replaces the person chip while the run is
 * live, so a card never shows "working" and "your turn" at once. Not a live region: nothing is announced.
 */
export function LiveLine({ live, size = 12 }: { live: LiveRun; size?: 12 | 16 }) {
  const { now, loadedAt } = useMinute();
  const words = liveSpoken(live);
  const started = runStart(live, loadedAt);
  const time = now && started !== undefined ? sinceLabel(now - started) : null;
  return (
    // Wraps to a second line rather than cutting the words off: they say who is doing what.
    <span title={time ? `${words} · ${time}` : words} className="inline-flex max-w-full min-w-0 items-start gap-1.5 text-[13px] leading-[18px] text-[var(--tx)]">
      <span className="flex h-[18px] flex-none items-center">
        <WorkingIndicator size={size} />
      </span>
      <span className="line-clamp-2 min-w-0">
        {/* A new phase fades in (150 ms); nothing animates on load (DESIGN.md §3.7). */}
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span key={live.phase} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.15 } }} exit={{ opacity: 0, transition: { duration: 0 } }}>
            {words}
          </motion.span>
        </AnimatePresence>
        {time && <span className="whitespace-nowrap text-[var(--tx2)] tabular-nums"> · {time}</span>}
      </span>
    </span>
  );
}
