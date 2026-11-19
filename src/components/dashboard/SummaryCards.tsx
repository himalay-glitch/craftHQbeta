import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import styles from "./tokens.module.css";

// Card anatomy measured from the reference: 12 px radius, 1 px #E3E3E3, a faint shadow, 12 × 16 px padding;
// label 13/18 grey, then 12 px, the number 32/36 regular, then 12 px, the sub-line 13/18 grey.
// Every card does something (as in the prototype), so every card lifts on hover like the reference's.
const CARD =
  "group flex min-w-0 flex-col rounded-[12px] border bg-white px-4 py-3 text-left shadow-[var(--shadow-card)] " +
  "transition-[transform,box-shadow,border-color] duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-0.5 " +
  "hover:shadow-[var(--shadow-card-h)] motion-reduce:hover:translate-y-0";

function StatCard({
  label,
  value,
  sub,
  onClick,
  pressed,
  dot,
}: {
  label: string;
  value: number;
  sub: ReactNode;
  onClick: () => void;
  /** For cards that filter the table: shown while their filter is on. */
  pressed?: boolean;
  dot?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`${CARD} ${pressed ? "border-[var(--cta)]" : "border-[var(--card-line)] hover:border-[var(--card-line-h)]"}`}
    >
      <span className="flex items-center justify-between gap-2 text-[13px] leading-[18px] text-[var(--tx2)]">
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {dot && <span aria-hidden="true" className="size-1.5 flex-none rounded-full bg-[var(--green)]" />}
          {label}
        </span>
        <ChevronRight
          aria-hidden="true"
          size={16}
          strokeWidth={1.5}
          className="flex-none opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </span>
      <span className="mt-3 text-[32px] leading-9 font-normal tracking-[-0.02em] text-[var(--tx)] tabular-nums">{value}</span>
      <span className="mt-3 truncate text-[13px] leading-[18px] text-[var(--tx2)]">{sub}</span>
    </button>
  );
}

interface SummaryCardsProps {
  needsYou: number;
  othersWaiting: number;
  readyToReview: number;
  stuck: number;
  /** Stories the agent is working on, split by stage for the Running card's line. */
  running: { inProgress: number; inReview: number };
  queued: number;
  loopTick: string;
  /** Which filter-card is on, if any. */
  active: "mine" | "review" | "stuck" | null;
  onNeedsYou: () => void;
  onReview: () => void;
  onStuck: () => void;
  onAgent: () => void;
}

/**
 * Five stats. First the three that filter the table (Needs you, Ready to review, Stuck), then the agent's
 * two, Running and Queued, as on the live app's "Agent's turn" card. Done was the least important and is
 * gone; it lives in the Details panel's Recent activity.
 */
export function SummaryCards(p: SummaryCardsProps) {
  const runningTotal = p.running.inProgress + p.running.inReview;
  return (
    <section aria-label="Summary" className={`${styles.cards} mt-4`}>
      <StatCard
        label="Needs you"
        value={p.needsYou}
        sub={`${p.othersWaiting} more waiting on others`}
        onClick={p.onNeedsYou}
        pressed={p.active === "mine"}
      />
      <StatCard
        label="Ready to review"
        value={p.readyToReview}
        sub="Test, then accept or ask for changes"
        onClick={p.onReview}
        pressed={p.active === "review"}
      />
      <StatCard label="Stuck" value={p.stuck} sub="Not being picked up" onClick={p.onStuck} pressed={p.active === "stuck"} />
      <StatCard
        label="Running"
        value={runningTotal}
        sub={runningTotal === 0 ? "The agent is idle" : `${p.running.inProgress} in progress, ${p.running.inReview} in review`}
        onClick={p.onAgent}
        dot={runningTotal > 0}
      />
      <StatCard
        label="Queued"
        value={p.queued}
        sub={`Agent checked ${p.loopTick}`}
        onClick={p.onAgent}
      />
    </section>
  );
}
