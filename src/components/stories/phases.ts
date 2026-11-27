import type { PhaseKey, RunPhase } from "@/types/stories";
import { elapsed } from "./clock";

// A robot run's phases in plain words, for business readers. While it works, only the current phase shows, by
// the robot's name (LIVE_WORDS in LiveLine.tsx, the same words as the board: "Builder is making the change"), in
// the chat's live line and the status row, never the whole row of them at once. These shorter words sit beside
// the robot already (the activity column's build line, the folded summary under a reply). When the run is done,
// the phases fold into one line under its reply. Never "agent" (DESIGN.md §9.2).

export const PHASE_LABEL: Record<PhaseKey, string> = {
  plan: "Planning the work",
  implement: "Making the change",
  "ui-check": "Checking the screens",
  review: "Reviewing its work",
  verify: "Verifying the change",
  resume: "Picking up where it left off",
  reply: "Writing the reply",
};

/** Past tense, for the folded line: "Planned · changed · screens checked". */
const PHASE_DONE: Record<PhaseKey, string> = {
  plan: "planned",
  implement: "changed",
  "ui-check": "screens checked",
  review: "reviewed",
  verify: "verified",
  resume: "picked up again",
  reply: "replied",
};

/** One line under a phase in the opened summary, where the label alone doesn't say enough. */
export const PHASE_NOTE: Partial<Record<PhaseKey, string>> = {
  "ui-check": "Opened the running app and looked at the screens",
  verify: "Checker, not Builder, checked it against the story",
};

/** "Planned · changed · screens checked · reviewed · verified". The reply is left out: the line sits under it. */
export function runLine(phases: RunPhase[]) {
  const words = phases.filter((p) => p.key !== "reply").map((p) => PHASE_DONE[p.key]);
  const line = (words.length ? words : ["replied"]).join(" · ");
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** The run's whole time: "15s", "38m" (whole minutes drop the "0s"). */
export const runTime = (phases: RunPhase[]) => elapsed(phases.reduce((t, p) => t + p.ms, 0)).replace(/m 0s$/, "m");

/**
 * What the robot is doing inside each phase, a few plain steps, for the faint trail under the chat's live line
 * (RunTrail). Sample words until the CraftHQ API streams a run's real steps; they play once, in order, and the
 * last one stays. Robots by name, never "agent" (DESIGN.md §9.2).
 */
export const PHASE_STEPS: Record<PhaseKey, string[]> = {
  plan: ["Making the story’s branch", "Reading the plan", "Reading the engineering page", "Listing the files it will change"],
  implement: ["Opening the files it will change", "Writing the change", "Saving the changed files", "Running the app’s own tests"],
  "ui-check": ["Starting the app", "Opening the screens at phone size", "Opening the screens at web size", "Comparing them with the specification"],
  review: ["Running every check", "Reading its own change line by line", "Looking for screens it didn’t mean to change"],
  verify: ["Checker is reading the story", "Checker is trying the change", "Checker is comparing it with the plan"],
  resume: ["Finding where it stopped", "Picking up the story’s branch", "Carrying on with the change"],
  reply: ["Gathering what it found", "Writing the reply", "Reading it over once more"],
};

/** The same, while the robot reads a message before it answers. */
export const THINKING_STEPS = ["Reading your message", "Looking back over the story", "Checking what changed since the last build", "Working out what to do"];
