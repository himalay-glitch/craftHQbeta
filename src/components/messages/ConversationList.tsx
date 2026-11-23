import { CircleDot, SquarePen } from "lucide-react";
import type { Conversation } from "@/types/messages";
import { BTN_SECONDARY } from "@/components/dashboard/classes";
import { storyRef } from "@/components/dashboard/format";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { names } from "@/components/stories/RichText";
import { previewOf } from "./format";
import { firstName, nameOf, personById, storyTitle } from "./team";
import { ago } from "./time";

interface ConversationListProps {
  conversations: Conversation[];
  viewerId: string;
  now: number;
  onOpen: (key: string) => void;
  onNew: () => void;
}

/**
 * Every conversation you're in, the most recent first: who it's with, the story it's about (if any) and the
 * last thing said. Unread ones have a dot and a heavier name.
 */
export function ConversationList({ conversations, viewerId, now, onOpen, onNew }: ConversationListProps) {
  if (!conversations.length) {
    return (
      <div className="pt-10 text-center">
        <p className="m-0 text-[15px] leading-[22px] font-medium text-[var(--tx)]">No messages yet</p>
        <p className="mx-auto mt-1 mb-0 max-w-[300px] text-[14px] leading-5 text-pretty text-[var(--tx2)]">
          Talk to a teammate about a story from its Team button, or write to them here. They’ll see it the next time they open CraftHQ.
        </p>
        <button type="button" onClick={onNew} className={`${BTN_SECONDARY} mt-5`}>
          <SquarePen aria-hidden="true" size={16} strokeWidth={1.75} />
          New message
        </button>
      </div>
    );
  }

  return (
    <ul className="-mx-3 mt-3 mb-0 flex list-none flex-col gap-px p-0">
      {conversations.map((c) => {
        const last = c.messages[c.messages.length - 1];
        const lastOther = [...c.messages].reverse().find((m) => m.from !== viewerId)?.from ?? c.with[0];
        const avatar = personById(lastOther);
        const title = c.storyId !== undefined ? storyTitle(c.storyId) : undefined;
        const who = last.from === viewerId ? "You: " : c.with.length > 1 ? `${firstName(last.from)}: ` : "";
        return (
          <li key={c.key}>
            <button
              type="button"
              onClick={() => onOpen(c.key)}
              className="flex w-full gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-[120ms] hover:bg-[var(--row-h)] focus-visible:bg-[var(--row-h)]"
            >
              <span className="flex size-8 flex-none items-center justify-center">
                <PersonAvatar initials={avatar?.initials ?? "?"} size={28} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-baseline gap-2">
                  <span className={`min-w-0 flex-1 truncate text-[14px] leading-5 text-[var(--tx)] ${c.unread ? "font-semibold" : "font-medium"}`}>
                    {names(c.with.map(c.with.length > 1 ? firstName : nameOf))}
                  </span>
                  {/* Someone asked you for a reply here: it stays marked until you've given one. */}
                  {c.askedYou && <span className="flex-none text-[12px] leading-4 font-medium text-warning-ink">Waiting on you</span>}
                  <span className="flex-none text-[12px] leading-4 text-[var(--tx2)] tabular-nums">{ago(last.at, now)}</span>
                </span>
                {c.storyId !== undefined && (
                  <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[12px] leading-4 text-[var(--tx2)]">
                    <CircleDot aria-hidden="true" size={12} strokeWidth={1.75} className="flex-none" />
                    <span className="truncate">
                      {storyRef(c.storyId)}
                      {title && ` ${title}`}
                    </span>
                  </span>
                )}
                <span className="mt-0.5 flex items-center gap-2">
                  <span className={`min-w-0 flex-1 truncate text-[13px] leading-[18px] ${c.unread ? "text-[var(--tx)]" : "text-[var(--tx2)]"}`}>
                    {who}
                    {previewOf(last.text, last.files?.length ?? 0)}
                  </span>
                  {c.unread > 0 && (
                    <>
                      <span aria-hidden="true" className="size-1.5 flex-none rounded-full bg-[var(--ink)]" />
                      <span className="sr-only">, {c.unread === 1 ? "unread" : `${c.unread} unread`}</span>
                    </>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
