import { useCallback, useEffect, useState } from "react";
import type { ConnectionService, ConnectionsResponse } from "@/types/connections";

const NAMES: Record<ConnectionService, string> = { github: "GitHub", claude: "Claude" };

/** The required services that aren't connected yet, in the order people connect them. */
async function fetchMissing(signal?: AbortSignal): Promise<string[]> {
  const res = await fetch("/api/connections", { cache: "no-store", signal });
  if (!res.ok) throw new Error(`GET /api/connections answered ${res.status}`);
  const { connections } = (await res.json()) as ConnectionsResponse;
  return connections.filter((c) => c.required && c.status !== "connected").map((c) => NAMES[c.service]);
}

/**
 * The connect-accounts step between sign-in and the dashboard. When a required service isn't
 * connected, the modal opens over the dashboard as the page loads. Closing it (done, Skip, Esc)
 * checks again, so the banner knows what's still missing.
 */
export function useConnectionSetup() {
  const [missing, setMissing] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchMissing(controller.signal).then(
      (names) => {
        setMissing(names);
        if (names.length > 0) setOpen(true);
      },
      () => {
        // The modal shows its own load error with Try again, so open it rather than guess.
        if (!controller.signal.aborted) setOpen(true);
      },
    );
    return () => controller.abort();
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    fetchMissing().then(setMissing, () => {});
  }, []);

  const reopen = useCallback(() => setOpen(true), []);

  return { open, missing, close, reopen };
}
