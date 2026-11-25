import { Plug } from "lucide-react";
import { BTN_SECONDARY } from "./classes";

/** Shown after someone skips the connect-accounts modal: what's missing, and the way back to it. */
export function SetupBanner({ missing, onConnect }: { missing: string[]; onConnect: () => void }) {
  if (missing.length === 0) return null;
  const names = missing.join(" and ");

  return (
    <div
      role="status"
      className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[12px] border border-[var(--card-line)] bg-[var(--bar)] py-2.5 pr-2.5 pl-4"
    >
      <Plug aria-hidden="true" size={16} strokeWidth={1.75} className="flex-none text-[var(--tx2)]" />
      <p className="min-w-0 flex-1 text-[14px] leading-5 text-[var(--tx)]">
        {names} {missing.length > 1 ? "aren’t" : "isn’t"} connected yet, so the agent can’t start work.
      </p>
      <button type="button" className={BTN_SECONDARY} onClick={onConnect}>
        Connect accounts
      </button>
    </div>
  );
}
