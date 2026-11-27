import { useId, useState } from "react";
import {
  AppWindow,
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
  GitBranch,
  GitPullRequest,
  Hammer,
  ListChecks,
  MonitorPlay,
  PenTool,
  X,
  type LucideIcon,
} from "lucide-react";
import type { NeedKind, StoryStatus } from "@/types/dashboard";
import type { ActivityItem, ActivityKind, PreviewActions } from "@/types/stories";
import { activeOf, isProof, madeOf, OPENS, orderOutputs, reasonOf, type Reason } from "./activity";
import chat from "./chat.module.css";
import { elapsed, useNow } from "./clock";
import { Collapse } from "./Collapse";
import { PanelSection } from "./PanelSection";
import { PreviewButtons, PreviewInline } from "./PreviewControl";
import { COLUMNS } from "./stage";

// What the story made, a part each: Pages, Preview, Code (Shubham, 27 Nov: every part a white box of its own that
// folds). A part lists what was made, one line each, the build and its checks folded into one; and what's under way
// shows in its own part, in place: the Builder's ring while it works, the time so far, a build's bar, then it turns into
// a finished line where it stands. Before 27 Nov what was running sat in one list on top and went down when it finished.
// Colour only for state (DESIGN.md §2.7); the robot is the one 3D thing.

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
  main: GitBranch,
};

export interface ActivityProps {
  items: ActivityItem[];
  /** What the viewer has to decide now, if anything: its evidence is marked in the outputs. */
  yours?: NeedKind;
  /** The chat's decision already offers Restart, so a failed preview gets no second button here. */
  restartInChat: boolean;
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

/** A neutral tile: white with a hairline, flat (Shubham, 26 Nov: no shadows anywhere, a clean layout). */
export const RAISED =
  "border border-black/[0.08] bg-white text-[var(--tx)]";

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
  const Icon = item.kind === "pr" && /merged/i.test(item.detail) ? GitMerge : item.kind === "preview" && item.scope === "app" ? AppWindow : ICON[item.kind];
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

// ---- Under way: being made, waiting on someone, or stopped ----

/** One thing under way, in its part: what it is, what it's doing and for how long; why, in full, when it stopped. */
function LiveRow({ item, yours, restartInChat, preview, onSoon }: { item: ActivityItem } & Omit<ActivityProps, "items">) {
  const reason = reasonOf(item, yours);
  const ticking = item.startedAt !== undefined && (reason === "working" || reason === "starting" || reason === "running");
  const now = useNow(ticking);
  const time = ticking && now && item.startedAt !== undefined ? elapsed(now - item.startedAt) : null;
  const status = statusOf(item);
  const word = reasonWord(item, reason, yours);
  const tone = item.state === "failed" ? "text-[var(--red)]" : item.state === "working" ? "text-[var(--tx)]" : "text-[var(--tx2)]";
  // A preview that's starting can be cancelled; one that couldn't start can be started again (unless the chat's
  // decision already offers Restart). Everything else under way is news: no buttons.
  const previewActions = item.kind === "preview" && (item.run === "starting" || (item.state === "failed" && !restartInChat));

  return (
    <div className="relative flex gap-2.5 rounded-lg px-2 py-1.5">
      {/* Tinted for a moment when it arrives and when its state changes (DESIGN.md §8.4). */}
      <span aria-hidden="true" key={`${item.state}:${item.run ?? ""}`} className={`pointer-events-none absolute inset-0 rounded-lg ${item.fresh ? chat.flash : ""}`} />
      <Tile key={item.state} item={item} size={24} />
      <div className="relative min-w-0 flex-1">
        <p className="m-0 flex min-h-6 items-center gap-2">
          {/* Under its part's heading, a preview is named for which it is, as its finished line is. */}
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--tx)]">
            {item.kind === "preview" ? (item.scope === "app" ? "Whole app" : "This story") : item.title}
          </span>
          <span key={reason} className={`flex flex-none items-center gap-1 text-xs tabular-nums ${chat.labelIn} ${reason === "failed" ? "text-[var(--red)]" : "text-[var(--tx2)]"}`}>
            {item.settling && item.run === "on" ? (
              // A preview that has just started running: it's on, not finished.
              <>
                <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--green)]" />
                Running
              </>
            ) : time ? (
              time
            ) : reason === "working" ? (
              `Started ${item.at}`
            ) : status?.startsWith(word) ? null : (
              // Said once: not here when the status line already starts with it.
              word
            )}
          </span>
        </p>
        {status && (
          // Wraps rather than cutting off. Why something failed shows in full; anything else stops at two lines, with the
          // whole of it in a tooltip (DESIGN.md §3.2).
          <p
            key={item.detail}
            title={item.state === "failed" ? undefined : status}
            className={`m-0 text-xs ${item.state === "failed" ? "" : "line-clamp-2"} ${tone} ${item.fresh ? chat.labelIn : ""}`}
          >
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
              className={`h-full w-full origin-left rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none ${item.state === "failed" ? "bg-[var(--red)]" : "bg-[var(--cta)]"}`}
              style={{ transform: `scaleX(${item.progress.done / item.progress.total})` }}
            />
          </div>
        )}
        {previewActions && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PreviewButtons item={item} failed={item.state === "failed"} preview={preview} onSoon={onSoon} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Made: one line each ----

/** One line: a small tile, the name, and what it is now, muted. No box; a soft background on hover. */
const LINE = "group relative flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left pointer-coarse:min-h-11";
// Hover is a 4% black wash (DESIGN.md §3.1 `--hover`), so it shows on the grey canvas as well as on white.
const LINE_BUTTON = `${LINE} transition-colors duration-[120ms] hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--cta)]`;

/** `holdName`: never narrower than a short name like "Whole app", so buttons beside it move down instead of squeezing it. */
function LineText({ title, detail, proof, running, holdName }: { title: string; detail: string; proof?: boolean; running?: boolean; holdName?: boolean }) {
  return (
    // The name and what it is now share a line when they fit; in a narrow space the state goes under the name, so
    // neither is cut short. The name keeps its dot beside it. Only a name longer than the whole row still truncates,
    // hence the tooltip (DESIGN.md §3.2).
    <span
      title={detail ? `${title} · ${detail}` : title}
      className={`relative flex flex-1 flex-wrap items-baseline gap-x-1.5 ${holdName ? "min-w-24" : "min-w-0"}`}
    >
      <span className="flex max-w-full min-w-0 items-baseline gap-1.5">
        <span className="min-w-0 truncate text-sm font-medium text-[var(--tx)]">{title}</span>
        {proof && (
          <>
            <span aria-hidden="true" className="size-1.5 flex-none -translate-y-px self-center rounded-full bg-[#d97706]" />
            <span className="sr-only">, waiting on you</span>
          </>
        )}
        {running && <span aria-hidden="true" className="size-1.5 flex-none self-center rounded-full bg-[var(--green)]" />}
      </span>
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

interface OutputRowProps {
  item: ActivityItem;
  proof: boolean;
  preview: PreviewActions;
  onSoon: (message: string) => void;
  /** The whole app, while it's off: whether this story is in it. */
  line?: string;
}

function OutputRow({ item, proof, preview, onSoon, line }: OutputRowProps) {
  const opens = OPENS[item.kind];
  const flash = item.fresh && <span aria-hidden="true" key={item.doneAt} className={`pointer-events-none absolute inset-0 rounded-lg ${chat.flash}`} />;

  // A preview, this story's or the whole app: started, opened and stopped right on its line (it costs server time, so
  // Stop is never faded).
  if (item.kind === "preview") {
    const off = !item.run || item.run === "off";
    return (
      // Where the name and the buttons don't fit side by side, the buttons go on a line of their own under it, on the
      // right. Below 18rem (phones under about 330 px) that holds in every state, so starting or stopping a preview
      // never reshapes the row, and Play comes back where Stop was.
      <div className={`${LINE} flex-wrap gap-y-1`}>
        {flash}
        <Tile item={item} size={24} badge={false} />
        {/* Named under the part's Preview heading: "This story" and "Whole app" (Shubham, 27 Nov). Off, this story's
            play button already says it's ready to try; the whole app says whether this story is in it yet. */}
        <LineText
          title={item.scope === "app" ? "Whole app" : "This story"}
          detail={off ? (item.scope === "app" ? (line ?? "") : "") : item.detail}
          proof={proof}
          running={item.run === "on"}
          holdName
        />
        <span className="ml-auto flex @max-[18rem]:basis-full @max-[18rem]:justify-end">
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
      <Collapse open={open} id={panelId}>
        <ul className="m-0 mb-1 ml-[19px] flex list-none flex-col gap-1 border-l border-[var(--line)] py-1 pl-[19px]">
          {items.map((it) => (
            <li key={it.id} className="flex items-baseline gap-2 text-xs">
              <CircleCheck aria-hidden="true" size={12} strokeWidth={2} className="flex-none translate-y-0.5 text-[var(--green)]" />
              {/* The name stays whole and its result goes under it when they don't fit side by side, like the lines
                  above; the tooltip has both (DESIGN.md §3.2). */}
              <span title={it.detail ? `${it.title} · ${it.detail}` : it.title} className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                <span className="max-w-full min-w-0 truncate font-medium text-[var(--tx)]">{it.title}</span>
                <span className="max-w-full min-w-0 truncate text-[var(--tx2)]">{it.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Collapse>
    </div>
  );
}

/** Where the story is, for what a part says while it's empty: before the build, queued, building, or after it. */
type Phase = "plan" | "queued" | "build" | "after";

const phaseOf = (status: StoryStatus): Phase =>
  status === "new" || status === "planning" ? "plan" : status === "approved" ? "queued" : status === "in_progress" ? "build" : "after";

type Said = { title: string; detail?: string };

interface Section {
  /** Names its box and its fold: "pages". */
  key: string;
  label: string;
  kinds: ActivityKind[];
  /** What the empty slot stands for, when the part also has a line that's always there (Preview: the slot is this
   *  story's preview, and the whole app's line is under it at every stage). Otherwise anything of `kinds`. */
  slot?: (it: ActivityItem) => boolean;
  /** The empty slot's icon. */
  icon: LucideIcon;
  /** While the part has nothing: what isn't there and, while it can still come, when it comes. */
  empty: (phase: Phase) => Said;
}

/**
 * What was made, in parts (Shubham, 27 Nov: section-wise, "the page section for specification pages and engineering
 * pages, second section is for preview"). The parts are always there, in this order, so nobody has to guess what will
 * come (Shubham, 27 Nov: "a section that's already defined"): a part shows what's under way and what was made, one line
 * each (only the pages this story has, say just the engineering page), or says plainly that it's empty and, while it
 * can still come, when it comes. Once the story is past the point where a part is made, it says this story has none.
 */
const SECTIONS: Section[] = [
  {
    key: "pages",
    label: "Pages",
    kinds: ["spec", "engineering"],
    icon: FileText,
    empty: (phase) => (phase === "plan" ? { title: "No pages yet", detail: "Written while planning" } : { title: "No pages for this story" }),
  },
  {
    // Two previews (Shubham, 27 Nov): this story's own, just what it makes (a login screen, a modal), and the whole app,
    // every screen from A to Z. The whole app is there at every stage, so the empty slot stands for this story's.
    key: "preview",
    label: "Preview",
    kinds: ["preview", "screenshots", "markup"],
    slot: (it) => it.kind === "preview" && it.scope !== "app",
    icon: MonitorPlay,
    empty: (phase) => ({ title: "This story", detail: phase === "after" ? "Nothing was built" : "Comes with the build" }),
  },
  {
    key: "code",
    label: "Code",
    kinds: ["pr", "main", "build", "checks"],
    icon: GitPullRequest,
    empty: (phase) =>
      phase === "plan"
        ? { title: "No code yet", detail: "Built once the plan is approved" }
        : phase === "queued"
          ? { title: "No code yet", detail: "Builder picks it up next" }
          : phase === "build"
            ? { title: "No code yet", detail: "Builder is on it" }
            : { title: "No code for this story" },
  },
];

/** An empty part: a dashed slot where its line will go, and what it says instead. */
function EmptySlot({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail?: string }) {
  return (
    <div className={LINE}>
      <span aria-hidden="true" className="relative flex size-6 flex-none items-center justify-center rounded-[7px] border border-dashed border-black/[0.16] text-[var(--tx2)]">
        <Icon size={14} strokeWidth={1.75} />
      </span>
      {/* Like a made line: the words, then the detail beside them or under them when they don't fit. */}
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
        <span className="text-sm text-[var(--tx2)]">{title}</span>
        {detail && <span className="text-xs text-[var(--tx2)]">{detail}</span>}
      </span>
    </div>
  );
}

/** A folded part's state in a few words and a dot, in its title row, so folding it hides nothing that matters. */
function signalOf(rows: ActivityItem[], proof: boolean, yours?: NeedKind) {
  if (rows.some((it) => it.state === "failed")) return { dot: "bg-[var(--red)]", words: "Stopped" };
  if (proof || (yours && rows.some((it) => it.state === "waiting"))) return { dot: "bg-[#d97706]", words: "Waiting on you" };
  if (rows.some((it) => it.state === "working" || it.run === "starting")) return { dot: "bg-[var(--tx)]", words: "In progress" };
  if (rows.some((it) => it.run === "on")) return { dot: "bg-[var(--green)]", words: "Preview running" };
  return undefined;
}

/** The parts, one after the other: boxes of their own from 1024 px (`boxed`), plain parts inside the Output tab below. */
export function Outputs({ items, yours, restartInChat, preview, onSoon, status, boxed }: ActivityProps & { status: StoryStatus; boxed?: boolean }) {
  const made = madeOf(items);
  const checks = made.filter((it) => it.kind === "build" || it.kind === "checks");
  const folded = checks.length > 1;
  // What's under way and what was made, together, in the parts' fixed order, so a line stays where it is when it finishes.
  const all = orderOutputs([...activeOf(items), ...(folded ? made.filter((it) => !checks.includes(it)) : made)]);
  const phase = phaseOf(status);
  // The whole app, while it's off: with this story in it once it's built, the app as it is before that. Short, so it
  // stays whole beside Web, Mobile and Play in the tablet's corner card.
  const appLine = (it: ActivityItem) => (it.withStory ? "With this story" : phase === "after" ? "Without this story" : "Before this story");

  return (
    <>
      {SECTIONS.map(({ key, label, kinds, slot, icon, empty }) => {
        const rows = all.filter((it) => kinds.includes(it.kind));
        const fold = folded && kinds.includes("checks");
        const count = rows.length + (fold ? 1 : 0);
        const vacant = slot ? !rows.some(slot) : count === 0;
        const proof = rows.some((it) => it.state === "done" && isProof(it, yours)) || (fold && checks.some((it) => isProof(it, yours)));
        const signal = signalOf(rows, proof, yours);
        // While something is being made in this part, what's already there fades back, so the eye goes to it (it comes
        // back on hover or focus). A part with nothing under way stays sharp.
        const dim = rows.some((it) => it.state === "working");
        return (
          <PanelSection
            key={key}
            id={key}
            title={label}
            count={count > 1 ? count : undefined}
            boxed={boxed}
            // Folded, the title row says what matters: something stopped, waiting on you, under way or running; or that
            // there's nothing in it yet.
            summary={
              signal ? (
                <span className="inline-flex items-center gap-1.5">
                  {signal.words}
                  <span aria-hidden="true" className={`size-1.5 flex-none rounded-full ${signal.dot}`} />
                </span>
              ) : count === 0 ? (
                phase === "after" ? "None" : "None yet"
              ) : undefined
            }
          >
            <div className="-mx-2 mt-0.5 flex flex-col">
              {vacant && <EmptySlot icon={icon} {...empty(phase)} />}
              {rows.map((it) =>
                it.state === "done" ? (
                  <div key={it.id} className={dim && !(it.kind === "preview" && (it.run === "on" || it.run === "starting")) ? chat.dim : undefined}>
                    <OutputRow item={it} proof={isProof(it, yours)} preview={preview} onSoon={onSoon} line={it.scope === "app" ? appLine(it) : undefined} />
                  </div>
                ) : (
                  <LiveRow key={it.id} item={it} yours={yours} restartInChat={restartInChat} preview={preview} onSoon={onSoon} />
                ),
              )}
              {fold && (
                <div className={dim ? chat.dim : undefined}>
                  <ChecksRow items={checks} proof={checks.some((it) => isProof(it, yours))} />
                </div>
              )}
            </div>
          </PanelSection>
        );
      })}
    </>
  );
}
