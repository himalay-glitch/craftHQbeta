import { useEffect, useState, type ReactNode } from "react";
import { CircleCheck, LoaderCircle, Monitor, Smartphone, TabletSmartphone, Wrench } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import type { Activity, BotId } from "@/types/ask";
import { Wireframe } from "./Blocks";
import { BotAvatar } from "./BotAvatar";
import { BOT_ASKS } from "./brain";
import { TEAM } from "./team";
import styles from "./ask.module.css";

type Worker = Exclude<BotId, "pm">;

/** Seconds since mount, ticking each second; null on the server (its clock isn't the browser's). */
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

const CARD = "w-full max-w-[560px] rounded-[20px] bg-white text-left shadow-[0_1px_2px_rgb(0_0_0/0.04),0_10px_28px_rgb(0_0_0/0.06)] ring-1 ring-black/[0.04]";

/** A workbench's heading: what it's called, and a quiet live marker. */
function BenchHead({ title, live }: { title: string; live: string }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4">
      <h2 className="text-[12px] leading-4 font-medium tracking-[0.04em] text-[var(--tx2)] uppercase">{title}</h2>
      <span className="inline-flex items-center gap-1.5 text-[12px] leading-4 text-[var(--tx2)]">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[#16A34A] motion-safe:animate-pulse" />
        {live}
      </span>
    </div>
  );
}

function StoryLine({ id, title, right }: { id: number; title: string; right: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <a href={`/dashboard?story=hq-${id}`} className="w-12 flex-none text-[13px] text-[var(--tx2)] tabular-nums hover:text-[var(--cta)]">
        hq-{id}
      </a>
      <span className="min-w-0 flex-1 truncate text-[15px] leading-[22px] font-medium text-[var(--tx)]">{title}</span>
      {right}
    </div>
  );
}

function Footer({ children }: { children: ReactNode }) {
  return <p className="mt-4 border-t border-[var(--line)] px-5 py-3 text-[13px] leading-[18px] text-[var(--tx2)]">{children}</p>;
}

// ---------- The four workbenches ----------

/** The Builder: the story on the bench, its build steps ticking over, and what's next. */
function BuilderBench({ elapsed }: { elapsed: string }) {
  const steps = ["Read the story and the screens", "Write the change", "Run the tests", "Open the pull request"];
  const at = 2; // running the tests
  return (
    <section aria-label="On the bench" className={CARD}>
      <BenchHead title="On the bench" live="Building now" />
      <div className="px-5 pt-3">
        <StoryLine id={54} title="Your calendar: see your upcoming plans" right={<StatusPill status="building" elapsed={elapsed} />} />
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F0F0F2]">
          <div className={`h-full w-[62%] rounded-full ${styles.sheen}`} style={{ backgroundColor: TEAM.builder.colour }} />
        </div>
        <ol className="mt-3 grid list-none grid-cols-2 gap-x-4 gap-y-1.5">
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
            </li>
          ))}
        </ol>
      </div>
      <Footer>
        Up next: <span className="text-[var(--tx)]">hq-58 · Dark mode</span>, once you approve its plan
      </Footer>
    </section>
  );
}

/** The Designer: the board for the story it's sketching, two screens drawn and the third coming. */
function DesignerBench({ elapsed }: { elapsed: string }) {
  const colour = TEAM.designer.colour;
  return (
    <section aria-label="On the drawing board" className={CARD}>
      <BenchHead title="On the drawing board" live={`Sketching · ${elapsed}`} />
      <div className="px-5 pt-3">
        <StoryLine id={23} title="Onboarding value slider and language switch" right={<span className="flex-none text-[13px] text-[var(--tx2)] tabular-nums">2 of 3</span>} />
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {(["cards", "list"] as const).map((layout) => (
            <div key={layout} className="rounded-[12px] border border-[var(--card-line)] bg-white p-1.5">
              <Wireframe layout={layout} colour={colour} />
            </div>
          ))}
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-[color-mix(in_oklab,var(--ctl)_80%,white)] bg-[#FBFAFE] text-[12px] text-[var(--tx2)]">
            <LoaderCircle aria-hidden="true" size={16} strokeWidth={2} className="motion-safe:animate-spin" style={{ color: colour }} />
            Sketching…
          </div>
        </div>
      </div>
      <Footer>
        Up next: <span className="text-[var(--tx)]">a settings page</span>, if you want one
      </Footer>
    </section>
  );
}

/** The Checker: the story under test, a live count of checks, and the devices it's running on. */
function CheckerBench() {
  const total = 24;
  const [done, setDone] = useState(17);
  useEffect(() => {
    const id = window.setInterval(() => setDone((n) => (n >= total - 2 ? 17 : n + 1)), 1800);
    return () => window.clearInterval(id);
  }, []);
  const devices: { name: string; icon: typeof Monitor; state: "done" | "now" | "next" }[] = [
    { name: "Web", icon: Monitor, state: "done" },
    { name: "Android", icon: Smartphone, state: "now" },
    { name: "iOS", icon: TabletSmartphone, state: "next" },
  ];
  return (
    <section aria-label="Under the magnifier" className={CARD}>
      <BenchHead title="Under the magnifier" live="Testing now" />
      <div className="px-5 pt-3">
        <StoryLine id={43} title="Creation flow revision" right={<StatusPill status="checking" />} />
        <div className="mt-4 flex items-end gap-4">
          <p className="text-[30px] leading-9 font-medium tracking-[-0.02em] text-[var(--tx)] tabular-nums">
            {done}
            <span className="text-[17px] text-[var(--tx2)]"> / {total} checks</span>
          </p>
          <p className="pb-1 text-[13px] leading-[18px] text-[var(--tx2)]">
            <span className="text-success">{done} passed</span> · 0 failed so far
          </p>
        </div>
        <div className="mt-2.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-[#F0F0F2]">
          <div className="rounded-full bg-success transition-[width] duration-500" style={{ width: `${(done / total) * 100}%` }} />
        </div>
        <ul className="mt-3 flex list-none flex-wrap gap-1.5">
          {devices.map(({ name, icon: Icon, state }) => (
            <li
              key={name}
              className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] leading-4 ${
                state === "done" ? "bg-success-tint text-success-ink" : state === "now" ? "bg-[#E1F7E8] text-[var(--tx)]" : "bg-[#F4F4F5] text-[var(--tx2)]"
              }`}
            >
              <Icon aria-hidden="true" size={13} strokeWidth={1.75} />
              {name}
              {state === "done" && <CircleCheck aria-hidden="true" size={12} strokeWidth={2} />}
              {state === "now" && <LoaderCircle aria-hidden="true" size={12} strokeWidth={2} className="motion-safe:animate-spin" />}
            </li>
          ))}
        </ul>
      </div>
      <Footer>
        Up next: <span className="text-[var(--tx)]">hq-44 · Event Details Page</span>
      </Footer>
    </section>
  );
}

/** The Fixer: what's in the shop, what broke and what it's trying. */
function FixerBench() {
  return (
    <section aria-label="In the repair shop" className={CARD}>
      <BenchHead title="In the repair shop" live="Repairing now" />
      <ul className="mt-3 list-none space-y-3 px-5">
        <li>
          <StoryLine id={21} title="Test story" right={<StatusPill status="failed" />} />
          <p className="mt-1.5 ml-15 flex items-center gap-1.5 text-[13px] leading-[18px] text-[var(--tx2)]">
            <LoaderCircle aria-hidden="true" size={13} strokeWidth={2} className="flex-none motion-safe:animate-spin" style={{ color: TEAM.fixer.colour }} />
            Attempt 2 of 3 · ran out of memory, retrying with more
          </p>
        </li>
        <li>
          <StoryLine id={2} title="Android: change the greeting to Hello from WePop native" right={<StatusPill status="failed" />} />
          <p className="mt-1.5 ml-15 flex items-center gap-1.5 text-[13px] leading-[18px] text-[var(--tx2)]">
            <Wrench aria-hidden="true" size={13} strokeWidth={1.75} className="flex-none" />
            Waiting on an admin · the full check retries at 11:43
          </p>
        </li>
      </ul>
      <Footer>
        Fixed this week: <span className="text-[var(--tx)]">3</span>, each back through the Checker
      </Footer>
    </section>
  );
}

/**
 * A bot's own chat, before you've written: the bot over a glow in its colour, its name and job, what it's doing
 * this minute, its workbench, and the things you'd ask it. No other bots here: this is a one-to-one.
 */
export function BotWelcome({ bot, activity, onAsk }: { bot: Worker; activity: Activity; onAsk: (q: string) => void }) {
  const info = TEAM[bot];
  const now = useClock();
  const elapsed = now === null ? "" : since(now - activity.since);
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
      <div className={`relative ${styles.bob}`}>
        <span
          aria-hidden="true"
          className="absolute inset-[-45%] rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, ${info.tint} 0%, color-mix(in oklab, ${info.colour} 14%, white) 45%, transparent 70%)` }}
        />
        <BotAvatar id={bot} size={108} bare animate className="overflow-visible!" />
      </div>
      <h1 className="mt-4 text-[30px] leading-9 font-semibold tracking-[-0.02em] text-[var(--tx)]">{info.name}</h1>
      <p className="mt-1.5 max-w-[440px] text-[15px] leading-6 text-pretty text-[var(--tx2)]">{info.does}</p>
      <p className="mt-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] leading-[18px] text-[var(--tx)] shadow-[0_0_0_1px_rgb(0_0_0/0.06)]">
        {activity.working ? (
          <LoaderCircle aria-hidden="true" size={13} strokeWidth={2.25} className="motion-safe:animate-spin" style={{ color: info.colour }} />
        ) : (
          <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--ctl)]" />
        )}
        {activity.now}
        {activity.working && elapsed && <span className="text-[var(--tx2)] tabular-nums">· {elapsed}</span>}
      </p>

      <div className="mt-7 flex w-full justify-center">
        {bot === "builder" && <BuilderBench elapsed={elapsed} />}
        {bot === "designer" && <DesignerBench elapsed={elapsed} />}
        {bot === "checker" && <CheckerBench />}
        {bot === "fixer" && <FixerBench />}
      </div>

      <div className="mt-5 flex max-w-[600px] flex-wrap justify-center gap-1.5">
        {BOT_ASKS[bot].map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onAsk(q)}
            className="h-8 rounded-full border border-[var(--card-line)] bg-white px-3 text-[13px] leading-[18px] text-[var(--tx)] transition-colors duration-[120ms] hover:border-[var(--ctl)] hover:bg-[#F6F6F7]"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
