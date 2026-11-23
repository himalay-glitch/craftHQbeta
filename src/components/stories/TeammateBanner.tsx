import { CircleExclamationPoint, CircleX, X } from "lucide-react";
import { elapsed, useNow } from "./clock";

/** A teammate's change to the story this page is showing. */
export interface TeammateChange {
  /** The teammate's first name. */
  who: string;
  /** "moved this back to Planning", "approved this again". */
  did: string;
  /** What it means for you, when you had something open: "Your review is on hold." */
  means?: string;
  /** Epoch ms, set in a handler. */
  at: number;
  /** The chat's line for it, so "See what changed" can take you there. */
  entryId: string;
}

/** "a moment ago", "40s ago", "2m 5s ago". */
export function ago(now: number, at: number) {
  return now - at < 10_000 ? "a moment ago" : `${elapsed(now - at)} ago`;
}

/**
 * A teammate changed the story you're on. A banner, not a toast: it's a state of the page that lasts until you've
 * seen it (DESIGN.md §6.5, §7.15), in the attention tone. The status row, the decision and the activity column have
 * already updated in place; this says who did it and what it means for you. One banner per page.
 */
export function TeammateBanner({ change, onSee, onDismiss }: { change: TeammateChange; onSee: () => void; onDismiss: () => void }) {
  const now = useNow(true);
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-10 flex-none items-center gap-2.5 rounded-lg bg-[var(--warning-tint)] py-1.5 pr-1.5 pl-3 text-sm text-[var(--tx)]"
    >
      <CircleExclamationPoint aria-hidden="true" size={16} strokeWidth={1.75} className="flex-none text-[var(--warning)]" />
      <p className="m-0 min-w-0 flex-1">
        <span className="font-medium">{change.who}</span> {change.did} {now ? ago(now, change.at) : "a moment ago"}.
        {change.means && <span className="text-[var(--tx2)]"> {change.means}</span>}
      </p>
      <button
        type="button"
        onClick={onSee}
        className="h-7 flex-none rounded-full px-2.5 text-xs font-medium text-[var(--tx)] transition-colors duration-[120ms] hover:bg-black/[0.06]"
      >
        See what changed
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        title="Got it"
        onClick={onDismiss}
        className="inline-flex size-7 flex-none items-center justify-center rounded-full text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/[0.06] hover:text-[var(--tx)]"
      >
        <X aria-hidden="true" size={16} strokeWidth={1.75} />
      </button>
    </div>
  );
}

/**
 * In place of a decision's buttons when pressing one was refused: the story had moved since this page last showed
 * it, so nothing was applied (DESIGN.md §6.9: errors show where they happen). One way on: catch up and see it.
 */
export function Refusal({ text, fix }: { text: string; fix?: { label: string; onClick: () => void } }) {
  return (
    <div role="alert" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-[var(--danger-tint)] px-3 py-2">
      <p className="m-0 flex min-w-0 flex-1 items-start gap-2 text-sm text-[var(--tx)]">
        <CircleX aria-hidden="true" size={16} strokeWidth={1.75} className="mt-0.5 flex-none text-[var(--danger-ink)]" />
        <span>{text}</span>
      </p>
      {fix && (
        <button
          type="button"
          onClick={fix.onClick}
          className="h-7 flex-none rounded-full border border-[var(--ctl)] bg-white px-3 text-xs font-medium text-[var(--tx)] transition-colors duration-[120ms] hover:border-[var(--ctl-h)] hover:bg-[var(--ctl-bg-h)]"
        >
          {fix.label}
        </button>
      )}
    </div>
  );
}
