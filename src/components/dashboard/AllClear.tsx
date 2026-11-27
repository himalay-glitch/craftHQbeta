import { Check } from "lucide-react";
import { BotAvatar } from "@/components/ask/BotAvatar";

/**
 * The stage when nothing needs you (DESIGN.md §6.7, all clear): the PM (64 px, blinking), a title and a sentence,
 * centred and at most 360 px wide, no action. If you cleared the deck yourself, it says how many you answered.
 */
export function AllClear({ answered }: { answered: number }) {
  return (
    <section
      aria-labelledby="clear-title"
      className="flex flex-col items-center rounded-[24px] border border-black/[0.06] bg-[radial-gradient(120%_90%_at_50%_0%,#FFF8E8_0%,#FFFFFF_60%)] px-6 py-14 text-center"
    >
      <BotAvatar id="pm" size={64} bare animate className="overflow-visible!" />
      <h2 id="clear-title" className="mt-4 text-[20px] leading-7 font-semibold tracking-[-0.012em] text-[var(--tx)]">
        Nothing needs you
      </h2>
      <p className="mt-1 max-w-[360px] text-[15px] leading-[22px] text-[var(--tx2)]">The agents will ask here when they need you.</p>
      {answered > 0 && (
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#E9F6EE] px-3 py-1.5 text-[13px] leading-[18px] font-medium text-[#1F6B4F]">
          <Check aria-hidden="true" size={14} strokeWidth={2.5} />
          You answered {answered} {answered === 1 ? "decision" : "decisions"}
        </p>
      )}
    </section>
  );
}
