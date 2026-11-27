import { useSyncExternalStore } from "react";
import type {
  AccessToken,
  FlowColumn,
  GitHubLevel,
  ProjectRepository,
  ProjectSettings,
  RepositorySetup,
  SettingsState,
  SetupStepId,
  SetupStepState,
} from "@/types/settings";

// The settings page's data. Sample values (the same people as the dashboard's sample) until the CraftHQ API has
// settings endpoints; changes are kept in this browser's storage meanwhile, so they survive a reload. Storage can be
// blocked (private windows): then changes last until the page closes. What's real already: GitHub and Claude
// connections (the connections API) and the ticket tools (the same store as New story → Import).

/** DESIGN.md §3.1, categorical colours, in slot order. Projects take the next unused one. */
export const PROJECT_COLOURS = [
  { value: "#2f6fed", name: "Blue" },
  { value: "#eb6834", name: "Orange" },
  { value: "#1baf7a", name: "Aqua" },
  { value: "#eda100", name: "Yellow" },
  { value: "#e87ba4", name: "Magenta" },
  { value: "#008300", name: "Green" },
  { value: "#6250d6", name: "Violet" },
  { value: "#e34948", name: "Red" },
] as const;

/** Repositories GitHub lets CraftHQ reach (sample). */
export const REACHABLE_REPOSITORIES = ["wepop/wepop-app", "wepop/website", "wepop/design-tokens", "wepop/infra"];

/** The board's five columns, in order, for the tracker's status mapping. */
export const FLOW_COLUMNS: { id: FlowColumn; label: string }[] = [
  { id: "planning", label: "Planning" },
  { id: "building", label: "Building" },
  { id: "in_review", label: "In review" },
  { id: "pull_request", label: "Pull request" },
  { id: "done", label: "Done" },
];

const TRACKER_STATUSES: Record<FlowColumn, string> = {
  planning: "To Do",
  building: "In Progress",
  in_review: "In Review",
  pull_request: "In Review",
  done: "Done",
};

/** Your own member id in every project's sample. */
export const ME = "me";

/* ── A repository's setup ────────────────────────────────────────────────────────────────────────────────────── */

/** The seven steps, in order and in the live settings' words (Project settings › Repositories). */
export const SETUP_STEPS: { id: SetupStepId; name: string }[] = [
  { id: "base", name: "Resolve the base commit" },
  { id: "contract", name: "Check the boot contract" },
  { id: "charter", name: "Write the charter" },
  { id: "harness", name: "Compile the harness" },
  { id: "registry", name: "Prepare the image registry" },
  { id: "proof", name: "Boot proof" },
  { id: "install", name: "Install the harness" },
];

const step = (state: SetupStepState, detail?: string) => (detail ? { state, detail } : { state });
const READY_LINE = "Ready · the harness reaches each workspace as it starts or wakes";
const CODE_ONLY_LINE = "No boot contract · code only: stories can work in this repository, with no boot proof and no preview";

/** Seven hex characters that stay the same for a name: the sample's stand-in for a commit. */
function sampleCommit(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

/** A finished code-only setup: three steps run, and the four between them aren't needed. */
export function codeOnlySetup(name: string, base: string): RepositorySetup {
  return {
    contract: "none",
    steps: {
      base: step("done", `${base} → ${sampleCommit(name)}`),
      contract: step("done", CODE_ONLY_LINE),
      charter: step("skipped"),
      harness: step("skipped"),
      registry: step("skipped"),
      proof: step("skipped"),
      install: step("done", READY_LINE),
    },
  };
}

/** A setup an admin starts now, in this browser: every step waiting, to be played through (stepsAt). */
export function startedSetup(): RepositorySetup {
  const waiting = Object.fromEntries(SETUP_STEPS.map((s) => [s.id, step("waiting")])) as RepositorySetup["steps"];
  return { contract: "none", steps: waiting, startedAt: Date.now() };
}

/** In the sample, a setup started here runs its three code-only steps, each for this long. */
export const SETUP_STEP_MS = 1300;
const RUN_ORDER: SetupStepId[] = ["base", "contract", "install"];
export const SETUP_RUN_MS = SETUP_STEP_MS * RUN_ORDER.length;

/** A repository's steps as they stand at `now`: as saved, or part-way through a run started in this browser. */
export function stepsAt(repo: ProjectRepository, now: number): RepositorySetup["steps"] {
  const { startedAt } = repo.setup;
  if (startedAt === undefined) return repo.setup.steps;
  const finished = codeOnlySetup(repo.name, repo.base).steps;
  const reached = now ? Math.max(0, Math.floor((now - startedAt) / SETUP_STEP_MS)) : 0;
  if (reached >= RUN_ORDER.length) return finished;
  return Object.fromEntries(
    SETUP_STEPS.map(({ id }) => {
      const turn = RUN_ORDER.indexOf(id);
      // The four a code-only repository doesn't need are known once the contract has been checked.
      if (turn === -1) return [id, step(reached >= 2 ? "skipped" : "waiting")];
      return [id, turn < reached ? finished[id] : step(turn === reached ? "running" : "waiting")];
    }),
  ) as RepositorySetup["steps"];
}

export type SetupState = "ready" | "failed" | "running";

/** Worked out from the steps, so the pill can never say Ready over a step that failed. */
export const setupState = (steps: RepositorySetup["steps"]): SetupState =>
  SETUP_STEPS.some((s) => steps[s.id].state === "failed") ? "failed" : steps.install.state === "done" ? "ready" : "running";

/**
 * What CraftHQ may do on GitHub, by level, word for word from the live settings' "See levels" (Project settings ›
 * GitHub access, Shubham's screenshot of 27 Nov). A project admin chooses the level; a person's own cap (Your
 * settings › GitHub) can only lower it for their work.
 */
export const GITHUB_LEVELS: Record<GitHubLevel, { name: string; summary: string; heading: string; allows: string[]; limits: string }> = {
  1: {
    name: "Pull requests only",
    summary: "CraftHQ proposes changes. A person merges them.",
    heading: "Allows",
    allows: ["Read the code", "Push its own work branches (fast-forward only)", "Open and update pull requests, and comment on them"],
    limits: "No force-push, no merging, no deleting branches, never the default branch.",
  },
  2: {
    name: "Maintain its branches",
    summary: "CraftHQ also tidies up after its own work.",
    heading: "Adds to Level 1",
    allows: ["Force-push its own work branches (with lease)", "Delete its own branches after the pull request closes", "Set labels and reviewers, and re-run checks"],
    limits: "No merging, and no pushing to branches it did not create.",
  },
  3: {
    name: "Full access",
    summary: "CraftHQ can finish the job on GitHub.",
    heading: "Adds to Level 2",
    allows: ["Merge pull requests", "Delete any branch", "Push any branch, including the default branch"],
    limits: "Your GitHub branch protection and required checks still apply.",
  },
};

/** The levels in order, for lists. */
export const LEVELS: GitHubLevel[] = [1, 2, 3];

/** The live settings' ranges for "Stories worked on at once" (Project settings › General). */
export const BUILDING_AT_ONCE = [6, 7, 8] as const;
export const PLANNING_AT_ONCE = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** "Level 2 · Maintain its branches". */
export const levelLabel = (level: GitHubLevel) => `Level ${level} · ${GITHUB_LEVELS[level].name}`;

const WEPOP: ProjectSettings = {
  id: "wepop",
  name: "WePop",
  description: "WePop is an invite-only app for planning nights out with friends: plans, invites, check-in at the door.",
  colour: "#2f6fed",
  prefix: "hq",
  yourRole: "admin",
  members: [
    { id: ME, name: "Josh", initials: "J", email: "josh@wepop.app", role: "admin", claude: true },
    { id: "deepak", name: "Deepak Tewatia", initials: "DT", email: "deepak@wepop.app", role: "admin", github: "deepakt", claude: true },
    { id: "rtdp", name: "rtdp", initials: "R", email: "rtdp@wepop.app", role: "member", claude: false },
  ],
  invites: [{ id: "inv-1", email: "maya@wepop.app", role: "member", sent: "2026-11-24" }],
  // The live page's three kinds: one with a boot contract (harness: boot proof and previews), one code only, and
  // one whose setup stopped at its first step.
  repositories: [
    {
      name: "wepop/wepop-app",
      base: "main",
      access: { [ME]: "write", deepak: "write", rtdp: "read" },
      reachedBy: { member: "deepak", via: "app" },
      setup: {
        contract: "file",
        steps: {
          base: step("done", "main → 4c1e9a7"),
          contract: step("done", "Contract OK · C1 to C6 passed"),
          charter: step("done", "charter 3 · 9b27d04f61ac (provisional, final for now)"),
          harness: step("done", "harness v25 · kit 0.2.12 · the same inputs made it before"),
          registry: step("done", "Image registry ready · built services: api, db, web, worker"),
          proof: step("done", "Boot proof passed · 4 images pushed · screenshot 5d03c8e1b7f2"),
          install: step("done", READY_LINE),
        },
      },
    },
    {
      name: "wepop/design-tokens",
      base: "main",
      access: { [ME]: "write", deepak: "read", rtdp: "none" },
      reachedBy: { member: "deepak", via: "app" },
      setup: codeOnlySetup("wepop/design-tokens", "main"),
    },
    {
      name: "wepop/infra",
      base: "main",
      access: { [ME]: "write", deepak: "write", rtdp: "none" },
      setup: {
        contract: "none",
        steps: {
          base: step("failed", "Couldn't read the branch main."),
          contract: step("waiting"),
          charter: step("waiting"),
          harness: step("waiting"),
          registry: step("waiting"),
          proof: step("waiting"),
          install: step("waiting"),
        },
      },
    },
  ],
  merger: "deepak",
  githubLevel: 2,
  buildingAtOnce: 6,
  planningAtOnce: 1,
  workspace: { state: "asleep", reported: "2026-11-26T12:12:00Z" },
  tracker: { tool: "jira", project: "WEP", statuses: TRACKER_STATUSES },
};

const WEBSITE: ProjectSettings = {
  id: "wepop-website",
  name: "WePop website",
  description: "The public site: the waitlist, the press page and the invite landing pages.",
  colour: "#eb6834",
  prefix: "web",
  yourRole: "member",
  members: [
    { id: "deepak", name: "Deepak Tewatia", initials: "DT", email: "deepak@wepop.app", role: "admin", github: "deepakt", claude: true },
    { id: ME, name: "Josh", initials: "J", email: "josh@wepop.app", role: "member", claude: true },
  ],
  invites: [],
  repositories: [
    {
      name: "wepop/website",
      base: "main",
      access: { deepak: "write", [ME]: "write" },
      reachedBy: { member: "deepak", via: "app" },
      setup: codeOnlySetup("wepop/website", "main"),
    },
  ],
  merger: "deepak",
  githubLevel: 1,
  buildingAtOnce: 6,
  planningAtOnce: 1,
  workspace: { state: "awake", reported: "2026-11-27T05:10:00Z" },
  tracker: { tool: "", project: "", statuses: TRACKER_STATUSES },
};

export const DEFAULTS: SettingsState = {
  profile: { name: "Josh", email: "josh@wepop.app" },
  // As on the live settings: linked, but not confirmed by you yet. The login is the connections mock's account.
  githubLink: { login: "crafthq-demo", id: 184203117, verified: false },
  githubCap: 0,
  githubTokenCheck: null,
  // The live page's three kinds: the loop's own token, which lasts until it's revoked; one you made, for 90 days; and
  // a revoked one, which stays listed.
  tokens: [
    { id: "tok-loop-2", name: "loop (workspace)", prefix: "chq_Rm4Tq8Vb", created: "2026-11-26T11:47:00Z", expires: null, lastUsed: "2026-11-26T12:11:00Z", revoked: null },
    { id: "tok-1", name: "laptop CLI", prefix: "chq_7Fk2Qa1e", created: "2026-10-02T09:30:00Z", expires: "2026-12-31", lastUsed: "2026-11-25T16:05:00Z", revoked: null },
    { id: "tok-loop-1", name: "loop (workspace)", prefix: "chq_Hw9Lp3Zc", created: "2026-11-20T07:13:00Z", expires: null, lastUsed: "2026-11-20T07:33:00Z", revoked: "2026-11-26T11:46:00Z" },
  ],
  projects: [WEPOP, WEBSITE],
};

// v2: the shape changed when the page took the live settings' sections (26 Nov), so the first version's data is left behind.
const KEY = "crafthq:settings:v2";
const subs = new Set<() => void>();
let cache: SettingsState | null = null;

/** The sample repository added on 27 Nov to show a setup that failed. */
const ADDED_TO_SAMPLE = ["wepop/infra"];

/**
 * Repositories saved before 27 Nov have no setup: each takes its sample's (or a finished code-only one), and the
 * list gains the sample repository added that day, once.
 */
function withSetups(saved: ProjectRepository[], sample: ProjectRepository[]): ProjectRepository[] {
  if (saved.every((r) => r.setup)) return saved;
  const repos = saved.map((r) => {
    if (r.setup) return r;
    const from = sample.find((s) => s.name === r.name);
    return { ...r, reachedBy: from?.reachedBy, setup: from?.setup ?? codeOnlySetup(r.name, r.base) };
  });
  return [...repos, ...sample.filter((s) => ADDED_TO_SAMPLE.includes(s.name) && !repos.some((r) => r.name === s.name))];
}

/** A stored project, with the fields it was saved without (added 27 Nov) taken from its sample. */
function withDefaults(p: ProjectSettings): ProjectSettings {
  const sample = DEFAULTS.projects.find((d) => d.id === p.id);
  // Saved before 27 Nov, these are missing, whatever the type says.
  return {
    ...sample,
    ...p,
    repositories: withSetups(p.repositories, sample?.repositories ?? []),
    githubLevel: p.githubLevel ?? sample?.githubLevel ?? 1,
    buildingAtOnce: p.buildingAtOnce ?? sample?.buildingAtOnce ?? 6,
    planningAtOnce: p.planningAtOnce ?? sample?.planningAtOnce ?? 1,
    workspace: p.workspace ?? sample?.workspace ?? { state: "asleep", reported: "2026-11-26T12:12:00Z" },
  };
}

/**
 * Tokens saved before 27 Nov have no `revoked` (revoking deleted them then) and the first sample's one token: take
 * today's sample, and keep the ones made since, as active.
 */
function withRevoked(saved: AccessToken[] | undefined): AccessToken[] {
  if (!saved) return DEFAULTS.tokens;
  if (saved.every((t) => "revoked" in t)) return saved;
  const sample = new Set(DEFAULTS.tokens.map((t) => t.id));
  return [...saved.filter((t) => !sample.has(t.id)).map((t) => ({ ...t, revoked: null })), ...DEFAULTS.tokens];
}

function read(): SettingsState {
  if (cache) return cache;
  try {
    const saved = window.localStorage.getItem(KEY);
    const parsed = saved ? (JSON.parse(saved) as Partial<SettingsState>) : null;
    // Merged with the defaults, so a section added later still gets its values: at the top, and in each project.
    cache = parsed
      ? { ...DEFAULTS, ...parsed, projects: (parsed.projects ?? DEFAULTS.projects).map(withDefaults), tokens: withRevoked(parsed.tokens) }
      : DEFAULTS;
  } catch {
    cache = DEFAULTS;
  }
  return cache;
}

/** Replace the state with what `change` returns, keep it, and tell the page. */
export function updateSettings(change: (s: SettingsState) => SettingsState) {
  cache = change(read());
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage blocked: the change lasts until the page closes.
  }
  subs.forEach((f) => f());
}

/** Change one project, by id. */
export function updateProject(id: string, change: (p: ProjectSettings) => ProjectSettings) {
  updateSettings((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? change(p) : p)) }));
}

function subscribe(onChange: () => void) {
  subs.add(onChange);
  return () => subs.delete(onChange);
}

// The server renders the defaults; the browser then switches to what's stored, right after hydration.
export const useSettings = () => useSyncExternalStore(subscribe, read, () => DEFAULTS);
