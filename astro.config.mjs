// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// Pages are static by default. A route that has to run on the server sets
// `export const prerender = false` (today only /api/auth/login), and the Node adapter
// serves it: `npm run build`, then `npm start`.
export default defineConfig({
  integrations: [react()],
  adapter: node({ mode: "standalone" }),
  vite: {
    plugins: [tailwindcss()],
  },
  // On the live site "/" is the signed-in app; until it exists here, "/" goes to the login page.
  redirects: {
    "/": { status: 302, destination: "/login" },
  },
});
