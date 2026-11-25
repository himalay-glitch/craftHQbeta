import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, History, SquarePen } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { MENU_CONTENT, MENU_ITEM } from "@/components/dashboard/classes";
import type { AskData, BotId, ChatMessage, Turn } from "@/types/ask";
import { AskPanel, type ListedChat } from "./AskPanel";
import type { BlockActions } from "./Blocks";
import { answer, pickDesign, understands } from "./brain";
import { BotAvatar } from "./BotAvatar";
import { Composer } from "./Composer";
import { deleteChat, newChatId, newMessageId, saveChat, seedChats, titleOf, useSavedChats } from "./history";
import { BotMessage, plainText, Thinking, UserMessage, WORD_MS, words } from "./Message";
import { TEAM } from "./team";
import styles from "./ask.module.css";

const REDUCED = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

// Three things to start with. Everything goes to the PM; who does the work happens out of sight.
const STARTERS: { title: string; text: string; ask: string }[] = [
  { title: "What’s happening?", text: "A quick read on every story, and what needs you", ask: "What’s happening right now?" },
  { title: "Design a screen", text: "Three directions to pick from, in minutes", ask: "Design a settings page" },
  { title: "Build something", text: "Turn an idea into a story and get it started", ask: "Build check-in reminders" },
];
const MORE = ["What merged this week?", "What’s stuck, and why?", "Who’s on the team?"];

/** The empty state, kept calm: the PM over a soft glow, a greeting, three things to start with. */
function Welcome({ data, onAsk }: { data: AskData; onAsk: (q: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
      {/* The glow floats with the PM, inside one layer, so the poster's white melts into it (multiply). */}
      <div className={`relative ${styles.bob}`}>
        <span
          aria-hidden="true"
          className="absolute inset-[-40%] rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, ${TEAM.pm.tint} 0%, rgb(253 226 212 / 0.6) 45%, transparent 70%)` }}
        />
        <BotAvatar id="pm" size={124} bare animate className="overflow-visible!" />
      </div>
      <h1 className="mt-5 text-[34px] leading-10 font-semibold tracking-[-0.025em] text-[var(--tx)]">Hi {data.firstName}, what’s up?</h1>
      <p className="mt-2 text-[15px] leading-6 text-[var(--tx2)]">How can I help with {data.project} today?</p>

      <div className="mt-9 grid w-full max-w-[640px] grid-cols-1 gap-3 sm:grid-cols-3">
        {STARTERS.map((s) => (
          <button
            key={s.title}
            type="button"
            onClick={() => onAsk(s.ask)}
            className="flex flex-col rounded-[18px] bg-white p-4 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04),0_6px_20px_rgb(0_0_0/0.05)] ring-1 ring-black/[0.04] transition-[transform,box-shadow] duration-[160ms] hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgb(0_0_0/0.04),0_12px_28px_rgb(0_0_0/0.08)] motion-reduce:hover:translate-y-0"
          >
            <span className="text-[14px] leading-5 font-semibold text-[var(--tx)]">{s.title}</span>
            <span className="mt-1 text-[13px] leading-[18px] text-pretty text-[var(--tx2)]">{s.text}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {MORE.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onAsk(q)}
            className="h-8 rounded-full px-3 text-[13px] leading-[18px] text-[var(--tx2)] transition-colors hover:bg-white hover:text-[var(--tx)]"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

type Files = { name: string; size: number }[];

/** The PM acknowledging files sent with a message, before the answer itself. */
function filesNote(files: Files): Turn {
  const one = files.length === 1;
  const names = files.map((f) => f.name).join(", ");
  return {
    from: "pm",
    delay: 500,
    blocks: [{ kind: "text", text: `Got ${one ? names : `${files.length} files (${names})`}. I’ll keep ${one ? "it" : "them"} with this chat and attach ${one ? "it" : "them"} to the story.` }],
  };
}

/**
 * Ask PM (demo): the one place to ask what's happening and hand out work. You only talk to the PM, and it's the
 * only bot you see: it answers, gives each job to the right bot out of sight, and tells you what came back. The
 * panel beside the chat keeps every past chat.
 */
export function AskPM({ data }: { data: AskData }) {
  const reduced = useReducedMotion();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // The open chat's id (made when its first message is sent), and the messages that arrived live, which stream in.
  const [chatId, setChatId] = useState<string | null>(null);
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [thinking, setThinking] = useState<{ from: BotId; wait?: BotId } | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [atBottom, setAtBottom] = useState(true);
  const timers = useRef<number[]>([]);
  const field = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const loaded = useRef<ChatMessage[] | null>(null);

  // Follow the conversation while you're at the bottom; leave you be if you've scrolled up to read.
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const bottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
    pinned.current = bottom;
    setAtBottom(bottom);
  };
  const follow = useCallback(() => {
    const el = scroller.current;
    if (el && pinned.current) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);
  useLayoutEffect(follow, [messages, thinking, follow]);
  const toLatest = () => {
    pinned.current = true;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  };

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const play = useCallback(
    (turns: Turn[]) => {
      setBusy(true);
      let at = 0;
      turns.forEach((turn, i) => {
        timers.current.push(window.setTimeout(() => setThinking({ from: turn.from, wait: turn.wait }), at));
        at += turn.delay;
        timers.current.push(
          window.setTimeout(() => {
            const t = Date.now();
            const id = newMessageId();
            setThinking(null);
            setMessages((m) => [...m, { id, from: turn.from, blocks: turn.blocks, at: t }]);
            setLiveIds((l) => new Set(l).add(id));
            setAnnounce(`${TEAM[turn.from].name}: ${plainText(turn.blocks)}`);
            if (i === turns.length - 1) setBusy(false);
          }, at),
        );
        // Let this reply finish streaming before the next bot starts thinking.
        at += reduced ? 300 : Math.min(2400, turn.blocks.reduce((n, b) => n + words(b), 0) * WORD_MS + 500);
      });
    },
    [reduced],
  );

  const send = useCallback(
    (raw: string, files: Files = []) => {
      const text = raw.trim();
      if ((!text && files.length === 0) || busy) return;
      pinned.current = true;
      if (!chatId) setChatId(newChatId());
      setMessages((m) => [
        ...m,
        { id: newMessageId(), from: "me", blocks: [{ kind: "text", text }], at: Date.now(), ...(files.length ? { files } : {}) },
      ]);
      setInput("");
      // With files, a note the script doesn't follow just gets the PM's acknowledgement, not its generic reply.
      const turns = text && (!files.length || understands(text)) ? answer(text, data) : [];
      play(files.length ? [filesNote(files), ...turns] : turns);
      field.current?.focus();
    },
    [busy, chatId, data, play],
  );
  const ask = useCallback((q: string) => send(q), [send]);

  // Arriving from a bot in the sidebar (/ask?about=builder): ask it what it's doing, once, and tidy the URL.
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current) return;
    arrived.current = true;
    const url = new URL(window.location.href);
    const about = url.searchParams.get("about");
    if (!about || !(about in TEAM)) return;
    url.searchParams.delete("about");
    window.history.replaceState(window.history.state, "", url);
    const question = `What is ${TEAM[about as BotId].name} doing?`;
    window.setTimeout(() => ask(question), 0); // after mount, not during it
  }, [ask]);

  const actions: BlockActions = {
    onAsk: ask,
    onPickDesign: (id, label) => {
      setMessages((m) => [...m, { id: newMessageId(), from: "me", blocks: [{ kind: "text", text: `Let’s go with ${id}.` }], at: Date.now() }]);
      play(pickDesign(id, label, data));
    },
    data,
  };

  // Every change to the open chat is saved, so New chat never loses it. Just reopening one doesn't count as a change.
  useEffect(() => {
    if (!chatId || messages.length === 0 || messages === loaded.current) return;
    saveChat({ id: chatId, title: titleOf(messages), updatedAt: Date.now(), messages });
  }, [chatId, messages]);

  const saved = useSavedChats();
  const seeds = useMemo(() => seedChats(data), [data]);
  const chats: ListedChat[] = [...saved.filter((c) => !c.deleted), ...seeds.filter((s) => !saved.some((c) => c.id === s.id))];

  /** Stops the bots mid-answer: nothing more arrives for this question. */
  const stop = () => {
    const wasBusy = busy;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setThinking(null);
    setBusy(false);
    if (wasBusy) setAnnounce("Stopped.");
  };

  const reset = () => {
    stop();
    loaded.current = null;
    setMessages([]);
    setChatId(null);
    setLiveIds(new Set());
    field.current?.focus();
  };

  // Reopen a past chat as it was (no streaming), ready to carry on.
  const openChat = (chat: ListedChat) => {
    stop();
    loaded.current = chat.messages;
    pinned.current = true;
    setMessages(chat.messages);
    setChatId(chat.id);
    setLiveIds(new Set());
  };

  const removeChat = (chat: ListedChat) => {
    deleteChat(chat.id);
    if (chat.id === chatId) reset();
  };

  const lastBot = [...messages].reverse().find((m) => m.from !== "me")?.id;
  const title = messages.length ? titleOf(messages) : "";

  return (
    // A soft wash behind floating panels, after the references: cool at the top left, warm at the bottom right.
    <main
      id="main"
      className="h-[calc(100dvh-var(--bar-h))] p-2 lg:p-4"
      style={{
        background:
          "radial-gradient(60% 55% at 0% 0%, #E9EEFA 0%, transparent 70%), radial-gradient(55% 60% at 100% 100%, #FBE3D6 0%, transparent 72%), #F4F4F6",
      }}
    >
      {/* Fills the screen at any desktop width; the conversation itself stays a readable column. */}
      <div className="flex h-full gap-4">
        <section
          aria-label="Ask PM"
          className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-white/85 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.05)] ring-1 ring-black/[0.04] backdrop-blur-xl"
        >
          {/* Which chat this is. On narrow screens, where the panel is hidden, past chats and New chat live here. */}
          {(messages.length > 0 || chats.length > 0) && (
            <div className={`flex h-12 flex-none items-center gap-2 px-5 ${messages.length ? "" : "lg:hidden"}`}>
              <p className="min-w-0 flex-1 truncate text-[14px] leading-5 font-medium text-[var(--tx)]" title={title}>
                {title}
              </p>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger
                  aria-label="Past chats"
                  title="Past chats"
                  className="inline-flex size-8 items-center justify-center rounded-full text-[var(--tx2)] transition-colors hover:bg-[#F4F4F5] hover:text-[var(--tx)] lg:hidden"
                >
                  <History aria-hidden="true" size={16} strokeWidth={1.75} />
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content align="end" sideOffset={6} className={`${MENU_CONTENT} w-72`}>
                    {chats.slice(0, 12).map((c) => (
                      <DropdownMenu.Item key={c.id} className={`${MENU_ITEM} h-10`} onSelect={() => openChat(c)}>
                        <span className="truncate">{c.title}</span>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={reset}
                  aria-label="New chat"
                  title="New chat"
                  className="inline-flex size-8 items-center justify-center rounded-full text-[var(--tx2)] transition-colors hover:bg-[#F4F4F5] hover:text-[var(--tx)] lg:hidden"
                >
                  <SquarePen aria-hidden="true" size={16} strokeWidth={1.75} />
                </button>
              )}
            </div>
          )}

          <div className="relative min-h-0 flex-1">
            <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto">
              <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col px-6">
                {messages.length === 0 ? (
                  <Welcome data={data} onAsk={ask} />
                ) : (
                  <div className="space-y-7 pt-3 pb-6">
                    {messages.map((m) =>
                      m.from === "me" ? (
                        <UserMessage key={m.id} message={m} />
                      ) : (
                        <BotMessage
                          key={m.id}
                          message={m}
                          stream={!reduced && m.id === lastBot && liveIds.has(m.id)}
                          newest={m.id === lastBot}
                          actions={actions}
                          onTick={follow}
                        />
                      ),
                    )}
                    {thinking && <Thinking from={thinking.from} wait={thinking.wait} />}
                  </div>
                )}
              </div>
            </div>
            {!atBottom && messages.length > 0 && (
              <button
                type="button"
                onClick={toLatest}
                className={`absolute bottom-3 left-1/2 inline-flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] leading-[18px] text-[var(--tx)] shadow-[0_2px_8px_rgb(0_0_0/0.12),0_0_0_1px_rgb(0_0_0/0.05)] transition-colors hover:bg-[#F6F6F7] ${styles.rise}`}
              >
                <ArrowDown aria-hidden="true" size={14} strokeWidth={2} />
                Latest
              </button>
            )}
          </div>

          <div className="px-4 pt-2 pb-4 sm:px-6">
            <Composer value={input} onChange={setInput} onSend={send} onStop={stop} busy={busy} fieldRef={field} />
            <p className="mt-2 text-center text-[12px] leading-4 text-[var(--tx2)]">PM answers from {data.project}’s stories and hands the work to the team · demo</p>
          </div>
        </section>

        <AskPanel
          chats={chats}
          currentId={chatId}
          onOpenChat={openChat}
          onDeleteChat={removeChat}
          onNewChat={reset}
        />
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </main>
  );
}
