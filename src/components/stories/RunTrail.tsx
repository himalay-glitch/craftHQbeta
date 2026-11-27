import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { PhaseKey } from "@/types/stories";
import chat from "./chat.module.css";
import { usePausedMotion } from "./motion-pref";
import { PHASE_STEPS, THINKING_STEPS } from "./phases";

/** A new step every 0.8 s: quick enough that even a short reply shows the words running, slow enough to catch each. */
const EVERY_MS = 800;
/** Three lines at most: the newest at full muted ink beside the robot, the two before it fading as they rise. */
const FADE = [0.35, 0.6, 1];

interface Line {
  id: number;
  text: string;
}
interface Trail {
  /** Which run of steps is playing: a phase, "thinking", or a task's own words. */
  run: string;
  /** The index of its next step. */
  next: number;
  /** The id the next line gets, so every line keeps its own key across runs. */
  seq: number;
  log: Line[];
}

/** A run starts with its first step at once, under the last lines of the run before (its unplayed steps dropped). */
const begin = (run: string, steps: readonly string[], prev?: Trail): Trail => {
  const seq = prev?.seq ?? 0;
  return { run, next: 1, seq: seq + 1, log: [...(prev?.log ?? []), { id: seq, text: steps[0] }].slice(-FADE.length) };
};

/**
 * What the robot is doing right now, as the chat's live line: three small lines running beside its face, and
 * nothing else (Shubham, 27 Nov: no pill above them). Each new step rises in at the bottom and writes itself in from
 * the left; the older ones fade as they rise, and the oldest leaves at the top. A phase plays its steps once and
 * keeps the last one; the next phase carries on under it, so the lines keep running for the whole build. A task with
 * no phase (creating the pull request, starting a preview) is one line: its own words.
 * Hidden from screen readers (the live region says the same in words); still under reduced motion or "Pause
 * animations".
 */
export function RunTrail({ phase, label }: { phase?: PhaseKey | "thinking"; label: string }) {
  const reduce = useReducedMotion();
  const paused = usePausedMotion();
  const still = Boolean(reduce) || paused;
  const run = phase ?? `task:${label}`;
  const steps = useMemo(() => (phase === "thinking" ? THINKING_STEPS : phase ? PHASE_STEPS[phase] : [label]), [phase, label]);
  const [trail, setTrail] = useState(() => begin(run, steps));

  // A new run: carry on from the lines already showing (React's "adjust state when a prop changes").
  if (trail.run !== run) setTrail(begin(run, steps, trail));

  useEffect(() => {
    if (trail.run !== run || trail.next >= steps.length) return;
    const t = window.setTimeout(
      () =>
        setTrail((s) =>
          s.run !== run || s.next >= steps.length
            ? s
            : { ...s, next: s.next + 1, seq: s.seq + 1, log: [...s.log, { id: s.seq, text: steps[s.next] }].slice(-FADE.length) },
        ),
      EVERY_MS,
    );
    return () => window.clearTimeout(t);
  }, [trail.run, trail.next, run, steps]);

  const shown = trail.log;
  return (
    // Anchored to the bottom, so the newest line always sits in the same place, beside the robot's face.
    <div aria-hidden="true" className="flex h-12 flex-col justify-end overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        {shown.map(({ id, text }, k) => {
          const newest = k === shown.length - 1;
          return (
            <motion.p
              key={id}
              layout={!still}
              initial={still ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: FADE[FADE.length - shown.length + k], y: 0 }}
              exit={still ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.36, ease: [0.2, 0, 0, 1] }}
              className={`m-0 truncate text-xs leading-4 text-[var(--tx2)] ${newest && !still ? chat.write : ""}`}
            >
              {text}
            </motion.p>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
