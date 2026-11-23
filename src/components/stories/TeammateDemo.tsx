import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";

export type TeammateMove = "planning" | "approved";

interface TeammateDemoProps {
  /** The teammate's first name. */
  who: string;
  present: boolean;
  onPresence: (here: boolean) => void;
  /** `late`: the change reaches the server before this page hears of it, so the next action is refused. */
  onMove: (to: TeammateMove, late: boolean) => void;
  /** A late change is waiting: this page hasn't caught up yet. */
  waiting: boolean;
  /** Moving back to Planning only makes sense from later on. */
  canPlan: boolean;
  /** The agent holds a build: nobody can change the status until it ends (the status menu is locked). */
  locked: boolean;
}

/**
 * Demo only (`?demo=teammate`), docked in the empty middle of the activity column so it never covers the chat's
 * decision: plays a teammate's moves on demand, since there's no back end yet. Never on a timer,
 * so Shubham decides when it happens. "Before this page catches up" shows the guard: the change is made but this
 * page doesn't know yet, so the next button you press is refused with the reason.
 */
export function TeammateDemo({ who, present, onPresence, onMove, waiting, canPlan, locked }: TeammateDemoProps) {
  const [open, setOpen] = useState(true);
  const [late, setLate] = useState(false);
  const btn =
    "h-7 w-full rounded-full border border-[var(--ctl)] bg-white px-3 text-left text-xs text-[var(--tx)] transition-colors duration-[120ms] hover:border-[var(--ctl-h)] hover:bg-[var(--ctl-bg-h)] disabled:opacity-50";

  return (
    <aside aria-label="Demo controls" className="fixed top-1/2 right-4 z-50 w-64 -translate-y-1/2 rounded-xl max-md:top-auto max-md:bottom-4 max-md:translate-y-0 border border-dashed border-[var(--ctl-h)] bg-white/95 p-2 shadow-[0_8px_24px_rgb(0_0_0/0.12)] backdrop-blur">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-xs font-medium text-[var(--tx2)]">
        <Users aria-hidden="true" size={14} strokeWidth={1.75} />
        <span className="flex-1 text-left">Demo · a teammate</span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={1.75} className={`transition-transform duration-[120ms] ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          <button type="button" className={btn} onClick={() => onPresence(!present)}>
            {present ? `${who} leaves the story` : `${who} opens this story`}
          </button>
          <button type="button" className={btn} disabled={waiting || locked || !canPlan} onClick={() => onMove("planning", late)}>
            {who} moves it back to Planning
          </button>
          <button type="button" className={btn} disabled={waiting || locked} onClick={() => onMove("approved", late)}>
            {who} approves it again (start again)
          </button>
          <label className="flex items-center gap-2 px-1 pt-0.5 text-xs text-[var(--tx2)]">
            <input type="checkbox" checked={late} onChange={(e) => setLate(e.target.checked)} className="accent-[var(--cta)]" />
            Before this page catches up
          </label>
          {locked && !waiting && <p className="m-0 px-1 text-xs text-[var(--tx2)]">The agent holds a build: nobody can change the status until it ends.</p>}
          {waiting && <p className="m-0 px-1 text-xs text-[var(--warning-ink)]">{who}’s change is made, but this page doesn’t know yet. Press any button on the story to see the guard.</p>}
        </div>
      )}
    </aside>
  );
}
