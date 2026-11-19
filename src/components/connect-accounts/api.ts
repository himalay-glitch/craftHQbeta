import type {
  ConnectWithCodeBody,
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

/** Connects a service. Services that connect with a code (Claude) need `code`. */
export async function connectService(
  service: ConnectionService,
  code?: string,
  signal?: AbortSignal,
): Promise<Connection> {
  const init: RequestInit = { method: "POST", signal };
  if (code !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify({ code } satisfies ConnectWithCodeBody);
  }
  return (await request<ConnectionResponse>(`${BASE}/${service}`, init)).connection;
}

/** The sign-in page to open, for services that connect with a code. */
export async function startSignIn(service: ConnectionService, signal?: AbortSignal): Promise<string> {
  return (await request<SignInStartResponse>(`${BASE}/${service}/start`, { method: "POST", signal })).url;
}
