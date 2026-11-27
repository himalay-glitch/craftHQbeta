import type { StoryStatus } from "@/types/dashboard";
import type { PhaseKey } from "@/types/stories";

// A rough idea of how long the robots still need (Shubham, 27 Nov: "an estimate time to complete the task … to just give
// an idea to the user"). Typical minutes for each phase of a run, until the CraftHQ API gives each story its own. Only
// the robots' work is estimated, never a person's: a review or a merge takes as long as it takes.

const MINUTES: Record<PhaseKey, number> = { plan: 3, implement: 15, "ui-check": 5, review: 4, verify: 3, resume: 2, reply: 1 };
/** A build's phases, in order: the branch and the plan, the change, the screens, its own review, the independent check. */
const BUILD: PhaseKey[] = ["plan", "implement", "ui-check", "review", "verify"];
const sum = (keys: PhaseKey[]) => keys.reduce((t, k) => t + MINUTES[k], 0);

/** Writing the plan, from reading the story to the draft. */
const PLAN_MINUTES = 5;
/** Queued, until Builder picks it up. */
const QUEUE_MINUTES = 2;
/** A whole build, from the branch to the independent check. */
export const BUILD_MINUTES = sum(BUILD);

export interface RobotRun {
  /** The run's current phase, as the chat's live line names it. */
  phase?: PhaseKey;
  /** Epoch ms: when the run started. */
  since?: number;
  /** Approved and waiting for Builder to pick it up. */
  queued?: boolean;
}

/** Minutes the robots still need for what they're doing now, or undefined when nothing of theirs is under way. */
export function minutesLeft(status: StoryStatus, run: RobotRun, now: number): number | undefined {
  if (run.queued) return QUEUE_MINUTES + BUILD_MINUTES;
  const { phase, since } = run;
  if (!phase) return undefined;
  if (phase === "reply") return MINUTES.reply;
  const gone = since && now ? Math.max(0, (now - since) / 60_000) : 0;
  // In Planning, the "plan" phase is the whole plan being written.
  if (status === "new" || status === "planning") return Math.max(1, (phase === "resume" ? MINUTES.resume : 0) + PLAN_MINUTES - gone);
  // A build: what's left of this phase (by the time gone since the run started), then the phases after it. A build that
  // picks up where it left off skips making the branch.
  const order: PhaseKey[] = phase === "resume" ? ["resume", ...BUILD.slice(1)] : BUILD;
  const at = Math.max(0, order.indexOf(phase));
  const into = Math.max(0, gone - sum(order.slice(0, at)));
  return Math.max(1, MINUTES[phase] - into) + sum(order.slice(at + 1));
}

/** "about 25 min", "about 4 min", "about a minute": rounded, so it reads as an idea and not a promise. */
export function roughly(minutes: number) {
  if (minutes < 1.5) return "about a minute";
  if (minutes < 10) return `about ${Math.round(minutes)} min`;
  return `about ${Math.round(minutes / 5) * 5} min`;
}
