import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, ArrowUpRight, Check, ChevronRight, CircleAlert } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import type { Story } from "@/types/dashboard";
import type { Decision, DecisionOption, Evidence } from "./decisions";
import { NEED_STATUS, storyRef } from "./format";
import { PersonAvatar } from "./PersonAvatar";

/** Evidence longer than this is a sentence, not a fact, so it isn't put in a chip. */
const CHIP_MAX = 28;

function EvidenceChip({ e }: { e: Evidence }) {
  const tone =
    e.tone === "positive" ? "bg-[#EDF7F1] text-[#1F6B4F]" : e.tone === "negative" ? "bg-[#FDECEC] text-[#B3261E]" : "bg-[#F4F4F5] text-[var(--tx2)]";
  return (
    <li className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] leading-4 ${tone}`}>
      {e.bar ? (
        <span aria-hidden="true" className="flex h-1.5 w-10 overflow-hidden rounded-full bg-black/[0.08]">
          <span className="h-full rounded-full bg-current" style={{ width: `${(e.bar.value / e.bar.total) * 100}%` }} />
        </span>
      ) : e.tone === "positive" ? (
        <Check aria-hidden="true" size={12} strokeWidth={2.5} />
      ) : e.tone === "negative" ? (
        <CircleAlert aria-hidden="true" size={12} strokeWidth={2} />
      ) : null}
      {e.text}
    </li>
  );
}

interface DecisionCardProps {
  story: Story;
  decision: Decision;
  /** What happened, said on the card as it leaves. */
  sent: string | null;
  onChoose: (option: DecisionOption) => void;
  onReply: (text: string) => void;
  onOpen: () => void;
}

/**
 * One decision, on a tall card: its status and when it changed, the question as the headline, and the story it's
 * about under it, with the evidence (DESIGN.md §2.2). Then four answers, one under another, each with its number
 * key: three to pick (the recommended one first, in blue) and Other, a box to write your own.
 */
export function DecisionCard({ story, decision, sent, onChoose, onReply, onOpen }: DecisionCardProps) {
  const [text, setText] = useState("");
  const qId = `deck-q-${story.id}`;

  return (
    <article aria-labelledby={qId} className="relative">
      <p className="flex min-w-0 items-center gap-2 text-[13px] leading-[18px] text-[var(--tx2)]">
        {story.need && <StatusPill status={NEED_STATUS[story.need]} />}
        {story.updated && <span className="truncate">{story.updated}</span>}
      </p>

      <h3 id={qId} className="mt-4 text-[20px] leading-7 font-semibold tracking-[-0.012em] text-pretty text-[var(--tx)]">
        {decision.question}
      </h3>

      {/* What it's about: the story (opens it), then the evidence. */}
      <button
        type="button"
        onClick={onOpen}
        className="group mt-3 flex max-w-full items-center gap-2 text-left text-[14px] leading-5 text-[var(--tx2)]"
      >
        <span className="truncate font-medium text-[var(--tx)] underline-offset-2 group-hover:underline">{story.title}</span>
        <span className="flex-none tabular-nums">{storyRef(story.id)}</span>
        {story.owner && <PersonAvatar initials={story.owner} />}
        <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.75} className="flex-none opacity-60 group-hover:opacity-100" />
      </button>
      {/* Short facts as chips; a sentence of context reads as plain text after them. */}
      <ul className="mt-3 flex list-none flex-wrap items-center gap-x-1.5 gap-y-2">
        {decision.evidence
          .filter((e) => e.text.length <= CHIP_MAX)
          .map((e) => (
            <EvidenceChip key={e.text} e={e} />
          ))}
        {decision.evidence
          .filter((e) => e.text.length > CHIP_MAX)
          .map((e) => (
            <li key={e.text} className="pl-1 text-[13px] leading-[18px] text-[var(--tx2)]">
              {e.text}
            </li>
          ))}
      </ul>

      {/* Four answers, one under another: three to pick, the recommended one first, then Other to write your own. */}
      <ul aria-label="Your answer" className="mt-5 flex list-none flex-col gap-2">
        {decision.options.map((o, i) => {
          const recommended = i === 0;
          return (
            <li key={o.label}>
              <button
                type="button"
                aria-keyshortcuts={String(i + 1)}
                onClick={() => onChoose(o)}
                className={`group flex w-full items-center gap-3 rounded-[14px] border px-3.5 py-3 text-left transition-[background-color,border-color] duration-[120ms] active:translate-y-px ${
                  recommended
                    ? "border-[#BFD3FB] bg-[#F5F8FF] hover:border-[var(--cta)] hover:bg-[#EEF4FF]"
                    : "border-[var(--card-line)] bg-white hover:border-[var(--ctl-h)] hover:bg-[var(--ctl-bg-h)]"
                }`}
              >
                <kbd
                  aria-hidden="true"
                  className={`inline-flex size-6 flex-none items-center justify-center rounded-[7px] font-sans text-[12px] font-medium tabular-nums ${
                    recommended ? "bg-[var(--cta)] text-white" : "bg-[#F1F1F2] text-[var(--tx2)]"
                  }`}
                >
                  {i + 1}
                </kbd>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-[14px] leading-5 font-medium text-[var(--tx)]">{o.label}</span>
                    {recommended && (
                      <span className="rounded-full bg-[#E3ECFD] px-2 py-px text-[11px] leading-4 font-medium text-[#1F57C3]">Recommended</span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-[18px] text-[var(--tx2)]">{o.detail}</span>
                </span>
                {o.choice.kind === "open" ? (
                  <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
                ) : (
                  <ChevronRight
                    aria-hidden="true"
                    size={16}
                    strokeWidth={1.75}
                    className="flex-none text-[var(--tx2)] opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
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
            className="flex items-center gap-3 rounded-[14px] border border-[var(--card-line)] bg-white py-1.5 pr-1.5 pl-3.5 transition-[border-color,box-shadow] duration-[120ms] focus-within:border-[var(--cta)] focus-within:shadow-[0_0_0_3px_rgb(47_111_237/0.12)]"
          >
            <kbd
              aria-hidden="true"
              className="inline-flex size-6 flex-none items-center justify-center rounded-[7px] bg-[#F1F1F2] font-sans text-[12px] font-medium text-[var(--tx2)] tabular-nums"
            >
              {decision.options.length + 1}
            </kbd>
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
              aria-keyshortcuts={String(decision.options.length + 1)}
              className="h-10 min-w-0 flex-1 text-[14px] leading-5 text-[var(--tx)] outline-none placeholder:text-[var(--tx2)]"
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
