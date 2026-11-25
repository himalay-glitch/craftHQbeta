import type { ReactNode } from "react";
import { ChevronRight, CircleExclamationPoint, CircleX, Clock, GitPullRequest, LoaderCircle, type LucideIcon } from "lucide-react";
import styles from "./tokens.module.css";

// Card anatomy measured from the reference: 12 px radius, 1 px #E3E3E3, a faint shadow, 12 × 16 px padding;
// label 13/18 grey, then 12 px, the number 32/36 regular, then 12 px, the sub-line 13/18 grey.
// Every card does something (as in the prototype), so every card lifts on hover like the reference's.
const CARD =
  "group flex min-w-0 flex-col rounded-[12px] border bg-white px-4 py-3 text-left shadow-[var(--shadow-card)] " +
  "transition-[transform,box-shadow,border-color] duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-0.5 " +
  "hover:shadow-[var(--shadow-card-h)] motion-reduce:hover:translate-y-0";

// Each card's status indicator: its icon in a 24 px tinted circle, in the same tones and icons as the status pills
// in the table (DESIGN.md §7.12). Robots at work are CraftHQ blue and turn (green means merged); waiting is grey;
// a person's turn is amber; stuck is red, with a soft ring pulsing out. At 0 the indicator goes grey and still,
// so colour only shows where there's something to look at.
const TONE = {
  active: "bg-[#E9F0FE] text-[var(--cta)]",
  neutral: "bg-[#F0F0F2] text-[var(--tx2)]",
  attention: "bg-warning-tint text-warning",
  negative: "bg-danger-tint text-danger-ink",
} as const;
type Tone = keyof typeof TONE;

function Indicator({ icon: Icon, tone, on, spin, ring }: { icon: LucideIcon; tone: Tone; on: boolean; spin?: boolean; ring?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-6 flex-none items-center justify-center rounded-full ${TONE[on ? tone : "neutral"]} ${on && ring ? styles.alertIcon : ""}`}
    >
      <Icon size={14} strokeWidth={2} className={on && spin ? "motion-safe:animate-spin" : ""} />
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  onClick,
  pressed,
  icon,
  tone,
  spin,
  ring,
}: {
  label: string;
  value: number;
  sub: ReactNode;
  onClick: () => void;
  /** For cards that filter the table: shown while their filter is on. */
  pressed?: boolean;
  icon: LucideIcon;
  tone: Tone;
  /** Robots at work: the icon turns (stills with reduced motion). */
  spin?: boolean;
  /** Stuck: the soft red ring pulses out of the indicator. */
  ring?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`${CARD} ${pressed ? "border-[var(--cta)]" : "border-[var(--card-line)] hover:border-[var(--card-line-h)]"}`}
    >
      <span className="flex items-center justify-between gap-2 text-[13px] leading-[18px] text-[var(--tx2)]">
        {/* Only the label truncates, so the indicator's ring isn't clipped. */}
        <span className="flex min-w-0 items-center gap-2">
          <Indicator icon={icon} tone={tone} on={value > 0} spin={spin} ring={ring} />
          <span className="truncate">{label}</span>
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
 * Five stats, the agent's two first: Running and Queued (as on the live app's "Agent's turn" card), then the three
 * that filter the table: Needs you, Ready to review, Stuck. Each carries a coloured status indicator. Done was the
 * least important and is gone; it lives in the Details panel's Recent activity.
 */
export function SummaryCards(p: SummaryCardsProps) {
  const runningTotal = p.running.inProgress + p.running.inReview;
  return (
    <section aria-label="Summary" className={`${styles.cards} mt-4`}>
      <StatCard
        label="Running"
        value={runningTotal}
        sub={runningTotal === 0 ? "The agent is idle" : `${p.running.inProgress} in progress, ${p.running.inReview} in review`}
        onClick={p.onAgent}
        icon={LoaderCircle}
        tone="active"
        spin
      />
      <StatCard label="Queued" value={p.queued} sub={`Agent checked ${p.loopTick}`} onClick={p.onAgent} icon={Clock} tone="neutral" />
      <StatCard
        label="Needs you"
        value={p.needsYou}
        sub={`${p.othersWaiting} more waiting on others`}
        onClick={p.onNeedsYou}
        pressed={p.active === "mine"}
        icon={CircleExclamationPoint}
        tone="attention"
      />
      <StatCard
        label="Ready to review"
        value={p.readyToReview}
        sub="Test, then accept or ask for changes"
        onClick={p.onReview}
        pressed={p.active === "review"}
        icon={GitPullRequest}
        tone="attention"
      />
      <StatCard
        label="Stuck"
        value={p.stuck}
        sub="Not being picked up"
        onClick={p.onStuck}
        pressed={p.active === "stuck"}
        icon={CircleX}
        tone="negative"
        ring
      />
    </section>
  );
}
