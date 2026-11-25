import type { APIRoute } from "astro";
import type { LoginErrorBody, LoginRequestBody } from "@/types/auth";

/**
 * Mock of the live POST /api/auth/login. There's no backend yet, so any email and password
 * sign in. An empty field, or a body that isn't JSON, gets a 400 the form shows as it is.
 */

// Runs on the server for each request rather than being built ahead of time.
export const prerender = false;

const MISSING: LoginErrorBody = { error: "Enter your email and password to sign in." };

export const POST = (async ({ request }) => {
  const body = (await request.json().catch(() => null)) as Partial<LoginRequestBody> | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) return Response.json(MISSING, { status: 400 });
  return Response.json({ ok: true });
}) satisfies APIRoute;
