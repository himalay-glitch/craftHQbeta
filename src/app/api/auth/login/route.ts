import type { LoginErrorBody, LoginRequestBody } from "@/types/auth";

/**
 * Mock of the live POST /api/auth/login. There's no backend yet, so for now any email and
 * any password sign in. Only an empty field is turned away, with a message the form shows.
 */
export async function POST(request: Request) {
  const body: Partial<LoginRequestBody> | null = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    const error: LoginErrorBody = { error: "Enter your email and password to sign in." };
    return Response.json(error, { status: 400 });
  }

  return Response.json({ ok: true });
}
