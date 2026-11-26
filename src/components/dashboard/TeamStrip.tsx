import { ChevronRight, Clock, LoaderCircle } from "lucide-react";
import { BotAvatar } from "@/components/ask/BotAvatar";
import { TEAM, TEAM_ORDER } from "@/components/ask/team";
import type { BotId } from "@/types/ask";
import type { RunningItem, Story } from "@/types/dashboard";
import { Indicator } from "./Indicator";
import { storyRef } from "./format";
import styles from "./tokens.module.css";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** What each agent has on, from the dashboard's own data. */
function work(running: RunningItem[], stuck: Story[], waitingOnYou: number): Record<BotId, { line: string; working: boolean }> {
  const building = running.filter((r) => r.status === "In progress");
  const checking = running.filter((r) => r.status === "In review").length;
  return {
    pm: { line: waitingOnYou ? `${waitingOnYou} questions for you` : "Listening", working: false },
    developer: { line: building.length ? `Building ${storyRef(building[building.length - 1].id)}` : "Free", working: building.length > 0 },
    designer: { line: "Free", working: false },
    tester: { line: checking ? `Checking ${checking}` : "Free", working: checking > 0 },
    debugger: { line: stuck.length ? `${plural(stuck.length, "story", "stories")} stuck` : "Nothing broken", working: stuck.length > 0 },
  };
}

/** The face in its ring: a turning arc in the agent's hue while it works (DESIGN.md §8.5), a hairline when idle. */
function Face({ id, working }: { id: BotId; working: boolean }) {
  const hue = TEAM[id].colour;
  return (
    <span className="relative inline-flex size-[64px] items-center justify-center">
      <svg aria-hidden="true" viewBox="0 0 64 64" className="absolute inset-0">
        <circle cx="32" cy="32" r="30.5" fill="none" stroke={working ? `color-mix(in oklab, ${hue} 22%, white)` : "#EDEDED"} strokeWidth="2" />
        {working && (
          <circle
            cx="32"
            cy="32"
            r="30.5"
            fill="none"
            stroke={hue}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="56 136"
            className={`origin-center ${styles.ring}`}
          />
        )}
      </svg>
      <BotAvatar id={id} size={52} />
    </span>
  );
}

interface TeamStripProps {
  running: RunningItem[];
  queued: number;
  loopTick: string;
  stuck: Story[];
  waitingOnYou: number;
  /** The agent whose question is on top of the deck. */
  asking: BotId | null;
  onViewAll: () => void;
}

/**
 * What's moving (DESIGN.md §5.6), as the team itself: five faces in the sidebar's order, each with what it's on and
 * a turning ring while it works. The agent whose question is on the deck says "Asking you", so the deck and the
 * team read as one. Running and Queued keep their numbers and indicators in the header. Each face opens its chat.
 */
export function TeamStrip({ running, queued, loopTick, stuck, waitingOnYou, asking, onViewAll }: TeamStripProps) {
  const now = work(running, stuck, waitingOnYou);
  return (
    <section aria-labelledby="team-title">
      <header className="flex items-center justify-between gap-3">
        <h2 id="team-title" className="text-[14px] leading-5 font-semibold text-[var(--tx)]">
          The team
        </h2>
        <button
          type="button"
          onClick={onViewAll}
          title={`The agents checked in ${loopTick}`}
          className="-mr-2 inline-flex h-8 items-center gap-3 rounded-full px-2 text-[13px] leading-[18px] text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/[0.04] hover:text-[var(--tx)]"
        >
          <span className="inline-flex items-center gap-1.5">
            <Indicator icon={LoaderCircle} tone="active" on={running.length > 0} spin size={20} />
            <span className="text-[var(--tx)] tabular-nums">{running.length}</span> running
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Indicator icon={Clock} tone="neutral" on={queued > 0} size={20} />
            <span className="text-[var(--tx)] tabular-nums">{queued}</span> queued
          </span>
          <ChevronRight aria-hidden="true" size={14} strokeWidth={1.75} />
        </button>
      </header>

      <ul className="-mx-1 mt-2 flex list-none gap-1 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
        {TEAM_ORDER.map((id) => {
          const isAsking = asking === id;
          return (
            <li key={id} className="min-w-[104px] flex-1">
              <a
                href={id === "pm" ? "/ask" : `/ask/${id}`}
                aria-label={`${TEAM[id].name}: ${now[id].line}${isAsking ? ", asking you" : ""}. Open its chat`}
                className={`flex flex-col items-center rounded-[18px] px-2 pt-3 pb-2.5 text-center transition-colors duration-[120ms] ${
                  isAsking ? "bg-[#F3F3F4]" : "hover:bg-[#F8F8F8]"
                }`}
              >
                <Face id={id} working={now[id].working} />
                <span className="mt-2 text-[14px] leading-5 font-medium text-[var(--tx)]">{TEAM[id].name}</span>
                <span className="max-w-full truncate text-[12px] leading-4 text-[var(--tx2)]">{now[id].line}</span>
                <span
                  aria-hidden="true"
                  className={`mt-1.5 inline-flex h-5 items-center rounded-full px-2 text-[11px] leading-4 font-medium transition-opacity duration-150 ${
                    isAsking ? "bg-[var(--ink)] text-white opacity-100" : "opacity-0"
                  }`}
                >
                  Asking you
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
