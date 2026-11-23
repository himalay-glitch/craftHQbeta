import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { ArrowUp, Paperclip, SquarePen } from "lucide-react";
import type { AskData, Block, BotId, ChatMessage, Turn } from "@/types/ask";
import { answer, pickDesign, SUGGESTIONS } from "./brain";
import { BlockView, type BlockActions } from "./Blocks";
import { BotAvatar } from "./BotAvatar";
import { TEAM, TEAM_ORDER } from "./team";
import styles from "./ask.module.css";

const WORD_MS = 32; // ~30 words a second: quick, but you can see it arrive
const words = (b: Block) => (b.kind === "text" ? b.text.split(" ").length : 0);
const plainText = (blocks: Block[]) =>
  blocks
    .filter((b): b is Extract<Block, { kind: "text" }> => b.kind === "text")
    .map((b) => b.text)
    .join(" ");

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

/** A bot's message: its text streams in word by word; each card appears once the text before it is out. */
function BotMessage({
  message,
  stream,
  actions,
  onTick,
}: {
  message: ChatMessage;
  stream: boolean;
  actions: BlockActions;
  onTick: () => void;
}) {
  const bot = TEAM[message.from as BotId];
  const total = message.blocks.reduce((n, b) => n + words(b), 0);
  const [shown, setShown] = useState(stream ? 0 : total);
  useEffect(() => {
    if (shown >= total) return;
    const t = window.setTimeout(() => setShown((s) => Math.min(total, s + 2)), WORD_MS * 2);
    return () => window.clearTimeout(t);
  }, [shown, total]);
  useEffect(onTick, [shown, onTick]);

  // Where each block's words start in the message, so each knows when it may show.
  const starts = message.blocks.map((_, i) => message.blocks.slice(0, i).reduce((n, b) => n + words(b), 0));
  return (
    <div className={`flex gap-3 ${styles.rise}`}>
      <BotAvatar id={bot.id} size={28} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-[18px]">
          <span className="font-medium text-[var(--tx)]">{bot.name}</span>
          <span className="text-[var(--tx2)]"> · {bot.role}</span>
        </p>
        <div className="mt-1.5 space-y-3">
          {message.blocks.map((b, i) => {
            const start = starts[i];
            if (b.kind === "text") {
              if (shown <= start) return null;
              const visible = b.text.split(" ").slice(0, shown - start).join(" ");
              return (
                <p key={i} className="text-[15px] leading-6 text-pretty text-[var(--tx)]">
                  {visible}
                </p>
              );
            }
            if (shown < start) return null;
            return (
              <div key={i} className={styles.rise}>
                <BlockView block={b} actions={actions} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Thinking({ from }: { from: BotId }) {
  return (
    <div className={`flex items-center gap-3 ${styles.rise}`}>
      <BotAvatar id={from} size={28} />
      <span className="inline-flex h-8 items-center gap-1 rounded-full bg-[#F4F4F5] px-3" aria-label={`${TEAM[from].name} is thinking`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`size-1.5 rounded-full bg-[var(--tx2)] ${styles.dot}`} />
        ))}
      </span>
    </div>
  );
}

/** The empty state: the PM, a greeting and a few things to ask, each tagged with the bot who'd answer. */
function Welcome({ data, onAsk }: { data: AskData; onAsk: (q: string) => void }) {
  const who: BotId[] = ["pm", "pm", "fixer", "designer", "builder", "pm"];
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
      <div className={styles.bob}>
        <BotAvatar id="pm" size={112} />
      </div>
      <h1 className="mt-6 text-[28px] leading-[34px] font-medium tracking-[-0.015em] text-[var(--tx)]">
        Hi {data.firstName}, what’s up?
      </h1>
      <p className="mt-2 max-w-[440px] text-[15px] leading-6 text-pretty text-[var(--tx2)]">
        Ask me anything about {data.project}. I know every story, and I’ll bring in the right bot for anything new.
      </p>
      <div className="mt-8 grid w-full max-w-[600px] grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((q, i) => (
          <button
            key={q}
            type="button"
            onClick={() => onAsk(q)}
            className="flex items-center gap-3 rounded-[14px] border border-[var(--card-line)] bg-white px-3 py-2.5 text-left text-[14px] leading-5 text-[var(--tx)] transition-[transform,box-shadow,border-color] duration-[160ms] hover:-translate-y-0.5 hover:border-[var(--card-line-h)] hover:shadow-[0_6px_16px_rgb(0_0_0/0.06)] motion-reduce:hover:translate-y-0"
          >
            <BotAvatar id={who[i]} size={28} />
            <span className="min-w-0 flex-1 truncate">{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

let seq = 0;
const nextId = () => `m${++seq}`;

/**
 * Ask PM (demo): the one place to ask what's happening. The PM answers from the project's stories, and brings in
 * the Designer, Builder, Checker or Fixer for new work; they reply in the same thread.
 */
export function AskPM({ data }: { data: AskData }) {
  const reduced = useReducedMotion();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState<BotId | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [handedOff, setHandedOff] = useState<Set<BotId>>(new Set());
  const timers = useRef<number[]>([]);
  const field = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // Follow the conversation while you're at the bottom; leave you be if you've scrolled up to read.
  useEffect(() => {
    const onScroll = () => {
      pinned.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const follow = useCallback(() => {
    if (pinned.current) end.current?.scrollIntoView({ block: "end", behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);
  useLayoutEffect(follow, [messages, thinking, follow]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const play = useCallback(
    (turns: Turn[]) => {
      setBusy(true);
      let at = 0;
      turns.forEach((turn, i) => {
        timers.current.push(window.setTimeout(() => setThinking(turn.from), at));
        at += turn.delay;
        timers.current.push(
          window.setTimeout(() => {
            setThinking(null);
            setMessages((m) => [...m, { id: nextId(), from: turn.from, blocks: turn.blocks }]);
            setHandedOff((h) => new Set(h).add(turn.from));
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

  const ask = useCallback(
    (q: string) => {
      const text = q.trim();
      if (!text || busy) return;
      pinned.current = true;
      setMessages((m) => [...m, { id: nextId(), from: "me", blocks: [{ kind: "text", text }] }]);
      setInput("");
      play(answer(text, data));
      field.current?.focus();
    },
    [busy, data, play],
  );

  const actions: BlockActions = {
    onAsk: ask,
    onPickDesign: (id, label) => {
      setMessages((m) => [...m, { id: nextId(), from: "me", blocks: [{ kind: "text", text: `Let’s go with ${id}.` }] }]);
      play(pickDesign(id, label, data));
    },
    handedOff,
    data,
  };

  const reset = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setMessages([]);
    setThinking(null);
    setBusy(false);
    setHandedOff(new Set());
    field.current?.focus();
  };

  // The textarea grows with what you type, up to about six lines.
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      ask(input);
    }
  };

  const lastBot = [...messages].reverse().find((m) => m.from !== "me")?.id;

  return (
    <main id="main" className="flex min-h-[calc(100dvh-var(--bar-h))] flex-col">
      {/* Who's here: the PM on the left, the team on the right. */}
      <header className="sticky top-[var(--bar-h)] z-10 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[760px] items-center gap-3 px-5">
          <BotAvatar id="pm" size={28} />
          <p className="min-w-0 flex-1 truncate text-[14px] leading-5">
            <span className="font-medium text-[var(--tx)]">Ask PM</span>
            <span className="text-[var(--tx2)]"> · {data.project}</span>
          </p>
          <ul className="flex list-none -space-x-1.5" aria-label="Team">
            {TEAM_ORDER.filter((id) => id !== "pm").map((id) => (
              <li key={id} title={`${TEAM[id].name} · ${TEAM[id].now}`}>
                <BotAvatar id={id} size={26} className="ring-2 ring-white" />
                <span className="sr-only">
                  {TEAM[id].name}, {TEAM[id].now}
                </span>
              </li>
            ))}
          </ul>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={reset}
              aria-label="New chat"
              title="New chat"
              className="ml-1 inline-flex size-8 items-center justify-center rounded-full text-[var(--tx2)] transition-colors hover:bg-black/5 hover:text-[var(--tx)]"
            >
              <SquarePen aria-hidden="true" size={16} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-5">
        {messages.length === 0 ? (
          <Welcome data={data} onAsk={ask} />
        ) : (
          <div className="flex-1 space-y-7 pt-4 pb-8">
            {messages.map((m) =>
              m.from === "me" ? (
                <div key={m.id} className={`flex justify-end ${styles.rise}`}>
                  <p className="max-w-[80%] rounded-[20px] bg-[#F2F2F4] px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap text-[var(--tx)]">
                    {(m.blocks[0] as { text: string }).text}
                  </p>
                </div>
              ) : (
                <BotMessage key={m.id} message={m} stream={!reduced && m.id === lastBot} actions={actions} onTick={follow} />
              ),
            )}
            {thinking && <Thinking from={thinking} />}
          </div>
        )}
        {/* Scroll target: its margin keeps the newest message clear of the composer that floats over the bottom. */}
        <div ref={end} className="scroll-mb-40" />

        {/* The composer stays at the bottom, on a white fade so the thread slides under it. */}
        <div className="sticky bottom-0 bg-gradient-to-t from-white from-70% to-transparent pt-6 pb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="rounded-[22px] border border-[var(--card-line)] bg-white px-4 pt-3 pb-2.5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_10px_30px_rgb(0_0_0/0.06)] transition-[border-color,box-shadow] focus-within:border-[var(--ctl)] focus-within:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_34px_rgb(0_0_0/0.09)]"
          >
            <label htmlFor="ask-input" className="sr-only">
              Ask PM
            </label>
            <textarea
              id="ask-input"
              ref={field}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask PM anything…"
              className="block max-h-40 w-full resize-none bg-transparent text-[15px] leading-6 text-[var(--tx)] outline-none placeholder:text-[var(--tx2)]"
            />
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Attach a file (coming soon)"
                title="Attach a file (coming soon)"
                className="-ml-1.5 inline-flex size-8 items-center justify-center rounded-full text-[var(--tx2)] transition-colors hover:bg-black/5 hover:text-[var(--tx)]"
              >
                <Paperclip aria-hidden="true" size={16} strokeWidth={1.75} />
              </button>
              <button
                type="submit"
                aria-label="Send"
                disabled={!input.trim() || busy}
                className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--cta)] text-white transition-[background-color,transform] duration-[120ms] hover:bg-[var(--cta-h)] active:scale-95 disabled:bg-[#E4E4E7] disabled:text-white"
              >
                <ArrowUp aria-hidden="true" size={16} strokeWidth={2.25} />
              </button>
            </div>
          </form>
          <p className="mt-2 text-center text-[12px] leading-4 text-[var(--tx2)]">PM answers from {data.project}’s stories · demo</p>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </main>
  );
}
