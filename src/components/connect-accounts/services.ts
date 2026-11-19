import type { ConnectionService } from "@/types/connections";

/**
 * What the modal says about each service. The wording is a draft: confirm it before launch.
 *
 * Logos: add each company's official logo to public/connect-accounts/ (DESIGN.md §3.6).
 * Until then the modal shows the service's initial in its place.
 */
export const SERVICE_COPY: Record<ConnectionService, { name: string; purpose: string; initial: string }> = {
  github: {
    name: "GitHub",
    purpose: "Lets the robots read your repositories and open pull requests.",
    initial: "G",
  },
  claude: {
    name: "Claude",
    purpose: "The robots do their work with your Claude account.",
    initial: "C",
  },
};
