import { Fragment, useEffect, useState } from "react";
import { LoaderCircle, Plus, Search, Trash2 } from "lucide-react";
import type { Activity, BotId, ChatMessage, SavedChat } from "@/types/ask";
import { BotAvatar } from "./BotAvatar";
import { TEAM, TEAM_ORDER } from "./team";
import styles from "./ask.module.css";

/** "now", "4m", "1h 5m": how long a bot has been at it. */
function since(ms: number) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** "just now", "12m ago", "3h ago", "Yesterday", "3 days ago": when a chat was last touched. */
function ago(ms: number) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return h < 48 ? "Yesterday" : `${Math.floor(h / 24)} days ago`;
}

/** The last thing the PM said in a chat, for the line under its title. */
function lastLine(messages: ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.from === "me") continue;
    const text = m.blocks.find((b) => b.kind === "text");
    if (text && text.kind === "text") return text.text;
  }
  return "";
}

/** The bots the PM brought into a chat, in the order it did (older chats: whoever spoke). The PM isn't listed. */
function broughtIn(messages: ChatMessage[]): BotId[] {
  const seen: BotId[] = [];
  const add = (id: BotId) => id !== "pm" && !seen.includes(id) && seen.push(id);
  for (const m of messages) {
    if (m.from !== "me") add(m.from);
    for (const b of m.blocks) if (b.kind === "handoff") add(b.to);
  }
  return seen;
}

/** The story a bot is on ("Building hq-54" → 54), for its Watch link. */
const storyIn = (now: string) => {
  const m = now.match(/hq-(\d+)/);
  return m ? Number(m[1]) : undefined;
};

export type ListedChat = SavedChat & { agoMinutes?: number };

/** When a chat was last touched: stored chats carry a time, the examples an age. */
const touched = (c: ListedChat, now: number) => c.updatedAt || now - (c.agoMinutes ?? 0) * 60000;

/** "Today", "Yesterday" or "Earlier", by the calendar. */
function dayGroup(t: number, now: number) {
  const day = (x: number) => new Date(x).setHours(0, 0, 0, 0);
  const d = Math.round((day(now) - day(t)) / 86400000);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : "Earlier";
}

/**
 * The panel beside the chat (after the reference's chat-history panel), with two tabs. Chats: every past chat,
 * newest first, with the PM and the bots it brought in, and when; click one to open it and carry on. Team: each
 * bot at work, live as the PM hands out work. It's view only: clicking a bot asks the PM what it's doing, and
 * Watch opens the story it's on. New chat sits at the bottom of both.
 */
export function AskPanel({
  chats,
  currentId,
  onOpenChat,
  onDeleteChat,
  activity,
  onAskAbout,
  onNewChat,
  currentBot = "pm",
}: {
  chats: ListedChat[];
  currentId: string | null;
  onOpenChat: (chat: ListedChat) => void;
  onDeleteChat: (chat: ListedChat) => void;
  activity: Record<BotId, Activity>;
  onAskAbout: (id: BotId) => void;
  onNewChat: () => void;
  /** Whose chat is open, so its row in Bots reads as the current one. */
  currentBot?: BotId;
}) {
  const [tab, setTab] = useState<"chats" | "team">("chats");
  const [query, setQuery] = useState("");
  // Times only once mounted (the server's clock isn't the browser's), then every 30 s.
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
  const shownChats = chats
    .filter((c) => !q || `${c.title} ${lastLine(c.messages)}`.toLowerCase().includes(q))
    .sort((x, y) => (now === null ? 0 : touched(y, now) - touched(x, now)));
  const shownBots = TEAM_ORDER.filter((id) => !q || `${TEAM[id].name} ${TEAM[id].role} ${activity[id].now}`.toLowerCase().includes(q));

  const TAB = "h-8 flex-1 rounded-full px-3 text-[13px] leading-[18px] font-medium transition-colors duration-[120ms]";
  return (
    <aside
      aria-label="Chats and team"
      className="hidden w-[300px] flex-none flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.05)] ring-1 ring-black/[0.04] lg:flex xl:w-[320px]"
    >
      <div className="px-4 pt-4">
        <div role="tablist" aria-label="Show" className="flex rounded-full bg-[#F4F4F5] p-1">
          {(["chats", "team"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`${TAB} ${tab === t ? "bg-white text-[var(--tx)] shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-[var(--tx2)] hover:text-[var(--tx)]"}`}
            >
              {t === "chats" ? "Chats" : "Team"}
            </button>
          ))}
        </div>
        <label className="mt-3 flex h-9 items-center gap-2 rounded-full border border-[var(--card-line)] px-3 transition-colors focus-within:border-[var(--ctl)]">
          <Search aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
          <span className="sr-only">{tab === "chats" ? "Search chats" : "Search the team"}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "chats" ? "Search chats…" : "Search the team…"}
            className="min-w-0 flex-1 bg-transparent text-[13px] leading-[18px] text-[var(--tx)] outline-none placeholder:text-[var(--tx2)]"
          />
        </label>
      </div>

      {tab === "chats" ? (
        <ul role="tabpanel" aria-label="Chats" className="mt-3 flex-1 list-none space-y-0.5 overflow-y-auto px-2 pb-3">
          {shownChats.map((c, i) => {
            const bots = broughtIn(c.messages).slice(0, 3);
            const t = now === null ? 0 : touched(c, now);
            const group = now === null ? "" : dayGroup(t, now);
            const prevGroup = i === 0 || now === null ? "" : dayGroup(touched(shownChats[i - 1], now), now);
            const open = c.id === currentId;
            return (
              <Fragment key={c.id}>
                {group && group !== prevGroup && (
                  <li aria-hidden="true" className="px-3 pt-3 pb-1 text-[11px] leading-4 font-medium tracking-[0.02em] text-[var(--tx2)] uppercase first:pt-1">
                    {group}
                  </li>
                )}
                <li className="group/chat relative">
                  <button
                    type="button"
                    onClick={() => onOpenChat(c)}
                    aria-current={open ? "true" : undefined}
                    className={`w-full rounded-[14px] px-3 py-2.5 text-left transition-colors duration-[120ms] ${open ? "bg-[#F1F1F3]" : "hover:bg-[#F6F6F7]"}`}
                  >
                    <span className="block truncate pr-6 text-[14px] leading-5 font-medium text-[var(--tx)]">{c.title}</span>
                    <span className="mt-0.5 block truncate text-[12px] leading-4 text-[var(--tx2)]">{lastLine(c.messages)}</span>
                    <span className="mt-2 flex items-center justify-between">
                      {/* The PM first; the bots it brought in, smaller, behind it. */}
                      <span className="flex items-center">
                        <BotAvatar id="pm" size={22} className="relative z-10 ring-2 ring-white" />
                        <span className="-ml-1 flex -space-x-1">
                          {bots.map((id) => (
                            <BotAvatar key={id} id={id} size={18} className="ring-2 ring-white" />
                          ))}
                        </span>
                      </span>
                      <span className="text-[11px] leading-4 text-[var(--tx2)] tabular-nums">{now === null ? "" : ago(now - t)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteChat(c)}
                    aria-label={`Delete “${c.title}”`}
                    title="Delete chat"
                    className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full text-[var(--tx2)] opacity-0 transition-[opacity,background-color] duration-[120ms] group-hover/chat:opacity-100 hover:bg-black/5 hover:text-[var(--red)] focus-visible:opacity-100"
                  >
                    <Trash2 aria-hidden="true" size={14} strokeWidth={1.75} />
                  </button>
                </li>
              </Fragment>
            );
          })}
          {shownChats.length === 0 && (
            <li className="px-3 py-6 text-center text-[13px] text-[var(--tx2)]">{q ? `No chat matches “${query}”.` : `Your chats${currentBot === "pm" ? "" : ` about the ${TEAM[currentBot].name}`} will show up here.`}</li>
          )}
        </ul>
      ) : (
        <div role="tabpanel" aria-label="Team" className="mt-3 flex min-h-0 flex-1 flex-col">
          <p className="px-5 pb-2 text-[12px] leading-4 text-pretty text-[var(--tx2)]">You talk to the PM. It hands the work to the team, and you can see what each one is on.</p>
          <ul className="flex-1 list-none space-y-1 overflow-y-auto px-3 pb-3">
            {shownBots.map((id) => {
              const bot = TEAM[id];
              const a = activity[id];
              const story = storyIn(a.now);
              return (
                <li key={id} className="group/bot relative">
                  <button
                    type="button"
                    onClick={() => onAskAbout(id)}
                    title={id === "pm" ? undefined : `Open ${bot.name}’s page`}
                    className="flex w-full gap-3 rounded-[16px] px-2.5 py-2.5 text-left transition-colors duration-[120ms] hover:bg-[#F6F6F7]"
                  >
                    {/* Working: a ring in the bot's colour; idle: a grey dot. */}
                    <span className="relative size-10 flex-none self-start">
                      <BotAvatar id={id} size={40} />
                      <span
                        aria-hidden="true"
                        className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-white"
                        style={{ backgroundColor: a.working ? bot.colour : "var(--ctl)" }}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2 pr-12">
                        <span className="truncate text-[14px] leading-5 font-medium text-[var(--tx)]">
                          {bot.name}
                          <span className="font-normal text-[var(--tx2)]"> · {bot.role}</span>
                        </span>
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-[12px] leading-4 text-[var(--tx)]">
                        {a.working ? (
                          <LoaderCircle aria-hidden="true" size={12} strokeWidth={2.25} className="flex-none motion-safe:animate-spin" style={{ color: bot.colour }} />
                        ) : (
                          <span aria-hidden="true" className="mx-[3px] size-1.5 flex-none rounded-full bg-[var(--ctl)]" />
                        )}
                        <span className="truncate">{a.now}</span>
                        {a.working && now !== null && <span className="flex-none text-[11px] text-[var(--tx2)] tabular-nums">· {since(now - a.since)}</span>}
                      </span>
                      {a.working && (
                        <span aria-hidden="true" className="mt-2 block h-1 overflow-hidden rounded-full bg-[#F0F0F2]">
                          <span className={`block h-full w-2/3 rounded-full ${styles.sheen}`} style={{ backgroundColor: bot.colour }} />
                        </span>
                      )}
                      <span className="mt-1.5 block text-[12px] leading-4 text-pretty text-[var(--tx2)]">{bot.does}</span>
                      <span className="mt-1 block text-[12px] leading-4 text-pretty text-[var(--tx2)]">
                        <span className="font-medium">Never:</span> {bot.never.charAt(0).toLowerCase() + bot.never.slice(1)}
                      </span>
                    </span>
                  </button>
                  {story !== undefined && (
                    <a
                      href={`/stories/hq-${story}`}
                      className="absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[12px] leading-4 font-medium text-[var(--cta)] transition-colors hover:bg-[var(--row-h)]"
                    >
                      Watch
                    </a>
                  )}
                </li>
              );
            })}
            {shownBots.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-[var(--tx2)]">No one on the team matches “{query}”.</li>}
          </ul>
        </div>
      )}

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
