/**
 * Mock of the live POST /api/auth/login. There's no backend in this clone, so every
 * attempt is rejected; the form then shows its built-in "sign-in failed" message.
 */
export async function POST() {
  return Response.json({}, { status: 401 });
}
