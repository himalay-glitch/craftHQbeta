import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, FileText, ThumbsDown, ThumbsUp } from "lucide-react";
import type { Block, BotId, ChatMessage } from "@/types/ask";
import { BlockView, type BlockActions } from "./Blocks";
import { BotAvatar } from "./BotAvatar";
import { TEAM } from "./team";
import styles from "./ask.module.css";

export const WORD_MS = 32; // ~30 words a second: quick, but you can see it arrive
export const words = (b: Block) => (b.kind === "text" ? b.text.split(" ").length : 0);
export const plainText = (blocks: Block[]) =>
  blocks
    .filter((b): b is Extract<Block, { kind: "text" }> => b.kind === "text")
    .map((b) => b.text)
    .join("\n\n");

const time = (at?: number) => (at ? new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "");

/** Story IDs in a reply ("hq-54") become links to the story. */
function Linked({ text }: { text: string }) {
  const parts = text.split(/(hq-\d+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^hq-\d+$/.test(p) ? (
          <a key={i} href={`/dashboard?story=${p}`} className="font-medium text-[var(--cta)] underline-offset-2 hover:underline">
            {p}
          </a>
        ) : (
          p
        ),
      )}
    </>
  );
}

function FileChips({ files }: { files: { name: string; size: number }[] }) {
  return (
    <ul className="flex list-none flex-wrap justify-end gap-1.5">
      {files.map((f) => (
        <li key={f.name} className="inline-flex max-w-[240px] items-center gap-1.5 rounded-[10px] border border-[var(--card-line)] bg-white px-2.5 py-1.5 text-[12px] leading-4">
          <FileText aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
          <span className="truncate text-[var(--tx)]">{f.name}</span>
          <span className="flex-none text-[var(--tx2)] tabular-nums">{formatSize(f.size)}</span>
        </li>
      ))}
    </ul>
  );
}

export const formatSize = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export function UserMessage({ message }: { message: ChatMessage }) {
  const text = message.blocks[0]?.kind === "text" ? message.blocks[0].text : "";
  return (
    <div className={`flex flex-col items-end gap-1.5 ${styles.rise}`}>
      {message.files && message.files.length > 0 && <FileChips files={message.files} />}
      {text && (
        <p title={time(message.at)} className="max-w-[80%] rounded-[20px] bg-[#F2F2F4] px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap text-[var(--tx)]">
          {text}
        </p>
      )}
    </div>
  );
}

/** Copy, and a quiet thumbs up or down, under a bot's reply (on hover; always on the newest). */
function Actions({ text, always }: { text: string; always: boolean }) {
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);
  const BTN =
    "inline-flex size-7 items-center justify-center rounded-full text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/5 hover:text-[var(--tx)]";
  return (
    <div
      className={`mt-2 -ml-1.5 flex items-center gap-0.5 transition-opacity duration-[120ms] focus-within:opacity-100 ${always ? "opacity-100" : "opacity-0 group-hover/msg:opacity-100"}`}
    >
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy reply"}
        title={copied ? "Copied" : "Copy"}
        className={BTN}
        onClick={() => {
          navigator.clipboard?.writeText(text).then(
            () => setCopied(true),
            () => {},
          );
        }}
      >
        {copied ? <Check aria-hidden="true" size={14} strokeWidth={2} className="text-success" /> : <Copy aria-hidden="true" size={14} strokeWidth={1.75} />}
      </button>
      <button type="button" aria-label="Good reply" aria-pressed={vote === "up"} title="Good reply" className={BTN} onClick={() => setVote(vote === "up" ? null : "up")}>
        <ThumbsUp aria-hidden="true" size={14} strokeWidth={1.75} className={vote === "up" ? "fill-current text-[var(--tx)]" : ""} />
      </button>
      <button type="button" aria-label="Bad reply" aria-pressed={vote === "down"} title="Bad reply" className={BTN} onClick={() => setVote(vote === "down" ? null : "down")}>
        <ThumbsDown aria-hidden="true" size={14} strokeWidth={1.75} className={vote === "down" ? "fill-current text-[var(--tx)]" : ""} />
      </button>
    </div>
  );
}

/** A bot's message: its text streams in word by word; each card appears once the text before it is out. */
export function BotMessage({
  message,
  stream,
  newest,
  actions,
  onTick,
}: {
  message: ChatMessage;
  stream: boolean;
  newest: boolean;
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
  const done = shown >= total;
  return (
    <div className={`group/msg flex gap-3 ${styles.rise}`}>
      <BotAvatar id={bot.id} size={30} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-[18px]">
          <span className="font-medium text-[var(--tx)]">{bot.name}</span>
          <span className="text-[var(--tx2)]">
            {" "}
            · {bot.role}
            {message.at ? ` · ${time(message.at)}` : ""}
          </span>
        </p>
        <div className="mt-1.5 space-y-3">
          {message.blocks.map((b, i) => {
            const start = starts[i];
            if (b.kind === "text") {
              if (shown <= start) return null;
              const visible = b.text.split(" ").slice(0, shown - start).join(" ");
              return (
                <p key={i} className="text-[15px] leading-6 text-pretty text-[var(--tx)]">
                  <Linked text={visible} />
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
        {done && <Actions text={plainText(message.blocks)} always={newest} />}
      </div>
    </div>
  );
}

const DOING: Record<BotId, string> = {
  pm: "is thinking",
  builder: "is on it",
  designer: "is sketching",
  checker: "is checking",
  fixer: "is looking into it",
};

/**
 * Before the PM's next message: the PM, and who's working. While a bot has the job it says so ("Designer is
 * sketching…", with its face); otherwise the PM is thinking.
 */
export function Thinking({ from, wait }: { from: BotId; wait?: BotId }): ReactNode {
  const who = wait ?? from;
  return (
    <div className={`flex items-center gap-3 ${styles.rise}`} role="status">
      <BotAvatar id={from} size={30} />
      <span className="inline-flex h-8 items-center gap-2 rounded-full bg-[#F4F4F5] pr-3.5 pl-3 text-[13px] leading-[18px] text-[var(--tx2)]">
        {wait ? (
          <BotAvatar id={wait} size={18} className="-ml-1" />
        ) : (
          <span className="inline-flex gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`size-1.5 rounded-full bg-[var(--tx2)] ${styles.dot}`} />
            ))}
          </span>
        )}
        {TEAM[who].name} {DOING[who]}…
      </span>
    </div>
  );
}
