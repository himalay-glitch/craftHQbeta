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
  /** GitHub can also connect with a developer token instead, for development environments. */
  acceptsToken?: boolean;
  /** Required connections must be made before the robots can start work. */
  required: boolean;
  status: ConnectionStatus;
  /** The connected account, e.g. "@octocat" on GitHub. Present once connected. */
  account?: string;
  /**
   * How CraftHQ reaches GitHub: through the CraftHQ app the organization installed ("app"), or
   * through the person's developer token ("token").
   */
  via?: "app" | "token";
  /** How many repositories CraftHQ can reach. 0 means connected, but no repositories yet. */
  repositories?: number;
  /** The last four characters of a saved developer token. The full token is never sent back. */
  tokenLast4?: string;
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

/** Body sent to POST /api/connections/github to connect with a developer token instead. */
export interface ConnectWithTokenBody {
  token: string;
}

/** Body of a successful POST or DELETE /api/connections/[service]. */
export interface ConnectionResponse {
  connection: Connection;
}

/**
 * The channel a provider's callback page uses to tell an open modal how sign-in ended. It works even
 * when the provider's page cuts the link between the sign-in window and the app.
 */
export const CONNECTIONS_CHANNEL = "crafthq-connections";

/** What the callback page sends on CONNECTIONS_CHANNEL when a sign-in window finishes. */
export interface ConnectionBroadcast {
  service: ConnectionService;
  outcome: "connected" | "cancelled" | "failed";
  /** A sentence the modal can show, for "failed". */
  message?: string;
}

/** Error payload returned by the /api/connections routes on a non-2xx response. */
export interface ConnectionErrorBody {
  /** A complete sentence the UI can show as it is (DESIGN.md §9). */
  error: string;
}
