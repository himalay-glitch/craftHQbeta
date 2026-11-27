import { useEffect } from "react";
import { motion, useAnimationControls, useReducedMotion, type Variants } from "framer-motion";
import type { ColumnKey } from "./stage";

// The five stages as small animated line icons (Shubham, 26 Nov: "more interactive, attractive icons" for Planning,
// Building, In review, Pull request and Done). Lucide's own shapes (ClipboardList, Hammer, Eye, GitPullRequest,
// CircleCheck, ISC), on its 24 grid with its 1.75 stroke and round caps, so they sit with every other icon (DESIGN.md §3.6);
// only parts of them move. Each plays once on request (hover, or the story arriving at that stage). The one that may
// repeat is the working indicator: a robot at work on the current stage (§3.7: nothing else loops on a work surface).
// Interface motion: ease-out, no overshoot, nothing with reduced motion.

const EASE = [0.2, 0, 0, 1] as const;

/** Drawn on: from nothing to the whole line. `rest` is the finished icon. */
const draw = (delay = 0): Variants => ({
  rest: { pathLength: 1, opacity: 1 },
  play: { pathLength: [0, 1], opacity: [0, 1], transition: { duration: 0.32, delay, ease: EASE } },
  loop: { pathLength: [0, 1], opacity: [0, 1], transition: { duration: 0.6, delay, ease: EASE, repeat: Infinity, repeatDelay: 0.7 } },
});

/** A dot that appears. */
const pop = (delay = 0): Variants => ({
  rest: { opacity: 1 },
  play: { opacity: [0, 1], transition: { duration: 0.15, delay } },
  loop: { opacity: [0, 1], transition: { duration: 0.3, delay, repeat: Infinity, repeatDelay: 1 } },
});

/** The hammer: lifts and strikes, from its grip. */
const strike: Variants = {
  rest: { rotate: 0 },
  play: { rotate: [0, -22, 0], transition: { duration: 0.42, ease: EASE } },
  loop: { rotate: [0, -22, 0], transition: { duration: 0.5, ease: EASE, repeat: Infinity, repeatDelay: 0.45 } },
};

/** The eye: one blink. */
const blink: Variants = {
  rest: { scaleY: 1 },
  play: { scaleY: [1, 0.12, 1], transition: { duration: 0.28, ease: EASE } },
  loop: { scaleY: [1, 0.12, 1], transition: { duration: 0.28, ease: EASE, repeat: Infinity, repeatDelay: 2.2 } },
};

/** The branch's end: arrives as the line reaches it. */
const land: Variants = {
  rest: { scale: 1 },
  play: { scale: [0.4, 1], transition: { duration: 0.2, delay: 0.26, ease: EASE } },
  loop: { scale: [0.4, 1], transition: { duration: 0.3, delay: 0.5, ease: EASE, repeat: Infinity, repeatDelay: 0.8 } },
};

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" } as const;
// Transforms from each part's own box, so a rotation turns around the hammer's grip and a blink squeezes the eye.
const BOX = { transformBox: "fill-box" } as const;

interface StageIconProps {
  stage: ColumnKey;
  /** Bumped to play the icon once (hover, or arriving at this stage). 0: still. */
  play: number;
  /** A robot at work on this stage: the working indicator, which may repeat. */
  working?: boolean;
  size?: number;
}

export function StageIcon({ stage, play, working = false, size = 16 }: StageIconProps) {
  const controls = useAnimationControls();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      controls.set("rest");
      return;
    }
    if (working) {
      void controls.start("loop");
      return;
    }
    if (play > 0) void controls.start("play");
    else controls.set("rest");
  }, [controls, reduce, working, play]);

  return (
    <motion.svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} initial="rest" animate={controls} className="flex-none overflow-visible">
      {stage === "planning" && (
        <>
          {/* ClipboardList: the board stays; its lines are written in. */}
          <path {...STROKE} d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect {...STROKE} width="8" height="4" x="8" y="2" rx="1" ry="1" />
          <motion.path {...STROKE} d="M8 11h.01" variants={pop(0)} />
          <motion.path {...STROKE} d="M12 11h4" variants={draw(0.04)} />
          <motion.path {...STROKE} d="M8 16h.01" variants={pop(0.16)} />
          <motion.path {...STROKE} d="M12 16h4" variants={draw(0.2)} />
        </>
      )}
      {stage === "building" && (
        // Hammer: the whole tool swings from its grip (bottom left).
        <motion.g variants={strike} style={{ ...BOX, transformOrigin: "12% 88%" }}>
          <path {...STROKE} d="m15 12-9.373 9.373a1 1 0 0 1-3.001-3L12 9" />
          <path {...STROKE} d="m18 15 4-4" />
          <path
            {...STROKE}
            d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172v-.344a2 2 0 0 0-.586-1.414l-1.657-1.657A6 6 0 0 0 12.516 3H9l1.243 1.243A6 6 0 0 1 12 8.485V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"
          />
        </motion.g>
      )}
      {stage === "review" && (
        // Eye: one blink.
        <motion.g variants={blink} style={{ ...BOX, transformOrigin: "50% 50%" }}>
          <path {...STROKE} d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <circle {...STROKE} cx="12" cy="12" r="3" />
        </motion.g>
      )}
      {stage === "pr" && (
        <>
          {/* GitPullRequest: the line runs from the branch to where it merges, and its end lands. */}
          <circle {...STROKE} cx="6" cy="6" r="3" />
          <line {...STROKE} x1="6" x2="6" y1="9" y2="21" />
          <motion.path {...STROKE} d="M13 6h3a2 2 0 0 1 2 2v7" variants={draw(0)} />
          <motion.circle {...STROKE} cx="18" cy="18" r="3" variants={land} style={{ ...BOX, transformOrigin: "50% 50%" }} />
        </>
      )}
      {stage === "done" && (
        <>
          {/* CircleCheck: the tick is drawn. */}
          <circle {...STROKE} cx="12" cy="12" r="10" />
          <motion.path {...STROKE} d="m16 9-5.5 5.5L8 12" variants={draw(0.05)} />
        </>
      )}
    </motion.svg>
  );
}
