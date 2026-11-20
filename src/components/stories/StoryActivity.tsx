import { useId, type ReactNode, type Ref } from "react";
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Braces,
  Camera,
  Check,
  CircleCheck,
  ChevronRight,
  CircleX,
  FileText,
  GitMerge,
  GitPullRequest,
  Hammer,
  ListChecks,
  LoaderCircle,
  MonitorPlay,
  PenTool,
  X,
  type LucideIcon,
} from "lucide-react";
import type { NeedKind } from "@/types/dashboard";
import type { ActivityItem, ActivityKind, PreviewActions } from "@/types/stories";
import { anyWorking, isProof, nowOf, OPENS, readyOf, reasonOf, type Reason } from "./activity";
import chat from "./chat.module.css";
import { elapsed, useNow } from "./clock";
import { DeviceSwitch, PreviewButtons } from "./PreviewControl";
import { COLUMNS } from "./stage";

// The activity column. On top, what's happening now, as a notification card: the spec being written, the build,
// a preview starting. When it finishes it shows "Finished" for a moment, then goes down to the Ready list at the
// bottom, where finished things stay as buttons. Not a timeline. The only loop is the Builder's working ring.

export const ICON: Record<ActivityKind, LucideIcon> = {
  read: BookOpen,
  spec: FileText,
  engineering: Braces,
  stage: ArrowRight,
  build: Hammer,
  checks: ListChecks,
  preview: MonitorPlay,
  screenshots: Camera,
  markup: PenTool,
  pr: GitPullRequest,
};

export interface ActivityProps {
  items: ActivityItem[];
  /** What the viewer has to decide now, if anything: its evidence is marked "Waiting on you" in the Ready list. */
  yours?: NeedKind;
  /** The chat's decision already offers Restart, so a failed preview gets no second button here. */
  restartInChat: boolean;
  /** Bumped by Undo, so the restored card appears without motion. */
  epoch: number;
  preview: PreviewActions;
  onSoon: (message: string) => void;
}

// ---- Words ----

const WORD: Record<Reason, string> = {
  working: "Working now",
  starting: "Starting…",
  running: "Running",
  failed: "Couldn’t finish",
  waiting: "Waiting for answers",
  yours: "Waiting on you",
  finished: "Finished",
  moved: "Moved",
  latest: "Latest",
};

/** The word for why this item is the highlighted one. "Finished", never "Done", so it isn't read as the Done stage. */
export function reasonWord(it: ActivityItem, reason: Reason, yours?: NeedKind) {
  if (reason === "failed" && it.kind === "preview") return "Couldn’t start";
  if (reason === "waiting" && yours) return "Waiting on you";
  return WORD[reason];
}

/** The card's status line. */
export function statusOf(it: ActivityItem) {
  if (it.kind === "stage" && it.move) {
    return it.move.to === "Cancelled" ? "Nothing more will happen." : (COLUMNS.find((c) => c.label === it.move?.to)?.hint ?? it.detail);
  }
  const busy = it.state === "working" || it.run === "starting";
  return busy && it.detail ? `${it.detail}…` : it.detail;
}

const stateWord = (it: ActivityItem) =>
  it.state === "working" ? ", in progress" : it.state === "done" ? ", done" : it.state === "failed" ? ", failed" : it.state === "waiting" ? ", waiting" : "";

// ---- The tile: the Builder with its ring while working, otherwise the item's icon ----

export function Tile({ item, size = 36 }: { item: ActivityItem; size?: 28 | 36 }) {
  const small = size === 28;
  if (item.state === "working") {
    return (
      <span aria-hidden="true" className={`relative flex flex-none items-center justify-center rounded-[30%] bg-bot-builder-bg ${small ? "size-7" : "size-9"}`}>
        <img src="/images/bots/builder.webp" width={small ? 20 : 28} height={small ? 20 : 28} alt="" className={`${small ? "size-5" : "size-7"} object-contain`} />
        <svg viewBox={small ? "0 0 34 34" : "0 0 42 42"} className={`absolute -top-[3px] -left-[3px] ${small ? "size-[34px]" : "size-[42px]"}`}>
          <rect
            x="1"
            y="1"
            width={small ? 32 : 40}
            height={small ? 32 : 40}
            rx={small ? 9.6 : 12}
            pathLength="100"
            fill="none"
            stroke="var(--bot-builder)"
            strokeWidth="2"
            strokeDasharray="72 28"
            className={chat.ring}
          />
        </svg>
      </span>
    );
  }
  const Icon = ICON[item.kind];
  return (
    <span
      aria-hidden="true"
      className={`relative flex flex-none items-center justify-center rounded-lg bg-[var(--ctl-bg-on)] text-[var(--tx)] ${small ? "size-7" : "size-9"} ${item.fresh ? chat.check : ""}`}
    >
      <Icon size={small ? 14 : 16} strokeWidth={1.75} />
      {item.state === "done" && (
        <span className="absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full bg-[var(--green)] text-white ring-2 ring-white">
          <Check size={9} strokeWidth={3} />
        </span>
      )}
      {item.state === "failed" && (
        <span className="absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full bg-[var(--red)] text-white ring-2 ring-white">
          <X size={9} strokeWidth={3} />
        </span>
      )}
    </span>
  );
}

// ---- The label line: why it's highlighted, and when ----

function LabelLine({ item, reason, word }: { item: ActivityItem; reason: Reason; word: string }) {
  const ticking = item.startedAt !== undefined && (reason === "working" || reason === "starting" || reason === "running");
  const now = useNow(ticking);
  const started = item.startedAt;
  const time =
    ticking && now && started !== undefined ? elapsed(now - started) : reason === "working" && started === undefined ? `Started ${item.at}` : item.at;

  const glyph: Record<Reason, ReactNode> = {
    working: <span className="size-1.5 rounded-full bg-[var(--tx)]" />,
    starting: <LoaderCircle size={14} strokeWidth={1.75} className="animate-spin text-[var(--tx2)] [animation-duration:0.8s] motion-reduce:animate-none" />,
    running: <span className="size-2 rounded-full bg-[var(--green)]" />,
    failed: <CircleX size={14} strokeWidth={1.75} className="text-[var(--red)]" />,
    waiting: <span className="size-1.5 rounded-full bg-[#d97706]" />,
    yours: <span className="size-1.5 rounded-full bg-[#d97706]" />,
    finished: <CircleCheck size={14} strokeWidth={1.75} className="text-[var(--green)]" />,
    moved: <ArrowRight size={14} strokeWidth={1.75} className="text-[var(--tx2)]" />,
    latest: <span className="size-1.5 rounded-full bg-[var(--ctl-h)]" />,
  };

  return (
    <p className="m-0 flex items-center gap-1.5 text-[12px] leading-4">
      <span aria-hidden="true" className="flex size-3.5 flex-none items-center justify-center">
        {glyph[reason]}
      </span>
      <span key={reason} className={`font-medium ${reason === "failed" ? "text-[var(--red)]" : "text-[var(--tx)]"} ${chat.labelIn}`}>
        {word}
      </span>
      <span className="text-[var(--tx2)] tabular-nums">· {time}</span>
    </p>
  );
}

// ---- Pictures: static, abstract shapes that never pass for real content ----

const SHEET_LINES = ["w-full", "w-[85%]", "w-[70%]"];

function Sheet({ item }: { item: ActivityItem }) {
  const writing = item.state === "working";
  const indent = item.kind === "engineering";
  return (
    <div className="w-[120px] translate-y-2 self-end rounded-t-[6px] border border-b-0 border-[var(--card-line)] bg-white p-2">
      <div className="h-1.5 w-1/2 rounded-full bg-black/15" />
      {SHEET_LINES.map((w, i) => (
        <div
          key={w}
          className={`mt-1.5 rounded-full ${w} ${indent && i > 0 ? "ml-2" : ""} ${writing && i === SHEET_LINES.length - 1 ? "h-1.5 border border-dashed border-black/20 bg-transparent" : "h-1 bg-black/10"}`}
        />
      ))}
      <div className="h-6" />
    </div>
  );
}

function Frames({ item }: { item: ActivityItem }) {
  const n = item.count ?? 3;
  const web = item.device === "web";
  const done = item.state === "done";
  return (
    <ul className="m-0 flex list-none gap-1.5 p-0">
      {Array.from({ length: n }, (_, i) => (
        <li
          key={i}
          className={`flex flex-col gap-1 rounded-[6px] border p-1.5 ${web ? "h-12 w-[76px]" : "h-[68px] w-10"} ${done ? `border-[var(--card-line)] bg-white ${item.fresh ? chat.check : ""}` : "border-dashed border-[var(--ctl)]"}`}
          style={done && item.fresh ? { animationDelay: `${i * 70}ms` } : undefined}
        >
          {done && (
            <>
              <span className="h-1 w-3/5 rounded-full bg-black/15" />
              <span className="h-1 w-4/5 rounded-full bg-black/10" />
              <span className={`mt-auto h-1/3 rounded-[3px] ${item.kind === "markup" ? "border border-dashed border-black/20" : "bg-black/[0.07]"}`} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function DeviceFrame({ item }: { item: ActivityItem }) {
  const phone = item.device === "mobile";
  const on = item.run === "on";
  const failed = item.state === "failed";
  return (
    <div
      className={`relative flex flex-col overflow-hidden border bg-white ${phone ? "h-20 w-11 rounded-[8px]" : "h-[76px] w-[136px] rounded-[6px]"} ${failed ? "border-dashed border-[var(--ctl)]" : "border-[var(--card-line)]"} ${item.state === "info" ? "opacity-40" : ""}`}
    >
      <div className="flex h-3 flex-none items-center gap-1 border-b border-[var(--line)] px-1.5">
        {phone ? (
          <span className="mx-auto h-1 w-3 rounded-full bg-black/15" />
        ) : (
          [0, 1, 2].map((d) => <span key={d} className="size-1 rounded-full bg-black/15" />)
        )}
        {on && <span className={`size-1.5 rounded-full bg-[var(--green)] ${phone ? "absolute top-1 right-1" : "ml-auto"}`} />}
      </div>
      {failed ? (
        <span className="flex flex-1 items-center justify-center text-[var(--red)]">
          <CircleX size={16} strokeWidth={1.75} />
        </span>
      ) : (
        <div className={`flex flex-1 flex-col gap-1 p-1.5 ${on ? "" : "opacity-40"}`}>
          <span className="h-1 w-1/2 rounded-full bg-black/[0.07]" />
          <span className="flex-1 rounded-[3px] bg-black/[0.07]" />
          {!phone && <span className="h-1 w-3/4 rounded-full bg-black/[0.07]" />}
        </div>
      )}
    </div>
  );
}

function BrowserMini({ item }: { item: ActivityItem }) {
  const failed = item.state === "failed";
  return (
    <div className={`relative h-[60px] w-[112px] rounded-[6px] border bg-white p-1.5 ${item.state === "working" ? "border-dashed border-[var(--ctl)]" : "border-[var(--card-line)]"}`}>
      <div className="flex gap-1">
        {[0, 1, 2].map((d) => (
          <span key={d} className="size-1 rounded-full bg-black/15" />
        ))}
      </div>
      <span className="mt-1.5 block h-1 w-3/5 rounded-full bg-black/10" />
      <span className="mt-1 block h-5 rounded-[3px] bg-black/[0.07]" />
      {failed && (
        <span className="absolute -top-2 -right-2 rounded-full bg-white text-[var(--red)]">
          <CircleX size={16} strokeWidth={1.75} />
        </span>
      )}
    </div>
  );
}

function PrMini({ item }: { item: ActivityItem }) {
  const merged = /merged/i.test(item.detail);
  const Icon = merged ? GitMerge : GitPullRequest;
  return (
    <div className={`flex h-14 w-[168px] gap-2 rounded-[6px] border bg-white p-2.5 ${item.state === "working" ? "border-dashed border-[var(--ctl)]" : "border-[var(--card-line)]"}`}>
      <Icon size={14} strokeWidth={1.75} className={`flex-none ${merged ? "text-[var(--green)]" : "text-[var(--tx2)]"}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="h-1.5 w-4/5 rounded-full bg-black/15" />
        <span className="h-1 w-full rounded-full bg-black/10" />
        <span className="h-1 w-3/5 rounded-full bg-black/10" />
        <span className="mt-auto h-2 w-8 rounded-full bg-black/10" />
      </div>
    </div>
  );
}

function Picture({ item }: { item: ActivityItem }) {
  // A stage change is real text: where the story moved.
  if (item.kind === "stage" && item.move) {
    const cancelled = item.move.to === "Cancelled";
    return (
      <div className="relative mt-3 flex h-[88px] items-center justify-center rounded-sm bg-[var(--ctl-bg-on)] px-3">
        <p className="m-0 inline-flex flex-wrap items-center justify-center gap-1.5 text-[14px] leading-5">
          {!cancelled && <Check aria-hidden="true" size={14} strokeWidth={2.25} className="text-[var(--green)]" />}
          <span>{item.move.from}</span>
          <ArrowRight aria-label="then" size={14} strokeWidth={1.75} className="text-[var(--tx2)]" />
          <span className={`font-medium ${cancelled ? "text-[var(--tx2)]" : "text-[var(--tx)]"}`}>{item.move.to}</span>
        </p>
      </div>
    );
  }

  let shape: ReactNode;
  if (item.kind === "read" || item.kind === "spec" || item.kind === "engineering") shape = <Sheet item={item} />;
  else if (item.kind === "screenshots" || item.kind === "markup") shape = <Frames item={item} />;
  else if (item.kind === "preview") shape = <DeviceFrame item={item} />;
  else if (item.kind === "build") shape = <BrowserMini item={item} />;
  else if (item.kind === "pr") shape = <PrMini item={item} />;
  else if (item.kind === "checks") shape = <CircleCheck size={24} strokeWidth={1.75} className="text-[var(--green)]" />;
  else {
    const Icon = ICON[item.kind];
    shape = <Icon size={20} strokeWidth={1.75} className="text-[var(--tx2)]" />;
  }
  return (
    <div aria-hidden="true" className="relative mt-3 flex h-[88px] items-center justify-center overflow-hidden rounded-sm bg-[var(--ctl-bg-on)]">
      {shape}
    </div>
  );
}

// ---- On top: what's happening now ----

/** One thing that's happening, as a notification card. */
function NowCard({
  item,
  yours,
  restartInChat,
  preview,
  onSoon,
  ref,
}: { item: ActivityItem; ref?: Ref<HTMLElement> } & Omit<ActivityProps, "items" | "epoch">) {
  const reduce = useReducedMotion();
  const titleId = useId();
  const reason = reasonOf(item, item.settling ? undefined : yours);
  const word = reasonWord(item, reason, yours);
  const tone = item.state === "working" ? "text-[var(--tx)]" : item.state === "failed" ? "text-[var(--red)]" : "text-[var(--tx2)]";
  // A preview that's starting can be cancelled; one that couldn't start can be started again (unless the chat's
  // decision already offers Restart). Everything else on top is just news: it has no buttons.
  const previewActions = item.kind === "preview" && (item.run === "starting" || (item.state === "failed" && !restartInChat));

  // It drops in from the top like a notification and, once finished, sinks down towards the Ready list.
  const enter: TargetAndTransition = reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 };
  const shown: TargetAndTransition = reduce
    ? { opacity: 1, transition: { duration: 0.15 } }
    : { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, delay: 0.08, ease: [0.2, 0, 0, 1] as const } };
  const leave: TargetAndTransition = reduce
    ? { opacity: 0, transition: { duration: 0.12 } }
    : { opacity: 0, y: 32, scale: 0.97, transition: { duration: 0.25, ease: [0.4, 0, 1, 1] as const } };

  return (
    <motion.article
      ref={ref}
      layout={reduce ? false : "position"}
      aria-labelledby={titleId}
      initial={enter}
      animate={shown}
      exit={leave}
      className="relative flex flex-col overflow-hidden rounded-xl border border-[var(--card-line)] bg-white p-4 max-md:rounded-none max-md:border-0 max-md:p-0 max-md:pb-3"
    >
      {/* A new item, and again when its state changes, is tinted for a moment (DESIGN.md §8.4). */}
      <span aria-hidden="true" key={`${item.state}:${item.run ?? ""}`} className={`pointer-events-none absolute inset-0 ${item.fresh ? chat.flash : ""}`} />

      <div className="relative flex gap-3">
        <Tile key={item.state} item={item} />
        <div className="min-w-0 flex-1">
          <LabelLine item={item} reason={reason} word={word} />
          <h3 id={titleId} className="m-0 mt-0.5 line-clamp-2 text-[16px] leading-6 font-semibold tracking-[-0.01em] text-[var(--tx)]">
            {item.title}
          </h3>
        </div>
      </div>

      {statusOf(item) && (
        <p key={item.detail} className={`relative m-0 mt-2 line-clamp-2 text-[14px] leading-5 ${tone} ${item.fresh ? chat.labelIn : ""}`}>
          {statusOf(item)}
          <span className="sr-only">{stateWord(item)}</span>
        </p>
      )}

      <Picture item={item} />

      {item.kind === "build" && item.progress && (
        <div className="relative mt-2 flex items-center gap-2">
          <div
            role="progressbar"
            aria-label={`Build: ${item.progress.done} of ${item.progress.total} steps`}
            aria-valuemin={0}
            aria-valuemax={item.progress.total}
            aria-valuenow={item.progress.done}
            className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--ctl-bg-on)]"
          >
            <div
              className={`h-full w-full origin-left rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none ${item.state === "failed" ? "bg-[var(--red)]" : item.state === "done" ? "bg-[var(--green)]" : "bg-[var(--cta)]"}`}
              style={{ transform: `scaleX(${item.state === "done" ? 1 : item.progress.done / item.progress.total})` }}
            />
          </div>
          <span className="text-[12px] leading-4 text-[var(--tx2)] tabular-nums">
            {item.state === "done" ? item.progress.total : item.progress.done} of {item.progress.total}
          </span>
        </div>
      )}

      {previewActions && (
        <div className="relative mt-3 flex flex-wrap items-center gap-2">
          <PreviewButtons item={item} failed={item.state === "failed"} preview={preview} onSoon={onSoon} />
        </div>
      )}
    </motion.article>
  );
}

/** Passing news on top: something that has just finished while another thing is under way, or a stage change.
 *  One slim line that slides down and goes. */
function NowLine({ item, ref }: { item: ActivityItem; ref?: Ref<HTMLParagraphElement> }) {
  const reduce = useReducedMotion();
  const stage = item.kind === "stage";
  return (
    <motion.p
      ref={ref}
      layout={reduce ? false : "position"}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.2, 0, 0, 1] as const } }}
      exit={reduce ? { opacity: 0, transition: { duration: 0.1 } } : { opacity: 0, y: 24, transition: { duration: 0.3, ease: [0.4, 0, 1, 1] as const } }}
      className="m-0 flex h-9 items-center gap-2 rounded-lg bg-[var(--ctl-bg-on)] px-3 text-[13px] leading-[18px]"
    >
      {stage ? (
        <ArrowRight aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
      ) : (
        <CircleCheck aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none text-[var(--green)]" />
      )}
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium text-[var(--tx)]">{item.title}</span>
        <span className="text-[var(--tx2)]">
          {stage ? (item.move ? ` · now ${item.move.to}` : "") : ` · ${item.detail || "Finished"}`}
        </span>
        {!stage && <span className="sr-only">, finished</span>}
      </span>
    </motion.p>
  );
}

/** What's happening now. One card at most, for the thing under way (or, when nothing is, the thing that has just
 *  finished); anything else passing through is a slim line under it. Nothing happening: a quiet line. */
export function NowArea({ items, yours, restartInChat, epoch, preview, onSoon }: ActivityProps) {
  const reduce = useReducedMotion();
  const now = nowOf(items);
  const live = now.filter((i) => !i.settling);
  const passing = now.filter((i) => i.settling);
  // Nothing under way: the newest thing that just finished gets the card for its moment (stage changes never do).
  const finishing = live.length ? undefined : passing.find((i) => i.kind !== "stage");
  const cards = finishing ? [finishing] : live;
  const lines = passing.filter((i) => i !== finishing);

  return (
    // popLayout: a card that's leaving lifts out of the flow as it sinks, so the next one takes its place at once.
    <div className="relative flex flex-col gap-2">
      <AnimatePresence key={epoch} initial={false} mode="popLayout">
        {cards.map((it) => (
          <NowCard key={`card-${it.id}`} item={it} yours={yours} restartInChat={restartInChat} preview={preview} onSoon={onSoon} />
        ))}
        {lines.map((it) => (
          <NowLine key={`line-${it.id}`} item={it} />
        ))}
        {now.length === 0 && (
          // After a card has gone down, not over it.
          <motion.p
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2, delay: reduce ? 0 : 0.3 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="m-0 flex h-10 items-center gap-2 rounded-xl border border-dashed border-[var(--ctl)] px-3 text-[13px] leading-[18px] text-[var(--tx2)]"
          >
            <span aria-hidden="true" className="size-1.5 flex-none rounded-full bg-[var(--ctl-h)]" />
            Nothing running right now
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- At the bottom: what's ready ----

const READY_ROW = "relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-[var(--card-line)] bg-white px-3 py-1.5 text-left";
/** A finished step you can't open (the build, the checks): the same line, without the button's outline. */
const READY_STEP = "relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-transparent px-3 py-1.5 text-left";

function ReadyRow({ item, proof, preview, onSoon }: { item: ActivityItem; proof: boolean; preview: PreviewActions; onSoon: (message: string) => void }) {
  const Icon = item.kind === "pr" && /merged/i.test(item.detail) ? GitMerge : ICON[item.kind];
  const opens = OPENS[item.kind];
  const running = item.kind === "preview" && item.run === "on";
  const head = (
    <>
      {/* Tinted for a moment when it lands. */}
      {item.fresh && <span aria-hidden="true" key={item.doneAt} className={`pointer-events-none absolute inset-0 ${chat.flash}`} />}
      <span aria-hidden="true" className="relative flex size-7 flex-none items-center justify-center rounded-lg bg-[var(--ctl-bg-on)] text-[var(--tx)]">
        <Icon size={14} strokeWidth={1.75} />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {/* The preview's device shows in its Web/Mobile switch (or "Running on web"), so the row just says Preview. */}
          <span className="truncate text-[14px] leading-5 font-medium text-[var(--tx)]">{item.kind === "preview" ? "Preview" : item.title}</span>
          {proof && (
            <>
              <span aria-hidden="true" className="size-1.5 flex-none rounded-full bg-[#d97706]" />
              <span className="sr-only">, waiting on you</span>
            </>
          )}
        </span>
        <span className="flex items-center gap-1.5 text-[12px] leading-4 text-[var(--tx2)]">
          {running && <span aria-hidden="true" className="size-1.5 flex-none rounded-full bg-[var(--green)]" />}
          <span className="truncate">{item.detail}</span>
        </span>
      </span>
    </>
  );

  // The preview: started, opened and stopped right here (it costs server time, so Stop is never faded).
  if (item.kind === "preview") {
    return (
      <div className={`${READY_ROW} flex-wrap`}>
        {head}
        {(!item.run || item.run === "off") && (
          <span className="relative flex-none">
            <DeviceSwitch device={item.device ?? "web"} onChange={(d) => preview.device(item.id, d)} />
          </span>
        )}
        <div className="relative flex w-full flex-wrap items-center gap-2 pb-0.5 pl-10">
          <PreviewButtons item={item} preview={preview} onSoon={onSoon} />
        </div>
      </div>
    );
  }
  if (opens) {
    const Go = item.kind === "pr" ? ArrowUpRight : ChevronRight;
    return (
      <button
        type="button"
        onClick={() => onSoon(opens)}
        className={`${READY_ROW} transition-[border-color,box-shadow] duration-[120ms] hover:border-[var(--card-line-h)] hover:shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cta)] pointer-coarse:min-h-11`}
      >
        {head}
        <Go aria-hidden="true" size={16} strokeWidth={1.75} className="relative flex-none text-[var(--tx2)]" />
      </button>
    );
  }
  return <div className={READY_STEP}>{head}</div>;
}

/** Finished things, at the bottom: each one a button, in the order they finished (the newest lands last). While
 *  something is being worked on they fade back, so the card on top is the one thing in focus; hover or keyboard
 *  focus brings them back at once. */
export function ReadyTray({ items, yours, preview, onSoon }: ActivityProps) {
  const reduce = useReducedMotion();
  const headingId = useId();
  const ready = readyOf(items);
  const dim = anyWorking(items);
  return (
    <section aria-labelledby={headingId} className={chat.tray}>
      <h3 id={headingId} className="m-0 flex h-6 items-center gap-1.5 text-[12px] leading-4 font-medium text-[var(--tx2)]">
        Ready
        {ready.length > 0 && <span className="tabular-nums">· {ready.length}</span>}
      </h3>
      {ready.length === 0 ? (
        <p className="m-0 mt-1 text-[13px] leading-[18px] text-[var(--tx2)]">Finished pages, previews and files land here.</p>
      ) : (
        <ul className="m-0 mt-1.5 flex list-none flex-col gap-1.5 p-0">
          <AnimatePresence initial={false}>
            {ready.map((it) => (
              <motion.li
                key={it.id}
                layout={reduce ? false : "position"}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] as const }}
              >
                <div className={dim && !(it.kind === "preview" && it.run === "on") ? chat.dim : undefined}>
                  <ReadyRow item={it} proof={isProof(it, yours)} preview={preview} onSoon={onSoon} />
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
