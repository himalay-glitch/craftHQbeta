import { useState } from "react";
import { SERVICE_COPY } from "@/components/connect-accounts/services";
import type { ConnectionService } from "@/types/connections";

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
 * Shown once someone has closed the connect-accounts modal (it opens by itself only on a first visit): one quiet line
 * under the heading saying what's missing, led by the missing services' own marks (Shubham, 26 Nov: show the GitHub
 * and Claude icons here), with the way back to the modal. It never outweighs the decisions below it.
 */
export function SetupBanner({ missing, onConnect }: { missing: ConnectionService[]; onConnect: () => void }) {
  if (missing.length === 0) return null;
  const names = missing.map((m) => SERVICE_COPY[m].name).join(" and ");

  return (
    <div role="status" className="mt-4 flex items-start gap-2 text-[13px] leading-5 text-[var(--tx2)]">
      {/* The sentence names them, so the marks are decoration. They overlap a little, like a stack of faces. */}
      <span aria-hidden="true" className="flex flex-none -space-x-1">
        {missing.map((m) => (
          <ServiceMark key={m} service={m} />
        ))}
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
