import { useMemo, useSyncExternalStore } from "react";
import type { Conversation, Message } from "@/types/messages";
import type { Segment } from "@/types/stories";
import { parseText } from "@/components/stories/RichText";
import { SAMPLE_VIEWER, sampleReply, seedMessages, STORIES, TEAM } from "./team";

// Front end only: messages between teammates, kept in local storage so they survive a reload and every
// island on the page (the top bar's Messages, a story's chat) reads the same ones. Another tab sees changes
// through the storage event. The CraftHQ API replaces this later, and delivers to the real teammate.

// v2: a story's people talk moved out of its chat into Team, and messages can wait for a reply (`ask`).
const KEY = "crafthq:messages:v2";

/** A teammate's sample reply, waiting to happen: they see the message at `seenAt`, then answer at `replyAt`. */
interface Pending {
  /** The teammate who answers. */
  from: string;
  /** The person who wrote to them. */
  to: string;
  storyId?: number;
  words: string;
  seenAt: number;
  replyAt: number;
}

interface State {
  messages: Message[];
  pending: Pending[];
}

const EMPTY: State = { messages: [], pending: [] };
let cache: State | null = null;
const listeners = new Set<() => void>();
let timer: number | undefined;
let seq = 0;

function load(): State {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (saved && typeof saved === "object" && Array.isArray((saved as State).messages) && Array.isArray((saved as State).pending)) {
      return saved as State;
    }
  } catch {
    // Storage blocked or unreadable: start from the sample messages.
  }
  return { messages: seedMessages(SAMPLE_VIEWER, Date.now()), pending: [] };
}

function read(): State {
  if (!cache) cache = load();
  return cache;
}

function write(next: State) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: messages last until the page closes.
  }
  listeners.forEach((l) => l());
  runTicker();
}

/** Plain words of a message, for matching. */
export const wordsOf = (text: Segment[]) =>
  text.map((seg) => (typeof seg === "string" ? seg : seg.type === "person" ? seg.name : seg.type === "agent" ? "agent" : `hq-${seg.id}`)).join("");

/** Turns due sample replies into messages: first the teammate sees what was sent, then they answer. */
function tick() {
  const s = read();
  if (!s.pending.length) return stopTicker();
  const now = Date.now();
  let messages = s.messages;
  let changed = false;
  const pending: Pending[] = [];
  for (const p of s.pending) {
    if (now >= p.seenAt) {
      messages = messages.map((m) => {
        if (m.from !== p.to || !m.to.includes(p.from) || m.storyId !== p.storyId || m.seen[p.from]) return m;
        changed = true;
        return { ...m, seen: { ...m.seen, [p.from]: p.seenAt } };
      });
    }
    if (now >= p.replyAt) {
      changed = true;
      seq += 1;
      messages = [
        ...messages,
        { id: `m-${p.replyAt}-${seq}`, from: p.from, to: [p.to], storyId: p.storyId, text: parseText(sampleReply(p.words), TEAM, STORIES), at: p.replyAt, seen: {} },
      ];
    } else {
      pending.push(p);
    }
  }
  if (changed || pending.length !== s.pending.length) write({ messages, pending });
}

function runTicker() {
  if (timer !== undefined || !read().pending.length) return;
  timer = window.setInterval(tick, 1000);
}

function stopTicker() {
  window.clearInterval(timer);
  timer = undefined;
}

function onStorage(e: StorageEvent) {
  if (e.key !== KEY) return;
  cache = null;
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  if (!listeners.size) window.addEventListener("storage", onStorage);
  listeners.add(onChange);
  // Replies that fell due while no page was open arrive now.
  window.setTimeout(tick, 0);
  runTicker();
  return () => {
    listeners.delete(onChange);
    if (!listeners.size) {
      window.removeEventListener("storage", onStorage);
      stopTicker();
    }
  };
}

const useStore = () => useSyncExternalStore(subscribe, read, () => EMPTY);

/** Sends a message. The first person it's for (or asked for a reply) reads it a few seconds later and answers
 *  (sample only). */
export function sendMessage(input: Pick<Message, "from" | "to" | "storyId" | "text" | "files" | "ask">) {
  const s = read();
  const now = Date.now();
  seq += 1;
  const message: Message = { id: `m-${now}-${seq}`, ...input, at: now, seen: {} };
  const replier = input.ask?.of[0] ?? input.to.find((id) => id !== input.from);
  let pending = s.pending;
  if (replier && input.from === SAMPLE_VIEWER) {
    // One answer per burst: writing again before they've answered moves their answer back.
    pending = pending.filter((p) => !(p.from === replier && p.to === input.from && p.storyId === input.storyId));
    pending = [...pending, { from: replier, to: input.from, storyId: input.storyId, words: wordsOf(input.text), seenAt: now + 3500, replyAt: now + 9000 }];
  }
  write({ messages: [...s.messages, message], pending });
  return message;
}

/** The conversation a message belongs to, from `viewer`'s side: "story:35", or "dm:" and the other person. */
export function keyOf(m: Pick<Message, "from" | "to" | "storyId">, viewer: string) {
  if (m.storyId !== undefined) return `story:${m.storyId}`;
  return `dm:${[m.from, ...m.to].filter((id) => id !== viewer).sort().join("+")}`;
}

const involves = (m: Message, viewer: string) => m.from === viewer || m.to.includes(viewer);

/** A request still waiting: not withdrawn, and nobody it asked has written in the story's conversation since. */
export function isOpenAsk(m: Message, conversation: Message[]) {
  const ask = m.ask;
  if (!ask || ask.withdrawnAt || m.storyId === undefined) return false;
  return !conversation.some((r) => r.storyId === m.storyId && r.at > m.at && ask.of.includes(r.from));
}

/** The writer takes a request back: the story stops showing that it waits on them. The message stays. */
export function withdrawAsk(id: string) {
  const s = read();
  const now = Date.now();
  write({ ...s, messages: s.messages.map((m) => (m.id === id && m.ask ? { ...m, ask: { ...m.ask, withdrawnAt: now } } : m)) });
}

/** Marks every message to `viewer` in one conversation as seen. */
export function markSeen(viewer: string, key: string) {
  const s = read();
  const now = Date.now();
  let changed = false;
  const messages = s.messages.map((m) => {
    if (!m.to.includes(viewer) || m.seen[viewer] || keyOf(m, viewer) !== key) return m;
    changed = true;
    return { ...m, seen: { ...m.seen, [viewer]: now } };
  });
  if (changed) write({ ...s, messages });
}

export function conversationsFor(messages: Message[], viewer: string): Conversation[] {
  const byKey = new Map<string, Conversation>();
  for (const m of [...messages].sort((a, b) => a.at - b.at)) {
    if (!involves(m, viewer)) continue;
    const key = keyOf(m, viewer);
    const c = byKey.get(key) ?? { key, storyId: m.storyId, with: [], messages: [], unread: 0, askedYou: false };
    for (const id of [m.from, ...m.to]) if (id !== viewer && !c.with.includes(id)) c.with.push(id);
    c.messages.push(m);
    if (m.to.includes(viewer) && !m.seen[viewer]) c.unread += 1;
    byKey.set(key, c);
  }
  for (const c of byKey.values()) c.askedYou = c.messages.some((m) => m.ask?.of.includes(viewer) && isOpenAsk(m, c.messages));
  return [...byKey.values()].sort((a, b) => b.messages[b.messages.length - 1].at - a.messages[a.messages.length - 1].at);
}

/** Every conversation `viewer` is in, the most recent first. */
export function useConversations(viewer: string) {
  const { messages } = useStore();
  return useMemo(() => conversationsFor(messages, viewer), [messages, viewer]);
}

/** Messages about one story that `viewer` wrote or was sent, oldest first. */
export function useStoryMessages(storyId: number, viewer: string) {
  const { messages } = useStore();
  return useMemo(() => messages.filter((m) => m.storyId === storyId && involves(m, viewer)).sort((a, b) => a.at - b.at), [messages, storyId, viewer]);
}
