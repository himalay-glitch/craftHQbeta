import { Fragment, useId, useRef, useState, type ReactNode } from "react";
import { DropdownMenu, Popover } from "radix-ui";
import { BookmarkCheck, BookmarkPlus, Check, ChevronDown, ChevronRight, File as FileIcon, FileImage, FilePlay, FileText, Forward, PencilLine } from "lucide-react";
import type { AskCard, AskRefusal, Author, FileRef, LiveState, RunPhase, ThreadEntry } from "@/types/stories";
import { BTN_PRIMARY, BTN_SECONDARY, MENU_CONTENT, MENU_ITEM } from "@/components/dashboard/classes";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { BotAvatar } from "@/components/ask/BotAvatar";
import tokens from "@/components/dashboard/tokens.module.css";
import chat from "./chat.module.css";
import { plainText } from "./decisions";
import { elapsed, useNow } from "./clock";
import { PHASE_LABEL, PHASE_NOTE, runLine, runTime } from "./phases";
import { isOnline } from "./presence";
import { letter, type QuestionEntry } from "./questions";
import { RichText } from "./RichText";
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
          className={`${tokens.tokens} z-50 w-[min(340px,calc(100vw-16px))] rounded-[16px] bg-white p-4 ring-1 ring-black/[0.08] outline-none`}
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

/**
 * The decision card's other way out (Shubham, 26 Nov): not yours to decide, so send the story to a teammate. Picking
 * someone sends it at once, with Undo; the story then waits on them and is paused for you.
 */
export function Handoff({ people, onSend }: NonNullable<AskCard["handoff"]>) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[var(--line)] pt-3">
      <span className="text-sm text-[var(--tx2)]">Someone else should decide?</span>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger className={`${BTN_SECONDARY} data-[state=open]:bg-[var(--ctl-bg-h)]`}>
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
  return (
    <div className={className}>
      <p className={`m-0 flex items-center gap-1.5 text-xs font-medium ${ask.tone === "stuck" ? "text-danger-ink" : "text-warning-ink"}`}>
        <span aria-hidden="true" className={`size-1.5 rounded-full ${ask.tone === "stuck" ? "bg-danger-ink" : "bg-warning"}`} />
        {ask.label}
      </p>
      <p className="m-0 mt-2 text-sm font-semibold text-[var(--tx)]">{ask.title}</p>
      {ask.meta && <p className="m-0 mt-1 text-sm text-pretty text-[var(--tx2)]">{ask.meta}</p>}
      {refusal && <Refusal text={refusal.text} fix={refusal.fix} />}
      {!refusal && (ask.primary || ask.secondary || onAsk) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {ask.primary && (
            <button type="button" onClick={ask.primary.onClick} className={BTN_PRIMARY}>
              {ask.primary.label}
            </button>
          )}
          {ask.secondary && (
            <button type="button" onClick={ask.secondary.onClick} className={BTN_SECONDARY}>
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
    <div className="px-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex max-w-full items-center gap-1.5 rounded-[4px] py-0.5 text-left text-xs text-[var(--tx2)] transition-colors duration-[120ms] hover:text-[var(--tx)]"
      >
        <Check aria-hidden="true" size={12} strokeWidth={2} className="flex-none text-[var(--green)]" />
        <span className="min-w-0 truncate">{line}</span>
        {time && <span className="flex-none tabular-nums">— {time}</span>}
        <ChevronRight aria-hidden="true" size={12} strokeWidth={2} className={`flex-none transition-transform duration-[120ms] ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <ol className={`m-0 mt-1 mb-1 flex list-none flex-col gap-1.5 border-l border-[var(--line)] p-0 pl-3 ${chat.enter}`}>
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
      )}
    </div>
  );
}

/** The phases behind a reply, folded: "Planned · changed · screens checked · reviewed · verified — 14s". */
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

/** "2 of 6 · 9s" beside the live phase: hidden from screen readers, so the polite region isn't read every second. */
function LiveMeta({ step, of, since }: { step?: number; of?: number; since?: number }) {
  const now = useNow(since !== undefined);
  const parts = [step && of && of > 1 ? `${step} of ${of}` : null, since && now ? elapsed(now - since) : null].filter(Boolean);
  if (!parts.length) return null;
  return (
    <span aria-hidden="true" className="flex-none text-xs font-normal text-[var(--tx2)] tabular-nums">
      {parts.join(" · ")}
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
      <div className={THEIR_TEXT}>
        <p className="m-0 text-[var(--tx2)]">{entry.question}</p>
        <p className="m-0 mt-1 flex items-start gap-2">
          <span className="flex h-6 flex-none items-center">
            <Check aria-hidden="true" size={14} strokeWidth={2} className={`text-[var(--green)] ${entry.fresh ? chat.check : ""}`} />
          </span>
          <span className="min-w-0">
            <span className="font-medium">
              {own ? `Something else: “${entry.answer.text}”` : `${lettered ? `${letter(entry.answer.option)} · ` : ""}${entry.options[entry.answer.option]}`}
            </span>{" "}
            <span className="text-xs whitespace-nowrap text-[var(--tx2)] tabular-nums">
              {entry.answer.by} · {entry.answer.at}
            </span>{" "}
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
      <p className="m-0 flex items-center gap-1.5 text-xs font-medium text-warning-ink">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
        Needs your answer
        {entry.number !== undefined && <span className="font-normal text-[var(--tx2)] tabular-nums">· decision #{entry.number}</span>}
      </p>
      <p className="m-0 mt-2 text-sm font-semibold text-pretty text-[var(--tx)]">{entry.question}</p>
      {/* What the agent found, before the choices (the live product's decision cards, Shubham 26 Nov). */}
      {entry.context && <p className="m-0 mt-1 text-sm text-pretty text-[var(--tx2)]">{entry.context}</p>}
      <fieldset className="m-0 mt-3 flex flex-col gap-1.5 border-0 p-0">
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
        <p className="m-0 mt-3 text-xs text-pretty text-[var(--tx2)]">
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
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={!ready} className={BTN_PRIMARY}>
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
function TheirRow({ author, head, at, children }: { author: Author; head: boolean; at: string; children: ReactNode }) {
  return (
    <div className={`flex gap-3 ${head ? "mt-4" : ""}`}>
      <div className="w-8 flex-none">
        {head &&
          (author.kind === "agent" ? (
            <BotAvatar id="builder" size={32} />
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
          const stack = item.entries.reduce((n, e) => n + (e.kind === "stage" ? e.text.length : 30), 0) > 120;
          return (
            <p key={item.entries[0].id} className={`m-0 py-0.5 text-center text-xs text-balance text-[var(--tx2)] ${stack ? "flex flex-col gap-1" : ""}`}>
              {item.divider && <span className="font-medium">{item.divider}</span>}
              {item.entries.map((entry, i) => (
                <Fragment key={entry.id}>
                  {!stack && (i > 0 || item.divider) && <span aria-hidden="true"> · </span>}
                  {/* data-entry: "See what changed" on a teammate's banner scrolls here; `highlight` tints it for a moment. */}
                  <span
                    data-entry={entry.id}
                    key={entry.id === highlight ? `${entry.id}-lit` : entry.id}
                    className={`rounded-md ${entry.fresh ? chat.enter : ""} ${entry.id === highlight ? chat.flash : ""}`}
                  >
                    {entry.kind === "created" ? (
                      <>
                        <span className="text-[var(--tx)]">{entry.by.kind === "agent" ? "Agent" : entry.by.name}</span> created this story
                      </>
                    ) : (
                      entry.text
                    )}
                  </span>
                </Fragment>
              ))}
            </p>
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
          const bubbles = card ? (
            <>
              {card.lead && <div className={`${mine ? MINE_BUBBLE : THEIR_TEXT} ${land}`}>{card.lead}</div>}
              <div className={`w-full max-w-[460px] ${land}`}>
                <StoryCardButton card={card} onOpen={onReadStory} />
              </div>
            </>
          ) : (
            <>
              {entry.text && entry.text.length > 0 && (
                <div className={`${mine ? MINE_BUBBLE : THEIR_TEXT} ${land}`}>
                  <RichText segments={entry.text} stories={stories} />
                </div>
              )}
              {entry.report && (
                <>
                  <div className={`${THEIR_TEXT} ${land}`}>{entry.report.outcome}</div>
                  {entry.report.means && <div className={`${THEIR_TEXT} ${land}`}>{entry.report.means}</div>}
                  {entry.report.details && <Checklist items={entry.report.details} fresh={entry.fresh} />}
                  {entry.report.next && (
                    <div className={`${THEIR_TEXT} ${land}`}>
                      <span className="font-medium">Next → </span>
                      {entry.report.next}
                    </div>
                  )}
                </>
              )}
              {entry.files && entry.files.length > 0 && (
                <div className={land}>
                  <Files files={entry.files} mine={mine} />
                </div>
              )}
              {entry.run && entry.run.length > 0 && (
                // `max-w-full`: no wider than the chat, so a long summary ends in "…" instead of pushing a phone
                // screen sideways.
                <div className={`max-w-full ${land}`}>
                  <RunFold phases={entry.run} />
                </div>
              )}
              {saved && (
                <p className="m-0 flex items-center gap-1.5 text-xs text-[var(--tx2)]">
                  <BookmarkCheck aria-hidden="true" size={12} strokeWidth={2} className="flex-none" />
                  Saved as a decision
                </p>
              )}
            </>
          );
          // Yours: the bubble alone, as in Ask PM; the day sits in the divider and the time in the tooltip.
          body = mine ? (
            <div title={entry.at} className={`flex flex-col items-end gap-1.5 pl-12 ${head ? "mt-4" : ""}`}>
              {bubbles}
            </div>
          ) : (
            <TheirRow author={entry.author} head={head} at={entry.at}>
              {bubbles}
            </TheirRow>
          );
        }

        return (
          <Fragment key={entry.id}>
            {divider && (
              <p className="m-0 pt-4 pb-1 text-center text-xs font-medium text-[var(--tx2)]" role="separator">
                {divider}
              </p>
            )}
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

      {/* The robot, live: reading your message, working, or waiting on someone, as Ask PM's "is on it" pill beside
          its face. The face holds still and nothing here loops: the words and the elapsed time say it's busy
          (DESIGN.md §8.5), and the working ring on the activity icon is the page's one loop (§3.7). */}
      <div aria-live="polite" className="mt-4 min-h-10">
        {live?.kind === "thinking" && (
          <div className={`flex items-center gap-3 ${chat.enter}`}>
            <BotAvatar id="builder" size={32} />
            <span className={`inline-flex h-8 items-center rounded-full bg-[#F4F4F5] px-3.5 text-sm text-[var(--tx2)] ${chat.labelIn}`}>
              Builder is reading your message
            </span>
          </div>
        )}
        {/* Working: only the current phase, by the robot's name, sliding in as it changes, with its step and the run's time. */}
        {live?.kind === "working" && (
          <div className={`flex items-center gap-3 ${chat.enter}`}>
            <BotAvatar id="builder" size={32} />
            <span className="inline-flex h-8 min-w-0 items-center gap-2 rounded-full bg-[#F4F4F5] px-3.5">
              <span key={live.label} className={`truncate text-sm text-[var(--tx)] ${chat.labelIn}`}>
                {live.label}
              </span>
              <LiveMeta step={live.step} of={live.of} since={live.since} />
            </span>
          </div>
        )}
        {(live?.kind === "waiting" || live?.kind === "quiet") && (
          <p className={`m-0 flex items-center gap-2 pl-11 text-xs text-[var(--tx2)] ${chat.enter}`}>
            {live.kind === "waiting" && <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--tx2)]" />}
            {live.text}
          </p>
        )}
      </div>
    </div>
  );
}
