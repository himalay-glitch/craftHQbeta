import type { APIRoute } from "astro";

/**
 * Mock of the live POST /api/auth/login. There's no backend in this clone, so every
 * attempt is rejected; the form then shows its built-in "sign-in failed" message.
 */

// Runs on the server for each request rather than being built ahead of time.
export const prerender = false;

export const POST = (() => Response.json({}, { status: 401 })) satisfies APIRoute;
