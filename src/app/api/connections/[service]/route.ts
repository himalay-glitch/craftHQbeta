import type { NextRequest } from "next/server";
import type { ConnectWithCodeBody, ConnectionResponse } from "@/types/connections";
import { connect, disconnect, isMockCode, isService, methodOf, serviceName } from "../mock-store";
import { errorResponse } from "../respond";

/** Long enough for the modal to show its "Connecting…" state (DESIGN.md §6.8). */
const CONNECT_DELAY_MS = 1200;
const DISCONNECT_DELAY_MS = 300;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readCode(request: NextRequest): Promise<string> {
  const body: unknown = await request.json().catch(() => null);
  const code = (body as Partial<ConnectWithCodeBody> | null)?.code;
  return typeof code === "string" ? code.trim() : "";
}

/**
 * Mock of POST /api/connections/[service].
 * - GitHub connects after a short delay, standing in for its popup sign-in.
 * - Claude needs `{ "code": "…" }`: the code from its sign-in page (see ../mock-store.ts).
 *
 * Add `?simulate=fail` for a failed connection, or `?simulate=expired-code` for an expired
 * Claude code.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/connections/[service]">) {
  const { service } = await ctx.params;
  if (!isService(service)) return errorResponse("That service isn't supported.", 404);

  const name = serviceName(service);
  const usesCode = methodOf(service) === "code";
  const code = usesCode ? await readCode(request) : "";
  if (usesCode && !code) return errorResponse(`Paste the code from ${name}'s sign-in page.`, 400);

  await wait(CONNECT_DELAY_MS);
  const simulate = request.nextUrl.searchParams.get("simulate");
  if (simulate === "fail") return errorResponse(`${name} didn't finish connecting. Try again.`, 502);
  if (usesCode && simulate === "expired-code") {
    return errorResponse("That code has expired. Sign in again to get a new one.", 410);
  }
  if (usesCode && !isMockCode(code)) {
    return errorResponse("That code didn't work. Check it, or sign in again to get a new one.", 400);
  }

  return Response.json({ connection: connect(service) } satisfies ConnectionResponse);
}

/** Mock of DELETE /api/connections/[service]: disconnects the service. */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/connections/[service]">) {
  const { service } = await ctx.params;
  if (!isService(service)) return errorResponse("That service isn't supported.", 404);

  await wait(DISCONNECT_DELAY_MS);
  return Response.json({ connection: disconnect(service) } satisfies ConnectionResponse);
}
