import type { APIRoute } from "astro";
import { MOCK_CODE, isService, methodOf } from "../_mock-store";
import { errorResponse } from "../_respond";

/**
 * Development stand-in for the provider's sign-in page (Anthropic's, for Claude). It skips the
 * sign-in and shows the test code to paste back into CraftHQ. It deliberately looks like a plain
 * CraftHQ dev page, not like Anthropic's.
 */

// Runs on the server for each request rather than being built ahead of time.
export const prerender = false;

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mock sign-in · CraftHQ development</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fcfcfc; color: #111112; font: 14px/20px system-ui, sans-serif; }
  main { max-width: 360px; padding: 24px; text-align: center; }
  h1 { margin: 0 0 8px; font-size: 16px; line-height: 24px; }
  p { margin: 0; color: rgb(0 4 9 / 0.59); }
  code { display: block; margin: 16px 0; padding: 12px; border-radius: 12px; background: rgb(0 0 0 / 0.05); font: 600 24px/32px ui-monospace, monospace; letter-spacing: 0.08em; user-select: all; }
</style>
</head>
<body>
<main>
  <h1>Mock sign-in (development only)</h1>
  <p>In the real app, people sign in on Anthropic's page here. Copy this code and paste it into CraftHQ.</p>
  <code>${MOCK_CODE}</code>
  <p>You can close this tab.</p>
</main>
</body>
</html>
`;

export const GET = (({ params }) => {
  const service = params.service ?? "";
  if (!isService(service) || methodOf(service) !== "code") {
    return errorResponse("That service doesn't use a sign-in code.", 404);
  }

  return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}) satisfies APIRoute;
