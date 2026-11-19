import type { APIRoute } from "astro";
import { CONNECTIONS_CHANNEL, type ConnectionBroadcast } from "@/types/connections";
import { connect, isService, methodOf, serviceName } from "../_mock-store";
import { errorResponse } from "../_respond";

/**
 * Mock of CraftHQ's OAuth callback: where the provider sends the sign-in window back after the
 * person approves or cancels. It records the result, tells the open modal over
 * CONNECTIONS_CHANNEL, and closes the window.
 *
 * `?outcome=` comes from the stand-in authorization page: connected, no-repos, failed or cancelled.
 */

// Runs on the server for each request rather than being built ahead of time.
export const prerender = false;

function page(heading: string, message: ConnectionBroadcast) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Back to CraftHQ</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fcfcfc; color: #111112; font: 14px/20px system-ui, sans-serif; }
  main { max-width: 360px; padding: 24px; text-align: center; }
  h1 { margin: 0 0 8px; font-size: 16px; line-height: 24px; }
  p { margin: 0; color: rgb(0 4 9 / 0.59); }
</style>
</head>
<body>
<main>
  <h1>${heading}</h1>
  <p>You can close this window and go back to CraftHQ.</p>
</main>
<script>
  try {
    const channel = new BroadcastChannel(${JSON.stringify(CONNECTIONS_CHANNEL)});
    channel.postMessage(${JSON.stringify(message)});
    channel.close();
  } catch {}
  setTimeout(() => window.close(), 400);
</script>
</body>
</html>
`;
}

export const GET = (({ params, url }) => {
  const service = params.service ?? "";
  if (!isService(service) || methodOf(service) !== "oauth") {
    return errorResponse("That service doesn't sign in this way.", 404);
  }

  const name = serviceName(service);
  const outcome = url.searchParams.get("outcome");
  let heading: string;
  let message: ConnectionBroadcast;
  if (outcome === "connected" || outcome === "no-repos") {
    connect(service, { via: "app", noRepositories: outcome === "no-repos" });
    heading = `${name} is connected`;
    message = { service, outcome: "connected" };
  } else if (outcome === "failed") {
    heading = `${name} didn't connect`;
    message = { service, outcome: "failed", message: `${name} didn't finish connecting. Try again.` };
  } else {
    heading = `${name} sign-in cancelled`;
    message = { service, outcome: "cancelled" };
  }

  return new Response(page(heading, message), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}) satisfies APIRoute;
