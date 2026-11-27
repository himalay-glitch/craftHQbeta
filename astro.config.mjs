// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
// Astro 7's own Markdown processor: it comes with Astro (package-lock.json), so nothing new is installed.
import { satteri } from "@astrojs/markdown-satteri";

// Pages are static by default. A route that has to run on the server sets
// `export const prerender = false` (today only /api/auth/login), and the Node adapter
// serves it: `npm run build`, then `npm start`.
export default defineConfig({
  integrations: [react()],
  adapter: node({ mode: "standalone" }),
  vite: {
    plugins: [tailwindcss()],
  },
  // Markdown: today only the Docs articles (src/content/docs/), which are the live site's words exactly. So straight
  // quotes stay straight ("don't" isn't curled into "don’t"), and code is plain monospace with no colours.
  markdown: {
    processor: satteri({ features: { smartPunctuation: false } }),
    syntaxHighlight: false,
  },
  // On the live site "/" is the signed-in app; until it exists here, "/" goes to the login page.
  redirects: {
    "/": { status: 302, destination: "/login" },
  },
});
