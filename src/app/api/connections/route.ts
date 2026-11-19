import type { NextRequest } from "next/server";
import type { Connection, ConnectionsResponse } from "@/types/connections";
import { listConnections } from "./mock-store";

/**
 * Mock of GET /api/connections: the workspace's connections, in the order people connect
 * them (GitHub, then Claude). There's no backend yet, so state comes from ./mock-store.ts.
 *
 * Add `?simulate=expired` to preview GitHub needing attention.
 */
export async function GET(request: NextRequest) {
  // Reading the request keeps this handler dynamic under Cache Components; without it the
  // response would be prerendered at build time and never change.
  const simulate = request.nextUrl.searchParams.get("simulate");

  let connections = listConnections();
  if (simulate === "expired") {
    connections = connections.map(
      (connection): Connection =>
        connection.service === "github"
          ? { ...connection, status: "needs_attention", reason: "Access expired" }
          : connection,
    );
  }

  return Response.json({ connections } satisfies ConnectionsResponse);
}
