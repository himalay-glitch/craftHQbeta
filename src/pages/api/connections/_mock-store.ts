import type { Connection, ConnectionMethod, ConnectionService } from "@/types/connections";

/**
 * In-memory stand-in for the connections backend, until a real one exists.
 *
 * State lives on `globalThis` so that every connection route (and hot reloads) share one
 * copy. It lasts as long as the server process, resets when the dev server restarts, and is
 * shared by everyone using that server.
 *
 * - GitHub connects through the CraftHQ app (reaching 3 mock repositories), or with a developer
 *   token shaped like a real one (ghp_… or github_pat_…). Only the token's last four characters
 *   are kept.
 * - Claude connects with a code: the mock sign-in page (./[service]/mock-sign-in) shows
 *   MOCK_CODE, and POST /api/connections/claude accepts it, ignoring case, spaces and dashes.
 */

/** The order people connect services in: GitHub first, then Claude. */
const ORDER: readonly ConnectionService[] = ["github", "claude"];

const NAMES: Record<ConnectionService, string> = {
  github: "GitHub",
  claude: "Claude",
};

const METHODS: Record<ConnectionService, ConnectionMethod> = {
  github: "oauth",
  claude: "code",
};

const ACCEPTS_TOKEN: Record<ConnectionService, boolean> = {
  github: true,
  claude: false,
};

/** The account each mock connection reports once connected. */
const MOCK_ACCOUNTS: Record<ConnectionService, string> = {
  github: "@crafthq-demo",
  claude: "you@example.com",
};

/** How many repositories the mock reaches through the CraftHQ app, and with a developer token. */
const MOCK_APP_REPOSITORIES = 3;
const MOCK_TOKEN_REPOSITORIES = 12;

/** The code the mock sign-in page shows, and the only one the mock accepts. */
export const MOCK_CODE = "4K7Q-9XPD";

type MockState = Pick<Connection, "status" | "account" | "via" | "repositories" | "tokenLast4" | "reason">;

const shared = globalThis as typeof globalThis & {
  __crafthqMockConnections?: Record<ConnectionService, MockState>;
};

const states = (shared.__crafthqMockConnections ??= {
  github: { status: "not_connected" },
  claude: { status: "not_connected" },
});

function view(service: ConnectionService): Connection {
  const { status, account, via, repositories, tokenLast4, reason } = states[service];
  return {
    service,
    method: METHODS[service],
    ...(ACCEPTS_TOKEN[service] ? { acceptsToken: true } : {}),
    required: true,
    status,
    ...(status !== "not_connected" && account ? { account } : {}),
    ...(status !== "not_connected" && via ? { via } : {}),
    ...(status !== "not_connected" && repositories !== undefined ? { repositories } : {}),
    ...(status !== "not_connected" && tokenLast4 ? { tokenLast4 } : {}),
    ...(status === "needs_attention" && reason ? { reason } : {}),
  };
}

export function isService(value: string): value is ConnectionService {
  return (ORDER as readonly string[]).includes(value);
}

export function serviceName(service: ConnectionService): string {
  return NAMES[service];
}

export function methodOf(service: ConnectionService): ConnectionMethod {
  return METHODS[service];
}

export function acceptsToken(service: ConnectionService): boolean {
  return ACCEPTS_TOKEN[service];
}

/** All connections, in the order people should connect them. */
export function listConnections(): Connection[] {
  return ORDER.map(view);
}

type ConnectOptions =
  | { via: "app"; noRepositories?: boolean }
  | { via: "token"; tokenLast4: string }
  | { via?: undefined };

export function connect(service: ConnectionService, options: ConnectOptions = {}): Connection {
  const account = MOCK_ACCOUNTS[service];
  if (options.via === "app") {
    states[service] = options.noRepositories
      ? { status: "needs_attention", account, via: "app", repositories: 0, reason: "No repositories yet" }
      : { status: "connected", account, via: "app", repositories: MOCK_APP_REPOSITORIES };
  } else if (options.via === "token") {
    states[service] = {
      status: "connected",
      account,
      via: "token",
      repositories: MOCK_TOKEN_REPOSITORIES,
      tokenLast4: options.tokenLast4,
    };
  } else {
    states[service] = { status: "connected", account };
  }
  return view(service);
}

export function disconnect(service: ConnectionService): Connection {
  states[service] = { status: "not_connected" };
  return view(service);
}

/** True when `code` matches MOCK_CODE, ignoring case, spaces and dashes. */
export function isMockCode(code: string): boolean {
  const normalise = (value: string) => value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return normalise(code) === normalise(MOCK_CODE);
}

/** True when `token` is shaped like a GitHub token: ghp_… (classic) or github_pat_… (fine-grained). */
export function isTokenShaped(token: string): boolean {
  return /^(ghp_|github_pat_)[A-Za-z0-9_]{20,}$/.test(token);
}
