import { useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { usePausedMotion } from "./motion-pref";

/**
 * The working mark: shows a robot is at work right now, and only then (DESIGN.md §8.5: the status label and the
 * elapsed time go with it, always). Ink, never coloured (§3.1: active is ink plus motion). It turns once every
 * 1.2 s, the working-ring tempo, not the 0.8 s loading spinner, because robot work is a status, not loading
 * (§6.8). Every mark on the page turns together and never restarts when its card re-renders or moves: the
 * rotation is one Web Animation started at the page's time origin. Still under reduced motion or "Pause
 * animations". Shared with the dashboard's live rows.
 */
export function WorkingIndicator({ size = 12 }: { size?: 12 | 16 }) {
  const paused = usePausedMotion();
  const reduce = useReducedMotion();
  const turn = useCallback(
    (el: SVGSVGElement | null) => {
      if (!el || paused || reduce) return;
      const anim = el.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: 1200, iterations: Infinity });
      // Started at time 0 on the page's timeline: every mark is at the same angle.
      anim.startTime = 0;
      return () => anim.cancel();
    },
    [paused, reduce],
  );
  return <LoaderCircle ref={turn} aria-hidden="true" size={size} strokeWidth={size === 12 ? 2 : 1.75} className="flex-none text-[var(--tx)]" />;
}
