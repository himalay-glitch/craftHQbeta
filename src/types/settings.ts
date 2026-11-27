// Settings (/settings), following the live CraftHQ settings (Shubham, 26 Nov): "Your settings", the same in every
// project, and "Project settings", which change only the project they're for. Sample data until the CraftHQ API has
// settings endpoints; the page keeps changes in this browser's storage meanwhile.

/** Your settings: the same in every project. */
export type YourTab = "profile" | "github" | "tracker" | "tokens";
/** Project settings: change only the project picked. */
export type ProjectTab = "general" | "people" | "repositories" | "github-access" | "claude" | "project-tracker";
export type SettingsTab = YourTab | ProjectTab;

export interface Profile {
  /** How your stories are labelled on the board, and how your commits are signed when your loop works for you. */
  name: string;
  /** The address you're signed in with. Read-only here. */
  email: string;
}

/**
 * Who you are on GitHub: the account the pull requests CraftHQ opens for your work are attributed to. Linking it
 * authorizes the crafthq-ai app on GitHub, and gives CraftHQ no access to your repositories: that's the connection.
 */
export interface GitHubLink {
  /** Without the @. */
  login: string;
  /** GitHub's number for the account, which stays the same when the login changes. */
  id: number;
  /** False until you confirm it's you by authorizing the crafthq-ai app on GitHub ("Re-link with GitHub"). */
  verified: boolean;
}

/**
 * What CraftHQ may do on GitHub in a project, chosen by a project admin (the live settings' three levels): 1, pull
 * requests only; 2, maintain its branches; 3, full access.
 */
export type GitHubLevel = 1 | 2 | 3;

/**
 * The most CraftHQ may do with your access, in every project: no cap (0), at most Level 1 or at most Level 2, as the
 * live settings offer. It can only lower a project's level for your work.
 */
export type GitHubCap = 0 | 1 | 2;

/** What the check found when you saved your developer token. The token itself lives in the connections API. */
export interface GitHubTokenCheck {
  /** The token it was for, by its last four characters. */
  last4: string;
  checks: { repository: string; push: boolean; pullRequest: boolean }[];
}

/**
 * A personal access token: it signs the crafthq CLI and its Claude Code plugin in as you. The value is shown once, at
 * creation; afterwards only its name and prefix stay visible.
 */
export interface AccessToken {
  id: string;
  /** What it's for: "laptop CLI", "loop (workspace)". */
  name: string;
  /** Its first characters, e.g. "chq_7Fk2Qa1e". */
  prefix: string;
  /** When it was made: an ISO date and time (tokens saved before 27 Nov have the date only). */
  created: string;
  /** YYYY-MM-DD, 90 days after it was made. null for one that lasts until you revoke it, as the loop's does. */
  expires: string | null;
  /** When it was last used (ISO date and time), or null when it hasn't been. */
  lastUsed: string | null;
  /** When it was revoked (ISO date and time), or null. Revoked tokens stay listed, as on the live settings. */
  revoked: string | null;
}

export type ProjectRole = "admin" | "member";

export interface ProjectMember {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: ProjectRole;
  /** GitHub login, once the person has linked GitHub. Pull requests for their work are then theirs, and they can merge. */
  github?: string;
  /** Whether their Claude account is connected for this project. Without it, their stories wait. */
  claude: boolean;
}

export interface ProjectInvite {
  id: string;
  email: string;
  role: ProjectRole;
  /** YYYY-MM-DD. */
  sent: string;
}

export type RepoAccess = "write" | "read" | "none";

/** A repository's seven setup steps, in the order they run. Their names, as the live settings have them, are in store.ts. */
export type SetupStepId = "base" | "contract" | "charter" | "harness" | "registry" | "proof" | "install";

/**
 * done, skipped (a code-only repository has no charter, harness, image registry or boot proof), failed, waiting
 * for an earlier step, or running now.
 */
export type SetupStepState = "done" | "skipped" | "failed" | "waiting" | "running";

export interface RepositorySetup {
  /** Where the boot contract comes from: "none" makes the repository code only; "file" is a file in it (harness). */
  contract: "none" | "file";
  /** Each step's state, and the line the live page prints beside it ("main → 8270d8d"). */
  steps: Record<SetupStepId, { state: SetupStepState; detail?: string }>;
  /** When an admin started setup in this browser (ms since 1970). The sample then plays the run through from there. */
  startedAt?: number;
}

export interface ProjectRepository {
  /** "owner/name". */
  name: string;
  /** The branch pull requests go into. */
  base: string;
  /** Who may read and write it, by member id. Missing means no access. */
  access: Record<string, RepoAccess>;
  /** Whose GitHub access CraftHQ reaches it with, and how: the live page's "Deepak · App". */
  reachedBy?: { member: string; via: "app" | "account" | "token" };
  /** Stories can be created once a repository's setup is ready. */
  setup: RepositorySetup;
}

/** The board's columns, which the tracker's statuses are matched to. */
export type FlowColumn = "planning" | "building" | "in_review" | "pull_request" | "done";

export interface ProjectTracker {
  /** A tool id from New story → Import (stories/imports.ts), or "" for none. */
  tool: string;
  /** The project in that tool, e.g. "WEP" in Jira. */
  project: string;
  /** The tracker's status for each column of the board. */
  statuses: Record<FlowColumn, string>;
}

export interface ProjectSettings {
  id: string;
  name: string;
  /** What the robots should know about the product, in a sentence or two. */
  description: string;
  /** One of DESIGN.md's categorical colours (§3.1). */
  colour: string;
  /** Story IDs start with it ("hq-58"). Set when the project is made, so links never break. */
  prefix: string;
  /** Your role here. Members see these settings but can't change them. */
  yourRole: ProjectRole;
  members: ProjectMember[];
  invites: ProjectInvite[];
  repositories: ProjectRepository[];
  /** The member who checks and merges pull requests on GitHub. Robots never merge. */
  merger: string;
  /** What CraftHQ may do on GitHub here. Each person can hold their own work lower, in Your settings › GitHub. */
  githubLevel: GitHubLevel;
  /** How many stories each person's robots build at the same time here: 6 to 8. Approved stories past that stay Queued. */
  buildingAtOnce: number;
  /** How many stories they plan, or answer notes on, at the same time: 1 to 8. */
  planningAtOnce: number;
  /**
   * Your own workspace for this project: where Claude signs in and your robots work. It sleeps when it has had
   * nothing to do for a while, and wakes by itself when a story of yours needs it.
   */
  workspace: {
    state: "asleep" | "awake";
    /** When it last reported what's in effect (ISO date and time). */
    reported: string;
  };
  tracker: ProjectTracker;
}

export interface SettingsState {
  profile: Profile;
  githubLink: GitHubLink | null;
  githubCap: GitHubCap;
  githubTokenCheck: GitHubTokenCheck | null;
  tokens: AccessToken[];
  projects: ProjectSettings[];
}
