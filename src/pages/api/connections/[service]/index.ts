import type { APIRoute } from "astro";
import type { ConnectWithCodeBody, ConnectWithTokenBody, ConnectionResponse } from "@/types/connections";
import {
  acceptsToken,
  connect,
  disconnect,
  isMockCode,
  isService,
  isTokenShaped,
  methodOf,
  serviceName,
} from "../_mock-store";
import { errorResponse } from "../_respond";

// Runs on the server for each request rather than being built ahead of time.
export const prerender = false;

/** Long enough for the modal to show its "Connecting…" state (DESIGN.md §6.8). */
const CONNECT_DELAY_MS = 1200;
const DISCONNECT_DELAY_MS = 300;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readBody(request: Request): Promise<Partial<ConnectWithCodeBody & ConnectWithTokenBody>> {
  const body: unknown = await request.json().catch(() => null);
  return body && typeof body === "object" ? (body as Partial<ConnectWithCodeBody & ConnectWithTokenBody>) : {};
}

/**
 * Mock of POST /api/connections/[service].
 * - GitHub connects through the CraftHQ app after a short delay, standing in for its popup
 *   sign-in. With `{ "token": "…" }` it connects with a developer token instead.
 * - Claude needs `{ "code": "…" }`: the code from its sign-in page (see ../_mock-store.ts).
 *
 * Previews: `?simulate=fail` (connection fails), `?simulate=no-repos` (GitHub connects but
 * reaches no repositories), `?simulate=bad-token` (GitHub rejects the token) and
 * `?simulate=expired-code` (Claude's code has expired).
 */
export const POST = (async ({ params, request, url }) => {
  const service = params.service ?? "";
  if (!isService(service)) return errorResponse("That service isn't supported.", 404);

  const name = serviceName(service);
  const simulate = url.searchParams.get("simulate");
  const body = await readBody(request);

  // Claude: the code from its sign-in page.
  if (methodOf(service) === "code") {
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) return errorResponse(`Paste the code ${name} showed you.`, 400);
    await wait(CONNECT_DELAY_MS);
    if (simulate === "fail") return errorResponse(`${name} didn't finish connecting. Try again.`, 502);
    if (simulate === "expired-code") return errorResponse(`That code has expired. Get a new one from ${name}.`, 410);
    if (!isMockCode(code)) {
      return errorResponse(`That code didn't work. Check it, or get a new one from ${name}.`, 400);
    }
    return Response.json({ connection: connect(service) } satisfies ConnectionResponse);
  }

  // GitHub's alternative: a developer token.
  if (body.token !== undefined) {
    if (!acceptsToken(service)) return errorResponse(`${name} doesn't use a developer token.`, 400);
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) return errorResponse("Paste your developer token.", 400);
    if (!isTokenShaped(token)) {
      return errorResponse("That doesn't look like a GitHub token. It starts with ghp_ or github_pat_.", 400);
    }
    await wait(CONNECT_DELAY_MS);
    if (simulate === "bad-token") {
      return errorResponse("GitHub didn't accept this token. Check that it hasn't expired and has the repo scope.", 400);
    }
    return Response.json({
      connection: connect(service, { via: "token", tokenLast4: token.slice(-4) }),
    } satisfies ConnectionResponse);
  }

  // GitHub's main path: sign in, and reach repositories through the CraftHQ app.
  await wait(CONNECT_DELAY_MS);
  if (simulate === "fail") return errorResponse(`${name} didn't finish connecting. Try again.`, 502);
  return Response.json({
    connection: connect(service, { via: "app", noRepositories: simulate === "no-repos" }),
  } satisfies ConnectionResponse);
}) satisfies APIRoute;

/** Mock of DELETE /api/connections/[service]: disconnects the service. */
export const DELETE = (async ({ params }) => {
  const service = params.service ?? "";
  if (!isService(service)) return errorResponse("That service isn't supported.", 404);

  await wait(DISCONNECT_DELAY_MS);
  return Response.json({ connection: disconnect(service) } satisfies ConnectionResponse);
}) satisfies APIRoute;
