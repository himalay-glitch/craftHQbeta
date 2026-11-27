import { useState } from "react";
import { X } from "lucide-react";
import { SERVICE_COPY } from "@/components/connect-accounts/services";
import type { ConnectionService } from "@/types/connections";

interface SetupBannerProps {
  missing: ConnectionService[];
  onConnect: () => void;
  /** Hides it; the sidebar's Connectors still opens the modal. */
  onDismiss: () => void;
}

/**
 * One service's mark on a small white disc: the official logo, unmodified (DESIGN.md §3.6), or its initial where the
 * file is missing (Claude's logo is a local preview only, like in the modal's rows).
 */
function ServiceMark({ service }: { service: ConnectionService }) {
  const copy = SERVICE_COPY[service];
  const [missing, setMissing] = useState(false);

  return (
    <span className="relative flex size-5 flex-none items-center justify-center rounded-full bg-white ring-1 ring-black/[0.08]">
      {copy.logo && !missing ? (
        <img src={copy.logo} alt="" width={12} height={12} className="size-3" onError={() => setMissing(true)} />
      ) : (
        <span className="text-xs font-semibold text-[var(--tx)]">{copy.initial}</span>
      )}
    </span>
  );
}

/**
 * Shown after someone skips the connect-accounts modal: a quiet amber pill on New story's line, as tall as the
 * button, saying what's missing, with the way back to the modal and a × to dismiss it. It never outweighs the
 * decisions below it. It leads with the missing services' own marks (Shubham, 26 Nov: show the GitHub and Claude
 * icons here) in place of a plug.
 */
export function SetupBanner({ missing, onConnect, onDismiss }: SetupBannerProps) {
  if (missing.length === 0) return null;
  const names = missing.map((m) => SERVICE_COPY[m].name).join(" and ");

  return (
    <div
      role="status"
      className="flex min-h-8 min-w-0 items-center gap-2 rounded-[16px] bg-[#FCEFD6]/70 py-1 pr-1 pl-1.5 text-[13px] leading-[18px] text-[#5C3A00]"
    >
      {/* The sentence names them, so the marks are decoration. They overlap a little, like a stack of faces. */}
      <span aria-hidden="true" className="flex flex-none -space-x-1">
        {missing.map((m) => (
          <ServiceMark key={m} service={m} />
        ))}
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
