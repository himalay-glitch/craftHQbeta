import { Fragment, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import type { Story } from "@/types/dashboard";
import type { Decision, DecisionOption } from "./decisions";
import { BTN_PRIMARY } from "./classes";
import { NEED_STATUS, storyRef } from "./format";

interface DecisionCardProps {
  story: Story;
  decision: Decision;
  /** What happened, said on the card as it leaves. */
  sent: string | null;
  /** The chosen answer: an option's index, or Other. */
  choice: Choice;
  onSelect: (choice: Choice) => void;
  /** Sends the chosen option. */
  onChoose: (option: DecisionOption) => void;
  onReply: (text: string) => void;
  onOpen: () => void;
}

export type Choice = number | "other";

const ROW = "flex w-full gap-3 px-4 py-3 text-left transition-colors duration-[120ms]";
// A native radio, drawn: a grey ring, and when chosen a thick blue ring around a white dot.
const RADIO =
  "mt-0.5 size-4 flex-none cursor-pointer appearance-none rounded-full border-[1.5px] border-[#B8B9BD] bg-white outline-none " +
  "transition-[border-width,border-color] duration-[120ms] checked:border-[5px] checked:border-[var(--cta)]";

/**
 * One decision, on a tall card: its status, the question as the headline, the story it's about and the facts in
 * one line (DESIGN.md §2.2). Then the answers as a radio list (§6.2): three to pick, the recommended one first and
 * chosen to start with, and the fourth, Other, a box to write your own; then the one button, which says what
 * sending does ("Try again", "Send note").
 */
export function DecisionCard({ story, decision, sent, choice, onSelect, onChoose, onReply, onOpen }: DecisionCardProps) {
  const [text, setText] = useState("");
  const otherRef = useRef<HTMLInputElement>(null);
  const qId = `deck-q-${story.id}`;
  const group = `deck-a-${story.id}`;
  const otherKey = decision.options.length + 1;
  const chosen = choice === "other" ? null : decision.options[choice];

  return (
    <article aria-labelledby={qId} className="relative">
      <p className="flex min-w-0 items-center gap-2 text-[13px] leading-[18px] text-[var(--tx2)]">
        {story.need && <StatusPill status={NEED_STATUS[story.need]} />}
        {story.updated && <span className="truncate">{story.updated}</span>}
      </p>

      <h3 id={qId} className="mt-4 text-[20px] [@media(max-height:820px)]:mt-3 leading-7 font-semibold tracking-[-0.012em] text-pretty text-[var(--tx)]">
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

      {/* The answers, as one radio list: three to pick, the recommended one first and chosen to start with, then Other
          to write your own. Nothing happens until you send, with the button that says what will happen. */}
      <form
        data-deck-form
        onSubmit={(e) => {
          e.preventDefault();
          if (choice !== "other") onChoose(decision.options[choice]);
          else if (text.trim()) onReply(text.trim());
          else otherRef.current?.focus();
        }}
        onKeyDown={(e) => {
          // Enter on a radio sends the chosen answer.
          if (e.key === "Enter" && (e.target as HTMLInputElement).type === "radio") {
            e.preventDefault();
            e.currentTarget.requestSubmit();
          }
        }}
        className="mt-5 [@media(max-height:820px)]:mt-4"
      >
        <fieldset className="min-w-0 divide-y divide-[var(--line)] overflow-hidden rounded-[16px] border border-[var(--card-line)]">
          <legend className="sr-only">Your answer</legend>
          {decision.options.map((o, i) => {
            const on = choice === i;
            return (
              <label
                key={o.label}
                className={`${ROW} cursor-pointer [@media(max-height:820px)]:py-2.5 has-[:focus-visible]:shadow-[inset_0_0_0_2px_var(--cta)] ${
                  on ? "bg-[#F5F8FF]" : "bg-white hover:bg-[var(--row-h)]"
                }`}
              >
                <input
                  type="radio"
                  name={group}
                  checked={on}
                  onChange={() => onSelect(i)}
                  aria-keyshortcuts={String(i + 1)}
                  className={RADIO}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] leading-5 font-medium text-[var(--tx)]">
                    {o.label}
                    {i === 0 && <span className="ml-2 text-[12px] font-medium text-[#1F57C3]">Recommended</span>}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-[18px] text-[var(--tx2)]">{o.detail}</span>
                </span>
                {o.choice.kind === "open" && (
                  <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.75} className="mt-0.5 flex-none text-[var(--tx2)]" />
                )}
              </label>
            );
          })}

          {/* Other: its radio and its box. Typing in the box chooses it. */}
          <div
            className={`${ROW} items-center py-1.5 has-[:focus-visible]:shadow-[inset_0_0_0_2px_var(--cta)] ${
              choice === "other" ? "bg-[#F5F8FF]" : "bg-white"
            }`}
          >
            <input
              type="radio"
              name={group}
              checked={choice === "other"}
              onChange={() => {
                onSelect("other");
                otherRef.current?.focus();
              }}
              aria-label="Other"
              aria-keyshortcuts={String(otherKey)}
              className={`${RADIO} mt-0`}
            />
            <input
              ref={otherRef}
              data-deck-other
              value={text}
              onFocus={() => onSelect("other")}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setText("");
                  onSelect(0);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder={`Other: ${decision.reply.placeholder.charAt(0).toLowerCase()}${decision.reply.placeholder.slice(1)}`}
              aria-label="Other: write your own answer"
              className="h-9 min-w-0 flex-1 bg-transparent text-[14px] leading-5 text-[var(--tx)] outline-none placeholder:text-[var(--tx2)]"
            />
          </div>
        </fieldset>

        {/* The one button: it says what sending does. */}
        <div className="mt-4 flex justify-end [@media(max-height:820px)]:mt-3">
          <button type="submit" disabled={choice === "other" && !text.trim()} className={`${BTN_PRIMARY} h-10 px-4`}>
            {chosen ? chosen.label : "Send note"}
            {chosen?.choice.kind === "open" && <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2} />}
            <kbd aria-hidden="true" className="hidden font-sans text-white/70 [@media(pointer:fine)]:inline">
              ↵
            </kbd>
          </button>
        </div>
      </form>

      {/* What happened, as the card leaves. */}
      {sent !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="absolute -inset-5 z-10 flex flex-col sm:-inset-6 [@media(min-width:640px)_and_(max-height:820px)]:-inset-5 items-center justify-center rounded-[24px] bg-white px-6 text-center"
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
