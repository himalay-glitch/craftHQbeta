import {
  CircleDashed,
  CircleExclamationPoint,
  CircleSlash,
  CircleX,
  GitMerge,
  GitPullRequest,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";
import type { StatusTone, TicketStatus } from "@/types/status";

/** DESIGN.md §7.12: each ticket status's label, tone, icon and meaning. The labels are the only words a status uses. */
export const STATUSES: Record<TicketStatus, { label: string; tone: StatusTone; icon: LucideIcon; means: string }> = {
  draft: { label: "Draft", tone: "neutral", icon: CircleDashed, means: "Written, not started" },
  asking: { label: "Asking", tone: "active", icon: LoaderCircle, means: "The Asker is reading the ticket" },
  needs_input: {
    label: "Needs input",
    tone: "attention",
    icon: CircleExclamationPoint,
    means: "Waiting for a person's answer or decision",
  },
  building: { label: "Building", tone: "active", icon: LoaderCircle, means: "The Developer is writing the change" },
  checking: {
    label: "Checking",
    tone: "active",
    icon: LoaderCircle,
    means: "The Tester is testing against the requirements",
  },
  in_review: {
    label: "In review",
    tone: "attention",
    icon: GitPullRequest,
    means: "The pull request is waiting for an engineer",
  },
  merged: { label: "Merged", tone: "positive", icon: GitMerge, means: "The change is merged" },
  failed: { label: "Failed", tone: "negative", icon: CircleX, means: "A build or check failed and needs a decision" },
  closed: { label: "Closed", tone: "neutral", icon: CircleSlash, means: "Closed without merging" },
};

// DESIGN.md §3.1 tones: the pill takes the tone's tint and ink, the icon its mark. Active has no tint; the motion
// (and, later, the agent's avatar) carries it.
const TONE: Record<StatusTone, { pill: string; mark: string }> = {
  neutral: { pill: "bg-field text-foreground", mark: "text-muted-foreground" },
  active: { pill: "text-foreground", mark: "text-foreground" },
  attention: { pill: "bg-warning-tint text-warning-ink", mark: "text-warning" },
  positive: { pill: "bg-success-tint text-success-ink", mark: "text-success" },
  negative: { pill: "bg-danger-tint text-danger-ink", mark: "text-danger-ink" },
};

interface StatusPillProps {
  status: TicketStatus;
  /** Agent work only: how long it has run, e.g. "4m", shown as "Building · 4m" (DESIGN.md §6.8). */
  elapsed?: string;
  /** Dense rows: the icon alone, with the label as its accessible name and tooltip (DESIGN.md §7.12). */
  iconOnly?: boolean;
  className?: string;
}

/**
 * A ticket's status, the same everywhere (DESIGN.md §7.12): the tone's icon (12 px) and a label (`text-xs
 * font-medium`) on the tone's tint, in its ink; `rounded-full`, 20 px tall, `px-2`. Agents' statuses turn their
 * icon, except with reduced motion.
 */
export function StatusPill({ status, elapsed, iconOnly = false, className = "" }: StatusPillProps) {
  const { label, tone, icon: Icon } = STATUSES[status];
  const name = elapsed ? `${label} · ${elapsed}` : label;
  const icon = (
    <Icon
      aria-hidden="true"
      size={12}
      strokeWidth={2}
      className={`flex-none ${TONE[tone].mark} ${tone === "active" ? "motion-safe:animate-spin" : ""}`}
    />
  );

  if (iconOnly) {
    return (
      <span role="img" aria-label={name} title={name} className={`inline-flex size-5 items-center justify-center ${className}`}>
        {icon}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-5 max-w-full items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap ${TONE[tone].pill} ${className}`}
    >
      {icon}
      <span className="truncate">{label}</span>
      {elapsed && <span className="flex-none font-normal tabular-nums opacity-75">· {elapsed}</span>}
    </span>
  );
}
