import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { DropdownMenu, Popover } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  File as FileIcon,
  FileImage,
  FilePlay,
  FileText,
  Forward,
  GitMerge,
  GitPullRequest,
  MessageCircleQuestion,
  PencilLine,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import type { AskCard, AskRefusal, Author, FileRef, LiveState, RunPhase, Segment, ThreadEntry } from "@/types/stories";
import { BTN_PRIMARY, BTN_SECONDARY, MENU_CONTENT, MENU_ITEM } from "@/components/dashboard/classes";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { BotAvatar } from "@/components/ask/BotAvatar";
import tokens from "@/components/dashboard/tokens.module.css";
import chat from "./chat.module.css";
import { plainText } from "./decisions";
import { elapsed } from "./clock";
import { PHASE_LABEL, PHASE_NOTE, runLine, runTime } from "./phases";
import { isOnline } from "./presence";
import { letter, type QuestionEntry } from "./questions";
import { usePausedMotion } from "./motion-pref";
import { Collapse } from "./Collapse";
import { RichText } from "./RichText";
import { RunTrail } from "./RunTrail";
import { StageIcon } from "./StageIcon";
import type { ColumnKey } from "./stage";
import { replyPlan, STEP, STEP_MS } from "./stream";
import { Refusal } from "./TeammateBanner";

interface StoryThreadProps {
  entries: ThreadEntry[];
  stories: { id: number; title: string }[];
  viewerInitials: string;
  /** What the agent is doing now, as the conversation's last line. */
  live: LiveState | null;
  /** "Needs your OK": the action waiting on the viewer, as the conversation's last card. */
  ask: AskCard | null;
  onAnswer: (entryId: string, option: number, text?: string) => void;
  /** A question's "Read more in the plan": opens the plan. */
  onReadMore?: () => void;
  /** "Let the defaults stand", offered beside an open question's Send answer. */
  onSkipQuestion?: () => void;
  /** A stage line to tint for a moment: the teammate's change, from "See what changed". */
  highlight?: string;
  /** Why the ask's button did nothing (a teammate changed the story first), in place of its buttons. */
  refusal?: AskRefusal;
  /** The story's first message, when it's long (a pasted spec): its short "why" as words, and the rest as one card. */
  storyCard?: StoryCard;
  /** The story card, pressed: opens Story details. */
  onReadStory?: () => void;
  /** The decision waits in the message box's place (DecisionDock), so the ask card and open questions aren't repeated
   *  at the end of the conversation (Shubham, 26 Nov). */
  docked?: boolean;
  /** "Save as decision" on a message: the decision in one line, and who wrote the message. */
  onSaveDecision?: (entryId: string, text: string, from: string) => void;
  /** Messages already saved as decisions: they say so, and offer it no more. */
  savedIds?: ReadonlySet<string>;
}

// One design language with Ask PM's chat (Shubham, 25 Nov: the two are the same thing, so they should look it). The
// agent's and teammates' words sit on the page with no bubble, in DESIGN.md's Reading type (16/24), under a face and
// a name with its time beside it, smaller and muted (Shubham, 26 Nov: a clear type hierarchy); yours
// are a light grey bubble on the right. Cards: 18 px corners and a hairline ring, no shadow (Shubham, 26 Nov: clean).
const TEXT = "text-base text-pretty whitespace-pre-wrap text-[var(--tx)]";
const THEIR_TEXT = `max-w-full ${TEXT}`;
const MINE_BUBBLE = `w-fit max-w-[80%] rounded-[20px] bg-[#F2F2F4] px-4 py-2.5 ${TEXT}`;
// A quiet text button beside a card's main ones ("Let the defaults stand", "Ask a question").
const GHOST =
  "h-8 rounded-full px-3 text-sm text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/[0.05] hover:text-[var(--tx)]";
const CARD = "w-full max-w-[460px] rounded-[18px] bg-white p-4 ring-1 ring-black/[0.08]";

// Three kinds of line, each its own look (Shubham, 27 Nov: "there are many text types… they should differentiate"),
// on DESIGN.md §3.2's roles:
// - What was said (the robot's and people's words): Reading, 16 px, in ink. Only conversation is this size.
// - What you do next: Body, 14 px, in ink, behind a small "Next" tag.
// - What happened (a run's summary, the story's stage changes, "Saved as a decision"): Caption, 12 px, muted, a 12 px
//   mark in front (a tick for a finished run, a dot for a change), always at the start of the words' column.
const HAPPENED = "m-0 flex items-start gap-1.5 text-xs text-pretty text-[var(--tx2)]";
/** The 12 px mark in front of a "what happened" line, as tall as its line. */
const MARK = "flex h-4 w-3 flex-none items-center justify-center";

/** A day's divider, centred. */
function DayDivider({ day }: { day: string }) {
  return (
    <p className="m-0 pt-4 pb-1 text-center text-xs font-medium text-[var(--tx2)]" role="separator">
      {day}
    </p>
  );
}

type AuthorKey = string;
const keyOf = (a: Author): AuthorKey => (a.kind === "agent" ? "agent" : a.initials);
// "Just now" and a time of day ("10:42 AM", on teammates' messages) are today.
const dayOf = (at: string) => (at === "Just now" || /^\d{1,2}:\d{2}\s?[AP]M$/.test(at) ? "Today" : at);

/** Where the day dividers go, and which messages start a new group (show the avatar and name). */
function layout(entries: ThreadEntry[]) {
  const rows: { entry: ThreadEntry; divider: string | null; head: boolean }[] = [];
  let lastDay = "";
  let lastKey: AuthorKey | null = null;
  for (const entry of entries) {
    const day = dayOf(entry.at);
    const divider = day !== lastDay ? day : null;
    lastDay = day;
    const key =
      entry.kind === "created" || entry.kind === "stage" ? null : entry.kind === "run" || entry.kind === "question" ? "agent" : keyOf(entry.author);
    rows.push({ entry, divider, head: key !== null && (key !== lastKey || divider !== null) });
    lastKey = key;
  }
  return { rows, lastKey };
}

export function Files({ files, mine }: { files: FileRef[]; mine: boolean }) {
  return (
    <ul className={`m-0 flex list-none flex-wrap gap-2 p-0 ${mine ? "justify-end" : ""}`}>
      {files.map((f, i) => {
        const Icon = f.kind === "image" ? FileImage : f.kind === "video" ? FilePlay : FileIcon;
        return (
          <li key={`${f.name}-${i}`} className="w-[148px] overflow-hidden rounded-[12px] border border-[var(--card-line)] bg-white">
            {f.preview ? (
              <img src={f.preview} alt="" width={148} height={96} className="block h-24 w-full object-cover" />
            ) : (
              <span className="flex h-24 items-center justify-center bg-[#F7F7F5] text-[var(--tx2)]">
                <Icon aria-hidden="true" size={20} strokeWidth={1.75} />
              </span>
            )}
            <span className="block truncate px-2.5 py-1.5 text-xs text-[var(--tx)]">{f.name}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * "Save as decision", floating at a message's corner on hover or focus (always there on touch screens), like a chat
 * app's message actions. It opens a small form with the message's first sentence, to reword as the outcome in one
 * line. Saved, the message says so, and the decision is listed on the right for good.
 */
function SaveDecision({ text, mine, onSave }: { text: string; mine: boolean; onSave: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(text);
  const inputId = useId();
  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(text);
      }}
    >
      <Popover.Trigger
        className={`absolute -top-3 ${mine ? "left-12" : "right-2"} z-10 inline-flex h-7 items-center gap-1.5 rounded-full border border-[var(--card-line)] bg-white px-2.5 text-xs font-medium text-[var(--tx)] opacity-0 transition-opacity duration-[120ms] group-hover/msg:opacity-100 hover:bg-[#F7F7F5] focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100`}
      >
        <BookmarkPlus aria-hidden="true" size={12} strokeWidth={2} className="text-[var(--tx2)]" />
        Save as decision
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={mine ? "start" : "end"}
          sideOffset={6}
          collisionPadding={8}
          className={`${tokens.tokens} ${chat.pop} z-50 w-[min(340px,calc(100vw-16px))] rounded-[16px] bg-white p-4 ring-1 ring-black/[0.08] outline-none`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              onSave(draft.trim());
              setOpen(false);
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor={inputId} className="text-sm font-semibold text-[var(--tx)]">
              Save as a decision
            </label>
            <textarea
              id={inputId}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              autoFocus
              className="field-sizing-content max-h-40 min-h-16 w-full resize-none rounded-[10px] border border-[var(--ctl)] bg-white px-2.5 py-2 text-sm text-[var(--tx)] outline-none focus:border-[var(--cta)]"
            />
            <p className="m-0 text-xs text-pretty text-[var(--tx2)]">
              Write the outcome in one line. It’s kept on the story for good, with your name.
            </p>
            <div className="mt-1 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className={BTN_SECONDARY}>
                Cancel
              </button>
              <button type="submit" disabled={!draft.trim()} className={`${BTN_PRIMARY} disabled:opacity-50`}>
                Save decision
              </button>
            </div>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** A long story's first message, after its "why": what was written, as one card that opens Story details. */
export interface StoryCard {
  entryId: string;
  /** The short "why", said as words above the card. */
  lead?: string;
  /** The details' first line, cut to one line. */
  preview: string;
  /** "412 words · 2 files". */
  meta: string;
}

/**
 * A long story (a pasted spec) in the chat: one card, like an attached document, never the whole text or a faded cut
 * (Shubham, 26 Nov: he chose this over a fold). Pressing it opens Story details, where the files are too.
 */
function StoryCardButton({ card, onOpen }: { card: StoryCard; onOpen?: () => void }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 rounded-[14px] border border-[var(--card-line)] bg-white p-3 text-left transition-[border-color] duration-[120ms] hover:border-black/15"
    >
      <span className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-[#F7F7F5] text-[var(--tx2)]">
        <FileText aria-hidden="true" size={20} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[var(--tx)]">Story details</span>
        <span className="block truncate text-sm text-[var(--tx2)]">{card.preview}</span>
        <span className="mt-0.5 block text-xs text-[var(--tx2)] tabular-nums">{card.meta}</span>
      </span>
      <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} className="flex-none text-[var(--tx2)] transition-transform duration-[120ms] group-hover:translate-x-0.5" />
    </button>
  );
}

// ---- The decision cards: "Needs your OK", "Needs your answer", Stuck, in the chat or in the message box's place ----
// Shubham, 27 Nov: they looked "very average and wireframy". Each now leads with a tile in its tone (DESIGN.md §2.7:
// a tone means state; attention for what waits on you, negative for something stopped) holding where the decision
// takes the story, drawn once as it arrives (StageIcon). Then the label and the title, what it moves on the right, the
// buttons (the main one with its icon, the next one filled rather than outlined, as DESIGN.md §7.1's secondary is),
// and "Send to someone" on a soft strip at the foot. The card itself stays plain white: no gradient (Shubham, 27 Nov),
// no shadow.

type Tone = "attention" | "stuck";
const TONE: Record<Tone, { ink: string; tile: string }> = {
  attention: { ink: "text-warning-ink", tile: "bg-warning-tint text-warning-ink" },
  stuck: { ink: "text-danger-ink", tile: "bg-danger-tint text-danger-ink" },
};

/** A filled secondary button (DESIGN.md §7.1), quieter than the main one beside it. */
const BTN_SOFT =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-field px-3.5 text-sm font-medium whitespace-nowrap text-[var(--tx)] transition-colors duration-[120ms] hover:bg-field-hover active:translate-y-px";

/** The stage a decision moves the story to, by the name its card uses. */
const STAGE_OF: Record<string, ColumnKey> = { Planning: "planning", Approved: "building", Building: "building", "In review": "review", "Pull request": "pr", Done: "done" };

/** The main button's icon, by what it does. */
function actionIcon(label: string): ReactNode {
  const icon = { "aria-hidden": true, size: 16, strokeWidth: 1.75 } as const;
  if (/^Settle/.test(label)) return <GitMerge {...icon} />;
  if (/pull request/i.test(label)) return <GitPullRequest {...icon} />;
  if (/^Approve/.test(label)) return <Check {...icon} />;
  if (/^Try again/.test(label)) return <RotateCcw {...icon} />;
  if (/^Reconnect/.test(label)) return <RefreshCw {...icon} />;
  if (/^Move to/.test(label)) return <ArrowRight {...icon} />;
  return null;
}

/** A decision card's top: its tile, its label in the tone, its title, and on the right what it moves or its number. */
function CardHead({ tone, tile, label, title, aside }: { tone: Tone; tile: ReactNode; label: string; title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className={`flex size-10 flex-none items-center justify-center rounded-[12px] ${TONE[tone].tile}`}>
        {tile}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-h-5 items-center gap-2">
          <p className={`m-0 min-w-0 flex-1 text-xs font-medium ${TONE[tone].ink}`}>{label}</p>
          {aside}
        </div>
        <p className="m-0 mt-0.5 text-base font-semibold text-pretty text-[var(--tx)]">{title}</p>
      </div>
    </div>
  );
}

/** What the decision moves: "In review → Pull request". */
function MoveChip({ move }: { move: { from: string; to: string } }) {
  return (
    <span className="hidden flex-none items-center gap-1 text-xs text-[var(--tx2)] sm:inline-flex">
      <span className="sr-only">Moves it from </span>
      {move.from}
      <ArrowRight aria-hidden="true" size={12} strokeWidth={2} />
      <span className="sr-only"> to </span>
      <span className="font-medium text-[var(--tx)]">{move.to}</span>
    </span>
  );
}

/**
 * The decision card's other way out (Shubham, 26 Nov): not yours to decide, so send the story to a teammate. Picking
 * someone sends it at once, with Undo; the story then waits on them and is paused for you. A soft strip across the
 * card's foot, with a few of the faces it could go to.
 */
export function Handoff({ people, onSend }: NonNullable<AskCard["handoff"]>) {
  return (
    <div className="-mx-4 mt-4 -mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-[#FAFAFA] px-4 py-2.5">
      <span className="flex min-w-0 items-center gap-2.5 text-sm text-[var(--tx2)]">
        <span aria-hidden="true" className="flex flex-none -space-x-1.5">
          {people.slice(0, 3).map((p) => (
            <span key={p.initials} className="flex rounded-full ring-2 ring-[#FAFAFA]">
              <PersonAvatar initials={p.initials} />
            </span>
          ))}
        </span>
        Someone else should decide?
      </span>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-medium whitespace-nowrap text-[var(--tx)] ring-1 ring-black/[0.08] transition-shadow duration-[120ms] hover:ring-black/[0.16] active:translate-y-px data-[state=open]:ring-black/[0.16]">
          <Forward aria-hidden="true" size={16} strokeWidth={1.75} />
          Send to someone
          <ChevronDown aria-hidden="true" size={14} strokeWidth={1.75} className="-mr-1 text-[var(--tx2)]" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={6} collisionPadding={8} className={MENU_CONTENT}>
            <DropdownMenu.Label className="px-4 pt-1.5 pb-1 text-xs text-[var(--tx2)]">Send this story to</DropdownMenu.Label>
            {people.map((p) => (
              <DropdownMenu.Item key={p.initials} className={MENU_ITEM} onSelect={() => onSend(p.initials)}>
                <PersonAvatar initials={p.initials} online={isOnline(p.initials)} />
                <span className="min-w-0 flex-1 truncate">
                  {p.name}
                  {isOnline(p.initials) && <span className="sr-only">, online</span>}
                </span>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

/** The decision waiting on the viewer: what it is, its buttons, and who else could decide. In the conversation's card,
 *  or in the message box's place (DecisionDock). */
export function DecisionCard({
  ask,
  refusal,
  className = CARD,
  onAsk,
}: {
  ask: AskCard;
  refusal?: AskRefusal;
  className?: string;
  /** In the message box's place: a quiet way to write first, at the end of the buttons (nothing under the card). */
  onAsk?: () => void;
}) {
  const tone: Tone = ask.tone === "stuck" ? "stuck" : "attention";
  const target = ask.move ? STAGE_OF[ask.move.to] : undefined;
  const tile =
    tone === "stuck" ? (
      <TriangleAlert size={20} strokeWidth={1.75} />
    ) : /^Conflict/.test(ask.label) ? (
      <GitMerge size={20} strokeWidth={1.75} />
    ) : target ? (
      <StageIcon stage={target} play={1} size={20} />
    ) : (
      <CircleHelp size={20} strokeWidth={1.75} />
    );
  return (
    // overflow-hidden: the strip at the foot keeps the card's round corners.
    <div className={`${className} overflow-hidden`}>
      <CardHead tone={tone} tile={tile} label={ask.label} title={ask.title} aside={ask.move ? <MoveChip move={ask.move} /> : undefined} />
      {ask.meta && <p className="m-0 mt-2 text-sm text-pretty text-[var(--tx2)] sm:pl-13">{ask.meta}</p>}
      {refusal && (
        <div className="sm:pl-13">
          <Refusal text={refusal.text} fix={refusal.fix} />
        </div>
      )}
      {!refusal && (ask.primary || ask.secondary || onAsk) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 sm:pl-13">
          {ask.primary && (
            <button type="button" onClick={ask.primary.onClick} className={BTN_PRIMARY}>
              {actionIcon(ask.primary.label)}
              {ask.primary.label}
            </button>
          )}
          {ask.secondary && (
            <button type="button" onClick={ask.secondary.onClick} className={BTN_SOFT}>
              {ask.secondary.label}
            </button>
          )}
          {onAsk && (
            <button type="button" onClick={onAsk} className={`${GHOST} sm:ml-auto`}>
              Ask a question
            </button>
          )}
        </div>
      )}
      {!refusal && ask.handoff && ask.handoff.people.length > 0 && <Handoff {...ask.handoff} />}
    </div>
  );
}

/** A checklist: what was done, each line with a tick (the agent's "receipt"). */
function Checklist({ items, fresh }: { items: string[]; fresh?: boolean }) {
  return (
    <ul className={`${TEXT} m-0 flex list-none flex-col gap-1 p-0`}>
      {items.map((item, i) => (
        <li key={item} className="flex items-start gap-2">
          {/* As tall as the line, so the tick sits on its middle. */}
          <span className="flex h-6 flex-none items-center">
            <Check
              aria-hidden="true"
              size={14}
              strokeWidth={2}
              className={`text-[var(--green)] ${fresh ? chat.check : ""}`}
              style={fresh ? { animationDelay: `${i * 90}ms` } : undefined}
            />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A finished run as one quiet line with a tick, that opens on click into what it did, one row per item. */
function Fold({ line, time, rows }: { line: string; time?: string; rows: { label: string; note?: string; time?: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex max-w-full items-center gap-1.5 rounded-[4px] py-0.5 text-left text-xs text-[var(--tx2)] transition-colors duration-[120ms] hover:text-[var(--tx)]"
      >
        <Check aria-hidden="true" size={12} strokeWidth={2} className="flex-none text-[var(--green)]" />
        <span className="min-w-0 truncate">{line}</span>
        {time && <span className="flex-none tabular-nums">· {time}</span>}
        <ChevronRight aria-hidden="true" size={12} strokeWidth={2} className={`flex-none transition-transform duration-[120ms] ${open ? "rotate-90" : ""}`} />
      </button>
      <Collapse open={open}>
        <ol className="m-0 flex list-none flex-col gap-1.5 border-l border-[var(--line)] p-0 py-1 pl-3">
          {rows.map((r, i) => (
            <li key={`${r.label}-${i}`} className="text-xs">
              <span className="flex items-baseline gap-2">
                <span className="text-[var(--tx)]">{r.label}</span>
                {r.time && <span className="text-[var(--tx2)] tabular-nums">{r.time}</span>}
              </span>
              {r.note && <span className="block text-[var(--tx2)]">{r.note}</span>}
            </li>
          ))}
        </ol>
      </Collapse>
    </div>
  );
}

/** The phases behind a reply, folded: "Planned · changed · screens checked · reviewed · verified · 14s". */
function RunFold({ phases }: { phases: RunPhase[] }) {
  return (
    <Fold
      line={runLine(phases)}
      time={runTime(phases)}
      rows={phases.map((p) => ({ label: PHASE_LABEL[p.key], note: PHASE_NOTE[p.key], time: elapsed(p.ms) }))}
    />
  );
}

/**
 * An older run, listed by its steps. While it runs it shows nothing here: the live line at the foot of the
 * chat names the one thing under way. Once done, it folds to its summary and opens into its steps.
 */
function Run({ entry }: { entry: Extract<ThreadEntry, { kind: "run" }> }) {
  if (entry.running) return null;
  return <Fold line={entry.summary} rows={entry.steps.map((label) => ({ label }))} />;
}

/** Replies that have written in once on this visit: one that mounts again (tinted by "See in chat") shows whole. */
const written = new Set<string>();

/** How long a word takes to fade in (chat.module.css `.word`), and a beat more. */
const WORD_FADE_MS = 460;

/**
 * A reply that arrived while the page is open writes itself in, a word at a time at Ask PM's pace (stream.ts),
 * instead of a "Builder is writing a reply" line first (Shubham, 27 Nov). Each word fades up out of a soft blur as
 * it arrives, so the words flow in line after line instead of popping (Shubham, 27 Nov: "text coming very smoothly").
 * `settled` turns true once the last word has finished fading: from then the reply is plain text again. With reduced
 * motion it's all there at once.
 */
function Writes({ id, total, on, children }: { id: string; total: number; on: boolean; children: (shown: number, settled: boolean) => ReactNode }) {
  const [shown, setShown] = useState(() => (on && !written.has(id) ? 0 : total));
  const [settled, setSettled] = useState(() => !(on && !written.has(id)));
  useEffect(() => {
    written.add(id);
  }, [id]);
  useEffect(() => {
    if (shown >= total) {
      if (settled) return;
      const t = window.setTimeout(() => setSettled(true), WORD_FADE_MS);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setShown((s) => Math.min(total, s + STEP)), STEP_MS);
    return () => window.clearTimeout(t);
  }, [shown, total, settled]);
  return <>{children(shown, settled)}</>;
}

/** One word writing in. Keys stay put, so only the newest words fade; the ones already there hold still. */
const revealWord = (w: string, key: string, first: boolean) => (
  <Fragment key={key}>
    {!first && " "}
    <span className={chat.word}>{w}</span>
  </Fragment>
);

/** The first `n` words of a text, each fading in as it arrives (the same word split as stream.ts). */
function RevealText({ text, n }: { text: string; n: number }) {
  return <>{text.split(" ").slice(0, Math.max(0, n)).map((w, i) => revealWord(w, String(i), i === 0))}</>;
}

/** The first `n` words of a message's text the same way; a chip (a person, a story) is one word. */
function RevealSegments({ segments, n, stories }: { segments: Segment[]; n: number; stories: { id: number; title: string }[] }) {
  const out: ReactNode[] = [];
  let left = n;
  segments.forEach((seg, si) => {
    if (left <= 0) return;
    if (typeof seg === "string") {
      const ws = seg.split(" ");
      ws.slice(0, left).forEach((w, wi) => out.push(revealWord(w, `${si}-${wi}`, wi === 0)));
      left -= ws.length;
    } else {
      out.push(
        <span key={si} className={chat.word}>
          <RichText segments={[seg]} stories={stories} />
        </span>,
      );
      left -= 1;
    }
  });
  return <>{out}</>;
}

/** The live line comes in like a new message (rise 8 px and fade, 360 ms) and leaves faster (fade, 150 ms). */
const LIVE_MOTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.2, 0, 0, 1] } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } },
} as const;
/** Under reduced motion it only fades (DESIGN.md §3.7). */
const LIVE_FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
} as const;

/** The robot's face on the live line, busy: a slow head tilt while it reads, a plush hop while it works. Still under
 *  reduced motion or "Pause animations". */
function LiveFace({ doing }: { doing: "read" | "work" }) {
  const reduce = useReducedMotion();
  const paused = usePausedMotion();
  const move = reduce || paused ? "" : doing === "work" ? chat.botHop : chat.botTilt;
  return (
    <span className={`inline-flex flex-none ${move}`}>
      <BotAvatar id="builder" size={32} bare />
    </span>
  );
}

export function Question({
  entry,
  onAnswer,
  onSkip,
  className = CARD,
  onAsk,
  onReadMore,
}: {
  entry: QuestionEntry;
  /** `text`: answered in their own words under "Something else" (`option` is -1). */
  onAnswer: (option: number, text?: string) => void;
  onSkip?: () => void;
  /** The card's frame: the conversation's card, or the message box's (DecisionDock). */
  className?: string;
  /** In the message box's place: write about it first, at the end of the buttons. */
  onAsk?: () => void;
  /** "Read more in the plan": opens the plan, where the detail is. */
  onReadMore?: () => void;
}) {
  const [choice, setChoice] = useState<number | "other" | null>(null);
  const [otherText, setOtherText] = useState("");
  const [changing, setChanging] = useState(false);
  const otherRef = useRef<HTMLTextAreaElement>(null);
  const answered = entry.answer && !changing;
  // A full decision (numbered, with sentences for options) names its options by letter; a quick question doesn't.
  const lettered = entry.number !== undefined;
  const fallback = entry.fallback;
  if (answered && entry.answer) {
    const own = entry.answer.text !== undefined;
    return (
      // Answered: the question as quiet context (14 px, muted), then the answer as said words with its tick, then who
      // answered and when, as a "what happened" line (Shubham, 27 Nov: fewer kinds of text).
      <div className={THEIR_TEXT}>
        <p className="m-0 text-sm text-[var(--tx2)]">{entry.question}</p>
        <p className="m-0 mt-1 flex items-start gap-2">
          <span className="flex h-6 flex-none items-center">
            <Check aria-hidden="true" size={14} strokeWidth={2} className={`text-[var(--green)] ${entry.fresh ? chat.check : ""}`} />
          </span>
          <span className="min-w-0">
            <span className="block">
              {own ? `Something else: “${entry.answer.text}”` : `${lettered ? `${letter(entry.answer.option)} · ` : ""}${entry.options[entry.answer.option]}`}
            </span>
            <span className="mt-0.5 block text-xs text-[var(--tx2)] tabular-nums">
              {entry.answer.by} · {entry.answer.at} ·{" "}
              <button
              type="button"
              onClick={() => {
                if (own) {
                  setChoice("other");
                  setOtherText(entry.answer!.text ?? "");
                } else setChoice(entry.answer!.option);
                setChanging(true);
              }}
              className="rounded-[4px] text-xs text-[var(--tx2)] underline-offset-2 hover:text-[var(--tx)] hover:underline"
            >
              Change
              </button>
            </span>
          </span>
        </p>
      </div>
    );
  }
  const ready = choice !== null && (choice !== "other" || otherText.trim().length > 0);
  // A row: selected in the call-to-action blue (DESIGN.md §2.7), its mark a letter chip; the radio itself is hidden.
  const row = (picked: boolean) =>
    `relative flex cursor-pointer items-start gap-3 rounded-[12px] border px-3 py-2.5 transition-colors duration-[120ms] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--cta)] ${
      picked ? "border-[var(--cta)] bg-[var(--row-sel)]" : "border-[var(--card-line)] hover:bg-[var(--row-h)]"
    }`;
  const mark = (picked: boolean) =>
    `inline-flex size-5 flex-none items-center justify-center rounded-md text-xs font-medium ${picked ? "bg-[var(--cta)] text-white" : "bg-field text-[var(--tx2)]"}`;
  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready || choice === null) return;
        if (choice === "other") onAnswer(-1, otherText.trim());
        else onAnswer(choice);
        setChanging(false);
      }}
    >
      <CardHead
        tone="attention"
        tile={<MessageCircleQuestion size={20} strokeWidth={1.75} />}
        label="Needs your answer"
        title={entry.question}
        aside={
          entry.number !== undefined ? (
            <span className="flex-none rounded-md bg-field px-1.5 font-mono text-xs text-[var(--tx2)] tabular-nums">
              <span className="sr-only">Decision </span>#{entry.number}
            </span>
          ) : undefined
        }
      />
      {/* What the agent found, before the choices (the live product's decision cards, Shubham 26 Nov). */}
      {entry.context && <p className="m-0 mt-2 text-sm text-pretty text-[var(--tx2)] sm:pl-13">{entry.context}</p>}
      <fieldset className="m-0 mt-3 flex flex-col gap-1.5 border-0 p-0 sm:pl-13">
        <legend className="sr-only">{entry.question}</legend>
        {entry.options.map((o, i) => {
          const picked = choice === i;
          const rec = entry.recommended?.option === i;
          return (
            <label key={o} className={row(picked)}>
              <input type="radio" name={entry.id} checked={picked} onChange={() => setChoice(i)} className="sr-only" />
              {lettered && (
                <span aria-hidden="true" className={mark(picked)}>
                  {letter(i)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                {/* Phones: the chip sits above the words, so it doesn't squeeze them into a narrow column. */}
                {rec && <span className="mb-1 inline-flex h-5 items-center rounded-full bg-field px-2 text-xs font-medium text-[var(--tx)] sm:hidden">Recommended</span>}
                <span className="block text-sm text-pretty text-[var(--tx)]">
                  {lettered && <span className="sr-only">{letter(i)}: </span>}
                  {o}
                </span>
                {rec && entry.recommended?.why && <span className="mt-1 block text-xs text-pretty text-[var(--tx2)]">{entry.recommended.why}</span>}
              </span>
              {rec && (
                <span aria-hidden="true" className="hidden h-5 flex-none items-center rounded-full bg-field px-2 text-xs font-medium text-[var(--tx)] sm:inline-flex">
                  Recommended
                </span>
              )}
            </label>
          );
        })}
        {/* Your own answer, inside the card: never a second text box elsewhere. */}
        {entry.other && (
          <div className={`${row(choice === "other")} flex-col gap-2`}>
            <label className="relative flex w-full cursor-pointer items-start gap-3">
              <input
                type="radio"
                name={entry.id}
                checked={choice === "other"}
                onChange={() => {
                  setChoice("other");
                  requestAnimationFrame(() => otherRef.current?.focus());
                }}
                className="sr-only"
              />
              <span aria-hidden="true" className={mark(choice === "other")}>
                <PencilLine size={12} strokeWidth={2} />
              </span>
              <span className="text-sm text-[var(--tx)]">Something else…</span>
            </label>
            {choice === "other" && (
              <textarea
                ref={otherRef}
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                rows={2}
                aria-label="Your own answer"
                placeholder="Say what this story should do instead"
                className="field-sizing-content block max-h-40 min-h-16 w-full resize-none rounded-[8px] border border-[var(--ctl)] bg-white px-2.5 py-2 text-sm text-[var(--tx)] outline-none placeholder:text-[var(--tx2)] focus:border-[var(--cta)]"
              />
            )}
          </div>
        )}
      </fieldset>
      {(fallback || (entry.readMore && onReadMore)) && (
        <p className="m-0 mt-3 text-xs text-pretty text-[var(--tx2)] sm:pl-13">
          {fallback && (
            <>
              If nobody answers by {fallback.by}, {lettered ? letter(fallback.option) : `“${entry.options[fallback.option]}”`} goes ahead.
            </>
          )}
          {fallback && entry.readMore && onReadMore && " "}
          {entry.readMore && onReadMore && (
            <button
              type="button"
              onClick={onReadMore}
              title={`“${entry.readMore}”, in the plan`}
              className="rounded-[4px] font-medium text-[var(--tx)] underline decoration-black/20 underline-offset-2 hover:decoration-current"
            >
              Read more in the plan
            </button>
          )}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2 sm:pl-13">
        <button type="submit" disabled={!ready} className={BTN_PRIMARY}>
          <Check aria-hidden="true" size={16} strokeWidth={1.75} />
          Send answer
        </button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            title={fallback ? `What happens if nobody answers: ${lettered ? letter(fallback.option) : entry.options[fallback.option]}` : "The agent picks the first option and finishes the plan"}
            className={GHOST}
          >
            {fallback && lettered ? `Let ${letter(fallback.option)} stand` : "Let the defaults stand"}
          </button>
        )}
        {onAsk && (
          <button type="button" onClick={onAsk} className={`${GHOST} sm:ml-auto`}>
            Ask about it
          </button>
        )}
      </div>
    </form>
  );
}

/** The agent's (or a teammate's) side: a face and "name · time" once per group, as in Ask PM, then the words and
 *  cards with 12 px between them. A new group stands 28 px off the one before. */
// In the chat the agent's face stands on its own, with no tinted circle behind it (Shubham, 27 Nov); people keep
// their circles, and so do the bots elsewhere (the sidebar).
function TheirRow({ author, head, at, children }: { author: Author; head: boolean; at: string; children: ReactNode }) {
  return (
    <div className={`flex gap-3 ${head ? "mt-4" : ""}`}>
      <div className="w-8 flex-none">
        {head &&
          (author.kind === "agent" ? (
            <BotAvatar id="builder" size={32} bare />
          ) : (
            <PersonAvatar initials={author.initials} size={32} online={isOnline(author.initials)} />
          ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
        {head && (
          // The name, then its time: smaller and muted, so the words lead (Shubham, 26 Nov).
          <p className="m-0 -mb-1.5 flex h-8 items-center gap-2">
            <span className="text-sm font-medium text-[var(--tx)]">
              {author.kind === "agent" ? "Agent" : author.name}
              {author.kind === "person" && isOnline(author.initials) && <span className="sr-only">, online</span>}
            </span>
            <span className="text-xs text-[var(--tx2)] tabular-nums">{at}</span>
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * The story's whole life as a chat, oldest first: who created it and what they asked, the agent's replies
 * (each with its run folded under it), its questions, people's notes, and a centred line for each stage change. Messages
 * from the same person in a row are grouped; days are marked once. New messages land with a little motion.
 */
export function StoryThread({
  entries,
  stories,
  viewerInitials,
  live,
  ask,
  onAnswer,
  onSkipQuestion,
  onReadMore,
  highlight,
  refusal,
  storyCard,
  onReadStory,
  docked = false,
  onSaveDecision,
  savedIds,
}: StoryThreadProps) {
  const { rows, lastKey } = layout(entries);
  const reduce = useReducedMotion();

  // The story's own updates (who created it, stage changes) run together: one quiet line per day, "Nov 11 · Plan
  // written · Plan approved by Josh", so the conversation leads (Shubham, 25 Nov: simpler). Each update keeps its own
  // span, so "See what changed" can still find and tint it.
  type System = Extract<ThreadEntry, { kind: "created" | "stage" }>;
  const items: ({ kind: "updates"; divider: string | null; entries: System[] } | { kind: "row"; row: (typeof rows)[number] })[] = [];
  for (const row of rows) {
    const { entry, divider } = row;
    if (entry.kind === "created" || entry.kind === "stage") {
      const last = items[items.length - 1];
      if (last?.kind === "updates" && !divider) last.entries.push(entry);
      else items.push({ kind: "updates", divider, entries: [entry] });
    } else items.push({ kind: "row", row });
  }

  return (
    <div className="flex flex-col gap-3 pt-2 pb-6">
      {items.map((item) => {
        if (item.kind === "updates") {
          // A few short updates read as one line ("Nov 12 · Builder started building · Verified by Checker"). A longer
          // run (main brought in, a push refused, GitHub reconnected) gets a line each, so it doesn't run together.
          // They're "what happened" lines (Shubham, 27 Nov): muted, 12 px, a dot in front, at the start of the words'
          // column like a run's summary, no longer centred across the chat.
          const stack = item.entries.reduce((n, e) => n + (e.kind === "stage" ? e.text.length : 30), 0) > 120;
          // data-entry: "See what changed" on a teammate's banner scrolls here; `highlight` tints it for a moment.
          const update = (entry: System) => (
            <span
              key={entry.id === highlight ? `${entry.id}-lit` : entry.id}
              data-entry={entry.id}
              className={`rounded-md ${entry.fresh ? chat.enter : ""} ${entry.id === highlight ? chat.flash : ""}`}
            >
              {entry.kind === "created" ? `${entry.by.kind === "agent" ? "Agent" : entry.by.name} created this story` : entry.text}
            </span>
          );
          const dot = (
            <span aria-hidden="true" className={MARK}>
              <span className="size-1 rounded-full bg-current" />
            </span>
          );
          return (
            <Fragment key={item.entries[0].id}>
              {item.divider && <DayDivider day={item.divider} />}
              <div className="flex flex-col gap-1 pl-11">
                {stack ? (
                  item.entries.map((entry) => (
                    <p key={entry.id} className={HAPPENED}>
                      {dot}
                      <span className="min-w-0">{update(entry)}</span>
                    </p>
                  ))
                ) : (
                  <p className={HAPPENED}>
                    {dot}
                    <span className="min-w-0">
                      {item.entries.map((entry, i) => (
                        <Fragment key={entry.id}>
                          {/* A no-break space before the dot: a wrapped line never starts with "·". */}
                          {i > 0 && <span aria-hidden="true">{"\u00A0· "}</span>}
                          {update(entry)}
                        </Fragment>
                      ))}
                    </span>
                  </p>
                )}
              </div>
            </Fragment>
          );
        }
        const { entry, divider, head } = item.row;
        if (entry.kind === "created" || entry.kind === "stage") return null; // grouped above, into the day's line
        // An open question waits in the message box's place, its day's date with it (it's the conversation's last thing).
        if (docked && entry.kind === "question" && !entry.answer) return null;
        let body: ReactNode = null;
        // A message can be saved as a decision (Shubham, 26 Nov): by whoever reads it, straight from the chat.
        let save: ReactNode = null;
        if (entry.kind === "run" && entry.running) {
          body = null; // the live line shows it
        } else if (entry.kind === "run" || entry.kind === "question") {
          body = (
            <TheirRow author={{ kind: "agent" }} head={head} at={entry.at}>
              <div className={`w-full ${entry.fresh ? chat.landTheirs : ""}`}>
                {entry.kind === "run" ? (
                  <Run entry={entry} />
                ) : (
                  <Question entry={entry} onAnswer={(o, text) => onAnswer(entry.id, o, text)} onSkip={onSkipQuestion} onReadMore={onReadMore} />
                )}
              </div>
            </TheirRow>
          );
        } else {
          const mine = entry.author.kind === "person" && entry.author.initials === viewerInitials;
          const land = entry.fresh ? (mine ? chat.landMine : chat.landTheirs) : "";
          const card = storyCard?.entryId === entry.id ? storyCard : undefined;
          const saved = savedIds?.has(entry.id) ?? false;
          const words = plainText(entry.text, entry.report);
          if (onSaveDecision && !saved && words) {
            const from = entry.author.kind === "agent" ? "the agent" : mine ? "You" : entry.author.name;
            save = <SaveDecision text={words} mine={mine} onSave={(text) => onSaveDecision(entry.id, text, from)} />;
          }
          // `shown`: how many of its words are out (Writes). Every message shows whole but the robot's reply that just
          // arrived, which writes in: its text, then the report's parts in order, then its files and run summary.
          const plan = replyPlan(entry);
          const bubbles = (shown: number, settled = true) => {
            const all = shown >= plan.total;
            const upTo = (text: string, start: number) => (settled ? text : <RevealText text={text} n={shown - start} />);
            return card ? (
              <>
                {card.lead && <div className={`${mine ? MINE_BUBBLE : THEIR_TEXT} ${land}`}>{card.lead}</div>}
                <div className={`w-full max-w-[460px] ${land}`}>
                  <StoryCardButton card={card} onOpen={onReadStory} />
                </div>
              </>
            ) : (
              <>
                {entry.text && entry.text.length > 0 && shown > 0 && (
                  <div className={`${mine ? MINE_BUBBLE : THEIR_TEXT} ${land}`}>
                    {settled ? <RichText segments={entry.text} stories={stories} /> : <RevealSegments segments={entry.text} n={shown} stories={stories} />}
                  </div>
                )}
                {entry.report && shown > plan.starts.outcome && (
                  <>
                    <div className={`${THEIR_TEXT} ${land}`}>{upTo(entry.report.outcome, plan.starts.outcome)}</div>
                    {entry.report.means && shown > plan.starts.means && (
                      <div className={`${THEIR_TEXT} ${land}`}>{upTo(entry.report.means, plan.starts.means)}</div>
                    )}
                    {entry.report.details && shown > plan.starts.details && <Checklist items={entry.report.details} fresh={entry.fresh} />}
                    {entry.report.next && shown > plan.starts.next && (
                      // What you do next: smaller than the conversation, behind its tag (the tag is the plan's "Next" word).
                      <p className={`m-0 flex max-w-full items-start gap-2 text-sm text-pretty text-[var(--tx)] ${land}`}>
                        <span className="inline-flex h-5 flex-none items-center rounded-md bg-field px-1.5 text-xs font-medium text-[var(--tx2)]">
                          Next<span className="sr-only">:</span>
                        </span>
                        <span className="min-w-0">{upTo(entry.report.next, plan.starts.next + 1)}</span>
                      </p>
                    )}
                  </>
                )}
                {all && entry.files && entry.files.length > 0 && (
                  <div className={land}>
                    <Files files={entry.files} mine={mine} />
                  </div>
                )}
                {all && entry.run && entry.run.length > 0 && (
                  // `max-w-full`: no wider than the chat, so a long summary ends in "…" instead of pushing a phone
                  // screen sideways.
                  <div className={`max-w-full ${land}`}>
                    <RunFold phases={entry.run} />
                  </div>
                )}
                {saved && (
                  <p className={HAPPENED}>
                    <span aria-hidden="true" className={MARK}>
                      <BookmarkCheck size={12} strokeWidth={2} />
                    </span>
                    Saved as a decision
                  </p>
                )}
              </>
            );
          };
          // Yours: the bubble alone, as in Ask PM; the day sits in the divider and the time in the tooltip.
          body = mine ? (
            <div title={entry.at} className={`flex flex-col items-end gap-1.5 pl-12 ${head ? "mt-4" : ""}`}>
              {bubbles(plan.total)}
            </div>
          ) : (
            <TheirRow author={entry.author} head={head} at={entry.at}>
              {entry.author.kind === "agent" ? (
                <Writes id={entry.id} total={plan.total} on={Boolean(entry.fresh) && !reduce}>
                  {bubbles}
                </Writes>
              ) : (
                bubbles(plan.total)
              )}
            </TheirRow>
          );
        }

        return (
          <Fragment key={entry.id}>
            {divider && <DayDivider day={divider} />}
            {/* data-entry: "See in chat" (a decision) and "See what changed" scroll here, and `highlight` tints it. */}
            {body && (
              <div
                data-entry={entry.id}
                key={entry.id === highlight ? `${entry.id}-lit` : entry.id}
                className={`group/msg relative -mx-2 rounded-[14px] px-2 ${entry.id === highlight ? chat.flash : ""}`}
              >
                {body}
                {save}
              </div>
            )}
          </Fragment>
        );
      })}

      {ask && !docked && (
        <TheirRow author={{ kind: "agent" }} head={lastKey !== "agent"} at="Now">
          <DecisionCard ask={ask} refusal={refusal} className={`${CARD} ${chat.enter}`} />
        </TheirRow>
      )}

      {/* The robot, live: reading your message, working, or waiting on someone. While it reads or works, its face
          moves (a slow head tilt while reading, a plush hop while working) and three small lines of what it's doing run
          beside it, and nothing else (Shubham, 27 Nov: no pill with the phase above them). The trail carries on from
          one phase to the next, so it doesn't restart. Screen readers hear the phase in words. Waiting, it holds still.
          While it writes its reply nothing shows here: the words write themselves in above. */}
      {/* `relative`: a line that's leaving is lifted out (popLayout) and fades where it was, while the next takes its
          place, so the two never stack. */}
      <div aria-live="polite" className="relative mt-4 min-h-10">
        <AnimatePresence initial={false} mode="popLayout">
          {(live?.kind === "thinking" || live?.kind === "working") && (
            // The face sits on the newest line: both centred 16 px above the block's foot. One key for reading and
            // working, so the lines carry on from one to the other.
            <motion.div key="busy" {...(reduce ? LIVE_FADE : LIVE_MOTION)} className="flex items-end gap-3">
              <LiveFace doing={live.kind === "thinking" ? "read" : "work"} />
              <span className="sr-only">{live.kind === "thinking" ? "Builder is reading your message" : live.label}</span>
              <div className="min-w-0 flex-1 pb-2">
                {live.kind === "thinking" ? (
                  <RunTrail phase="thinking" label="Builder is reading your message" />
                ) : (
                  <RunTrail phase={live.phase} label={live.label} />
                )}
              </div>
            </motion.div>
          )}
          {(live?.kind === "waiting" || live?.kind === "quiet") && (
            <motion.p key={`rest:${live.text}`} {...(reduce ? LIVE_FADE : LIVE_MOTION)} className="m-0 flex items-center gap-2 pl-11 text-xs text-[var(--tx2)]">
              {live.kind === "waiting" && <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--tx2)]" />}
              {live.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
