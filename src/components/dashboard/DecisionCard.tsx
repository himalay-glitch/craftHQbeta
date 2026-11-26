import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, CircleAlert, CornerDownLeft, PenLine } from "lucide-react";
import { BotAvatar } from "@/components/ask/BotAvatar";
import { TEAM } from "@/components/ask/team";
import { StatusPill } from "@/components/ui/StatusPill";
import type { Story } from "@/types/dashboard";
import { BTN_PRIMARY, BTN_SECONDARY } from "./classes";
import { OTHER, type Decision, type DecisionOption, type EvidenceTone } from "./decisions";
import { NEED_STATUS, storyRef } from "./format";
import { PersonAvatar } from "./PersonAvatar";

const EVIDENCE: Record<EvidenceTone, string> = {
  positive: "text-[#1F6B4F]",
  negative: "text-[#B3261E]",
  neutral: "text-[var(--tx2)]",
};

/** The open text box under the answers: what it's for, the text so far, and the option it belongs to. */
export interface Writing {
  option: DecisionOption;
  text: string;
}

interface DecisionCardProps {
  story: Story;
  decision: Decision;
  writing: Writing | null;
  /** Set while the card says what you chose, just before it leaves. */
  leaving: string | null;
  onChoose: (option: DecisionOption) => void;
  onWrite: (text: string) => void;
  onSend: () => void;
  onCancelWrite: () => void;
  onOpen: () => void;
}

/**
 * One decision on the Needs you deck. The agent whose question it is asks it in its own colour, with the evidence
 * under it (DESIGN.md §2.2, evidence before approval); then the answers, recommended first, each with its number
 * key; then Other… to write your own. Answers that need words open a text box on the card.
 */
export function DecisionCard({ story, decision, writing, leaving, onChoose, onWrite, onSend, onCancelWrite, onOpen }: DecisionCardProps) {
  const reduced = useReducedMotion();
  const agent = TEAM[decision.agent];
  const options = [...decision.options, OTHER];
  const box = useRef<HTMLTextAreaElement>(null);
  const titleId = `deck-title-${story.id}`;

  useEffect(() => {
    if (writing) box.current?.focus();
  }, [writing]);

  return (
    <article aria-labelledby={titleId} className="relative flex flex-col">
      {/* What it is: its status, ID, owner and last change; Open goes to the whole story. */}
      <header className="flex min-w-0 items-center gap-2 text-[13px] leading-[18px] text-[var(--tx2)]">
        {story.need && <StatusPill status={NEED_STATUS[story.need]} />}
        <span className="tabular-nums">{storyRef(story.id)}</span>
        {story.owner && <PersonAvatar initials={story.owner} />}
        {story.updated && <span className="truncate">· {story.updated}</span>}
        <button
          type="button"
          onClick={onOpen}
          className="-mr-2 ml-auto inline-flex h-7 flex-none items-center gap-1 rounded-full px-2.5 text-[13px] text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/[0.04] hover:text-[var(--tx)]"
        >
          Open
          <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.75} />
        </button>
      </header>

      <h3 id={titleId} className="mt-3 text-[20px] leading-7 font-semibold tracking-[-0.012em] text-pretty text-[var(--tx)]">
        {story.title}
      </h3>

      {/* The agent's question, in its colour. */}
      <div className="mt-4 flex gap-3 rounded-[14px] px-3.5 py-3" style={{ background: agent.tint }}>
        <BotAvatar id={decision.agent} size={32} className="mt-0.5" />
        <div className="min-w-0">
          <p className="text-[13px] leading-[18px]">
            <span className="font-semibold text-[var(--tx)]">{agent.name}</span>{" "}
            <span className="text-[var(--tx)]/70">{decision.asks}</span>
          </p>
          <p className="mt-1 text-[15px] leading-[22px] text-pretty text-[var(--tx)]">{decision.question}</p>
          {decision.evidence.length > 0 && (
            <ul className="mt-2 flex list-none flex-wrap gap-x-3 gap-y-1 text-[13px] leading-[18px]">
              {decision.evidence.map((e) => (
                <li key={e.text} className={`inline-flex items-center gap-1 ${EVIDENCE[e.tone]}`}>
                  {e.tone === "positive" && <Check aria-hidden="true" size={13} strokeWidth={2.25} />}
                  {e.tone === "negative" && <CircleAlert aria-hidden="true" size={13} strokeWidth={2} />}
                  {e.tone === "neutral" && <span aria-hidden="true" className="size-1 rounded-full bg-current opacity-60" />}
                  {e.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* The answers: recommended first, number keys 1–4, Other last. */}
      <ul aria-label="Your answer" className="mt-4 flex list-none flex-col gap-1.5">
        {options.map((o, i) => {
          const recommended = i === 0;
          const chosen = writing?.option.label === o.label;
          return (
            <li key={o.label}>
              <button
                type="button"
                aria-keyshortcuts={String(i + 1)}
                aria-expanded={o.choice.kind === "write" ? chosen : undefined}
                onClick={() => onChoose(o)}
                className={`group flex w-full items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-[background-color,border-color] duration-[120ms] ${
                  chosen
                    ? "border-[var(--cta)] bg-[#F3F7FF]"
                    : recommended
                      ? "border-[#C9D9FB] bg-[#F7FAFF] hover:border-[var(--cta)] hover:bg-[#F0F5FF]"
                      : "border-[var(--card-line)] hover:border-[var(--ctl-h)] hover:bg-[var(--ctl-bg-h)]"
                }`}
              >
                <kbd
                  aria-hidden="true"
                  className={`inline-flex size-6 flex-none items-center justify-center rounded-[7px] border font-sans text-[12px] tabular-nums ${
                    recommended || chosen ? "border-[#C9D9FB] bg-white text-[#1F57C3]" : "border-[var(--card-line)] bg-white text-[var(--tx2)]"
                  }`}
                >
                  {i + 1}
                </kbd>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[14px] leading-5 font-medium text-[var(--tx)]">{o.label}</span>
                    {recommended && (
                      <span className="rounded-full bg-[#E3ECFD] px-2 py-px text-[11px] leading-4 font-medium text-[#1F57C3]">
                        Recommended
                      </span>
                    )}
                  </span>
                  <span className="mt-px block text-[13px] leading-[18px] text-[var(--tx2)]">{o.detail}</span>
                </span>
                {o.choice.kind === "write" ? (
                  <PenLine aria-hidden="true" size={15} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
                ) : o.choice.kind === "open" ? (
                  <ArrowUpRight aria-hidden="true" size={15} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
                ) : (
                  <CornerDownLeft
                    aria-hidden="true"
                    size={15}
                    strokeWidth={1.75}
                    className="flex-none text-[var(--tx2)] opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Words for an answer that needs them (Ask for changes, Answer it, Other…). */}
      {writing && (
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
          className="mt-3 rounded-[12px] border border-[var(--cta)] bg-white p-3 focus-within:shadow-[0_0_0_3px_rgb(47_111_237/0.12)]"
        >
          <label htmlFor={`deck-write-${story.id}`} className="text-[13px] leading-[18px] font-medium text-[var(--tx)]">
            {writing.option.label === OTHER.label ? "Your answer" : writing.option.label}
          </label>
          <textarea
            ref={box}
            id={`deck-write-${story.id}`}
            rows={2}
            value={writing.text}
            placeholder={writing.option.choice.kind === "write" ? writing.option.choice.placeholder : ""}
            onChange={(e) => onWrite(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (writing.text.trim()) onSend();
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                onCancelWrite();
              }
            }}
            className="mt-1 block w-full resize-none text-[14px] leading-5 text-[var(--tx)] outline-none"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <span className="mr-auto text-[12px] text-[var(--tx2)]">⌘↵ to send · Esc to cancel</span>
            <button type="button" onClick={onCancelWrite} className={BTN_SECONDARY}>
              Cancel
            </button>
            <button type="button" onClick={onSend} disabled={!writing.text.trim()} className={BTN_PRIMARY}>
              Send
            </button>
          </div>
        </motion.div>
      )}

      {/* What you chose, said on the card as it leaves. */}
      {leaving !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="absolute -inset-5 z-10 flex flex-col items-center justify-center rounded-[20px] bg-white/90 backdrop-blur-[2px] md:-inset-6"
        >
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#16A34A] text-white">
            <Check aria-hidden="true" size={22} strokeWidth={2.5} />
          </span>
          <span className="mt-3 text-[17px] leading-6 font-semibold text-[var(--tx)]">{leaving}</span>
          <span className="mt-0.5 max-w-[80%] truncate text-[13px] leading-[18px] text-[var(--tx2)]">
            {storyRef(story.id)} · {story.title}
          </span>
        </motion.div>
      )}
    </article>
  );
}
