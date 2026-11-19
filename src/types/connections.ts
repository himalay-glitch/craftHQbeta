/** Outside services a workspace connects, in the order people connect them: GitHub, then Claude. */
export type ConnectionService = "github" | "claude";

/**
 * How a service connects (DESIGN.md §6.6):
 * - "oauth": the provider's page opens in a popup and hands back to CraftHQ by itself (GitHub).
 * - "code": the person signs in on the provider's page, which then shows a code they paste into
 *   CraftHQ (Claude). It's the code that page shows, never a sign-in code from an email.
 */
export type ConnectionMethod = "oauth" | "code";

/**
 * A connection's state on the server. The modal adds two short-lived states of its own
 * (DESIGN.md §6.6): "connecting" while a request is in flight, and "failed" after one fails.
 */
export type ConnectionStatus = "not_connected" | "connected" | "needs_attention";

export interface Connection {
  service: ConnectionService;
  method: ConnectionMethod;
  /** Required connections must be made before the robots can start work. */
  required: boolean;
  status: ConnectionStatus;
  /** The connected account, e.g. "@octocat" on GitHub. Present when connected. */
  account?: string;
  /** Why the connection needs attention, e.g. "Access expired". Present only with "needs_attention". */
  reason?: string;
}

/** Body of GET /api/connections. Connections come back in the order people should connect them. */
export interface ConnectionsResponse {
  connections: Connection[];
}

/** Body of POST /api/connections/[service]/start: the page to open so the person can sign in. */
export interface SignInStartResponse {
  url: string;
}

/** Body sent to POST /api/connections/[service] by services that connect with a code. */
export interface ConnectWithCodeBody {
  code: string;
}

/** Body of a successful POST or DELETE /api/connections/[service]. */
export interface ConnectionResponse {
  connection: Connection;
}

/** Error payload returned by the /api/connections routes on a non-2xx response. */
export interface ConnectionErrorBody {
  /** A complete sentence the UI can show as it is (DESIGN.md §9). */
  error: string;
}
