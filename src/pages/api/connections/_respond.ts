import type { ConnectionErrorBody } from "@/types/connections";

/** A JSON error whose message the UI can show as it is (DESIGN.md §9). */
export function errorResponse(message: string, status: number) {
  return Response.json({ error: message } satisfies ConnectionErrorBody, { status });
}
