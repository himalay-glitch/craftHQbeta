import { useEffect, useState } from "react";
import { Bot, LoaderCircle, Plus, Search } from "lucide-react";
import type { Activity, BotId } from "@/types/ask";
import { BotAvatar } from "./BotAvatar";
import { TEAM, TEAM_ORDER } from "./team";
import styles from "./ask.module.css";

/** "now", "4m", "1h 5m": how long a bot has been at it. */
function since(ms: number) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/**
 * The Bots sidebar beside the chat (after the reference's chat-history panel): every bot, what it's on, a spinner
 * and a progress line while it works. It follows the chat, so a handoff shows up here as it happens. Clicking a bot
 * asks the PM what it's doing.
 */
export function BotsSidebar({
  activity,
  onAskAbout,
  onNewChat,
}: {
  activity: Record<BotId, Activity>;
  onAskAbout: (id: BotId) => void;
  onNewChat: () => void;
}) {
  const [query, setQuery] = useState("");
  // Elapsed times only once mounted (the server's clock isn't the browser's), then every 30 s.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  const q = query.trim().toLowerCase();
  const bots = TEAM_ORDER.filter((id) => {
    const b = TEAM[id];
    return !q || `${b.name} ${b.role} ${activity[id].now}`.toLowerCase().includes(q);
  });

  return (
    <aside
      aria-label="Bots"
      className="hidden w-[300px] flex-none flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.05)] ring-1 ring-black/[0.04] xl:flex"
    >
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="text-[17px] leading-6 font-semibold tracking-[-0.01em] text-[var(--tx)]">Bots</h2>
        <a
          href="/bots"
          aria-label="All bots"
          title="All bots"
          className="inline-flex size-8 items-center justify-center rounded-full bg-[#F4F4F5] text-[var(--tx2)] transition-colors hover:bg-[#EAEAEC] hover:text-[var(--tx)]"
        >
          <Bot aria-hidden="true" size={16} strokeWidth={1.75} />
        </a>
      </div>

      <div className="px-5 pt-4">
        <label className="flex h-9 items-center gap-2 rounded-full border border-[var(--card-line)] px-3 transition-colors focus-within:border-[var(--ctl)]">
          <Search aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
          <span className="sr-only">Search the bots</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="min-w-0 flex-1 bg-transparent text-[13px] leading-[18px] text-[var(--tx)] outline-none placeholder:text-[var(--tx2)]"
          />
        </label>
      </div>

      <ul className="mt-3 flex-1 list-none space-y-1 overflow-y-auto px-3 pb-3">
        {bots.map((id) => {
          const bot = TEAM[id];
          const a = activity[id];
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onAskAbout(id)}
                className="flex w-full gap-3 rounded-[16px] px-2.5 py-2.5 text-left transition-colors duration-[120ms] hover:bg-[#F6F6F7]"
              >
                <BotAvatar id={id} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] leading-5 font-medium text-[var(--tx)]">{bot.name}</span>
                    {a.working && now !== null && (
                      <span className="flex-none text-[11px] leading-4 text-[var(--tx2)] tabular-nums">{since(now - a.since)}</span>
                    )}
                  </span>
                  <span className="block truncate text-[12px] leading-4 text-[var(--tx2)]">{bot.role}</span>
                  <span className="mt-1.5 flex items-center gap-1.5 text-[12px] leading-4 text-[var(--tx)]">
                    {a.working ? (
                      <LoaderCircle aria-hidden="true" size={12} strokeWidth={2.25} className="flex-none motion-safe:animate-spin" style={{ color: bot.colour }} />
                    ) : (
                      <span aria-hidden="true" className="mx-[3px] size-1.5 flex-none rounded-full bg-[var(--ctl)]" />
                    )}
                    <span className="truncate">{a.now}</span>
                  </span>
                  {a.working && (
                    <span aria-hidden="true" className="mt-2 block h-1 overflow-hidden rounded-full bg-[#F0F0F2]">
                      <span className={`block h-full w-2/3 rounded-full ${styles.sheen}`} style={{ backgroundColor: bot.colour }} />
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
        {bots.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-[var(--tx2)]">No bot matches “{query}”.</li>}
      </ul>

      <div className="px-4 pt-1 pb-4">
        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--cta)] text-[14px] leading-5 font-medium text-white transition-[background-color,transform] duration-[120ms] hover:bg-[var(--cta-h)] active:translate-y-px"
        >
          <Plus aria-hidden="true" size={16} strokeWidth={2} />
          New chat
        </button>
      </div>
    </aside>
  );
}
