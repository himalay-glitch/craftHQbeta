import type {
  ConnectWithCodeBody,
  ConnectWithTokenBody,
  Connection,
  ConnectionErrorBody,
  ConnectionResponse,
  ConnectionService,
  ConnectionsResponse,
  SignInStartResponse,
} from "@/types/connections";

const BASE = "/api/connections";

/** A failed request, with a message that can be shown to people as it is. */
export class ConnectionError extends Error {
  status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ConnectionError";
    this.status = status;
  }
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", ...init });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new ConnectionError("CraftHQ didn't answer. Check your connection and try again.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ConnectionErrorBody | null;
    throw new ConnectionError(body?.error ?? "That didn't work. Try again.", response.status);
  }
  return (await response.json()) as T;
}

/** The workspace's connections, in the order people should connect them. */
export async function fetchConnections(signal?: AbortSignal): Promise<Connection[]> {
  return (await request<ConnectionsResponse>(BASE, { signal })).connections;
}

/** What a connection needs: a sign-in code (Claude), a developer token (GitHub's alternative), or nothing. */
export type ConnectInput = { code: string } | { token: string } | Record<string, never>;

export async function connectService(
  service: ConnectionService,
  input: ConnectInput = {},
  signal?: AbortSignal,
): Promise<Connection> {
  const init: RequestInit = { method: "POST", signal };
  if ("code" in input) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify({ code: input.code } satisfies ConnectWithCodeBody);
  } else if ("token" in input) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify({ token: input.token } satisfies ConnectWithTokenBody);
  }
  return (await request<ConnectionResponse>(`${BASE}/${service}`, init)).connection;
}

/**
 * Local preview only: record how a sign-in window ended, because the real provider sends its answer
 * to the live app, not to this machine. "no-repos" means approved, but no repositories are reachable.
 */
export async function previewWindowSignIn(service: ConnectionService, outcome: "connected" | "no-repos"): Promise<Connection> {
  const query = outcome === "no-repos" ? "?simulate=no-repos" : "";
  return (await request<ConnectionResponse>(`${BASE}/${service}${query}`, { method: "POST" })).connection;
}

/** The sign-in page to open: the provider's own page, or a local stand-in. */
export async function startSignIn(service: ConnectionService, signal?: AbortSignal): Promise<string> {
  return (await request<SignInStartResponse>(`${BASE}/${service}/start`, { method: "POST", signal })).url;
}
