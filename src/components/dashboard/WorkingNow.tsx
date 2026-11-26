import { ChevronRight, Clock, LoaderCircle } from "lucide-react";
import { BotAvatar } from "@/components/ask/BotAvatar";
import { TEAM } from "@/components/ask/team";
import type { BotId } from "@/types/ask";
import type { RunningItem, Story } from "@/types/dashboard";
import { Indicator } from "./Indicator";
import { storyRef } from "./format";

interface Work {
  id: BotId;
  /** What it's doing, in a few words. */
  line: string;
  stories: { id: number; title: string }[];
  working: boolean;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Each agent and what it has on, from the dashboard's own data; the ones at work first. */
function teamWork(running: RunningItem[], stuck: Story[], waitingOnYou: number): Work[] {
  const building = running.filter((r) => r.status === "In progress");
  const checking = running.filter((r) => r.status === "In review");
  const work: Work[] = [
    {
      id: "developer",
      line: building.length ? `Building ${storyRef(building[building.length - 1].id)}` : "Free",
      stories: [...building].reverse(),
      working: building.length > 0,
    },
    {
      id: "tester",
      line: checking.length ? `Checking ${plural(checking.length, "story", "stories")}` : "Free",
      stories: checking,
      working: checking.length > 0,
    },
    {
      id: "debugger",
      line: stuck.length ? `Watching ${plural(stuck.length, "stuck story", "stuck stories")}` : "Nothing broken",
      stories: stuck,
      working: stuck.length > 0,
    },
    {
      id: "pm",
      line: waitingOnYou ? `Waiting on you for ${waitingOnYou}` : "Listening",
      stories: [],
      working: false,
    },
    { id: "designer", line: "Free", stories: [], working: false },
  ];
  return [...work.filter((w) => w.working), ...work.filter((w) => !w.working)];
}

interface WorkingNowProps {
  running: RunningItem[];
  queued: number;
  loopTick: string;
  stuck: Story[];
  waitingOnYou: number;
  /** "side": the column beside the deck. "board": the whole width, when nothing needs you. */
  layout: "side" | "board";
  onOpenStory: (id: number) => void;
  onViewAll: () => void;
}

const agentHref = (id: BotId) => (id === "pm" ? "/ask" : `/ask/${id}`);

/**
 * Working now (DESIGN.md §5.6): what's moving. Running and Queued keep their numbers and indicators, then each
 * agent and what it's on; an agent opens its own chat. Beside the deck it's a compact list; when nothing needs you
 * it becomes the page: a board of the team at work, with each agent's stories.
 */
export function WorkingNow({ running, queued, loopTick, stuck, waitingOnYou, layout, onOpenStory, onViewAll }: WorkingNowProps) {
  const team = teamWork(running, stuck, waitingOnYou);
  const building = running.filter((r) => r.status === "In progress").length;
  const board = layout === "board";

  const stats = (
    <div className={`grid grid-cols-2 gap-2 ${board ? "sm:w-[360px]" : ""}`}>
      <button
        type="button"
        onClick={onViewAll}
        className="flex flex-col rounded-[12px] bg-[#F7F8F7] px-3 py-2.5 text-left transition-colors duration-[120ms] hover:bg-[#F0F2F0]"
      >
        <span className="flex items-center gap-2 text-[13px] leading-[18px] text-[var(--tx2)]">
          <Indicator icon={LoaderCircle} tone="active" on={running.length > 0} spin size={20} />
          Running
        </span>
        <span className="mt-1.5 text-[28px] leading-8 tracking-[-0.02em] text-[var(--tx)] tabular-nums">{running.length}</span>
        <span className="truncate text-[12px] leading-4 text-[var(--tx2)]">
          {running.length ? `${building} building, ${running.length - building} checking` : "The agents are idle"}
        </span>
      </button>
      <button
        type="button"
        onClick={onViewAll}
        className="flex flex-col rounded-[12px] bg-[#F7F7F8] px-3 py-2.5 text-left transition-colors duration-[120ms] hover:bg-[#F0F0F2]"
      >
        <span className="flex items-center gap-2 text-[13px] leading-[18px] text-[var(--tx2)]">
          <Indicator icon={Clock} tone="neutral" on={queued > 0} size={20} />
          Queued
        </span>
        <span className="mt-1.5 text-[28px] leading-8 tracking-[-0.02em] text-[var(--tx)] tabular-nums">{queued}</span>
        <span className="truncate text-[12px] leading-4 text-[var(--tx2)]">Checked {loopTick}</span>
      </button>
    </div>
  );

  return (
    <section aria-labelledby="working-title" className="rounded-[16px] border border-[var(--card-line)] bg-white p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 id="working-title" className="text-[15px] leading-[22px] font-semibold text-[var(--tx)]">
          Working now
        </h2>
        <button
          type="button"
          onClick={onViewAll}
          className="-mr-1.5 inline-flex h-7 items-center gap-0.5 rounded-full px-2 text-[13px] text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/[0.04] hover:text-[var(--tx)]"
        >
          View all
          <ChevronRight aria-hidden="true" size={14} strokeWidth={1.75} />
        </button>
      </header>

      {stats}

      {board ? (
        <ul className="mt-4 grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {team.map((w) => (
            <li key={w.id} className={`flex flex-col rounded-[14px] border border-[var(--card-line)] p-3.5 ${w.working ? "" : "bg-[#FCFCFC]"}`}>
              <a href={agentHref(w.id)} className="group flex items-center gap-2.5">
                <span className="relative flex-none">
                  <BotAvatar id={w.id} size={40} />
                  {w.working && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-[#22A06B] ring-2 ring-white motion-safe:animate-pulse"
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] leading-5 font-semibold text-[var(--tx)] group-hover:underline">{TEAM[w.id].name}</span>
                  <span className={`block truncate text-[12px] leading-4 ${w.working ? "text-[var(--tx)]" : "text-[var(--tx2)]"}`}>{w.line}</span>
                </span>
              </a>
              {w.stories.length > 0 && (
                <ul className="mt-3 flex list-none flex-col gap-0.5 border-t border-[var(--line)] pt-2">
                  {w.stories.slice(0, 3).map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        data-story={s.id}
                        onClick={() => onOpenStory(s.id)}
                        className="flex w-full items-baseline gap-2 rounded-[6px] px-1.5 py-1 text-left text-[13px] leading-[18px] hover:bg-[var(--row-h)]"
                      >
                        <span className="flex-none text-[12px] text-[var(--tx2)] tabular-nums">{storyRef(s.id)}</span>
                        <span className="truncate text-[var(--tx)]">{s.title}</span>
                      </button>
                    </li>
                  ))}
                  {w.stories.length > 3 && <li className="px-1.5 pt-0.5 text-[12px] leading-4 text-[var(--tx2)]">+{w.stories.length - 3} more</li>}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-3 flex list-none flex-col">
          {team.map((w) => (
            <li key={w.id}>
              <a
                href={agentHref(w.id)}
                aria-label={`${TEAM[w.id].name}: ${w.line}. Open its chat`}
                className="-mx-2 flex items-center gap-3 rounded-[10px] px-2 py-2 transition-colors duration-[120ms] hover:bg-[var(--row-h)]"
              >
                <span className="relative flex-none">
                  <BotAvatar id={w.id} size={30} />
                  {w.working && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-[#22A06B] ring-2 ring-white motion-safe:animate-pulse"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] leading-5 font-medium text-[var(--tx)]">{TEAM[w.id].name}</span>
                  <span className={`block truncate text-[12px] leading-4 ${w.working ? "text-[var(--tx)]/80" : "text-[var(--tx2)]"}`}>{w.line}</span>
                </span>
                {w.stories.length > 0 && (
                  <span className="flex-none rounded-full bg-[#F2F2F3] px-2 py-px text-[12px] leading-4 text-[var(--tx2)] tabular-nums">
                    {w.stories.length}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
