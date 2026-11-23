import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowUpRight, MessageCircle, SquarePen } from "lucide-react";
import type { Viewer } from "@/types/dashboard";
import type { Conversation } from "@/types/messages";
import { ICON_BTN } from "@/components/dashboard/classes";
import { storyRef } from "@/components/dashboard/format";
import { SidePanel } from "@/components/dashboard/SidePanel";
import { Tip } from "@/components/dashboard/Tip";
import tokens from "@/components/dashboard/tokens.module.css";
import { useNow } from "@/components/stories/clock";
import { useIsWide } from "@/components/stories/hooks";
import { names, parseText } from "@/components/stories/RichText";
import { ConversationList } from "./ConversationList";
import { OPEN_EVENT, type OpenDetail } from "./events";
import { ConversationView } from "./ConversationView";
import { MessageComposer, saveDraft } from "./MessageComposer";
import { PeoplePicker } from "./PeoplePicker";
import { markSeen, sendMessage, useConversations } from "./store";
import { firstName, nameOf, STORIES, storyTitle, TEAM } from "./team";

type View = { kind: "list" } | { kind: "conversation"; key: string } | { kind: "new" };

const useInBrowser = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

const BACK =
  "-ml-2.5 inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[13px] leading-[18px] font-medium text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/5 hover:text-[var(--tx)]";

/**
 * Messages, in the top bar on every signed-in page: talk to a teammate without leaving what you're doing.
 * The button shows how many messages you haven't seen; it opens a side panel with your conversations, where you
 * read and reply: each story's Team conversation (the story page's Team button opens the same one) and direct
 * ones. People only: the agent never reads them. The page underneath stays usable.
 */
export function Messages({ viewer }: { viewer: Viewer }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });
  // Bumped when a conversation opens with a draft put in from outside, so its box reads it again.
  const [draftEpoch, setDraftEpoch] = useState(0);
  // What opened the panel (the top bar's button, or a story's Team button), for focus to go back to.
  const opener = useRef<HTMLElement | null>(null);
  const conversations = useConversations(viewer.id);
  const unread = conversations.reduce((n, c) => n + c.unread, 0);
  const isWide = useIsWide();
  const inBrowser = useInBrowser();
  const now = useNow(open);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const current: Conversation | null =
    view.kind !== "conversation"
      ? null
      : (conversations.find((c) => c.key === view.key) ?? {
          key: view.key,
          storyId: view.key.startsWith("story:") ? Number(view.key.slice(6)) : undefined,
          with: view.key.startsWith("dm:") ? view.key.slice(3).split("+") : [],
          messages: [],
          unread: 0,
          askedYou: false,
        });
  const seenCount = current?.messages.length ?? 0;

  // Reading a conversation marks it seen, including messages that arrive while it's open.
  useEffect(() => {
    if (open && view.kind === "conversation") markSeen(viewer.id, view.key);
  }, [open, view, seenCount, viewer.id]);

  // Focus follows the view: the title for the list, the reply box in a conversation, the search for a new one.
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      const target =
        view.kind === "conversation"
          ? document.querySelector<HTMLElement>("[data-message-composer]")
          : view.kind === "new"
            ? document.querySelector<HTMLElement>("[data-people-search]")
            : document.getElementById(titleId);
      target?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, view, titleId]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const { key, draft } = (e as CustomEvent<OpenDetail | undefined>).detail ?? {};
      if (key && draft) {
        saveDraft(key, draft);
        setDraftEpoch((n) => n + 1);
      }
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setView(key ? { kind: "conversation", key } : { kind: "list" });
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const close = () => {
    setOpen(false);
    setView({ kind: "list" });
    (opener.current?.isConnected ? opener.current : buttonRef.current)?.focus();
    opener.current = null;
  };

  // Everyone already in the conversation hears it, and anyone tagged joins it. A request waits on the tagged people.
  const send = ({ text, tagged, ask }: { text: string; tagged: string[]; ask: boolean }) => {
    if (!current) return;
    const to = [...new Set([...current.with, ...tagged])].filter((id) => id !== viewer.id);
    if (!to.length) return;
    sendMessage({ from: viewer.id, to, storyId: current.storyId, text: parseText(text, TEAM, STORIES), ask: ask && tagged.length ? { of: tagged } : undefined });
  };

  const back = (
    <button type="button" onClick={() => setView({ kind: "list" })} className={BACK}>
      <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
      Messages
    </button>
  );

  let panel: { title: string; eyebrow: ReactNode; actions?: ReactNode; body: ReactNode; footer?: ReactNode };
  if (current) {
    const story = current.storyId;
    const title = story !== undefined ? (storyTitle(story) ?? storyRef(story)) : names(current.with.map(nameOf));
    // Opened from the story's own page: no link back to where you already are.
    const onStoryPage = story !== undefined && window.location.pathname.replace(/\/$/, "") === `/stories/${storyRef(story)}`;
    panel = {
      title,
      eyebrow: back,
      actions:
        story !== undefined && !onStoryPage ? (
          <Tip label="Open the story">
            <a href={`/stories/${storyRef(story)}`} aria-label={`Open ${storyRef(story)}`} className={ICON_BTN}>
              <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.75} />
            </a>
          </Tip>
        ) : undefined,
      body: (
        <>
          <p className="mt-0.5 mb-0 text-[13px] leading-[18px] text-[var(--tx2)]">
            {story !== undefined
              ? `Team on ${storyRef(story)}${current.with.length ? ` · with ${names(current.with.map(nameOf))}` : ""}`
              : "Direct messages"}
          </p>
          <ConversationView conversation={current} viewerId={viewer.id} now={now} />
        </>
      ),
      footer: (
        <MessageComposer
          key={`${current.key}:${draftEpoch}`}
          conversationKey={current.key}
          label={story !== undefined ? `Message the team about ${storyRef(story)}` : `Message ${current.with.map(firstName).join(" and ")}`}
          people={story !== undefined ? TEAM.filter((p) => p.id !== viewer.id) : undefined}
          recipients={current.with}
          canAsk={story !== undefined}
          onSend={send}
        />
      ),
    };
  } else if (view.kind === "new") {
    panel = {
      title: "New message",
      eyebrow: back,
      body: <PeoplePicker people={TEAM.filter((p) => p.id !== viewer.id)} onPick={(id) => setView({ kind: "conversation", key: `dm:${id}` })} />,
    };
  } else {
    panel = {
      title: "Messages",
      eyebrow: unread ? `${unread} unread` : null,
      actions: (
        <Tip label="New message">
          <button type="button" aria-label="New message" onClick={() => setView({ kind: "new" })} className={ICON_BTN}>
            <SquarePen aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
        </Tip>
      ),
      body: (
        <ConversationList
          conversations={conversations}
          viewerId={viewer.id}
          now={now}
          onOpen={(key) => setView({ kind: "conversation", key })}
          onNew={() => setView({ kind: "new" })}
        />
      ),
    };
  }

  return (
    <>
      <Tip label="Messages" side="bottom">
        <button
          ref={buttonRef}
          type="button"
          aria-label={unread ? `Messages, ${unread} unread` : "Messages"}
          aria-expanded={open}
          onClick={() => (open ? close() : setOpen(true))}
          className={`${ICON_BTN} relative ${open ? "bg-black/5 text-[var(--tx)]" : ""}`}
        >
          <MessageCircle aria-hidden="true" size={18} strokeWidth={1.5} />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ink)] px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2 ring-[var(--bar)]"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </Tip>
      {inBrowser &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div key="messages" className={tokens.tokens}>
                <SidePanel title={panel.title} titleId={titleId} eyebrow={panel.eyebrow} actions={panel.actions} footer={panel.footer} isWide={isWide} onClose={close}>
                  {panel.body}
                </SidePanel>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
