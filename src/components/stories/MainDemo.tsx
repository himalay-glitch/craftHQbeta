import { GitBranch, Play, RotateCcw } from "lucide-react";
import { BTN_PRIMARY, ICON_BTN } from "@/components/dashboard/classes";
import { Tip } from "@/components/dashboard/Tip";

export interface MainDemoStep {
  /** What happens: "hq-8 and hq-12 merge into main". */
  label: string;
  /** What happened in the live product at this point (hq-35, 17–25 Nov), so the difference is plain. */
  live: string;
  run: () => void;
}

interface MainDemoProps {
  steps: MainDemoStep[];
  /** Steps done so far: the next one is the one Play plays. */
  at: number;
  /** Why the next step waits, if it does ("Press Reconnect GitHub on the card first"). */
  wait?: string;
}

/**
 * Demo only, on hq-35 (Shubham, 26 Nov: "showcase it with the same story"): replays what happened to "Tell the host
 * when you'll arrive" in the live product, one step at a time, handled the new way, each with what the live product
 * did then. A slim strip at the top of the chat, in the page's flow, so it covers nothing (the right side's tabs and
 * the message box stay clear): the step you're on, Play, and Start over.
 */
export function MainDemo({ steps, at, wait }: MainDemoProps) {
  const done = at >= steps.length;
  const step = done ? null : steps[at];
  return (
    <aside aria-label="Demo controls" className="flex items-center gap-3 rounded-2xl border border-dashed border-[var(--ctl-h)] bg-[#FAFAFA] py-2 pr-2 pl-3">
      <GitBranch aria-hidden="true" size={16} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
      <div className="min-w-0 flex-1">
        <p className="m-0 flex items-center gap-2 text-xs text-[var(--tx2)]">
          <span>Demo · hq-35 and main</span>
          {/* Where you are: one dot per step, filled once played. */}
          <span aria-hidden="true" className="flex items-center gap-1">
            {steps.map((st, i) => (
              <span key={st.label} className={`size-1.5 rounded-full ${i < at ? "bg-[var(--tx)]" : i === at ? "bg-[var(--cta)]" : "bg-[#D4D4D8]"}`} />
            ))}
          </span>
          <span className="tabular-nums">{done ? "done" : `${at + 1} of ${steps.length}`}</span>
        </p>
        <p className="m-0 mt-0.5 truncate text-sm font-medium text-[var(--tx)]" title={step?.label}>
          {step ? step.label : "Every step has played"}
        </p>
        <p className="m-0 truncate text-xs text-[var(--tx2)]" title={step?.live} aria-live="polite">
          {wait ?? (step ? step.live : "Start over to see it again.")}
        </p>
      </div>
      {step && !wait && (
        <button type="button" onClick={step.run} className={`${BTN_PRIMARY} flex-none`}>
          <Play aria-hidden="true" size={14} strokeWidth={2} />
          Play
        </button>
      )}
      <Tip label="Start over">
        <button type="button" aria-label="Start the demo over" onClick={() => window.location.reload()} className={ICON_BTN}>
          <RotateCcw aria-hidden="true" size={16} strokeWidth={1.75} />
        </button>
      </Tip>
    </aside>
  );
}
