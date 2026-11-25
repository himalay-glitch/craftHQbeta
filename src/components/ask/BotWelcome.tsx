import { useEffect, useState, type ReactNode } from "react";
import { Check, LoaderCircle } from "lucide-react";
import type { Activity, BotId } from "@/types/ask";
import { BotAvatar } from "./BotAvatar";
import { BOT_ASKS } from "./brain";
import { TEAM } from "./team";
import styles from "./ask.module.css";

type Worker = Exclude<BotId, "pm">;

/** The time now, ticking each second; null on the server (its clock isn't the browser's). */
function useClock() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return now;
}

const since = (ms: number) => {
  const m = Math.floor(ms / 60000);
  return m < 1 ? "now" : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

/** What a bot has on right now, in one light strip: the story, how far along, and one quiet line of detail. */
interface Now {
  id: number;
  title: string;
  /** Right of the title: how far along, in a few words. */
  progressLabel: string;
  /** 0–1. */
  progress: number;
  detail: ReactNode;
}

const Sep = () => <span className="text-[var(--ctl)]">·</span>;
const Done = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center gap-1">
    <Check aria-hidden="true" size={12} strokeWidth={2.25} className="text-success" />
    {children}
  </span>
);
const Doing = ({ children, colour }: { children: ReactNode; colour: string }) => (
  <span className="inline-flex items-center gap-1 text-[var(--tx)]">
    <LoaderCircle aria-hidden="true" size={12} strokeWidth={2.25} className="motion-safe:animate-spin" style={{ color: colour }} />
    {children}
  </span>
);

function nowFor(bot: Worker, checks: number): Now {
  const c = TEAM[bot].colour;
  switch (bot) {
    case "builder":
      return {
        id: 54,
        title: "Your calendar: see your upcoming plans",
        progressLabel: "Step 3 of 4",
        progress: 0.62,
        detail: (
          <>
            <Doing colour={c}>Running the tests</Doing> <Sep /> Next: hq-58, dark mode
          </>
        ),
      };
    case "designer":
      return {
        id: 23,
        title: "Onboarding value slider and language switch",
        progressLabel: "2 of 3 screens",
        progress: 0.66,
        detail: (
          <>
            <Doing colour={c}>Sketching the last screen</Doing> <Sep /> Directions soon
          </>
        ),
      };
    case "checker":
      return {
        id: 43,
        title: "Creation flow revision",
        progressLabel: `${checks} of 24 checks`,
        progress: checks / 24,
        detail: (
          <>
            <Done>Web</Done> <Sep /> <Doing colour={c}>Android</Doing> <Sep /> iOS next
          </>
        ),
      };
    case "fixer":
      return {
        id: 21,
        title: "Test story",
        progressLabel: "Attempt 2 of 3",
        progress: 0.5,
        detail: (
          <>
            <Doing colour={c}>Retrying with more memory</Doing> <Sep /> hq-2 waits on an admin
          </>
        ),
      };
  }
}

/**
 * A bot's own chat, before you've written. Calm on purpose: the bot, its name, one live line, one light strip with
 * what it has on, and three things to ask. No other bots here: this is a one-to-one.
 */
export function BotWelcome({ bot, activity, onAsk }: { bot: Worker; activity: Activity; onAsk: (q: string) => void }) {
  const info = TEAM[bot];
  const clock = useClock();
  const elapsed = clock === null ? "" : since(clock - activity.since);

  // The Checker's count creeps up while you watch (demo), then starts over.
  const [checks, setChecks] = useState(17);
  useEffect(() => {
    if (bot !== "checker") return;
    const id = window.setInterval(() => setChecks((n) => (n >= 22 ? 17 : n + 1)), 1800);
    return () => window.clearInterval(id);
  }, [bot]);
  const now = nowFor(bot, checks);

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
      <div className={`relative ${styles.bob}`}>
        <span
          aria-hidden="true"
          className="absolute inset-[-45%] rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, ${info.tint} 0%, color-mix(in oklab, ${info.colour} 12%, white) 45%, transparent 70%)` }}
        />
        <BotAvatar id={bot} size={96} bare animate className="overflow-visible!" />
      </div>
      <h1 className="mt-4 text-[28px] leading-9 font-semibold tracking-[-0.02em] text-[var(--tx)]">{info.name}</h1>
      <p className="mt-1 inline-flex items-center gap-1.5 text-[14px] leading-5 text-[var(--tx2)]">
        <span aria-hidden="true" className="size-1.5 rounded-full motion-safe:animate-pulse" style={{ background: info.colour }} />
        {activity.now}
        {activity.working && elapsed && <span className="tabular-nums">· {elapsed}</span>}
      </p>

      {/* What it has on: one light strip. */}
      <a
        href={`/dashboard?story=hq-${now.id}`}
        className="group mt-8 block w-full max-w-[500px] rounded-[16px] bg-white/70 px-4 py-3.5 text-left ring-1 ring-black/[0.06] transition-[background-color,box-shadow] duration-[160ms] hover:bg-white hover:shadow-[0_6px_20px_rgb(0_0_0/0.06)]"
      >
        <span className="flex items-baseline gap-2.5">
          <span className="flex-none text-[12px] text-[var(--tx2)] tabular-nums">hq-{now.id}</span>
          <span className="min-w-0 flex-1 truncate text-[14px] leading-5 font-medium text-[var(--tx)]">{now.title}</span>
          <span className="flex-none text-[12px] text-[var(--tx2)] tabular-nums">{now.progressLabel}</span>
        </span>
        <span aria-hidden="true" className="mt-2.5 block h-[3px] overflow-hidden rounded-full bg-black/[0.06]">
          <span
            className={`block h-full rounded-full transition-[width] duration-500 ${styles.sheen}`}
            style={{ width: `${Math.round(now.progress * 100)}%`, backgroundColor: info.colour }}
          />
        </span>
        <span className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] leading-4 text-[var(--tx2)]">{now.detail}</span>
      </a>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {BOT_ASKS[bot].slice(0, 3).map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onAsk(q)}
            className="h-8 rounded-full bg-white/70 px-3.5 text-[13px] leading-[18px] text-[var(--tx)] ring-1 ring-black/[0.06] transition-colors duration-[120ms] hover:bg-white"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
