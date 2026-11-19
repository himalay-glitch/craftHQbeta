import { useState } from "react";
import { SERVICE_COPY } from "@/components/connect-accounts/services";
import type { ConnectionService } from "@/types/connections";
import { BTN_SECONDARY } from "./classes";

/**
 * One service's official logo, unmodified at 16 px, on a white 28 px disc. (Smaller than DESIGN.md
 * §3.6's 20–24 px for logos, at Shubham's request: the banner is a quiet reminder, not a connections row.)
 * Discs overlap by 4 px, like a facepile (§7.13), and the first one sits on top (`layer` counts down), with
 * a 2 px ring in the banner's own colour that cuts it out of the disc underneath. The logo files fill their
 * box edge to edge, so overlap plus ring covers only the disc's empty 6 px margin, never the logo. Falls
 * back to the service's initial wherever its logo file is missing (Claude's, outside Shubham's machine).
 */
function LogoDisc({ service, layer }: { service: ConnectionService; layer: number }) {
  const copy = SERVICE_COPY[service];
  const [failed, setFailed] = useState(false);

  return (
    <span
      style={{ zIndex: layer }}
      className="relative flex size-7 flex-none items-center justify-center rounded-full bg-white ring-2 ring-[var(--bar)] not-first:-ml-1"
    >
      {copy.logo && !failed ? (
        <img src={copy.logo} alt="" width={16} height={16} className="size-4" onError={() => setFailed(true)} />
      ) : (
        <span className="text-[11px] leading-none font-semibold text-[var(--tx)]">{copy.initial}</span>
      )}
    </span>
  );
}

/** Shown after someone skips the connect-accounts modal: what's missing, and the way back to it. */
export function SetupBanner({ missing, onConnect }: { missing: ConnectionService[]; onConnect: () => void }) {
  if (missing.length === 0) return null;
  const names = missing.map((service) => SERVICE_COPY[service].name);
  const one = names.length === 1;

  return (
    <div
      role="status"
      className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[12px] border border-[var(--card-line)] bg-[var(--bar)] py-2.5 pr-2.5 pl-3"
    >
      {/* The names are in the sentence, so the logos are decoration for screen readers. */}
      <span aria-hidden="true" className="isolate flex flex-none items-center">
        {missing.map((service, index) => (
          <LogoDisc key={service} service={service} layer={missing.length - index} />
        ))}
      </span>
      <p className="min-w-0 flex-1 text-[14px] leading-5 text-[var(--tx)]">
        {`${names.join(" and ")} ${one ? "isn’t" : "aren’t"} connected yet, so the agent can’t start work.`}
      </p>
      <button type="button" className={BTN_SECONDARY} onClick={onConnect}>
        {one ? `Connect ${names[0]}` : "Connect accounts"}
      </button>
    </div>
  );
}
