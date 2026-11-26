import { Fragment, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, ArrowUpRight, Check } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import type { Story } from "@/types/dashboard";
import type { Decision, DecisionOption } from "./decisions";
import { NEED_STATUS, storyRef } from "./format";

interface DecisionCardProps {
  story: Story;
  decision: Decision;
  /** What happened, said on the card as it leaves. */
  sent: string | null;
  onChoose: (option: DecisionOption) => void;
  onReply: (text: string) => void;
  onOpen: () => void;
}

const ROW = "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-[120ms] outline-none";
const NUM = "w-3 flex-none pt-px text-[13px] leading-5 font-medium tabular-nums";

/**
 * One decision, on a tall card: its status, the question as the headline, the story it's about and the facts in
 * one line (DESIGN.md §2.2). Then the answers as one list, the way Claude asks: three to pick, numbered, the
 * recommended one first, and the fourth, Other, a box to write your own.
 */
export function DecisionCard({ story, decision, sent, onChoose, onReply, onOpen }: DecisionCardProps) {
  const [text, setText] = useState("");
  const qId = `deck-q-${story.id}`;
  const otherKey = decision.options.length + 1;

  return (
    <article aria-labelledby={qId} className="relative">
      <p className="flex min-w-0 items-center gap-2 text-[13px] leading-[18px] text-[var(--tx2)]">
        {story.need && <StatusPill status={NEED_STATUS[story.need]} />}
        {story.updated && <span className="truncate">{story.updated}</span>}
      </p>

      <h3 id={qId} className="mt-4 text-[20px] leading-7 font-semibold tracking-[-0.012em] text-pretty text-[var(--tx)]">
        {decision.question}
      </h3>

      {/* What it's about: the story (opens it), then the facts, in one quiet line. */}
      <p className="mt-2 text-[14px] leading-5 text-[var(--tx2)]">
        <button
          type="button"
          onClick={onOpen}
          className="font-medium text-[var(--tx)] underline decoration-black/20 underline-offset-[3px] transition-colors duration-[120ms] hover:decoration-current"
        >
          {story.title}
        </button>{" "}
        <span className="tabular-nums">{storyRef(story.id)}</span>
        {decision.evidence.map((e) => (
          <Fragment key={e.text}>
            {" · "}
            <span className={e.tone === "negative" ? "text-[#B3261E]" : undefined}>{e.text}</span>
          </Fragment>
        ))}
      </p>

      {/* The answers, as one list: three to pick, the recommended one first, then Other to write your own. */}
      <ul
        aria-label="Your answer"
        className="mt-5 list-none divide-y divide-[var(--line)] overflow-hidden rounded-[16px] border border-[var(--card-line)]"
      >
        {decision.options.map((o, i) => {
          const recommended = i === 0;
          return (
            <li key={o.label}>
              <button
                type="button"
                aria-keyshortcuts={String(i + 1)}
                onClick={() => onChoose(o)}
                className={`${ROW} focus-visible:shadow-[inset_0_0_0_2px_var(--cta)] ${
                  recommended ? "bg-[#F5F8FF] hover:bg-[#EDF3FF]" : "bg-white hover:bg-[var(--row-h)]"
                }`}
              >
                <span aria-hidden="true" className={`${NUM} ${recommended ? "text-[var(--cta)]" : "text-[var(--tx2)]"}`}>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] leading-5 font-medium text-[var(--tx)]">
                    {o.label}
                    {recommended && <span className="ml-2 text-[12px] font-medium text-[#1F57C3]">Recommended</span>}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-[18px] text-[var(--tx2)]">{o.detail}</span>
                </span>
                {o.choice.kind === "open" && (
                  <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.75} className="mt-0.5 flex-none text-[var(--tx2)]" />
                )}
              </button>
            </li>
          );
        })}

        {/* 4: Other, with its own box. Enter sends it as a note on the story. */}
        <li>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) onReply(text.trim());
            }}
            className={`${ROW} items-center py-1.5 pr-1.5 focus-within:shadow-[inset_0_0_0_2px_var(--cta)]`}
          >
            <span aria-hidden="true" className={`${NUM} pt-0 text-[var(--tx2)]`}>
              {otherKey}
            </span>
            <input
              data-deck-other
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setText("");
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder={`Other: ${decision.reply.placeholder.charAt(0).toLowerCase()}${decision.reply.placeholder.slice(1)}`}
              aria-label="Other: write your own answer"
              aria-keyshortcuts={String(otherKey)}
              className="h-9 min-w-0 flex-1 bg-transparent text-[14px] leading-5 text-[var(--tx)] outline-none placeholder:text-[var(--tx2)]"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label="Send"
              className="inline-flex size-8 flex-none items-center justify-center rounded-full bg-[var(--cta)] text-white transition-opacity duration-[120ms] disabled:opacity-0"
            >
              <ArrowUp aria-hidden="true" size={16} strokeWidth={2} />
            </button>
          </form>
        </li>
      </ul>

      {/* What happened, as the card leaves. */}
      {sent !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="absolute -inset-6 z-10 flex flex-col items-center justify-center rounded-[24px] bg-white px-6 text-center"
        >
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#16A34A] text-white">
            <Check aria-hidden="true" size={22} strokeWidth={2.5} />
          </span>
          <p className="mt-3 text-[17px] leading-6 font-semibold text-[var(--tx)]">{sent}</p>
          <p className="mt-0.5 max-w-[80%] truncate text-[13px] leading-[18px] text-[var(--tx2)]">
            {storyRef(story.id)} · {story.title}
          </p>
        </motion.div>
      )}
    </article>
  );
}
