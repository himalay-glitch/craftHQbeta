import { useEffect } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { AskCard } from "@/types/stories";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/dashboard/classes";
import chat from "./chat.module.css";
import { Mascot } from "./Mascot";

/**
 * A stage's decision, in front of the conversation. When the agent finishes a stage and needs a person to move
 * the story on (approve the plan, accept the work, open the pull request), the chat behind softens and this
 * takes the message box's place: what's being decided, where it moves the story, and the buttons.
 * "Read the chat first" (or Esc, or a click on the chat) puts it back as the last card in the conversation.
 */
export function StoryDecision({ ask, onDismiss }: { ask: AskCard | null; onDismiss: () => void }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if ((e.target as HTMLElement).closest('[role="menu"], [role="listbox"], dialog')) return;
      onDismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  if (!ask) return null;
  return (
    <section
      aria-labelledby="decision-title"
      aria-live="polite"
      className={`relative flex flex-col rounded-[20px] border border-[var(--card-line)] bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-20px_rgb(0_0_0/0.28)] ${chat.rise}`}
    >
      {/* Desktop: top right, clear of the buttons and of the toast under them. Phones: under the buttons. */}
      <button
        type="button"
        onClick={onDismiss}
        className="order-last mt-2 -mb-2 h-8 self-start rounded-full px-3 text-[13px] leading-[18px] text-[var(--tx2)] transition-colors duration-[120ms] hover:bg-black/[0.05] hover:text-[var(--tx)] max-md:ml-[42px] md:absolute md:top-3 md:right-3 md:m-0"
      >
        Read the chat first
      </button>
      <div className="flex items-start gap-3.5">
        <Mascot size={40} state="idle" className="flex-none" />
        <div className="min-w-0 flex-1">
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-4 text-[var(--tx2)] md:pr-32">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[#d97706]" />
              {ask.label}
            </span>
            {ask.move && (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[var(--tx)]">
                  <Check aria-hidden="true" size={12} strokeWidth={2.25} className="text-[var(--green)]" />
                  {ask.move.from}
                </span>
                <ArrowRight aria-label="then" size={12} strokeWidth={2} />
                <span className="font-medium text-[var(--tx)]">{ask.move.to}</span>
              </span>
            )}
          </p>
          <h2 id="decision-title" className="m-0 mt-1.5 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-[var(--tx)]">
            {ask.title}
          </h2>
          {ask.meta && <p className="m-0 mt-0.5 text-[14px] leading-5 text-[var(--tx2)]">{ask.meta}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {ask.primary && (
              <button type="button" onClick={ask.primary.onClick} className={`${BTN_PRIMARY} h-9 px-4`}>
                {ask.primary.label}
              </button>
            )}
            {ask.secondary && (
              <button type="button" onClick={ask.secondary.onClick} className={`${BTN_SECONDARY} h-9 px-4`}>
                {ask.secondary.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
