import { Plug } from "lucide-react";

const NAMES: Record<string, string> = { github: "GitHub", claude: "Claude" };

/**
 * Shown after someone skips the connect-accounts modal: one quiet line under the heading saying what's missing,
 * with the way back to the modal. It never outweighs the decisions below it.
 */
export function SetupBanner({ missing, onConnect }: { missing: string[]; onConnect: () => void }) {
  if (missing.length === 0) return null;
  const names = missing.map((m) => NAMES[m.toLowerCase()] ?? m).join(" and ");

  return (
    <div role="status" className="mt-4 flex items-start gap-2 text-[13px] leading-5 text-[var(--tx2)]">
      <span className="inline-flex size-5 flex-none items-center justify-center rounded-full bg-[#FCEFD6] text-[#7A4A00]">
        <Plug aria-hidden="true" size={12} strokeWidth={2} />
      </span>
      <p>
        {names} {missing.length > 1 ? "aren’t" : "isn’t"} connected, so the agents can’t start work.{" "}
        <button type="button" onClick={onConnect} className="font-medium text-[var(--cta)] underline-offset-2 hover:underline">
          Connect {missing.length > 1 ? "accounts" : names}
        </button>
      </p>
    </div>
  );
}
