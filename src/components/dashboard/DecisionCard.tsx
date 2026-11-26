import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, ArrowUpRight, Check, CircleAlert } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import type { Story } from "@/types/dashboard";
import type { Decision, DecisionOption, Evidence } from "./decisions";
import { NEED_STATUS, storyRef } from "./format";
import { PersonAvatar } from "./PersonAvatar";

// 40 px buttons: the recommended answer is the page's one solid button; the others are quiet outlines.
const BTN = "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] leading-5 font-medium whitespace-nowrap transition-colors duration-[120ms]";
const PRIMARY = `${BTN} bg-[var(--cta)] text-white hover:bg-[var(--cta-h)] active:translate-y-px`;
const SECONDARY = `${BTN} border border-[var(--ctl)] bg-white text-[var(--tx)] hover:border-[var(--ctl-h)] hover:bg-[var(--ctl-bg-h)] active:translate-y-px`;

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
 * One decision: its status and when it changed, the question as the headline, and the story it's about under it,
 * with the evidence (DESIGN.md §2.2). Then the recommended answer as the one solid button, the others quieter, what
 * each does said underneath, and a note box for anything else.
 */
export function DecisionCard({ story, decision, sent, onChoose, onReply, onOpen }: DecisionCardProps) {
  const [hint, setHint] = useState(0);
  const [text, setText] = useState("");
  const qId = `deck-q-${story.id}`;
  const hintId = `deck-hint-${story.id}`;

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

      {/* The answers. */}
      <div className="mt-6 flex flex-wrap items-center gap-2" onMouseLeave={() => setHint(0)}>
        {decision.options.map((o, i) => (
          <button
            key={o.label}
            type="button"
            aria-keyshortcuts={String(i + 1)}
            aria-describedby={hintId}
            onMouseEnter={() => setHint(i)}
            onFocus={() => setHint(i)}
            onClick={() => onChoose(o)}
            className={i === 0 ? PRIMARY : SECONDARY}
          >
            {o.label}
            {o.choice.kind === "open" && <ArrowUpRight aria-hidden="true" size={15} strokeWidth={1.75} />}
          </button>
        ))}
      </div>
      <p id={hintId} className="mt-2 min-h-[18px] text-[13px] leading-[18px] text-[var(--tx2)]">
        {decision.options[hint]?.detail}
      </p>

      {/* Anything else: a note on the story. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) onReply(text.trim());
        }}
        className="mt-4 flex items-center gap-2 rounded-[14px] border border-[var(--card-line)] bg-[#FAFAFA] pr-1.5 pl-3.5 transition-[border-color,background-color] duration-[120ms] focus-within:border-[var(--cta)] focus-within:bg-white"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setText("");
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder={decision.reply.placeholder}
          aria-label="Add a note"
          className="h-11 min-w-0 flex-1 text-[14px] leading-5 text-[var(--tx)] outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Send"
          className="inline-flex size-8 flex-none items-center justify-center rounded-full bg-[var(--ink)] text-white transition-opacity duration-[120ms] disabled:opacity-25"
        >
          <ArrowUp aria-hidden="true" size={16} strokeWidth={2} />
        </button>
      </form>

      {/* What happened, as the card leaves. */}
      {sent !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="absolute -inset-7 z-10 flex flex-col items-center justify-center rounded-[24px] bg-white px-7 text-center"
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
