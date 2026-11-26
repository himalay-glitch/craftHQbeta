import { Check } from "lucide-react";
import { BotAvatar } from "@/components/ask/BotAvatar";

/**
 * Needs you, all clear (DESIGN.md §6.7): a small agent render (the PM, 64 px), a title and a sentence, no action.
 * If you cleared the deck yourself, it says how many you answered.
 */
export function AllClear({ answered }: { answered: number }) {
  return (
    <section
      aria-labelledby="clear-title"
      className="flex flex-col gap-4 rounded-[20px] border border-[var(--card-line)] bg-[linear-gradient(100deg,#FFFFFF_40%,#FFF8E6)] p-5 sm:flex-row sm:items-center sm:gap-5 md:p-6"
    >
      <BotAvatar id="pm" size={64} bare animate className="flex-none overflow-visible!" />
      <div className="min-w-0 flex-1">
        <h2 id="clear-title" className="text-[20px] leading-7 font-semibold tracking-[-0.012em] text-[var(--tx)]">
          Nothing needs you
        </h2>
        <p className="mt-0.5 text-[15px] leading-[22px] text-[var(--tx2)]">The agents will ask here when they need you.</p>
      </div>
      {answered > 0 && (
        <p className="inline-flex flex-none items-center gap-2 self-start rounded-full bg-[#E5F5EC] px-3 py-1.5 text-[13px] leading-[18px] font-medium text-[#1F6B4F] sm:self-center">
          <Check aria-hidden="true" size={14} strokeWidth={2.25} />
          You answered {answered} {answered === 1 ? "decision" : "decisions"}
        </p>
      )}
    </section>
  );
}
