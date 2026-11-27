import { useState, type ReactNode } from "react";
import { Check, CircleSlash } from "lucide-react";
import type { NeedKind, StoryStatus as Status } from "@/types/dashboard";
import { Tip } from "@/components/dashboard/Tip";
import { useNow } from "./clock";
import { BUILD_MINUTES, minutesLeft, roughly, type RobotRun } from "./estimate";
import { StageIcon } from "./StageIcon";
import { PanelSection } from "./PanelSection";
import { COLUMNS, STATUS_LABEL, type ColumnKey, type MoveOption, type StatusMove } from "./stage";

// The Status box's heart: every status as a chip with its name, across (Shubham, 27 Nov: "the status need to work
// horizontally with some different idea"). The story's status is the filled one, with its stage's icon; the ones behind
// it are ticked. Changing the status by hand is one click on a chip (Shubham, 27 Nov, after a track of clickable icons
// that didn't convince him: the icons had no names, it didn't look clickable, the words under it changed on hover, and
// it asked again before moving). So: a status the story can be moved to is an outlined button with its name; the others
// are plain words. A click moves the story at once, and the toast says what happened, with Undo (DESIGN.md §9.2: what
// a choice does is said after you choose it). Nothing on the page changes on hover; a chip's tooltip says what the click
// will do. A status is an instruction; a note is a conversation.

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Whose turn it is, said in the box. */
export type Turn = { kind: "you" | "other" | "working" | "stuck" | "none"; name?: string };

/** The tag for your turn, by what's waiting on you: "Your review", "Your OK". */
const YOUR: Partial<Record<NeedKind, string>> = {
  review: "Your review",
  planning: "Your OK",
  decision: "Your answers",
  triage: "Your call",
  next: "Your next step",
};

/** A chip: one of the five stages, or Cancelled, the other way a story ends. */
type Spot = ColumnKey | "cancel";

/** The chip each move a person can make belongs to. In review has none: the robots move a story there. */
const SPOT: Record<StatusMove, Spot> = { planning: "planning", approved: "building", pull_request: "pr", done: "done", close: "done", cancelled: "cancel" };

/** What a move does, in the words of the status guide: a chip's tooltip. */
function moveSays(m: MoveOption, from: Status, merger: string): string {
  switch (m.move) {
    case "planning":
      return from === "new" ? "The agent writes a plan first. Nothing is built." : "The plan is rewritten from your notes. Nothing is built.";
    case "approved":
      return `${
        from === "new" || from === "planning"
          ? "Builder builds it, then Checker checks it."
          : from === "in_review" || from === "pull_request"
            ? "Builder changes it, then Checker checks it again."
            : "A new build from the story as it is now."
      } Takes ${roughly(BUILD_MINUTES)}.`;
    case "pull_request":
      return /^Update/.test(m.label) ? `The open pull request gets this build, and ${merger} merges it on GitHub.` : `${merger} checks it and merges it on GitHub. Robots never merge.`;
    case "done":
      return "Accepts the work. There’s nothing to merge.";
    case "close":
      return "Closes the pull request on GitHub without merging it.";
    case "cancelled":
      return "Not going to happen. Stops any work still waiting to start.";
  }
}

interface StatusPickerProps {
  status: Status;
  need?: NeedKind;
  turn: Turn;
  /** What's under way right now: "PR #259 · Ready to merge", "Builder is making the change". */
  detail?: string;
  /** The robots' run under way, or the queue: for a rough idea of how long they still need. */
  robotRun?: RobotRun;
  /** The dot's colour class, as the badge's. */
  dot: string;
  moves: MoveOption[];
  /** The agent's suggestion: the decision card's main button. */
  suggested?: StatusMove;
  /** That button's words, so the chat and this side say the same thing ("Try again", "Create pull request"). */
  suggestedLabel?: string;
  /** Why nothing can be changed right now. */
  locked?: string;
  /** The person who merges, by first name ("Deepak", or "you"). */
  merger: string;
  /** Runs a move; the reason comes back when it was refused (a teammate changed the story first). */
  onMove: (move: StatusMove) => string | undefined;
  /** Opens "How statuses work". */
  onGuide: () => void;
  /** From 1024 px: a white box of its own that folds, named Status. In the Status tab the tab already says it. */
  boxed?: boolean;
}

const CHIP = "inline-flex h-7 items-center gap-1 rounded-full text-xs font-medium whitespace-nowrap pointer-coarse:h-11";
/** Side padding: a button's or the story's own chip; and the little a plain word needs. Kept tight, so three chips with
 *  their marks share a row in the 300 px box. */
const PAD = "px-2 pointer-coarse:px-3";
const PAD_PLAIN = "px-1 pointer-coarse:px-1.5";
/** A status the story can be moved to: an outlined button (the secondary button's look, DESIGN.md §7.1), so it reads as
 *  something to press. */
const CHIP_BUTTON =
  "cursor-pointer border transition-colors duration-[120ms] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cta)]";
const CHIP_GO = `${CHIP_BUTTON} border-[var(--ctl)] bg-white text-[var(--tx)] hover:border-[var(--ctl-h)] hover:bg-[var(--ctl-bg-h)]`;
/** The agent's suggestion: the one blue outline. */
const CHIP_SUGGESTED = `${CHIP_BUTTON} border-[var(--cta)] bg-white text-primary-strong hover:bg-selected`;
/** Cancelling: quieter until it's pointed at. */
const CHIP_STOP = `${CHIP_BUTTON} border-[var(--ctl)] bg-white text-[var(--tx2)] hover:border-danger hover:bg-danger-tint hover:text-danger-ink`;

export function StatusPicker({ status, need, turn, detail, robotRun, dot, moves, suggested, suggestedLabel, locked, merger, onMove, onGuide, boxed }: StatusPickerProps) {
  const [refused, setRefused] = useState<string | null>(null);
  // Ticks while a robot works, so the estimate counts down.
  const clock = useNow(Boolean(robotRun?.phase));
  // The status's own name, as the header's badge says it (26 Nov: the header said "New" and this box "Planning").
  const label = STATUS_LABEL[status];
  const at = COLUMNS.findIndex((c) => c.statuses.includes(status));
  const cancelled = status === "cancelled";
  const suggestion = suggested ? moves.find((m) => m.move === suggested) : undefined;
  // The move a chip stands for, if the story can be moved there now.
  const moveAt = (spot: Spot) => (locked ? undefined : moves.find((m) => SPOT[m.move] === spot));
  const stageName = cancelled ? "Cancelled" : COLUMNS[at]?.label;

  // Whose turn, in words.
  const tag =
    turn.kind === "you"
      ? { text: (need && YOUR[need]) ?? "Waiting on you" }
      : turn.kind === "stuck"
        ? { text: "Stopped" }
        : turn.kind === "other" && turn.name
          ? { text: `With ${turn.name}` }
          : turn.kind === "working"
            ? { text: "Working" }
            : null;

  // One click moves the story; the toast says what happened, with Undo.
  const run = (move: StatusMove) => setRefused(onMove(move) ?? null);

  // The story's own chip: its tone's tint and ink (DESIGN.md §3.1).
  const tint = dot.includes("d97706")
    ? "bg-warning-tint text-warning-ink"
    : dot.includes("b91c1c")
      ? "bg-danger-tint text-danger-ink"
      : dot.includes("16a34a")
        ? "bg-success-tint text-success-ink"
        : "bg-field text-[var(--tx)]";
  // Whose turn, in its tone's ink: words, not another pill (Shubham, 26 Nov: a calmer Status).
  const turnTone = turn.kind === "you" ? "text-warning-ink" : turn.kind === "stuck" ? "text-danger-ink" : "text-[var(--tx)]";
  // Under the chips: the status's own word when it differs from the stage ("Queued"), then what's under way, never
  // repeating a word. Not "Queued" on a story that stopped.
  const showLabel = label !== COLUMNS[at]?.label && !cancelled && turn.kind !== "stuck";
  const words = [showLabel ? label : null, detail && detail !== label ? detail : null].filter(Boolean).join(" · ");
  // A rough idea of how long the robots still need (Shubham, 27 Nov: "an estimate time to complete the task … to just
  // give an idea to the user"). Only their work: nothing while it waits on a person. It goes where whose turn goes:
  // while the robots work, the time is the news.
  const left = robotRun && !cancelled && turn.kind !== "stuck" ? minutesLeft(status, robotRun, clock) : undefined;
  // Before the plan is approved, the build says how long it takes, so an approval comes with an idea of the wait.
  const buildAhead = status === "new" || status === "planning";

  const why = (spot: Spot) =>
    locked ?? (spot === "review" ? "A story gets here by itself, once it’s built and checked." : `It can’t be moved here from ${stageName}.`);

  return (
    <PanelSection
      id="status"
      title="Status"
      boxed={boxed}
      titleHidden
      // Folded, the title row still says where the story is and whose turn it is.
      summary={
        <>
          {stageName}
          {left !== undefined ? ` · ${cap(roughly(left))} left` : tag && <span className={turn.kind === "you" ? "text-warning-ink" : turn.kind === "stuck" ? "text-danger-ink" : undefined}> · {tag.text}</span>}
        </>
      }
    >
      {/* The statuses, in the order a story goes through them, then Cancelled at the end of its row. They wrap onto a
          second row: five names don't fit across the narrow box. */}
      <ol aria-label="Stages" className={`m-0 flex list-none flex-wrap gap-x-1 gap-y-1.5 ${boxed ? "mt-2.5" : ""}`}>
        {COLUMNS.map((c, i) => {
          const current = i === at && !cancelled;
          return (
            // Keyed by the status too: arriving at a new stage plays its icon once.
            <li key={`${c.key}:${status}`} aria-current={current ? "step" : undefined} className="flex">
              <StatusChip
                name={c.label}
                current={current}
                past={!cancelled && i < at}
                tint={tint}
                mark={current ? <NowIcon stage={c.key} working={turn.kind === "working"} /> : undefined}
                move={moveAt(c.key)}
                says={(m) => moveSays(m, status, merger)}
                why={current ? undefined : why(c.key)}
                suggested={Boolean(suggestion) && moveAt(c.key)?.move === suggestion?.move}
                suggestedLabel={suggestedLabel}
                onPick={run}
              />
            </li>
          );
        })}
        {/* The other way a story ends, at the far end of its row. Not on a finished story. */}
        {status !== "done" && (
          <li aria-current={cancelled ? "step" : undefined} className="ml-auto flex">
            <StatusChip
              name="Cancelled"
              current={cancelled}
              past={false}
              tint="bg-field text-[var(--tx2)]"
              mark={cancelled ? <CircleSlash aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none" /> : undefined}
              move={moveAt("cancel")}
              says={(m) => moveSays(m, status, merger)}
              why={cancelled ? undefined : (locked ?? `It can’t be cancelled from ${stageName}.`)}
              stop
              suggested={false}
              onPick={run}
            />
          </li>
        )}
      </ol>

      {/* Under the chips, in words that never change on hover: whose turn (or, while the robots work, the time they still
          need), then what's happening. */}
      <div className="mt-3">
        {left !== undefined ? (
          <p className="m-0 text-sm font-medium text-[var(--tx)] tabular-nums">{cap(roughly(left))} left</p>
        ) : (
          tag && <p className={`m-0 text-sm font-medium ${turnTone}`}>{tag.text}</p>
        )}
        {words && <p className="m-0 text-xs text-pretty text-[var(--tx2)]">{words}</p>}
        {buildAhead && <p className="m-0 mt-1 text-xs text-pretty text-[var(--tx2)]">Building takes {roughly(BUILD_MINUTES)}</p>}
      </div>

      {(refused || locked) && (
        <p role={refused ? "alert" : undefined} className="m-0 mt-3 rounded-[10px] bg-field px-3 py-2 text-xs text-pretty text-[var(--tx2)]">
          {refused ?? locked}
        </p>
      )}

      <button
        type="button"
        onClick={onGuide}
        className="mt-3 inline-flex min-h-6 items-center self-start rounded-[4px] text-xs font-medium whitespace-nowrap text-[var(--tx2)] underline decoration-black/20 underline-offset-2 hover:text-[var(--tx)] pointer-coarse:min-h-9"
      >
        How statuses work
      </button>
    </PanelSection>
  );
}

/** The story's own stage's icon, in its chip: drawn once when the story arrives there, and kept going while a robot
 *  works on it (the working indicator). */
function NowIcon({ stage, working }: { stage: ColumnKey; working: boolean }) {
  return <StageIcon stage={stage} play={1} working={working} size={14} />;
}

/**
 * One status. The story's own is filled in its tone, with `mark` (its stage's icon); the ones behind it have a tick.
 * With a `move`, it's a button: one click moves the story there, and its tooltip says what that does. Without one it's
 * plain words, and its tooltip says why it can't be picked.
 */
function StatusChip({
  name,
  current,
  past,
  tint,
  mark,
  move,
  says,
  why,
  stop,
  suggested,
  suggestedLabel,
  onPick,
}: {
  name: string;
  current: boolean;
  past: boolean;
  tint: string;
  mark?: ReactNode;
  /** The move this chip stands for, when the story can be moved here now. */
  move?: MoveOption;
  says: (move: MoveOption) => string;
  why?: string;
  /** Cancelled: quieter, and red when pointed at. */
  stop?: boolean;
  suggested: boolean;
  suggestedLabel?: string;
  onPick: (move: StatusMove) => void;
}) {
  const inside = (
    <>
      {mark}
      {past && <Check aria-hidden="true" size={10} strokeWidth={3} className="flex-none text-success" />}
      {name}
    </>
  );
  if (!move) {
    const chip = (
      <span className={`${CHIP} ${current ? `${PAD} ${tint} font-semibold` : `${PAD_PLAIN} ${past ? "text-[var(--tx2)]" : "text-[var(--tx2)]/70"}`}`}>
        {inside}
        <span className="sr-only">{current ? ", now" : past ? ", done" : ""}</span>
      </span>
    );
    return why ? <Tip label={why}>{chip}</Tip> : chip;
  }
  // The words on the move's own button elsewhere ("Create pull request"), then what it does.
  const tip = (
    <span className="block">
      <span className="block font-medium">{suggested && suggestedLabel ? suggestedLabel : move.label}</span>
      <span className="block opacity-80">{says(move)}</span>
    </span>
  );
  return (
    <Tip label={tip}>
      <button
        type="button"
        data-spot={SPOT[move.move]}
        onClick={() => onPick(move.move)}
        className={`${CHIP} ${PAD} ${current ? `${tint} font-semibold cursor-pointer transition-[filter] duration-[120ms] hover:brightness-95 active:translate-y-px` : stop ? CHIP_STOP : suggested ? CHIP_SUGGESTED : CHIP_GO}`}
      >
        {inside}
        <span className="sr-only">
          {current ? ", now" : past ? ", done" : ""}: {move.label}
          {suggested ? ", suggested" : ""}
        </span>
      </button>
    </Tip>
  );
}
