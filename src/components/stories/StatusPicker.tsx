import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import type { NeedKind, StoryStatus as Status } from "@/types/dashboard";
import tokens from "@/components/dashboard/tokens.module.css";
import { COLUMNS, STATUS_LABEL, type MoveOption, type StatusMove } from "./stage";

// The Status tab's heart. The five stages top to bottom, with the story's stage open: whose turn it is and what's
// happening, and the agent's suggestion when the chat isn't showing it (Shubham, 26 Nov: a better Status). Under them,
// "Change status": the box you open to choose the next status (the old story page's habit: "users are used to changing
// the status"); each choice says where the story goes, what that does and its consequence, and the suggestion is
// marked. A status is an instruction; a note is a conversation.

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

type Tone = "code" | "close" | "plan" | "pr";

// A move's consequence, in DESIGN.md §3.1's tones: changes the code (positive), goes to the person who merges (blue: the
// one action), replans (outlined), closes (neutral).
const TAG: Record<Tone, string> = {
  code: "bg-success-tint text-success-ink",
  pr: "bg-selected text-primary-strong",
  plan: "bg-white text-[var(--tx)] ring-1 ring-[var(--ctl)]",
  close: "bg-field text-[var(--tx2)]",
};

/** Where a move sends the story, what it does, and its consequence, in the words of the status guide. */
function moveInfo(m: MoveOption, from: Status, merger: string): { to: string; what: string; tag: string; tone: Tone } {
  switch (m.move) {
    case "planning":
      return {
        to: "Planning",
        what: from === "new" ? "The agent writes a plan first. Nothing is built." : "Back to planning: the plan is rewritten from your notes. Nothing is built.",
        tag: "Replans",
        tone: "plan",
      };
    case "approved":
      return from === "new" || from === "planning"
        ? { to: "Building", what: "Approve the plan: Builder builds it, then Checker checks it.", tag: "Starts the build", tone: "code" }
        : from === "in_review" || from === "pull_request"
          ? { to: "Building", what: "Rebuild with your notes: Builder changes it, then Checker checks it again.", tag: "Changes the code", tone: "code" }
          : from === "done" || from === "cancelled"
            ? { to: "Building", what: "Reopen it: a new build from the story as it is now.", tag: "New build", tone: "code" }
            : { to: "Building", what: "Start a new build from the story as it is now.", tag: "New build", tone: "code" };
    case "pull_request":
      return /^Update/.test(m.label)
        ? { to: "Pull request", what: `The open pull request gets this build, and ${merger} merges it on GitHub.`, tag: "Updates the PR", tone: "pr" }
        : { to: "Pull request", what: `${merger} checks it and merges it on GitHub. Robots never merge.`, tag: `Goes to ${merger}`, tone: "pr" };
    case "done":
      return { to: "Done", what: "Accept the work. There’s nothing to merge.", tag: "Closes", tone: "close" };
    case "close":
      return { to: "Done", what: "Close the pull request on GitHub without merging it.", tag: "Closes", tone: "close" };
    case "cancelled":
      return { to: "Cancelled", what: "Not going to happen. Stops any work still waiting to start.", tag: "Closes", tone: "close" };
  }
}

interface StatusPickerProps {
  status: Status;
  need?: NeedKind;
  turn: Turn;
  /** What's under way right now: "PR #259 · Ready to merge", "Builder is making the change". */
  detail?: string;
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
}

export function StatusPicker({ status, need, turn, detail, dot, moves, suggested, suggestedLabel, locked, merger, onMove, onGuide }: StatusPickerProps) {
  const [refused, setRefused] = useState<string | null>(null);
  // The status's own name, as the header's badge says it (26 Nov: the header said "New" and this box "Planning"). The row
  // of stages under the box shows which column that is.
  const label = STATUS_LABEL[status];
  const at = COLUMNS.findIndex((c) => c.statuses.includes(status));
  const cancelled = status === "cancelled";
  const main = moves.filter((m) => m.move !== "cancelled");
  const cancel = moves.find((m) => m.move === "cancelled");
  const suggestion = suggested ? moves.find((m) => m.move === suggested) : undefined;

  // Whose turn, in words, for the current stage and the menu's name.
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
  const now =
    turn.kind === "you"
      ? "It’s waiting for you."
      : turn.kind === "stuck"
        ? "It stopped and needs you."
        : turn.kind === "other" && turn.name
          ? `It’s with ${turn.name}.`
          : turn.kind === "working"
            ? "A robot is working on it."
            : status === "done" || cancelled
              ? "It’s finished."
              : "Nothing is waiting on anyone.";

  const run = (move: StatusMove) => setRefused(onMove(move) ?? null);

  // The current stage's colour: its dot and a soft ring of the same tone (DESIGN.md §3.1).
  const ring = dot.includes("d97706") ? "ring-warning-tint" : dot.includes("b91c1c") ? "ring-danger-tint" : dot.includes("16a34a") ? "ring-success-tint" : "ring-field";
  // Whose turn, said on the current stage in its tone's ink: words, not another pill (Shubham, 26 Nov: a calmer Status).
  const turnTone = turn.kind === "you" ? "text-warning-ink" : turn.kind === "stuck" ? "text-danger-ink" : "text-[var(--tx2)]";
  // What the current stage says under its name: the status's own word when it differs from the stage ("Queued"), then
  // what's under way, never repeating a word.
  // Not when the stage line already says it ("Cancelled"), and not "Queued" on a story that stopped.
  const showLabel = label !== COLUMNS[at]?.label && !cancelled && turn.kind !== "stuck";
  const words = [showLabel ? label : null, detail && detail !== label ? detail : null].filter(Boolean).join(" · ");

  return (
    <section aria-label="Status" className="flex flex-col">
      {/* The tab already says Status. */}
      <h3 className="sr-only">Status</h3>

      {/* The five stages, top to bottom (Shubham, 26 Nov: a better Status; the row of five wrapped in a narrow card):
          a tick for each stage behind, the story's stage with its tone, whose turn and what's happening, the rest ahead. */}
      <ol aria-label="Stages" className="m-0 flex list-none flex-col p-0">
        {COLUMNS.map((c, i) => {
          const current = i === at;
          const past = !cancelled && i < at;
          const last = i === COLUMNS.length - 1;
          return (
            <li key={c.key} aria-current={current ? "step" : undefined} className="relative flex gap-3">
              {/* The line down to the next stage: inked behind the story, faint ahead. */}
              {!last && (
                <span aria-hidden="true" className={`absolute top-5 -bottom-1 left-2 w-px -translate-x-1/2 ${past ? "bg-[var(--tx2)]/40" : "bg-[var(--line)]"}`} />
              )}
              <span aria-hidden="true" className="relative flex h-6 w-4 flex-none items-center justify-center">
                {current ? (
                  <span className={`size-2.5 rounded-full ring-4 ${cancelled ? "bg-[var(--tx2)] ring-field" : `${dot} ${ring}`}`} />
                ) : past ? (
                  <span className="flex size-4 items-center justify-center rounded-full bg-field">
                    <Check size={12} strokeWidth={2} className="text-[var(--tx2)]" />
                  </span>
                ) : (
                  <span className="size-2 rounded-full border-[1.5px] border-[var(--ctl-h)] bg-white" />
                )}
              </span>
              <div className={`min-w-0 flex-1 ${last ? "" : current ? "pb-4" : "pb-2"}`}>
                <p className="m-0 flex h-6 items-center gap-2">
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${current ? "font-semibold text-[var(--tx)]" : past ? "text-[var(--tx)]" : "text-[var(--tx2)]"}`}
                  >
                    {current && cancelled ? "Cancelled" : c.label}
                  </span>
                  {current && tag && <span className={`flex-none text-xs font-medium ${turnTone}`}>{tag.text}</span>}
                </p>
                {current && words && <p className="m-0 text-xs text-pretty text-[var(--tx2)]">{words}</p>}
                {/* The agent's suggestion, one tap away, when the chat isn't already showing it as the decision. */}
                {current && suggestion && !locked && (
                  <button
                    type="button"
                    onClick={() => run(suggestion.move)}
                    className="mt-2 inline-flex h-7 items-center rounded-full bg-[var(--cta)] px-3 text-sm font-medium whitespace-nowrap text-white transition-colors duration-[120ms] hover:bg-[var(--cta-h)] active:translate-y-px"
                  >
                    {suggestedLabel ?? suggestion.label}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {(refused || locked) && (
        <p role={refused ? "alert" : undefined} className="m-0 mt-3 rounded-[10px] bg-field px-3 py-2 text-xs text-pretty text-[var(--tx2)]">
          {refused ?? locked}
        </p>
      )}

      {/* Changing it yourself: the box you open to choose the next status, each choice saying what it does. */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger
            aria-label={`Change status. Now: ${label}${tag ? `, ${tag.text}` : ""}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--ctl)] bg-white pr-2.5 pl-3.5 text-sm font-medium text-[var(--tx)] transition-colors duration-[120ms] hover:border-[var(--ctl-h)] hover:bg-[var(--ctl-bg-h)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cta)] data-[state=open]:border-[var(--cta)]"
          >
            Change status
            <ChevronDown aria-hidden="true" size={16} strokeWidth={1.75} className="text-[var(--tx2)] transition-transform duration-[120ms] [[data-state=open]_&]:rotate-180" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            {/* A little wider than the card, opening toward the chat, so each choice reads in two lines. */}
            <DropdownMenu.Content
              align="start"
              sideOffset={6}
              collisionPadding={8}
              className={`${tokens.tokens} z-50 w-[min(340px,calc(100vw-16px))] rounded-[16px] bg-white p-1.5 ring-1 ring-black/[0.08] outline-none`}
            >
              <p className="m-0 px-2.5 pt-1.5 pb-2 text-xs text-[var(--tx2)]">
                Now: {label}. {now}
              </p>
              {locked && <p className="m-0 mx-1 mb-1 rounded-[10px] bg-field px-2.5 py-2 text-xs text-pretty text-[var(--tx2)]">{locked}</p>}
              {main.length > 0 && <DropdownMenu.Separator className="my-1 h-px bg-[var(--line)]" />}
              {main.map((m) => (
                <MoveItem key={m.move} m={m} info={moveInfo(m, status, merger)} suggested={m.move === suggested} disabled={Boolean(locked)} onSelect={() => run(m.move)} />
              ))}
              {cancel && (
                <>
                  <DropdownMenu.Separator className="my-1 h-px bg-[var(--line)]" />
                  <MoveItem m={cancel} info={moveInfo(cancel, status, merger)} danger disabled={Boolean(locked)} onSelect={() => run("cancelled")} />
                </>
              )}
              <DropdownMenu.Separator className="my-1 h-px bg-[var(--line)]" />
              <DropdownMenu.Item
                onSelect={onGuide}
                className="flex h-9 cursor-pointer items-center rounded-[10px] px-2.5 text-sm font-medium text-[var(--tx)] outline-none data-highlighted:bg-[var(--menu-h)]"
              >
                How statuses work →
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <button
          type="button"
          onClick={onGuide}
          className="inline-flex min-h-6 items-center rounded-[4px] text-xs font-medium text-[var(--tx2)] underline decoration-black/20 underline-offset-2 hover:text-[var(--tx)] pointer-coarse:min-h-9"
        >
          How statuses work
        </button>
      </div>
    </section>
  );
}

function MoveItem({
  m,
  info,
  suggested,
  danger,
  disabled,
  onSelect,
}: {
  m: MoveOption;
  info: ReturnType<typeof moveInfo>;
  suggested?: boolean;
  danger?: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      textValue={`${info.to} ${m.label}`}
      className="flex cursor-pointer items-start gap-3 rounded-[10px] px-2.5 py-2 outline-none data-disabled:cursor-default data-disabled:opacity-50 data-highlighted:bg-[var(--menu-h)]"
    >
      <span className="min-w-0 flex-1">
        {/* The stage it goes to, its consequence beside it, then what it does. */}
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className={`text-sm font-semibold ${danger ? "text-danger-ink" : "text-[var(--tx)]"}`}>{info.to}</span>
          <span className={`inline-flex h-5 items-center rounded-full px-1.5 text-xs font-medium whitespace-nowrap ${TAG[info.tone]}`}>{info.tag}</span>
          {suggested && <span className="inline-flex h-5 items-center rounded-full bg-[var(--cta)] px-1.5 text-xs font-medium text-white">Suggested</span>}
        </span>
        <span className="mt-0.5 block text-xs text-pretty text-[var(--tx2)]">{info.what}</span>
      </span>
    </DropdownMenu.Item>
  );
}
