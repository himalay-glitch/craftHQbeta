import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { ArrowUp, AtSign, Mic, Paperclip, Sparkles, SquarePen } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { MENU_CONTENT, MENU_ITEM } from "@/components/dashboard/classes";
import type { Activity, AskData, Block, BotId, ChatMessage, Turn } from "@/types/ask";
import { answer, pickDesign } from "./brain";
import { BlockView, type BlockActions } from "./Blocks";
import { BotAvatar } from "./BotAvatar";
import { BotsSidebar } from "./BotsSidebar";
import { TEAM } from "./team";
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

/** Where the team stands when you arrive (the dashboard's running stories). */
function startingActivity(t: number): Record<BotId, Activity> {
  return {
    pm: { now: "Talking with you", working: false, since: t },
    builder: { now: "Building hq-54", working: true, since: t - 4 * 60000 },
    designer: { now: "Designing hq-23", working: true, since: t - 7 * 60000 },
    checker: { now: "Checking hq-43", working: true, since: t - 60000 },
    fixer: { now: "Retrying hq-21", working: true, since: t },
  };
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
      <BotAvatar id={bot.id} size={30} className="mt-0.5" />
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
      <BotAvatar id={from} size={30} />
      <span className="inline-flex h-8 items-center gap-1 rounded-full bg-[#F4F4F5] px-3" aria-label={`${TEAM[from].name} is thinking`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`size-1.5 rounded-full bg-[var(--tx2)] ${styles.dot}`} />
        ))}
      </span>
    </div>
  );
}

// The welcome's three cards, each fronted by the bot who takes it (the reference's 3D icons).
const STARTERS: { bot: BotId; title: string; text: string; ask: string }[] = [
  { bot: "pm", title: "What’s happening?", text: "A quick read on every story, and what needs you", ask: "What’s happening right now?" },
  { bot: "designer", title: "Design a screen", text: "Three directions to pick from, in minutes", ask: "Design a settings page" },
  { bot: "builder", title: "Build something", text: "Turn an idea into a story and get it started", ask: "Build check-in reminders" },
];
const MORE = ["What merged this week?", "What’s stuck, and why?", "Who’s on the team?"];

/** The empty state: the PM over a soft glow, a greeting, three things to start with. */
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
        <BotAvatar id="pm" size={124} bare className="overflow-visible!" />
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
            <BotAvatar id={s.bot} size={40} bare className="-ml-1" />
            <span className="mt-6 text-[14px] leading-5 font-semibold text-[var(--tx)]">{s.title}</span>
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

let seq = 0;
const nextId = () => `m${++seq}`;

const PILL =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--card-line)] bg-white px-3 text-[13px] leading-[18px] " +
  "text-[var(--tx)] transition-colors duration-[120ms] hover:bg-[#F6F6F7] data-[state=open]:bg-[#F6F6F7]";

/**
 * Ask PM (demo): the one place to ask what's happening. The PM answers from the project's stories and brings in
 * the Designer, Builder, Checker or Fixer for new work; they reply in the same thread, and the Bots sidebar
 * shows each of them at work.
 */
export function AskPM({ data }: { data: AskData }) {
  const reduced = useReducedMotion();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState<BotId | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [handedOff, setHandedOff] = useState<Set<BotId>>(new Set());
  const [activity, setActivity] = useState(() => startingActivity(Date.now()));
  const timers = useRef<number[]>([]);
  const field = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // Follow the conversation while you're at the bottom; leave you be if you've scrolled up to read.
  const onScroll = () => {
    const el = scroller.current;
    if (el) pinned.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
  };
  const follow = useCallback(() => {
    const el = scroller.current;
    if (el && pinned.current) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
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
            const t = Date.now();
            setThinking(null);
            setMessages((m) => [...m, { id: nextId(), from: turn.from, blocks: turn.blocks }]);
            setHandedOff((h) => new Set(h).add(turn.from));
            setAnnounce(`${TEAM[turn.from].name}: ${plainText(turn.blocks)}`);
            // The sidebar follows: whoever was handed work starts on it; whoever replied says where it stands.
            setActivity((a) => {
              const next = { ...a };
              for (const b of turn.blocks) if (b.kind === "handoff") next[b.to] = { now: b.task, working: true, since: t };
              if (turn.status) {
                const prev = a[turn.from];
                next[turn.from] = { ...turn.status, since: turn.status.working && prev.working ? prev.since : t };
              }
              return next;
            });
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

  // Arriving from a bot in the sidebar (/ask?about=builder): ask what it's doing, once, and tidy the URL.
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

  // Adds "@Builder " and puts the cursor after it, once the menu has closed and handed focus back.
  const mention = (id: BotId) => {
    setInput((v) => `${v.trim() ? `${v.trimEnd()} ` : ""}@${TEAM[id].name} `);
    window.setTimeout(() => {
      const el = field.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }, 0);
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
    // A soft wash behind floating panels, after the references: cool at the top left, warm at the bottom right.
    <main
      id="main"
      className="h-[calc(100dvh-var(--bar-h))] p-2 lg:p-4"
      style={{
        background:
          "radial-gradient(60% 55% at 0% 0%, #E9EEFA 0%, transparent 70%), radial-gradient(55% 60% at 100% 100%, #FBE3D6 0%, transparent 72%), #F4F4F6",
      }}
    >
      <div className="mx-auto flex h-full max-w-[1440px] gap-4">
        <section
          aria-label="Ask PM"
          className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-white/85 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.05)] ring-1 ring-black/[0.04] backdrop-blur-xl"
        >
          {messages.length > 0 && (
            <button
              type="button"
              onClick={reset}
              aria-label="New chat"
              title="New chat"
              className="absolute top-3 right-3 z-10 inline-flex size-8 items-center justify-center rounded-full bg-white/80 text-[var(--tx2)] backdrop-blur transition-colors hover:bg-[#F4F4F5] hover:text-[var(--tx)] lg:hidden"
            >
              <SquarePen aria-hidden="true" size={16} strokeWidth={1.75} />
            </button>
          )}

          <div ref={scroller} onScroll={onScroll} className="flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col px-6">
              {messages.length === 0 ? (
                <Welcome data={data} onAsk={ask} />
              ) : (
                <div className="space-y-7 pt-8 pb-6">
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
            </div>
          </div>

          {/* The composer: a prompt line, then the tools and Send (after the reference). */}
          <div className="px-4 pt-2 pb-4 sm:px-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="mx-auto max-w-[720px] rounded-[20px] border border-[var(--card-line)] bg-white p-3 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.05)] transition-[border-color,box-shadow] focus-within:border-[var(--ctl)] focus-within:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.08)]"
            >
              <div className="flex items-start gap-2 px-1">
                <Sparkles aria-hidden="true" size={16} strokeWidth={1.75} className="mt-[5px] flex-none text-[var(--tx2)]" />
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
                  placeholder="Ask PM anything, or give the team something to do…"
                  className="block max-h-40 min-w-0 flex-1 resize-none bg-transparent text-[15px] leading-6 text-[var(--tx)] outline-none placeholder:text-[var(--tx2)]"
                />
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <button type="button" aria-disabled="true" title="Attach a file (coming soon)" className={`${PILL} cursor-default`}>
                  <Paperclip aria-hidden="true" size={14} strokeWidth={1.75} className="text-[var(--tx2)]" />
                  Attach
                </button>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger className={PILL}>
                    <AtSign aria-hidden="true" size={14} strokeWidth={1.75} className="text-[var(--tx2)]" />
                    Mention a bot
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      side="top"
                      align="start"
                      sideOffset={8}
                      className={MENU_CONTENT}
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      {(["builder", "designer", "checker", "fixer"] as BotId[]).map((id) => (
                        <DropdownMenu.Item key={id} className={`${MENU_ITEM} h-11`} onSelect={() => mention(id)}>
                          <BotAvatar id={id} size={26} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] leading-5">{TEAM[id].name}</span>
                            <span className="block text-[12px] leading-4 text-[var(--tx2)]">{TEAM[id].role}</span>
                          </span>
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
                <span className="flex-1" />
                <button
                  type="button"
                  aria-disabled="true"
                  aria-label="Talk to PM (coming soon)"
                  title="Talk to PM (coming soon)"
                  className="inline-flex size-9 cursor-default items-center justify-center rounded-full text-[var(--tx2)] transition-colors hover:bg-[#F4F4F5]"
                >
                  <Mic aria-hidden="true" size={16} strokeWidth={1.75} />
                </button>
                <button
                  type="submit"
                  aria-label="Send"
                  disabled={!input.trim() || busy}
                  className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--cta)] text-white transition-[background-color,transform] duration-[120ms] hover:bg-[var(--cta-h)] active:scale-95 disabled:bg-[#E4E4E7]"
                >
                  <ArrowUp aria-hidden="true" size={17} strokeWidth={2.25} />
                </button>
              </div>
            </form>
            <p className="mt-2 text-center text-[12px] leading-4 text-[var(--tx2)]">PM answers from {data.project}’s stories · demo</p>
          </div>
        </section>

        <BotsSidebar activity={activity} onAskAbout={(id) => ask(`What is ${TEAM[id].name} doing?`)} onNewChat={reset} />
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </main>
  );
}
