import { useState } from "react";
import { Check, CircleAlert, CircleDashed, RotateCw } from "lucide-react";
import { BTN_PRIMARY, BTN_SECONDARY, SKELETON } from "@/components/dashboard/classes";
import { SERVICE_COPY } from "@/components/connect-accounts/services";
import type { Connection, ConnectionService } from "@/types/connections";
import { Pill } from "./ui";

/** The service's official mark (connect-accounts/services.ts), or its initial while the file isn't there. */
export function ServiceLogo({ service }: { service: ConnectionService }) {
  const copy = SERVICE_COPY[service];
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-white ring-1 ring-black/[0.08]">
      {copy.logo && !failed ? (
        <img src={copy.logo} alt="" width={20} height={20} className="size-5" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true" className="text-sm font-semibold text-[var(--tx)]">
          {copy.initial}
        </span>
      )}
    </span>
  );
}

/** The connection's state as DESIGN.md §6.6 names it, in §7.12's pill, beside the service's name. */
export function StateChip({ status }: { status: Connection["status"] }) {
  if (status === "connected") {
    return (
      <Pill tone="positive" icon={Check}>
        Connected
      </Pill>
    );
  }
  if (status === "needs_attention") {
    return (
      <Pill tone="attention" icon={CircleAlert}>
        Needs attention
      </Pill>
    );
  }
  return (
    <Pill tone="neutral" icon={CircleDashed}>
      Not connected
    </Pill>
  );
}

/**
 * One connection (GitHub or Claude) as the connections API has it: loading, didn't load, or its state, with the button
 * that opens the Connect accounts modal, where connecting happens.
 */
export function ServiceRow({
  service,
  connection,
  loading,
  failed,
  onRetry,
  onOpen,
  connectedLine,
  emptyLine,
  connectLabel,
  primary,
}: {
  service: ConnectionService;
  connection: Connection | undefined;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  onOpen: () => void;
  connectedLine: string;
  emptyLine: string;
  /** "Link GitHub", "Connect Claude". */
  connectLabel: string;
  /** The section's one main action while it isn't connected. */
  primary?: boolean;
}) {
  const name = SERVICE_COPY[service].name;
  if (failed) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-[var(--tx)]">{name} didn't load.</span>
        <button type="button" onClick={onRetry} className={BTN_SECONDARY}>
          <RotateCw aria-hidden="true" size={14} strokeWidth={2} />
          Try again
        </button>
      </div>
    );
  }
  if (loading) {
    return (
      <div aria-busy="true" aria-label={`Loading ${name}`} className="flex items-center gap-3">
        <span className={`${SKELETON} size-10 rounded-xl`} />
        <span className="flex flex-1 flex-col gap-1.5">
          <span className={`${SKELETON} h-3.5 w-24`} />
          <span className={`${SKELETON} h-3 w-64 max-w-full`} />
        </span>
      </div>
    );
  }
  const status = connection?.status ?? "not_connected";
  const line = status === "connected" ? connectedLine : status === "needs_attention" ? (connection?.reason ?? "Needs you to sign in again.") : emptyLine;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <ServiceLogo service={service} />
      <span className="min-w-0 flex-1 basis-56">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-[var(--tx)]">
          {name}
          <StateChip status={status} />
        </span>
        <span className="block text-xs text-pretty text-[var(--tx2)]">{line}</span>
      </span>
      <button type="button" onClick={onOpen} className={status === "not_connected" && primary ? BTN_PRIMARY : BTN_SECONDARY}>
        {status === "connected" ? "Manage" : status === "needs_attention" ? "Reconnect" : connectLabel}
      </button>
    </div>
  );
}
