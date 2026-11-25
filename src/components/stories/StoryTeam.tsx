import { useEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Lock, X } from "lucide-react";
import type { Person } from "@/types/dashboard";
import type { Conversation } from "@/types/messages";
import { ICON_BTN } from "@/components/dashboard/classes";
import { storyRef } from "@/components/dashboard/format";
import { Tip } from "@/components/dashboard/Tip";
import { ConversationView } from "@/components/messages/ConversationView";
import { MessageComposer } from "@/components/messages/MessageComposer";
import { markSeen, sendMessage, useConversations } from "@/components/messages/store";
import { firstName, nameOf, STORIES, TEAM } from "@/components/messages/team";
import { useNow } from "./clock";
import { names, parseText } from "./RichText";

/** Ask PM's easing for things arriving (its `.rise`). */
const EASE = [0.2, 0, 0, 1] as const;

interface TeamConversationProps {
  storyId: number;
  viewerId: string;
  /** Bumped when a draft is put in from outside (a nudge, "Write to Esha in Team"), so the box reads it again. */
  draftEpoch: number;
  /** Tighter sides, for the narrow corner card. */
  compact?: boolean;
  className?: string;
  /** Esc in it: back to where you were (Activity, or the sheet closes). */
  onEscape?: () => void;
}

/**
 * The story's Team conversation: who's in it, the messages, and the box. It's the same conversation teammates see in
 * Messages wherever they are, with the same @ tags and "Wait for a reply" requests; people only, the agent never reads
 * it. It sits in the Team tab of the card beside the chat (and of the corner card at 768–1023 px), or in a full
 * screen on phones. Opening it puts you in the box and marks it read.
 */
export function TeamConversation({ storyId, viewerId, draftEpoch, compact = false, className = "", onEscape }: TeamConversationProps) {
  const key = `story:${storyId}`;
  const conversations = useConversations(viewerId);
  const current: Conversation = conversations.find((c) => c.key === key) ?? { key, storyId, with: [], messages: [], unread: 0, askedYou: false };
  const now = useNow(true);
  const box = useRef<HTMLDivElement>(null);
  const count = current.messages.length;

  // Reading it marks it seen, including messages that arrive while it's open.
  useEffect(() => {
    markSeen(viewerId, key);
  }, [viewerId, key, count]);

  // Opening it puts you in the reply box, without the browser scrolling anything to show it.
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("[data-message-composer]")?.focus({ preventScroll: true });
  }, []);

  // Everyone already in the conversation hears it, and anyone tagged joins it. A request waits on the tagged people.
  const send = ({ text, tagged, ask }: { text: string; tagged: string[]; ask: boolean }) => {
    const to = [...new Set([...current.with, ...tagged])].filter((id) => id !== viewerId);
    if (!to.length) return;
    sendMessage({ from: viewerId, to, storyId, text: parseText(text, TEAM, STORIES), ask: ask && tagged.length ? { of: tagged } : undefined });
  };

  const side = compact ? "px-1" : "px-4";
  return (
    <div
      ref={box}
      onKeyDown={(e) => {
        // The @ list takes Esc first (it marks it handled).
        if (e.key !== "Escape" || e.defaultPrevented || !onEscape) return;
        e.stopPropagation();
        onEscape();
      }}
      className={`flex min-h-0 flex-col ${className}`}
    >
      <p className={`m-0 flex-none truncate pt-3 text-[12px] leading-4 text-[var(--tx2)] ${side}`}>
        {current.with.length ? `${storyRef(storyId)} · with ${names(current.with.map(nameOf))}` : `People on ${storyRef(storyId)}`}
      </p>
      {/* `relative` keeps any screen-reader text inside the scroll area, so it can't stretch the page. */}
      <div className={`relative min-h-0 flex-1 overflow-y-auto pb-3 ${side}`}>
        <ConversationView conversation={current} viewerId={viewerId} now={now} />
      </div>
      <div className={`flex-none pt-2 ${compact ? "" : "px-3 pb-3"}`}>
        <MessageComposer
          key={`${key}:${draftEpoch}`}
          conversationKey={key}
          label={`Message the team about ${storyRef(storyId)}`}
          people={TEAM.filter((p) => p.id !== viewerId)}
          recipients={current.with}
          canAsk
          onSend={send}
        />
      </div>
    </div>
  );
}

interface DirectConversationProps {
  person: Person;
  viewerId: string;
  compact?: boolean;
  className?: string;
  /** Back to the story's Team conversation (the arrow, or Esc). */
  onBack: () => void;
}

/**
 * A private word with one person, opened from their face (Shubham, 25 Nov: "talk with a particular member", without
 * threads). It shows in the Team tab, under "← Team", so you stay in the story; it's your one-to-one conversation with
 * them, the same one Messages shows anywhere, so it isn't tied to this story and the others on it don't see it.
 */
export function DirectConversation({ person, viewerId, compact = false, className = "", onBack }: DirectConversationProps) {
  const key = `dm:${person.id}`;
  const conversations = useConversations(viewerId);
  const current: Conversation = conversations.find((c) => c.key === key) ?? { key, with: [person.id], messages: [], unread: 0, askedYou: false };
  const now = useNow(true);
  const box = useRef<HTMLDivElement>(null);
  const count = current.messages.length;

  useEffect(() => {
    markSeen(viewerId, key);
  }, [viewerId, key, count]);

  useEffect(() => {
    box.current?.querySelector<HTMLElement>("[data-message-composer]")?.focus({ preventScroll: true });
  }, []);

  const send = ({ text }: { text: string; tagged: string[]; ask: boolean }) => {
    sendMessage({ from: viewerId, to: [person.id], text: parseText(text, TEAM, STORIES) });
  };

  const side = compact ? "px-1" : "px-4";
  const first = firstName(person.id);
  return (
    <div
      ref={box}
      onKeyDown={(e) => {
        if (e.key !== "Escape" || e.defaultPrevented) return;
        e.stopPropagation();
        onBack();
      }}
      className={`flex min-h-0 flex-col ${className}`}
    >
      <div className={`flex flex-none items-center gap-2 pt-2.5 ${side}`}>
        <button
          type="button"
          onClick={onBack}
          className="-ml-1.5 inline-flex h-7 flex-none items-center gap-1 rounded-full px-1.5 text-[12px] leading-4 font-medium text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/5 hover:text-[var(--tx)]"
        >
          <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.75} />
          Team
        </button>
        <span aria-hidden="true" className="text-[12px] text-[var(--tx2)]">
          ·
        </span>
        <h3 className="m-0 min-w-0 truncate text-[13px] leading-[18px] font-medium text-[var(--tx)]">{person.name}</h3>
        <span className="ml-auto inline-flex flex-none items-center gap-1 text-[12px] leading-4 text-[var(--tx2)]">
          <Lock aria-hidden="true" size={12} strokeWidth={2} />
          Private
        </span>
      </div>
      <p className={`m-0 flex-none pt-1 text-[12px] leading-4 text-[var(--tx2)] ${side}`}>Only you and {first} see this. It’s also in Messages.</p>
      <div className={`relative min-h-0 flex-1 overflow-y-auto pb-3 ${side}`}>
        <ConversationView conversation={current} viewerId={viewerId} now={now} />
      </div>
      <div className={`flex-none pt-2 ${compact ? "" : "px-3 pb-3"}`}>
        <MessageComposer key={key} conversationKey={key} label={`Message ${first} privately`} recipients={[person.id]} onSend={send} />
      </div>
    </div>
  );
}

interface StoryTeamProps {
  /** "Team", or "Esha Nair · Private". */
  title: string;
  onClose: () => void;
  /** The conversation: TeamConversation or DirectConversation. */
  children: ReactNode;
}

/** Phones (under 768 px): Team as a full screen under the top bar, sliding in from the right; × or Esc closes it. */
export function StoryTeam({ title, onClose, children }: StoryTeamProps) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      aria-label={title}
      initial={reduce ? { opacity: 0 } : { x: 48, opacity: 0 }}
      animate={{ x: 0, opacity: 1, transition: { duration: reduce ? 0.15 : 0.3, ease: EASE } }}
      exit={reduce ? { opacity: 0, transition: { duration: 0.15 } } : { x: 48, opacity: 0, transition: { duration: 0.2, ease: EASE } }}
      className="fixed inset-x-0 top-[var(--bar-h)] bottom-0 z-40 flex flex-col bg-white"
    >
      <header className="flex h-14 flex-none items-center gap-2 pr-3 pl-4">
        <h2 className="m-0 min-w-0 flex-1 text-[14px] leading-5 font-medium text-[var(--tx)]">{title}</h2>
        <Tip label="Close Team (Esc)">
          <button type="button" aria-label="Close Team" onClick={onClose} className={ICON_BTN}>
            <X aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
        </Tip>
      </header>
      {children}
    </motion.section>
  );
}
