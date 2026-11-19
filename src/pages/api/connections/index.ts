import type { APIRoute } from "astro";
import type { Connection, ConnectionsResponse } from "@/types/connections";
import { listConnections } from "./_mock-store";

/**
 * Mock of GET /api/connections: the workspace's connections, in the order people connect
 * them (GitHub, then Claude). There's no backend yet, so state comes from ./_mock-store.ts.
 *
 * Add `?simulate=expired` to preview GitHub needing attention.
 */

// Runs on the server for each request rather than being built ahead of time.
export const prerender = false;

export const GET = (({ url }) => {
  let connections = listConnections();
  if (url.searchParams.get("simulate") === "expired") {
    connections = connections.map(
      (connection): Connection =>
        connection.service === "github"
          ? { ...connection, status: "needs_attention", reason: "Access expired" }
          : connection,
    );
  }

  return Response.json({ connections } satisfies ConnectionsResponse);
}) satisfies APIRoute;
