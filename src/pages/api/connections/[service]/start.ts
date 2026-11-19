import type { APIRoute } from "astro";
import type { SignInStartResponse } from "@/types/connections";
import { isService, methodOf } from "../_mock-store";
import { errorResponse } from "../_respond";

/**
 * Mock of POST /api/connections/[service]/start: the page to open so the person can sign in.
 *
 * - GitHub: the live CraftHQ.AI GitHub App's real authorization page. Authorizing there really links
 *   your GitHub account to the live app, and GitHub sends the answer to app.crafthq.ai, so this local
 *   app never hears it: in local runs the modal counts the window closing as approved. The real backend will add
 *   a state value and its own callback.
 * - Claude: ./mock-sign-in, a stand-in that shows a test code, until the real Anthropic page's
 *   address is known.
 */

// Runs on the server for each request rather than being built ahead of time.
export const prerender = false;

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize?client_id=Iv23liEqc7lwzeRrYZf7";

export const POST = (({ params, url }) => {
  const service = params.service ?? "";
  if (!isService(service)) return errorResponse("That service isn't supported.", 404);

  const signInUrl =
    methodOf(service) === "oauth"
      ? GITHUB_AUTHORIZE_URL
      : new URL(`/api/connections/${service}/mock-sign-in`, url).toString();
  return Response.json({ url: signInUrl } satisfies SignInStartResponse);
}) satisfies APIRoute;
