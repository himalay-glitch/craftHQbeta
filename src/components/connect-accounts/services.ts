import type { ConnectionService } from "@/types/connections";
import type { ButtonVariant } from "./Button";

type ServiceCopy = {
  name: string;
  purpose: string;
  /** Shown in the logo spot until the service's official logo is in public/connect-accounts/. */
  initial: string;
  /** The official logo, unmodified (DESIGN.md §3.6). */
  logo?: string;
  /** The provider's own colours for its sign-in button, used while it's the next step. */
  brandButton?: { variant: ButtonVariant; mark?: string };
};

/**
 * What the modal says about each service. The wording is a draft: confirm it before launch.
 *
 * GitHub's marks are the official files from https://brand.github.com/GitHub_Logos.zip, unmodified.
 * Claude's orange and dark ink come from Anthropic's brand guidelines. No Claude logo: Anthropic's
 * trademark guidelines govern that, so check with Anthropic before adding one.
 */
export const SERVICE_COPY: Record<ConnectionService, ServiceCopy> = {
  github: {
    name: "GitHub",
    purpose: "CraftHQ opens pull requests as you, in repositories where your organization installed the CraftHQ app.",
    initial: "G",
    logo: "/connect-accounts/GitHub_Invertocat_Black.svg",
    brandButton: { variant: "inverse", mark: "/connect-accounts/GitHub_Invertocat_White.svg" },
  },
  claude: {
    name: "Claude",
    purpose: "The robots do their work with your Claude account.",
    initial: "C",
    // Local preview only: this file is git-ignored on Shubham's machine. Anthropic supplies the official
    // logo on request (trademark guidelines), so the row shows the initial wherever the file is missing.
    logo: "/connect-accounts/claude-logo.svg",
    brandButton: { variant: "claude" },
  },
};

/** GitHub's page for a new classic token, with the repo scope already ticked. */
export const NEW_GITHUB_TOKEN_URL = "https://github.com/settings/tokens/new?scopes=repo&description=CraftHQ";
