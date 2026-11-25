import { Fragment, useEffect, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import type { ChatMessage, SavedChat } from "@/types/ask";

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
 * The panel beside the chat (after the reference's chat-history panel): every past chat with the PM, newest
 * first, grouped by day; click one to open it and carry on. No bots here: the PM is the only one you talk to,
 * and the team works out of sight. New chat sits at the bottom.
 */
export function AskPanel({
  chats,
  currentId,
  onOpenChat,
  onDeleteChat,
  onNewChat,
}: {
  chats: ListedChat[];
  currentId: string | null;
  onOpenChat: (chat: ListedChat) => void;
  onDeleteChat: (chat: ListedChat) => void;
  onNewChat: () => void;
}) {
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
  const shown = chats
    .filter((c) => !q || `${c.title} ${lastLine(c.messages)}`.toLowerCase().includes(q))
    .sort((x, y) => (now === null ? 0 : touched(y, now) - touched(x, now)));

  return (
    <aside
      aria-label="Chats"
      className="hidden w-[300px] flex-none flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.05)] ring-1 ring-black/[0.04] lg:flex xl:w-[320px]"
    >
      <div className="px-4 pt-4">
        <h2 className="px-1 text-[15px] leading-6 font-semibold text-[var(--tx)]">Chats</h2>
        <label className="mt-2 flex h-9 items-center gap-2 rounded-full border border-[var(--card-line)] px-3 transition-colors focus-within:border-[var(--ctl)]">
          <Search aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
          <span className="sr-only">Search chats</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            className="min-w-0 flex-1 bg-transparent text-[13px] leading-[18px] text-[var(--tx)] outline-none placeholder:text-[var(--tx2)]"
          />
        </label>
      </div>

      <ul className="mt-3 flex-1 list-none space-y-0.5 overflow-y-auto px-2 pb-3">
        {shown.map((c, i) => {
          const t = now === null ? 0 : touched(c, now);
          const group = now === null ? "" : dayGroup(t, now);
          const prevGroup = i === 0 || now === null ? "" : dayGroup(touched(shown[i - 1], now), now);
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
                  <span className="flex items-baseline gap-2 pr-6">
                    <span className="min-w-0 flex-1 truncate text-[14px] leading-5 font-medium text-[var(--tx)]">{c.title}</span>
                    <span className="flex-none text-[11px] leading-4 text-[var(--tx2)] tabular-nums transition-opacity group-hover/chat:opacity-0">
                      {now === null ? "" : ago(now - t)}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] leading-4 text-[var(--tx2)]">{lastLine(c.messages)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteChat(c)}
                  aria-label={`Delete “${c.title}”`}
                  title="Delete chat"
                  className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full text-[var(--tx2)] opacity-0 transition-[opacity,background-color] duration-[120ms] group-hover/chat:opacity-100 hover:bg-black/5 hover:text-[var(--red)] focus-visible:opacity-100"
                >
                  <Trash2 aria-hidden="true" size={14} strokeWidth={1.75} />
                </button>
              </li>
            </Fragment>
          );
        })}
        {shown.length === 0 && (
          <li className="px-3 py-6 text-center text-[13px] text-[var(--tx2)]">{q ? `No chat matches “${query}”.` : "Your chats will show up here."}</li>
        )}
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
