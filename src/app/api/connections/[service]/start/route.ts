import type { NextRequest } from "next/server";
import type { SignInStartResponse } from "@/types/connections";
import { isService, methodOf, serviceName } from "../../mock-store";
import { errorResponse } from "../../respond";

/**
 * Mock of POST /api/connections/[service]/start, for services that connect with a code
 * (Claude). It returns the page to open in a new tab so the person can sign in.
 *
 * The real backend will return the provider's sign-in URL. This mock points at
 * ../mock-sign-in, a local page that shows the test code.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/connections/[service]/start">) {
  const { service } = await ctx.params;
  if (!isService(service)) return errorResponse("That service isn't supported.", 404);
  if (methodOf(service) !== "code") {
    return errorResponse(`${serviceName(service)} doesn't use a sign-in code.`, 400);
  }

  const url = new URL(`/api/connections/${service}/mock-sign-in`, request.nextUrl.origin).toString();
  return Response.json({ url } satisfies SignInStartResponse);
}
