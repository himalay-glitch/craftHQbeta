import { Pause } from "lucide-react";
import { ICON_BTN } from "@/components/dashboard/classes";
import { Tip } from "@/components/dashboard/Tip";
import { setPausedMotion, usePausedMotion } from "./motion-pref";

/**
 * "Pause animations" (WCAG 2.2.2): stops every working mark turning, for this viewer, on every page that has them
 * (the board, the list, the dashboard). One name and one icon; the pressed state says it's on. 44 px on touch.
 */
export function PauseToggle() {
  const paused = usePausedMotion();
  return (
    <Tip label="Pause animations">
      <button
        type="button"
        aria-pressed={paused}
        aria-label="Pause animations"
        onClick={() => setPausedMotion(!paused)}
        className={`${ICON_BTN} size-[30px] pointer-coarse:size-11 ${paused ? "bg-[var(--ctl-bg-on)] text-[var(--tx)]" : ""}`}
      >
        <Pause aria-hidden="true" size={14} strokeWidth={1.75} />
      </button>
    </Tip>
  );
}
