import { useId, useState, type Ref } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Braces,
  Camera,
  Check,
  ChevronRight,
  CircleCheck,
  FileText,
  GitMerge,
  GitPullRequest,
  Hammer,
  ListChecks,
  MonitorPlay,
  PenTool,
  X,
  type LucideIcon,
} from "lucide-react";
import type { NeedKind } from "@/types/dashboard";
import type { ActivityItem, ActivityKind, PreviewActions } from "@/types/stories";
import { anyWorking, isProof, nowOf, OPENS, orderOutputs, readyOf, reasonOf, type Reason } from "./activity";
import chat from "./chat.module.css";
import { elapsed, useNow } from "./clock";
import { PreviewButtons, PreviewInline } from "./PreviewControl";
import { COLUMNS } from "./stage";

// The activity column, kept minimal. On top, one small card with only what's running now, a slim row each: the
// Builder's ring while it works, the time so far, "Finished" for a moment, then the row goes down. Nothing running:
// one quiet line, no box. At the bottom, the outputs to check: one line each, no boxes, the build and its checks
// folded into one. Colour only for state (DESIGN.md §2.7); the robot is the one 3D thing.

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
  /** What the viewer has to decide now, if anything: its evidence is marked in the outputs. */
  yours?: NeedKind;
  /** The chat's decision already offers Restart, so a failed preview gets no second button here. */
  restartInChat: boolean;
  /** Bumped by Undo, so restored rows appear without motion. */
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

/** The word for why this item is on top. "Finished", never "Done", so it isn't read as the Done stage. */
export function reasonWord(it: ActivityItem, reason: Reason, yours?: NeedKind) {
  if (reason === "failed" && it.kind === "preview") return "Couldn’t start";
  if (reason === "waiting" && yours) return "Waiting on you";
  return WORD[reason];
}

/** The row's status line. */
export function statusOf(it: ActivityItem) {
  if (it.kind === "stage" && it.move) {
    return it.move.to === "Cancelled" ? "Nothing more will happen." : (COLUMNS.find((c) => c.label === it.move?.to)?.hint ?? it.detail);
  }
  const busy = it.state === "working" || it.run === "starting";
  return busy && it.detail ? `${it.detail}…` : it.detail;
}

const stateWord = (it: ActivityItem) =>
  it.run === "starting" ? ", starting" : it.run === "on" ? ", running" : it.state === "working" ? ", in progress" : it.state === "done" ? ", done" : it.state === "failed" ? ", failed" : it.state === "waiting" ? ", waiting" : "";

// ---- The tile: the Builder with its ring while working, otherwise the item's icon on a raised tile ----

const TILE = {
  24: { box: "size-6 rounded-[7px]", bot: 18, ring: 30, rx: 8.4 },
  28: { box: "size-7 rounded-[9px]", bot: 20, ring: 34, rx: 9.6 },
  32: { box: "size-8 rounded-[10px]", bot: 24, ring: 38, rx: 10.8 },
} as const;

/** A raised, neutral tile: soft top light, a hairline and a small shadow, so it reads as an object, not an outline. */
const RAISED =
  "border border-black/[0.07] bg-[linear-gradient(180deg,#ffffff_0%,#f2f2f0_100%)] text-[var(--tx)] shadow-[0_1px_2px_rgb(0_0_0/0.06),inset_0_1px_0_rgb(255_255_255/0.9)]";

/** `badge`: false in the outputs, where everything is finished, so a tick on each would only be noise. */
export function Tile({ item, size = 32, badge = true }: { item: ActivityItem; size?: 24 | 28 | 32; badge?: boolean }) {
  const t = TILE[size];
  if (item.state === "working") {
    const box = t.ring - 6;
    return (
      <span aria-hidden="true" className={`relative flex flex-none items-center justify-center bg-bot-builder-bg ${t.box}`}>
        <img src="/images/bots/builder.webp" width={t.bot} height={t.bot} alt="" style={{ width: t.bot, height: t.bot }} className="object-contain" />
        <svg viewBox={`0 0 ${t.ring} ${t.ring}`} style={{ width: t.ring, height: t.ring }} className="absolute -top-[3px] -left-[3px]">
          <rect x="1" y="1" width={box + 4} height={box + 4} rx={t.rx} pathLength="100" fill="none" stroke="var(--bot-builder)" strokeWidth="2" strokeDasharray="72 28" className={chat.ring} />
        </svg>
      </span>
    );
  }
  const Icon = item.kind === "pr" && /merged/i.test(item.detail) ? GitMerge : ICON[item.kind];
  return (
    <span aria-hidden="true" className={`relative flex flex-none items-center justify-center ${t.box} ${RAISED}`}>
      <Icon size={size === 24 ? 14 : 16} strokeWidth={1.75} />
      {badge && item.state === "done" && (
        <span className="absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full bg-[var(--green)] text-white ring-2 ring-white">
          <Check size={9} strokeWidth={3} />
        </span>
      )}
      {item.state === "failed" && (
        <span className="absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full bg-[var(--red)] text-white ring-2 ring-white">
          <X size={9} strokeWidth={3} />
        </span>
      )}
      {item.state === "waiting" && <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-[#d97706] ring-2 ring-white" />}
    </span>
  );
}

// ---- On top: what's running now ----

/** One thing under way (or just finished), as a slim row: what it is, what it's doing, and for how long. */
function NowRow({
  item,
  yours,
  restartInChat,
  preview,
  onSoon,
  ref,
}: { item: ActivityItem; ref?: Ref<HTMLLIElement> } & Omit<ActivityProps, "items" | "epoch">) {
  const reduce = useReducedMotion();
  const settling = Boolean(item.settling);
  const reason = reasonOf(item, settling ? undefined : yours);
  const ticking = !settling && item.startedAt !== undefined && (reason === "working" || reason === "starting" || reason === "running");
  const now = useNow(ticking);
  const time = ticking && now && item.startedAt !== undefined ? elapsed(now - item.startedAt) : null;
  const stage = item.kind === "stage";
  const status = stage && item.move ? `Now ${item.move.to}` : statusOf(item);
  const tone = item.state === "failed" ? "text-[var(--red)]" : item.state === "working" ? "text-[var(--tx)]" : "text-[var(--tx2)]";
  // A preview that's starting can be cancelled; one that couldn't start can be started again (unless the chat's
  // decision already offers Restart). Everything else on top is news: no buttons.
  const previewActions = item.kind === "preview" && (item.run === "starting" || (item.state === "failed" && !restartInChat));

  return (
    <motion.li
      ref={ref}
      layout={reduce ? false : "position"}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.2, 0, 0, 1] as const } }}
      exit={reduce ? { opacity: 0, transition: { duration: 0.1 } } : { opacity: 0, y: 16, transition: { duration: 0.25, ease: [0.4, 0, 1, 1] as const } }}
      className="relative flex gap-2.5 rounded-lg px-2 py-1.5"
    >
      {/* Tinted for a moment when it arrives and when its state changes (DESIGN.md §8.4); a merge, in the positive
          tint, once, where it lands (§8.6). */}
      <span
        aria-hidden="true"
        key={`${item.state}:${item.run ?? ""}`}
        className={`pointer-events-none absolute inset-0 rounded-lg ${item.fresh ? (item.kind === "pr" && /merged/i.test(item.detail) ? chat.flashGood : chat.flash) : ""}`}
      />
      {stage ? (
        <span aria-hidden="true" className={`relative flex size-7 flex-none items-center justify-center rounded-[9px] ${RAISED}`}>
          <ArrowRight size={16} strokeWidth={1.75} className="text-[var(--tx2)]" />
        </span>
      ) : (
        <Tile key={item.state} item={item} size={28} />
      )}
      <div className="relative min-w-0 flex-1">
        <p className="m-0 flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--tx)]">{item.kind === "preview" ? "Preview" : item.title}</span>
          <span key={settling ? "finished" : reason} className={`flex flex-none items-center gap-1 text-xs tabular-nums ${chat.labelIn} ${reason === "failed" ? "text-[var(--red)]" : "text-[var(--tx2)]"}`}>
            {settling && item.run === "on" ? (
              // A preview that has just started running: it's on, not finished.
              <>
                <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--green)]" />
                Running
              </>
            ) : settling && !stage ? (
              <>
                <CircleCheck aria-hidden="true" size={12} strokeWidth={2} className="text-[var(--green)]" />
                Finished
              </>
            ) : time ? (
              time
            ) : reason === "working" ? (
              `Started ${item.at}`
            ) : stage ? (
              item.at
            ) : status?.startsWith(reasonWord(item, reason, yours)) ? null : (
              // Said once: not here when the status line already starts with it.
              reasonWord(item, reason, yours)
            )}
          </span>
        </p>
        {status && (
          // Wraps rather than cutting off: it's often the reason something stopped, and there's no tooltip here.
          <p key={item.detail} className={`m-0 line-clamp-2 text-xs ${tone} ${item.fresh ? chat.labelIn : ""}`}>
            {status}
            <span className="sr-only">{stateWord(item)}</span>
          </p>
        )}
        {item.kind === "build" && item.progress && (
          <div
            role="progressbar"
            aria-label={`Build: ${item.progress.done} of ${item.progress.total} steps`}
            aria-valuemin={0}
            aria-valuemax={item.progress.total}
            aria-valuenow={item.progress.done}
            className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--ctl-bg-on)]"
          >
            <div
              className={`h-full w-full origin-left rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none ${item.state === "failed" ? "bg-[var(--red)]" : item.state === "done" ? "bg-[var(--green)]" : "bg-[var(--cta)]"}`}
              style={{ transform: `scaleX(${item.state === "done" ? 1 : item.progress.done / item.progress.total})` }}
            />
          </div>
        )}
        {previewActions && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PreviewButtons item={item} failed={item.state === "failed"} preview={preview} onSoon={onSoon} />
          </div>
        )}
      </div>
    </motion.li>
  );
}

/**
 * What's running now, in one small card: a slim row for each thing under way, and for a moment each thing that
 * has just finished, before it goes down to the outputs. Nothing running: one quiet line, no box.
 */
export function NowArea({ items, yours, restartInChat, epoch, preview, onSoon }: ActivityProps) {
  const reduce = useReducedMotion();
  // Under way first, then what's passing through on its way down.
  const now = nowOf(items);
  const rows = [...now.filter((i) => !i.settling), ...now.filter((i) => i.settling)];

  return (
    // popLayout: what's leaving lifts out of the flow, so the next thing takes its place at once.
    <AnimatePresence key={epoch} initial={false} mode="popLayout">
      {rows.length > 0 ? (
        <motion.div
          key="card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.15 } }}
          exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.1 } }}
          className="rounded-xl border border-[var(--card-line)] bg-white p-1 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_6px_16px_-10px_rgb(0_0_0/0.12)]"
        >
          <ul className="m-0 flex list-none flex-col p-0">
            <AnimatePresence initial={false} mode="popLayout">
              {rows.map((it) => (
                <NowRow key={it.id} item={it} yours={yours} restartInChat={restartInChat} preview={preview} onSoon={onSoon} />
              ))}
            </AnimatePresence>
          </ul>
        </motion.div>
      ) : (
        <motion.p
          key="idle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2, delay: reduce ? 0 : 0.25 } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          className="m-0 flex h-6 items-center gap-2 text-xs text-[var(--tx2)]"
        >
          <span aria-hidden="true" className="size-1.5 flex-none rounded-full bg-[var(--ctl-h)]" />
          Nothing running right now
        </motion.p>
      )}
    </AnimatePresence>
  );
}

// ---- At the bottom: the outputs ----

/** One line: a small tile, the name, and what it is now, muted. No box; a soft background on hover. */
const LINE = "group relative flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left pointer-coarse:min-h-11";
// Hover is a 4% black wash (DESIGN.md §3.1 `--hover`), so it shows on the grey canvas as well as on white.
const LINE_BUTTON = `${LINE} transition-colors duration-[120ms] hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cta)]`;

/** `holdName`: never narrower than a short name like "Preview", so buttons beside it move down instead of squeezing it. */
function LineText({ title, detail, proof, running, holdName }: { title: string; detail: string; proof?: boolean; running?: boolean; holdName?: boolean }) {
  return (
    // The name and what it is now share a line when they fit; in the narrow column the state goes under the name, so
    // neither is cut short. Only a name longer than the whole row still truncates, hence the tooltip (DESIGN.md §3.2).
    <span
      title={detail ? `${title} · ${detail}` : title}
      className={`relative flex flex-1 flex-wrap items-baseline gap-x-1.5 ${holdName ? "min-w-[4.5rem]" : "min-w-0"}`}
    >
      <span className="max-w-full min-w-0 truncate text-sm font-medium text-[var(--tx)]">{title}</span>
      {proof && (
        <>
          <span aria-hidden="true" className="size-1.5 flex-none -translate-y-px self-center rounded-full bg-[#d97706]" />
          <span className="sr-only">, waiting on you</span>
        </>
      )}
      {running && <span aria-hidden="true" className="size-1.5 flex-none self-center rounded-full bg-[var(--green)]" />}
      <span className="max-w-full min-w-0 truncate text-xs text-[var(--tx2)]">{detail}</span>
    </span>
  );
}

/** What a line leads to, shown on hover or focus (always on touch screens), so the list stays quiet. */
function Trailing({ icon: Icon, open }: { icon: LucideIcon; open?: boolean }) {
  return (
    <Icon
      aria-hidden="true"
      size={16}
      strokeWidth={1.75}
      className={`relative flex-none text-[var(--tx2)] transition-[opacity,transform] duration-[120ms] ${open === undefined ? "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100" : ""} ${open ? "rotate-90" : ""}`}
    />
  );
}

function OutputRow({ item, proof, preview, onSoon }: { item: ActivityItem; proof: boolean; preview: PreviewActions; onSoon: (message: string) => void }) {
  const opens = OPENS[item.kind];
  const flash = item.fresh && <span aria-hidden="true" key={item.doneAt} className={`pointer-events-none absolute inset-0 rounded-lg ${chat.flash}`} />;

  // The preview: started, opened and stopped right on its line (it costs server time, so Stop is never faded).
  if (item.kind === "preview") {
    return (
      // Where the column is too narrow for the name and the buttons side by side, the buttons go on a line of their
      // own under it, on the right.
      <div className={`${LINE} flex-wrap gap-y-1`}>
        {flash}
        <Tile item={item} size={24} badge={false} />
        {/* Off, the play button already says it's ready to try; the words would only be cut short beside it. */}
        <LineText title="Preview" detail={!item.run || item.run === "off" ? "" : item.detail} proof={proof} running={item.run === "on"} holdName />
        <span className="ml-auto flex">
          <PreviewInline item={item} preview={preview} onSoon={onSoon} />
        </span>
      </div>
    );
  }
  if (opens) {
    return (
      <button type="button" onClick={() => onSoon(opens)} className={LINE_BUTTON}>
        {flash}
        <Tile item={item} size={24} badge={false} />
        <LineText title={item.title} detail={item.detail} proof={proof} />
        <Trailing icon={item.kind === "pr" ? ArrowUpRight : ChevronRight} />
      </button>
    );
  }
  return (
    <div className={LINE}>
      {flash}
      <Tile item={item} size={24} badge={false} />
      <LineText title={item.title} detail={item.detail} proof={proof} />
    </div>
  );
}

/** The build and its checks, folded into one line that opens: they're proof, not things to open one by one. */
function ChecksRow({ items, proof }: { items: ActivityItem[]; proof: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div>
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)} className={LINE_BUTTON}>
        <span aria-hidden="true" className={`relative flex size-6 flex-none items-center justify-center rounded-[7px] ${RAISED}`}>
          <ListChecks size={14} strokeWidth={1.75} />
        </span>
        <LineText title="Build and checks" detail="All passed" proof={proof} />
        <Trailing icon={ChevronRight} open={open} />
      </button>
      {open && (
        <ul id={panelId} className={`m-0 mb-1 ml-[19px] flex list-none flex-col gap-1 border-l border-[var(--line)] py-1 pl-[19px] ${chat.enter}`}>
          {items.map((it) => (
            <li key={it.id} className="flex items-baseline gap-2 text-xs">
              <CircleCheck aria-hidden="true" size={12} strokeWidth={2} className="flex-none translate-y-0.5 text-[var(--green)]" />
              <span className="font-medium text-[var(--tx)]">{it.title}</span>
              <span className="min-w-0 truncate text-[var(--tx2)]">{it.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The outputs, at the bottom: what's finished, to check. One line each, in a fixed order (pages, the preview and
 * screens, the pull request, then the build and its checks folded into one line). While something is being worked
 * on, the lines fade back so the card on top is the one thing in focus; hover or keyboard focus brings them back.
 */
export function Outputs({ items, yours, preview, onSoon }: ActivityProps) {
  const headingId = useId();
  const ready = orderOutputs(readyOf(items));
  const dim = anyWorking(items);
  const checks = ready.filter((it) => it.kind === "build" || it.kind === "checks");
  const folded = checks.length > 1;
  const lines = folded ? ready.filter((it) => !checks.includes(it)) : ready;

  return (
    <section aria-labelledby={headingId} className={chat.tray}>
      <h3 id={headingId} className="m-0 flex h-6 items-center gap-1.5 text-xs font-medium text-[var(--tx2)]">
        Outputs
        {ready.length > 0 && <span className="tabular-nums">· {ready.length}</span>}
      </h3>
      {ready.length === 0 ? (
        <p className="m-0 mt-1 text-xs text-[var(--tx2)]">Finished pages, previews and code land here.</p>
      ) : (
        <div className="-mx-2 mt-0.5 flex flex-col">
          {lines.map((it) => (
            <div key={it.id} className={dim && !(it.kind === "preview" && it.run === "on") ? chat.dim : undefined}>
              <OutputRow item={it} proof={isProof(it, yours)} preview={preview} onSoon={onSoon} />
            </div>
          ))}
          {folded && (
            <div className={dim ? chat.dim : undefined}>
              <ChecksRow items={checks} proof={checks.some((it) => isProof(it, yours))} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
