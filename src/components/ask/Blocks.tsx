import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, CircleAlert, CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import type { ActivityLine, AskData, Block, BotId, StoryRef } from "@/types/ask";
import { BotAvatar } from "./BotAvatar";
import { TEAM, TEAM_ORDER } from "./team";
import styles from "./ask.module.css";

// The pieces an answer is made of. Quiet by default: hairline cards, 15/24 text, colour only from status
// pills and the bots themselves.

const CARD = "overflow-hidden rounded-[14px] border border-[var(--card-line)] bg-white";

function Stories({ items }: { items: StoryRef[] }) {
  return (
    <ul className={`${CARD} list-none divide-y divide-[var(--line)]`}>
      {items.map((s) => (
        <li key={s.id}>
          <a
            href={`/dashboard?story=hq-${s.id}`}
            className="group flex min-h-12 items-center gap-3 px-3.5 py-2.5 transition-colors duration-[80ms] hover:bg-[var(--row-h)]"
          >
            <span className="w-12 flex-none text-[13px] text-[var(--tx2)] tabular-nums">hq-{s.id}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] leading-5 text-[var(--tx)]">{s.title}</span>
              {s.detail && <span className="block truncate text-[12px] leading-4 text-[var(--tx2)]">{s.detail}</span>}
            </span>
            <StatusPill status={s.status} />
            <ArrowUpRight
              aria-hidden="true"
              size={14}
              strokeWidth={1.75}
              className="flex-none text-[var(--tx2)] opacity-0 transition-opacity group-hover:opacity-100"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

function Stats({ items }: { items: { label: string; value: number }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((s) => (
        <div key={s.label} className="rounded-[12px] bg-[#F6F6F7] px-3 py-2.5">
          <div className="text-[22px] leading-7 font-medium tracking-[-0.01em] text-[var(--tx)] tabular-nums">{s.value}</div>
          <div className="text-[12px] leading-4 text-[var(--tx2)]">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * The PM giving a job to a bot, as one quiet line: PM → Designer · the task. It spins until the PM brings the
 * work back, then ticks. With a story, Watch opens that story's page, where the bot works live.
 * Not for anything you need to act on: that's an approval card.
 */
function Handoff({ to, task, story, done }: { to: BotId; task: string; story?: number; done: boolean }) {
  const bot = TEAM[to];
  return (
    <div className="flex min-h-7 items-center gap-1.5 text-[13px] leading-[18px] text-[var(--tx2)]">
      <BotAvatar id="pm" size={20} />
      <ArrowRight aria-hidden="true" size={12} strokeWidth={2} className="flex-none" />
      <BotAvatar id={to} size={20} />
      <span className="ml-1 min-w-0 truncate">
        Handed to <span className="font-medium text-[var(--tx)]">{bot.name}</span> · {task}
      </span>
      {done ? (
        <Check aria-label="Done" size={14} strokeWidth={2} className="flex-none text-success" />
      ) : (
        <LoaderCircle aria-label="Working" size={14} strokeWidth={2} className="flex-none motion-safe:animate-spin" style={{ color: bot.colour }} />
      )}
      {story !== undefined && (
        <a
          href={`/stories/hq-${story}`}
          className="ml-auto flex-none rounded-full px-2 py-0.5 font-medium text-[var(--cta)] transition-colors hover:bg-[var(--row-h)]"
        >
          Watch
        </a>
      )}
    </div>
  );
}

const TONE = {
  done: <CircleCheck aria-hidden="true" size={13} strokeWidth={2} className="flex-none text-success" />,
  warn: <CircleAlert aria-hidden="true" size={13} strokeWidth={2} className="flex-none text-warning" />,
  work: <LoaderCircle aria-hidden="true" size={13} strokeWidth={2} className="flex-none motion-safe:animate-spin" />,
};

/**
 * What a bot did, as quiet log lines under the PM's words: the bot works, it doesn't talk.
 * Not for results you look at (designs, checks, steps carry those) or anything that needs you.
 */
function Activity({ by, lines }: { by: BotId; lines: ActivityLine[] }) {
  const bot = TEAM[by];
  return (
    <ul className="list-none space-y-1 border-l-2 pl-3" style={{ borderColor: `color-mix(in oklab, ${bot.colour} 35%, white)` }}>
      {lines.map((l) => (
        <li key={l.text} className="flex items-center gap-2 text-[12px] leading-4 text-[var(--tx2)]">
          {TONE[l.tone ?? "done"]}
          <span className="min-w-0">
            <span className="font-medium text-[var(--tx)]">{bot.name}</span> {l.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "by Designer": who made a result the PM brought back. */
function Credit({ by }: { by: BotId }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-[12px] leading-4 text-[var(--tx2)]">
      <BotAvatar id={by} size={16} />
      by {TEAM[by].name}
    </p>
  );
}

/**
 * Something that needs your OK before the team goes on. Yes asks the PM to carry on; No closes it.
 * Not for news: if nothing waits on you, it's a line of text.
 */
function Approval({
  title,
  body,
  yes,
  no,
  onAsk,
}: {
  title: string;
  body: string;
  yes: { label: string; ask: string };
  no: string;
  onAsk: (q: string) => void;
}) {
  const [said, setSaid] = useState<"yes" | "no" | null>(null);
  return (
    <div className={`${CARD} px-3.5 py-3`}>
      <span className="inline-flex h-5 items-center rounded-full bg-warning-tint px-2 text-[11px] leading-4 font-medium text-warning-ink">Needs your OK</span>
      <p className="mt-2 text-[14px] leading-5 font-medium text-[var(--tx)]">{title}</p>
      <p className="mt-0.5 text-[13px] leading-[18px] text-pretty text-[var(--tx2)]">{body}</p>
      {said ? (
        <p className="mt-3 flex items-center gap-1.5 text-[13px] leading-[18px] text-[var(--tx2)]">
          {said === "yes" && <Check aria-hidden="true" size={14} strokeWidth={2} className="text-success" />}
          {said === "yes" ? yes.label : no}
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setSaid("yes");
              onAsk(yes.ask);
            }}
            className="h-8 rounded-full bg-[var(--cta)] px-3.5 text-[13px] leading-[18px] font-medium text-white transition-colors duration-[120ms] hover:bg-[var(--cta-h)]"
          >
            {yes.label}
          </button>
          <button
            type="button"
            onClick={() => setSaid("no")}
            className="h-8 rounded-full border border-[var(--card-line)] bg-white px-3.5 text-[13px] leading-[18px] text-[var(--tx)] transition-colors duration-[120ms] hover:bg-[var(--ctl-bg-h)]"
          >
            {no}
          </button>
        </div>
      )}
    </div>
  );
}

/** A tiny wireframe per direction, in the Designer's violet. */
export function Wireframe({ layout, colour }: { layout: "list" | "cards" | "split"; colour: string }) {
  const soft = `color-mix(in oklab, ${colour} 18%, white)`;
  const mid = `color-mix(in oklab, ${colour} 45%, white)`;
  return (
    <svg viewBox="0 0 160 110" className="block h-auto w-full" aria-hidden="true">
      <rect width="160" height="110" rx="8" fill="#FAFAFB" />
      <rect x="10" y="10" width="60" height="7" rx="3.5" fill={mid} />
      {layout === "list" &&
        [26, 42, 58, 74, 90].map((y) => (
          <g key={y}>
            <rect x="10" y={y} width="140" height="11" rx="3" fill="white" stroke="#ECECEE" />
            <rect x="15" y={y + 3.5} width="40" height="4" rx="2" fill={soft} />
            <rect x="128" y={y + 2.5} width="16" height="6" rx="3" fill={mid} />
          </g>
        ))}
      {layout === "cards" &&
        [
          [10, 26],
          [84, 26],
          [10, 66],
          [84, 66],
        ].map(([x, y]) => (
          <g key={`${x}${y}`}>
            <rect x={x} y={y} width="66" height="34" rx="5" fill="white" stroke="#ECECEE" />
            <rect x={x + 6} y={y + 7} width="12" height="12" rx="4" fill={soft} />
            <rect x={x + 6} y={y + 23} width="38" height="4" rx="2" fill={mid} />
          </g>
        ))}
      {layout === "split" && (
        <>
          <rect x="10" y="26" width="44" height="74" rx="5" fill="white" stroke="#ECECEE" />
          {[34, 46, 58, 70].map((y, i) => (
            <rect key={y} x="16" y={y} width="32" height="6" rx="3" fill={i === 1 ? mid : soft} />
          ))}
          <rect x="62" y="26" width="88" height="74" rx="5" fill="white" stroke="#ECECEE" />
          <rect x="70" y="35" width="44" height="5" rx="2.5" fill={mid} />
          <rect x="70" y="48" width="72" height="9" rx="3" fill={soft} />
          <rect x="70" y="62" width="72" height="9" rx="3" fill={soft} />
          <rect x="114" y="84" width="28" height="9" rx="4.5" fill={mid} />
        </>
      )}
    </svg>
  );
}

function Designs({
  options,
  onPick,
}: {
  options: { id: string; label: string; layout: "list" | "cards" | "split" }[];
  onPick: (id: string, label: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const colour = TEAM.designer.colour;
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={picked !== null}
          onClick={() => {
            setPicked(o.id);
            onPick(o.id, o.label);
          }}
          aria-pressed={picked === o.id}
          className={`group rounded-[14px] border bg-white p-1.5 text-left transition-[transform,box-shadow,border-color] duration-[160ms] enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_6px_16px_rgb(0_0_0/0.08)] motion-reduce:enabled:hover:translate-y-0 ${
            picked === o.id ? "border-[var(--cta)] ring-2 ring-[var(--cta)]/15" : "border-[var(--card-line)]"
          } ${picked !== null && picked !== o.id ? "opacity-50" : ""}`}
        >
          <Wireframe layout={o.layout} colour={colour} />
          <span className="flex items-center justify-between px-1.5 pt-1.5 pb-0.5 text-[13px] leading-[18px]">
            <span className="text-[var(--tx)]">
              <span className="font-medium">{o.id}</span>
              <span className="text-[var(--tx2)]"> · {o.label}</span>
            </span>
            <span className="text-[12px] text-[var(--cta)] opacity-0 transition-opacity group-enabled:group-hover:opacity-100">
              {picked === o.id ? "" : "Use"}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * The Builder's steps, ticking over while you watch (each ~1.6 s). When the last one is done the story moves on to
 * review: every step is ticked, the bar is full and the pill says In review.
 */
function Steps({ story, steps }: { story: { id: number; title: string }; steps: string[] }) {
  const [at, setAt] = useState(0);
  const [secs, setSecs] = useState(0);
  const done = at >= steps.length;
  useEffect(() => {
    if (done) return;
    const step = window.setInterval(() => setAt((a) => Math.min(a + 1, steps.length)), 1600);
    const clock = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => {
      window.clearInterval(step);
      window.clearInterval(clock);
    };
  }, [steps.length, done]);
  const elapsed = secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m`;
  return (
    <div className={`${CARD} px-3.5 py-3`}>
      <div className="flex items-center gap-3">
        <span className="w-12 flex-none text-[13px] text-[var(--tx2)] tabular-nums">hq-{story.id}</span>
        <span className="min-w-0 flex-1 truncate text-[14px] leading-5 text-[var(--tx)]">{story.title}</span>
        {done ? <StatusPill status="in_review" /> : <StatusPill status="building" elapsed={elapsed} />}
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#F0F0F2]">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${done ? "" : styles.sheen}`}
          style={{ width: `${done ? 100 : ((at + 0.5) / steps.length) * 100}%`, backgroundColor: done ? "var(--success)" : TEAM.builder.colour }}
        />
      </div>
      <ol className="mt-3 list-none space-y-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2 text-[13px] leading-[18px]">
            {i < at ? (
              <CircleCheck aria-hidden="true" size={14} strokeWidth={2} className="flex-none text-success" />
            ) : i === at ? (
              <LoaderCircle aria-hidden="true" size={14} strokeWidth={2} className="flex-none text-[var(--tx)] motion-safe:animate-spin" />
            ) : (
              <span aria-hidden="true" className="mx-[3px] size-2 flex-none rounded-full border border-[var(--ctl)]" />
            )}
            <span className={i <= at ? "text-[var(--tx)]" : "text-[var(--tx2)]"}>{s}</span>
            <span className="sr-only">{i < at ? "done" : i === at ? "in progress" : "to do"}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Checks({ story, passed, failed, note }: { story: { id: number; title: string }; passed: number; failed: number; note: string }) {
  return (
    <div className={`${CARD} px-3.5 py-3`}>
      <div className="flex items-center gap-3">
        <span className="w-12 flex-none text-[13px] text-[var(--tx2)] tabular-nums">hq-{story.id}</span>
        <span className="min-w-0 flex-1 truncate text-[14px] leading-5 text-[var(--tx)]">{story.title}</span>
        <StatusPill status={failed ? "failed" : "merged"} />
      </div>
      <div className="mt-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        <div className="bg-success" style={{ flex: passed }} />
        <div className="bg-danger-ink" style={{ flex: failed }} />
      </div>
      <p className="mt-2 text-[12px] leading-4 text-[var(--tx2)] tabular-nums">
        {passed} passed · {failed} failed
      </p>
      {failed > 0 && (
        <p className="mt-2.5 flex gap-2 rounded-[10px] bg-danger-tint px-3 py-2 text-[13px] leading-[18px] text-danger-ink">
          <CircleX aria-hidden="true" size={14} strokeWidth={2} className="mt-0.5 flex-none" />
          {note}
        </p>
      )}
    </div>
  );
}

function Team() {
  return (
    <ul className="grid list-none grid-cols-1 gap-2 sm:grid-cols-2">
      {TEAM_ORDER.map((id) => {
        const bot = TEAM[id];
        return (
          <li key={id} className={`${CARD} flex items-start gap-3 px-3 py-2.5`}>
            <BotAvatar id={id} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] leading-5 font-medium text-[var(--tx)]">
                {bot.name}
                {id === "pm" && <span className="font-normal text-[var(--tx2)]"> · you talk to this one</span>}
              </span>
              <span className="block text-[12px] leading-4 text-pretty text-[var(--tx2)]">{bot.does}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Suggest({ items, onAsk }: { items: string[]; onAsk: (q: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onAsk(q)}
          className="h-8 rounded-full border border-[var(--card-line)] bg-white px-3 text-[13px] leading-[18px] text-[var(--tx)] transition-colors duration-[120ms] hover:border-[var(--ctl)] hover:bg-[var(--ctl-bg-h)]"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

export interface BlockActions {
  onAsk: (q: string) => void;
  onPickDesign: (id: string, label: string) => void;
  /** Handoffs whose work the PM has brought back, so their spinner becomes a tick. */
  handedOff: Set<BotId>;
  data: AskData;
}

/** Every block but text (the message streams its text itself). A result a bot made says so underneath. */
export function BlockView({ block, actions }: { block: Exclude<Block, { kind: "text" }>; actions: BlockActions }) {
  const view = viewOf(block, actions);
  const by = "by" in block && block.kind !== "activity" && block.kind !== "approval" ? block.by : undefined;
  return by ? (
    <div>
      {view}
      <Credit by={by} />
    </div>
  ) : (
    view
  );
}

function viewOf(block: Exclude<Block, { kind: "text" }>, actions: BlockActions) {
  switch (block.kind) {
    case "stats":
      return <Stats items={block.items} />;
    case "stories":
      return <Stories items={block.items} />;
    case "handoff":
      return <Handoff to={block.to} task={block.task} story={block.story} done={actions.handedOff.has(block.to)} />;
    case "activity":
      return <Activity by={block.by} lines={block.lines} />;
    case "approval":
      return <Approval title={block.title} body={block.body} yes={block.yes} no={block.no} onAsk={actions.onAsk} />;
    case "designs":
      return <Designs options={block.options} onPick={actions.onPickDesign} />;
    case "steps":
      return <Steps story={block.story} steps={block.steps} />;
    case "checks":
      return <Checks story={block.story} passed={block.passed} failed={block.failed} note={block.note} />;
    case "team":
      return <Team />;
    case "suggest":
      return <Suggest items={block.items} onAsk={actions.onAsk} />;
  }
}
