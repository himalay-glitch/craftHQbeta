import { useCallback, useEffect, useState } from "react";
import { fetchConnections } from "@/components/connect-accounts/api";
import type { Connection, ConnectionErrorBody, ConnectionService } from "@/types/connections";

/**
 * GitHub and Claude as the connections API has them (the same source as the Connect accounts modal), for the sections
 * that show them: Your settings › GitHub, and the project's GitHub access and Claude.
 */
export function useConnections() {
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [failed, setFailed] = useState(false);

  // State changes only when the answer comes back, so this can run from an effect.
  const reload = useCallback((signal?: AbortSignal) => {
    fetchConnections(signal)
      .then((list) => {
        setConnections(list);
        setFailed(false);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setFailed(true);
      });
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    reload(ctrl.signal);
    return () => ctrl.abort();
  }, [reload]);

  /** Try again after a failure: back to loading, then ask again. */
  const retry = useCallback(() => {
    setFailed(false);
    setConnections(null);
    reload();
  }, [reload]);

  /** Put in what a request just answered (saving a developer token), without asking again. */
  const update = useCallback((connection: Connection) => {
    setConnections((list) =>
      list?.some((c) => c.service === connection.service) ? list.map((c) => (c.service === connection.service ? connection : c)) : [...(list ?? []), connection],
    );
  }, []);

  const get = (service: ConnectionService) => connections?.find((c) => c.service === service);
  return { loading: !connections && !failed, failed, get, reload, retry, update };
}

/**
 * Disconnects a service: DELETE /api/connections/[service], which the API has and the modal doesn't use yet. Throws an
 * Error whose message can be shown as it is.
 */
export async function disconnectService(service: ConnectionService): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`/api/connections/${service}`, { method: "DELETE", cache: "no-store" });
  } catch {
    throw new Error("CraftHQ didn't answer. Check your connection and try again.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ConnectionErrorBody | null;
    throw new Error(body?.error ?? "That didn't work. Try again.");
  }
}
