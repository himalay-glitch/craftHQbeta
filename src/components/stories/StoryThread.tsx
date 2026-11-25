import { Fragment, useState, type ReactNode } from "react";
import { Check, ChevronRight, File as FileIcon, FileImage, FilePlay } from "lucide-react";
import type { AskCard, AskRefusal, Author, FileRef, LiveState, RunPhase, ThreadEntry } from "@/types/stories";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/dashboard/classes";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { BotAvatar } from "@/components/ask/BotAvatar";
import chat from "./chat.module.css";
import { elapsed, useNow } from "./clock";
import { PHASE_LABEL, PHASE_NOTE, runLine, runTime } from "./phases";
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
  onAnswer: (entryId: string, option: number) => void;
  /** "Let the defaults stand", offered beside an open question's Send answer. */
  onSkipQuestion?: () => void;
  /** A stage line to tint for a moment: the teammate's change, from "See what changed". */
  highlight?: string;
  /** Why the ask's button did nothing (a teammate changed the story first), in place of its buttons. */
  refusal?: AskRefusal;
}

// One design language with Ask PM's chat (Shubham, 25 Nov: the two are the same thing, so they should look it). The
// agent's and teammates' words sit on the page with no bubble, 15/24, under a face and a "name · time" line; yours
// are a light grey bubble on the right. Cards are Ask's: 18 px corners, a soft shadow and a faint ring.
const TEXT = "text-[15px] leading-6 text-pretty whitespace-pre-wrap text-[var(--tx)]";
const THEIR_TEXT = `max-w-full ${TEXT}`;
const MINE_BUBBLE = `w-fit max-w-[80%] rounded-[20px] bg-[#F2F2F4] px-4 py-2.5 ${TEXT}`;
const CARD = "w-full max-w-[460px] rounded-[18px] bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_6px_20px_rgb(0_0_0/0.05)] ring-1 ring-black/[0.04]";

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

function Files({ files, mine }: { files: FileRef[]; mine: boolean }) {
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
                <Icon aria-hidden="true" size={22} strokeWidth={1.5} />
              </span>
            )}
            <span className="block truncate px-2.5 py-1.5 text-[12px] leading-4 text-[var(--tx)]">{f.name}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** A checklist: what was done, each line with a tick (the agent's "receipt"). */
function Checklist({ items, fresh }: { items: string[]; fresh?: boolean }) {
  return (
    <ul className={`${TEXT} m-0 flex list-none flex-col gap-1 p-0`}>
      {items.map((item, i) => (
        <li key={item} className="flex items-start gap-2">
          <Check
            aria-hidden="true"
            size={14}
            strokeWidth={2.25}
            className={`mt-[5px] flex-none text-[var(--green)] ${fresh ? chat.check : ""}`}
            style={fresh ? { animationDelay: `${i * 90}ms` } : undefined}
          />
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
        className="inline-flex max-w-full items-center gap-1.5 rounded-[4px] py-0.5 text-left text-[12px] leading-4 text-[var(--tx2)] transition-colors duration-[120ms] hover:text-[var(--tx)]"
      >
        <Check aria-hidden="true" size={13} strokeWidth={2.25} className="flex-none text-[var(--green)]" />
        <span className="min-w-0 truncate">{line}</span>
        {time && <span className="flex-none tabular-nums">— {time}</span>}
        <ChevronRight aria-hidden="true" size={12} strokeWidth={2} className={`flex-none transition-transform duration-[120ms] ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <ol className={`m-0 mt-1 mb-1 flex list-none flex-col gap-1.5 border-l border-[var(--line)] p-0 pl-3 ${chat.enter}`}>
          {rows.map((r, i) => (
            <li key={`${r.label}-${i}`} className="text-[12px] leading-4">
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
    <span aria-hidden="true" className="flex-none text-[12px] leading-4 font-normal text-[var(--tx2)] tabular-nums">
      {parts.join(" · ")}
    </span>
  );
}

function Question({
  entry,
  onAnswer,
  onSkip,
}: {
  entry: Extract<ThreadEntry, { kind: "question" }>;
  onAnswer: (option: number) => void;
  onSkip?: () => void;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const [changing, setChanging] = useState(false);
  const answered = entry.answer && !changing;
  if (answered && entry.answer) {
    return (
      <div className={THEIR_TEXT}>
        <p className="m-0 text-[var(--tx2)]">{entry.question}</p>
        <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2">
          <Check aria-hidden="true" size={14} strokeWidth={2.25} className={`text-[var(--green)] ${entry.fresh ? chat.check : ""}`} />
          <span className="font-medium">{entry.options[entry.answer.option]}</span>
          <span className="text-[12px] text-[var(--tx2)]">
            {entry.answer.by} · {entry.answer.at}
          </span>
          <button
            type="button"
            onClick={() => {
              setChoice(entry.answer!.option);
              setChanging(true);
            }}
            className="rounded-[4px] text-[12px] text-[var(--tx2)] underline-offset-2 hover:text-[var(--tx)] hover:underline"
          >
            Change
          </button>
        </p>
      </div>
    );
  }
  return (
    <form
      className={CARD}
      onSubmit={(e) => {
        e.preventDefault();
        if (choice === null) return;
        onAnswer(choice);
        setChanging(false);
      }}
    >
      <p className="m-0 flex items-center gap-1.5 text-[12px] leading-4 text-[var(--tx2)]">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[#D08A00]" />
        Needs your answer
      </p>
      <p className="m-0 mt-1.5 text-[14px] leading-5 font-semibold">{entry.question}</p>
      <fieldset className="m-0 mt-3 flex flex-col gap-1.5 border-0 p-0">
        <legend className="sr-only">{entry.question}</legend>
        {entry.options.map((o, i) => (
          <label
            key={o}
            className={`flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2 text-[14px] leading-5 transition-colors duration-[120ms] ${
              choice === i ? "border-[var(--cta)] bg-[var(--row-sel)]" : "border-[var(--card-line)] hover:bg-[var(--row-h)]"
            }`}
          >
            <input type="radio" name={entry.id} checked={choice === i} onChange={() => setChoice(i)} className="accent-[var(--cta)]" />
            {o}
          </label>
        ))}
      </fieldset>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={choice === null} className={BTN_PRIMARY}>
          Send answer
        </button>
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            title="The agent picks the first option and finishes the plan"
            className="h-8 rounded-full px-3 text-[13px] leading-[18px] text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/[0.05] hover:text-[var(--tx)]"
          >
            Let the defaults stand
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
      <div className="w-[30px] flex-none">
        {head &&
          (author.kind === "agent" ? (
            <BotAvatar id="builder" size={30} className="mt-0.5" />
          ) : (
            <span className="mt-0.5 flex size-[30px] items-center justify-center">
              <PersonAvatar initials={author.initials} size={28} />
            </span>
          ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
        {head && (
          <p className="m-0 -mb-1.5 text-[13px] leading-[18px]">
            <span className="font-medium text-[var(--tx)]">{author.kind === "agent" ? "Agent" : author.name}</span>
            <span className="text-[var(--tx2)]"> · {at}</span>
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
export function StoryThread({ entries, stories, viewerInitials, live, ask, onAnswer, onSkipQuestion, highlight, refusal }: StoryThreadProps) {
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
          return (
            <p key={item.entries[0].id} className="m-0 py-0.5 text-center text-[12px] leading-4 text-balance text-[var(--tx2)]">
              {item.divider && <span className="font-medium">{item.divider}</span>}
              {item.entries.map((entry, i) => (
                <Fragment key={entry.id}>
                  {(i > 0 || item.divider) && <span aria-hidden="true"> · </span>}
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
        let body: ReactNode = null;
        if (entry.kind === "run" && entry.running) {
          body = null; // the live line shows it
        } else if (entry.kind === "run" || entry.kind === "question") {
          body = (
            <TheirRow author={{ kind: "agent" }} head={head} at={entry.at}>
              <div className={`w-full ${entry.fresh ? chat.landTheirs : ""}`}>
                {entry.kind === "run" ? (
                  <Run entry={entry} />
                ) : (
                  <Question entry={entry} onAnswer={(o) => onAnswer(entry.id, o)} onSkip={onSkipQuestion} />
                )}
              </div>
            </TheirRow>
          );
        } else {
          const mine = entry.author.kind === "person" && entry.author.initials === viewerInitials;
          const land = entry.fresh ? (mine ? chat.landMine : chat.landTheirs) : "";
          const bubbles = (
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
                      <span className="font-semibold">Next → </span>
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
              <p className="m-0 pt-4 pb-1 text-center text-[12px] leading-4 font-medium text-[var(--tx2)]" role="separator">
                {divider}
              </p>
            )}
            {body}
          </Fragment>
        );
      })}

      {ask && (
        <TheirRow author={{ kind: "agent" }} head={lastKey !== "agent"} at="Now">
          <div className={`${CARD} ${chat.enter}`}>
            <p className="m-0 flex items-center gap-1.5 text-[12px] leading-4 text-[var(--tx2)]">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[#d97706]" />
              {ask.label}
            </p>
            <p className="m-0 mt-1.5 text-[14px] leading-5 font-semibold">{ask.title}</p>
            {ask.meta && <p className="m-0 mt-0.5 text-[13px] leading-[18px] text-[var(--tx2)]">{ask.meta}</p>}
            {refusal && <Refusal text={refusal.text} fix={refusal.fix} />}
            {!refusal && (ask.primary || ask.secondary) && (
              <div className="mt-3 flex flex-wrap gap-2">
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
              </div>
            )}
          </div>
        </TheirRow>
      )}

      {/* The robot, live: reading your message, working, or waiting on someone, as Ask PM's "is on it" pill beside
          its face. The face holds still and nothing here loops: the words and the elapsed time say it's busy
          (DESIGN.md §8.5), and the working ring on the activity icon is the page's one loop (§3.7). */}
      <div aria-live="polite" className="mt-4 min-h-10">
        {live?.kind === "thinking" && (
          <div className={`flex items-center gap-3 ${chat.enter}`}>
            <BotAvatar id="builder" size={30} />
            <span className={`inline-flex h-8 items-center rounded-full bg-[#F4F4F5] px-3.5 text-[13px] leading-[18px] text-[var(--tx2)] ${chat.labelIn}`}>
              Builder is reading your message
            </span>
          </div>
        )}
        {/* Working: only the current phase, by the robot's name, sliding in as it changes, with its step and the run's time. */}
        {live?.kind === "working" && (
          <div className={`flex items-center gap-3 ${chat.enter}`}>
            <BotAvatar id="builder" size={30} />
            <span className="inline-flex h-8 min-w-0 items-center gap-2 rounded-full bg-[#F4F4F5] px-3.5">
              <span key={live.label} className={`truncate text-[13px] leading-[18px] text-[var(--tx)] ${chat.labelIn}`}>
                {live.label}
              </span>
              <LiveMeta step={live.step} of={live.of} since={live.since} />
            </span>
          </div>
        )}
        {(live?.kind === "waiting" || live?.kind === "quiet") && (
          <p className={`m-0 flex items-center gap-2 pl-[42px] text-[12px] leading-4 text-[var(--tx2)] ${chat.enter}`}>
            {live.kind === "waiting" && <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--tx2)]" />}
            {live.text}
          </p>
        )}
      </div>
    </div>
  );
}
