import { Plug, X } from "lucide-react";

const NAMES: Record<string, string> = { github: "GitHub", claude: "Claude" };

interface SetupBannerProps {
  missing: string[];
  onConnect: () => void;
  /** Hides it; the sidebar's Connectors still opens the modal. */
  onDismiss: () => void;
}

/**
 * Shown after someone skips the connect-accounts modal: a quiet amber pill on New story's line, as tall as the
 * button, saying what's missing, with the way back to the modal and a × to dismiss it. It never outweighs the
 * decisions below it.
 */
export function SetupBanner({ missing, onConnect, onDismiss }: SetupBannerProps) {
  if (missing.length === 0) return null;
  const names = missing.map((m) => NAMES[m.toLowerCase()] ?? m).join(" and ");

  return (
    <div
      role="status"
      className="flex min-h-8 min-w-0 items-center gap-2 rounded-[16px] bg-[#FCEFD6]/70 py-1 pr-1 pl-1.5 text-[13px] leading-[18px] text-[#5C3A00]"
    >
      <span className="inline-flex size-5 flex-none items-center justify-center rounded-full bg-[#F7DDA8] text-[#7A4A00]">
        <Plug aria-hidden="true" size={12} strokeWidth={2} />
      </span>
      <p className="min-w-0">
        {names} {missing.length > 1 ? "aren’t" : "isn’t"} connected, so the agents can’t start work.{" "}
        <button type="button" onClick={onConnect} className="font-medium text-[var(--cta)] underline-offset-2 hover:underline">
          Connect {missing.length > 1 ? "accounts" : names}
        </button>
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="inline-flex size-6 flex-none items-center justify-center rounded-full text-[#7A4A00] transition-colors duration-[120ms] hover:bg-[#F7DDA8]"
      >
        <X aria-hidden="true" size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
