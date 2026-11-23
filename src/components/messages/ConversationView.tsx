import { Fragment, useEffect, useRef } from "react";
import { Hourglass } from "lucide-react";
import type { Conversation, Message } from "@/types/messages";
import { storyRef } from "@/components/dashboard/format";
import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import { names, RichText } from "@/components/stories/RichText";
import { receipt } from "./format";
import { isOpenAsk, withdrawAsk } from "./store";
import { firstName, nameOf, personById, STORIES } from "./team";
import { day, stamp } from "./time";

const TEXT = "text-[14px] leading-5 tracking-[-0.15px] whitespace-pre-wrap break-words";
const THEIRS = `w-fit max-w-[85%] rounded-[16px] border border-[var(--card-line)] bg-white px-3.5 py-2 text-[var(--tx)] ${TEXT}`;
const MINE = `w-fit max-w-[85%] rounded-[18px] bg-[var(--ink)] px-3.5 py-2 text-white ${TEXT}`;
/** A new group starts when the sender changes, the day changes, or after five quiet minutes. */
const GAP = 5 * 60_000;

interface ConversationViewProps {
  conversation: Conversation;
  viewerId: string;
  now: number;
}

/**
 * One conversation, oldest first, in the story chat's bubbles: yours dark on the right, theirs white on the
 * left with their name. Under your latest message, whether they've seen it. New messages scroll into view.
 */
export function ConversationView({ conversation, viewerId, now }: ConversationViewProps) {
  const end = useRef<HTMLDivElement>(null);
  const { messages } = conversation;
  const lastMine = [...messages].reverse().find((m) => m.from === viewerId);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (!messages.length) {
    const who = conversation.with.map(firstName).join(" and ");
    return (
      <p className="mt-6 mb-0 text-[14px] leading-5 text-pretty text-[var(--tx2)]">
        {conversation.storyId !== undefined
          ? `Talk about ${storyRef(conversation.storyId)} with your team here. Tag someone with @ and they’re told in Messages, wherever they are in CraftHQ. Only people read this: to tell the agent something, write in the story’s chat.`
          : `Write to ${who}. They’ll see it in Messages the next time they open CraftHQ, and you’ll see here when they’ve read it.`}
      </p>
    );
  }

  return (
    <div role="log" aria-label={`Conversation with ${conversation.with.map(nameOf).join(", ")}`} className="mt-4 flex flex-col gap-1">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const d = day(m.at, now);
        const divider = !prev || d !== day(prev.at, now) ? d : null;
        const head = Boolean(divider) || !prev || prev.from !== m.from || m.at - prev.at > GAP;
        const mine = m.from === viewerId;
        const status = m === lastMine ? receipt(m, viewerId) : null;
        const request = m.ask ? <AskLine m={m} messages={messages} viewerId={viewerId} mine={mine} /> : null;
        const files = m.files?.length ? (
          <p className={`m-0 px-1 text-[12px] leading-4 text-[var(--tx2)] ${mine ? "text-right" : ""}`}>
            {m.files.map((f) => f.name).join(", ")}
          </p>
        ) : null;
        return (
          <Fragment key={m.id}>
            {divider && (
              <p role="separator" className="m-0 pt-3 pb-1 text-center text-[12px] leading-4 font-medium text-[var(--tx2)]">
                {divider}
              </p>
            )}
            {mine ? (
              <div className={`flex flex-col items-end gap-1 pl-10 ${head ? "pt-2" : ""}`}>
                {head && <p className="m-0 px-1 text-[12px] leading-4 text-[var(--tx2)]">{stamp(m.at, now)}</p>}
                {m.text.length > 0 && (
                  <div className={MINE}>
                    <RichText segments={m.text} stories={STORIES} tone="dark" />
                  </div>
                )}
                {files}
                {request}
                {status && <p className="m-0 px-1 text-[12px] leading-4 text-[var(--tx2)]">{status}</p>}
              </div>
            ) : (
              <div className={`flex gap-2.5 pr-10 ${head ? "pt-2" : ""}`}>
                <span className="flex w-7 flex-none justify-center">{head && <PersonAvatar initials={personById(m.from)?.initials ?? "?"} size={28} />}</span>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  {head && (
                    <p className="m-0 flex items-baseline gap-2 px-1 text-[13px] leading-[18px]">
                      <span className="font-semibold text-[var(--tx)]">{nameOf(m.from)}</span>
                      <span className="text-[12px] text-[var(--tx2)]">{stamp(m.at, now)}</span>
                    </p>
                  )}
                  {m.text.length > 0 && (
                    <div className={THEIRS}>
                      <RichText segments={m.text} stories={STORIES} />
                    </div>
                  )}
                  {files}
                  {request}
                </div>
              </div>
            )}
          </Fragment>
        );
      })}
      <div ref={end} />
    </div>
  );
}

/**
 * Under a request ("Wait for a reply"): while it waits, who it waits on, with Withdraw for the writer, or "Waiting
 * on your reply" in attention ink when it's you. Once answered it says nothing more (the reply is right below);
 * withdrawn, it says so.
 */
function AskLine({ m, messages, viewerId, mine }: { m: Message; messages: Message[]; viewerId: string; mine: boolean }) {
  if (!m.ask) return null;
  const line = "m-0 flex items-center gap-1 px-1 text-[12px] leading-4";
  if (m.ask.withdrawnAt) return <p className={`${line} text-[var(--tx2)]`}>Request withdrawn</p>;
  if (!isOpenAsk(m, messages)) return null;
  const icon = <Hourglass aria-hidden="true" size={12} strokeWidth={2} className="flex-none" />;
  if (m.ask.of.includes(viewerId) && !mine) {
    return (
      <p className={`${line} font-medium text-warning-ink`}>
        {icon}
        Waiting on your reply
      </p>
    );
  }
  return (
    <p className={`${line} text-[var(--tx2)]`}>
      {icon}
      Waiting on {names(m.ask.of.map(firstName))}
      {mine && (
        <>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => withdrawAsk(m.id)}
            className="font-medium text-[var(--tx)] underline decoration-black/20 underline-offset-2 hover:decoration-current"
          >
            Withdraw
          </button>
        </>
      )}
    </p>
  );
}
