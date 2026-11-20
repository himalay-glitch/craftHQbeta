import { Fragment, useState, type ReactNode } from "react";
import { Check, ChevronDown, Circle, File as FileIcon, FileImage, FilePlay, LoaderCircle } from "lucide-react";
import type { AskCard, Author, FileRef, LiveState, ThreadEntry } from "@/types/stories";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/dashboard/classes";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { AgentAvatar } from "./AgentAvatar";
import chat from "./chat.module.css";
import { Mascot } from "./Mascot";
import { RichText } from "./RichText";

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
}

// Bubbles: the agent's are soft grey, teammates' white with a hairline, the viewer's dark on the right.
const TEXT = "text-[14px] leading-5 tracking-[-0.15px] whitespace-pre-wrap";
const AGENT_BUBBLE = `w-fit max-w-[min(640px,100%)] rounded-[16px] bg-[#F2F2F0] px-3.5 py-2 text-[var(--tx)] ${TEXT}`;
const PERSON_BUBBLE = `w-fit max-w-[min(640px,100%)] rounded-[16px] border border-[var(--card-line)] bg-white px-3.5 py-2 text-[var(--tx)] ${TEXT}`;
const MINE_BUBBLE = `w-fit max-w-[min(560px,85%)] rounded-[18px] bg-[var(--ink)] px-3.5 py-2 text-white ${TEXT}`;
const CARD = "w-full max-w-[460px] rounded-[16px] border border-[var(--card-line)] bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]";

type AuthorKey = string;
const keyOf = (a: Author): AuthorKey => (a.kind === "agent" ? "agent" : a.initials);
const dayOf = (at: string) => (at === "Just now" ? "Today" : at);

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

/** A checklist bubble: what was done, each line with a tick (the agent's "receipt"). */
function Checklist({ items, fresh }: { items: string[]; fresh?: boolean }) {
  return (
    <ul className={`${AGENT_BUBBLE} m-0 flex list-none flex-col gap-1`}>
      {items.map((item, i) => (
        <li key={item} className="flex items-start gap-2">
          <Check
            aria-hidden="true"
            size={14}
            strokeWidth={2.25}
            className={`mt-[3px] flex-none text-[var(--green)] ${fresh ? chat.check : ""}`}
            style={fresh ? { animationDelay: `${i * 90}ms` } : undefined}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** One of the agent's runs: steps that tick off while it works, folded to a summary once done. */
function Run({ entry }: { entry: Extract<ThreadEntry, { kind: "run" }> }) {
  const [open, setOpen] = useState(false);
  const done = entry.done ?? (entry.running ? 0 : entry.steps.length);
  const showAll = entry.running || open || entry.steps.length <= 4;
  const steps = showAll ? entry.steps : entry.steps.slice(-3);
  const offset = entry.steps.length - steps.length;
  return (
    <div className={`${AGENT_BUBBLE} min-w-[260px]`}>
      <p className="m-0 flex items-center gap-2 font-medium">
        {entry.running ? (
          <LoaderCircle aria-hidden="true" size={14} strokeWidth={2} className="animate-spin text-[var(--tx2)] motion-reduce:animate-none" />
        ) : (
          <Check aria-hidden="true" size={14} strokeWidth={2.25} className="text-[var(--green)]" />
        )}
        {entry.summary}
      </p>
      <ol className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
        {steps.map((step, j) => {
          const i = j + offset;
          const isDone = i < done;
          const isNow = entry.running && i === done;
          return (
            <li key={step} className="flex items-center gap-2 text-[13px] leading-[18px]">
              <span className="flex size-3.5 flex-none items-center justify-center">
                {isDone ? (
                  <Check aria-hidden="true" size={13} strokeWidth={2.25} className={`text-[var(--green)] ${entry.fresh || entry.running ? chat.check : ""}`} />
                ) : isNow ? (
                  <LoaderCircle aria-hidden="true" size={12} strokeWidth={2.25} className="animate-spin text-[var(--tx2)] motion-reduce:animate-none" />
                ) : (
                  <Circle aria-hidden="true" size={10} strokeWidth={2} className="text-[var(--ctl-h)]" />
                )}
              </span>
              <span className={isDone ? "text-[var(--tx)]" : isNow ? `text-[var(--tx)] ${chat.shimmer}` : "text-[var(--tx2)]"}>{step}</span>
            </li>
          );
        })}
      </ol>
      {!showAll && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1.5 inline-flex items-center gap-1 rounded-[4px] text-[12px] leading-4 text-[var(--tx2)] hover:text-[var(--tx)]"
        >
          <ChevronDown aria-hidden="true" size={12} />
          Show all {entry.steps.length} steps
        </button>
      )}
    </div>
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
      <div className={AGENT_BUBBLE}>
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

/** The agent's side of the conversation: the mascot once per group, then its bubbles and cards. */
function TheirRow({ author, head, at, children }: { author: Author; head: boolean; at: string; children: ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <div className="w-8 flex-none">
        {head &&
          (author.kind === "agent" ? (
            <AgentAvatar size={32} />
          ) : (
            <span className="flex size-8 items-center justify-center">
              <PersonAvatar initials={author.initials} size={28} />
            </span>
          ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        {head && (
          <p className="m-0 flex items-baseline gap-2 px-1 pt-1.5 text-[13px] leading-[18px]">
            <span className="font-semibold text-[var(--tx)]">{author.kind === "agent" ? "Agent" : author.name}</span>
            <span className="text-[12px] text-[var(--tx2)]">{at}</span>
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * The story's whole life as a chat, oldest first: who created it and what they asked, the agent's replies,
 * its work as checklists, its questions, people's notes, and a centred line for each stage change. Messages
 * from the same person in a row are grouped; days are marked once. New messages land with a little motion.
 */
export function StoryThread({ entries, stories, viewerInitials, live, ask, onAnswer, onSkipQuestion }: StoryThreadProps) {
  const { rows, lastKey } = layout(entries);

  return (
    <div className="flex flex-col gap-2 pt-2 pb-6">
      {rows.map(({ entry, divider, head }) => {
        const anim = entry.fresh ? chat.enter : "";

        let body: ReactNode = null;
        if (entry.kind === "created" || entry.kind === "stage") {
          body = (
            <p className={`m-0 py-1 text-center text-[12px] leading-4 text-[var(--tx2)] ${anim}`}>
              {entry.kind === "created" ? (
                <>
                  <span className="font-medium text-[var(--tx)]">{entry.by.kind === "agent" ? "Agent" : entry.by.name}</span> created this story
                </>
              ) : (
                entry.text
              )}
            </p>
          );
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
                <div className={`${mine ? MINE_BUBBLE : entry.author.kind === "agent" ? AGENT_BUBBLE : PERSON_BUBBLE} ${land}`}>
                  <RichText segments={entry.text} stories={stories} tone={mine ? "dark" : "light"} />
                </div>
              )}
              {entry.report && (
                <>
                  <div className={`${AGENT_BUBBLE} ${land}`}>{entry.report.outcome}</div>
                  {entry.report.means && <div className={`${AGENT_BUBBLE} ${land}`}>{entry.report.means}</div>}
                  {entry.report.details && <Checklist items={entry.report.details} fresh={entry.fresh} />}
                  {entry.report.next && (
                    <div className={`${AGENT_BUBBLE} ${land}`}>
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
            </>
          );
          body = mine ? (
            <div className="flex flex-col items-end gap-1 pl-12">
              {head && <p className="m-0 px-1 pt-1.5 text-[12px] leading-4 text-[var(--tx2)]">{entry.at}</p>}
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
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--cta)]" />
              {ask.label}
            </p>
            <p className="m-0 mt-1.5 text-[14px] leading-5 font-semibold">{ask.title}</p>
            {ask.meta && <p className="m-0 mt-0.5 text-[13px] leading-[18px] text-[var(--tx2)]">{ask.meta}</p>}
            {(ask.primary || ask.secondary) && (
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

      {/* The agent, live: thinking, working (its loop plays), or waiting on someone. */}
      <div aria-live="polite" className="min-h-10">
        {live?.kind === "thinking" && (
          <div className={`flex items-center gap-2.5 ${chat.enter}`}>
            <Mascot size={32} state="idle" />
            <span className="flex items-center gap-2 text-[13px] leading-[18px] text-[var(--tx2)]">
              <span aria-hidden="true" className="flex gap-1 text-[#EB6834]">
                <span className={chat.dot} />
                <span className={chat.dot} />
                <span className={chat.dot} />
              </span>
              <span className={chat.labelIn}>Thinking</span>
            </span>
          </div>
        )}
        {live?.kind === "working" && (
          <div className={`flex items-center gap-2.5 ${chat.enter}`}>
            <Mascot size={36} state="work" />
            <span key={live.label} className={`text-[13px] leading-[18px] font-medium ${chat.labelIn} ${chat.shimmer}`}>
              {live.label}
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
