import type { Connection, ConnectionMethod, ConnectionService } from "@/types/connections";

/**
 * In-memory stand-in for the connections backend, until a real one exists.
 *
 * State lives on `globalThis` so that every connection route (and hot reloads) share one
 * copy. It lasts as long as the server process, resets when `npm run dev` restarts, and is
 * shared by everyone using that server.
 *
 * Claude connects with a code: the mock sign-in page (./[service]/mock-sign-in) shows
 * MOCK_CODE, and POST /api/connections/claude accepts it, ignoring case, spaces and dashes.
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

/** The account each mock connection reports once connected. */
const MOCK_ACCOUNTS: Record<ConnectionService, string> = {
  github: "@crafthq-demo",
  claude: "you@example.com",
};

/** The code the mock sign-in page shows, and the only one the mock accepts. */
export const MOCK_CODE = "4K7Q-9XPD";

type MockState = Pick<Connection, "status" | "account">;

const shared = globalThis as typeof globalThis & {
  __crafthqMockConnections?: Record<ConnectionService, MockState>;
};

const states = (shared.__crafthqMockConnections ??= {
  github: { status: "not_connected" },
  claude: { status: "not_connected" },
});

function view(service: ConnectionService): Connection {
  const { status, account } = states[service];
  return {
    service,
    method: METHODS[service],
    required: true,
    status,
    ...(status === "connected" && account ? { account } : {}),
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

/** All connections, in the order people should connect them. */
export function listConnections(): Connection[] {
  return ORDER.map(view);
}

export function connect(service: ConnectionService): Connection {
  states[service] = { status: "connected", account: MOCK_ACCOUNTS[service] };
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
