// Content model of the dashboard, taken from the manager's prototype (crafthq-re.html, Dashboard view).

/** A story's stage. Shown in the story panel. */
export type StoryStatus = "new" | "planning" | "approved" | "in_progress" | "in_review" | "done" | "cancelled";

/** Why a story needs a person: the prototype's groups, in its order. */
export type NeedKind = "stuck" | "review" | "decision" | "planning" | "triage" | "next";

export interface Person {
  id: string;
  name: string;
  initials: string;
}

export interface Viewer extends Person {
  email: string;
  /** The line under the name in the account menu, e.g. "Workspace asleep · wakes by itself when a story needs it". */
  workspace: string;
}

export interface Story {
  id: number;
  title: string;
  status: StoryStatus;
  /** Owner's initials, as the prototype shows them ("E", "DT"). Stuck stories have none. */
  owner?: string;
  /** Present while the story needs a person; the story is then in the dashboard's table. */
  need?: NeedKind;
  /** Whose turn it is: "You", or a teammate ("rtdp", "Deepak Tewatia"). Stuck stories have none. */
  waitingOn?: string;
  /** The story's own instruction, when it differs from its group's. */
  action?: string;
  /** Extra line, e.g. "1 open question" or "Status planning; last step: build finished". */
  meta?: string;
  /** "just now", "2m ago", "8d ago". */
  updated?: string;
  /** The same, in minutes, for sorting. */
  updatedMinutes?: number;
  /** In review: the last check run, the evidence on its decision card. */
  checks?: { passed: number; total: number };
  /** A decision: the open question it waits on, and the answer that stands if you keep the default. */
  question?: { text: string; fallback: string };
}

/** A story that merged recently ("Shipped this week"). */
export interface ShippedItem {
  id: number;
  title: string;
  /** "2h ago", "yesterday", "Tuesday". */
  when: string;
}

/** A story the agent is working on ("With the agent"). */
export interface RunningItem {
  id: number;
  title: string;
  status: "In review" | "In progress";
  updated: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  storyId?: number;
  updated: string;
  finished?: boolean;
}

/** What the top bar's search needs; kept small because it's passed to a separate island. */
export interface SearchItem {
  id: number;
  title: string;
  status: StoryStatus;
}

export interface DashboardData {
  /** The project this dashboard is for, e.g. "WePop". It's the page heading; the nav already says Dashboard. */
  project: string;
  viewer: Viewer;
  /** Teammates who can own a new story. */
  people: Person[];
  stories: Story[];
  running: RunningItem[];
  queued: number;
  /** "just now": when the agent's loop last checked in. */
  loopTick: string;
  activity: ActivityItem[];
  /** This week's merges, newest first. */
  shipped: ShippedItem[];
  done: number;
  totalStories: number;
  about: string;
  version: string;
  /** The ID the next new story gets. */
  nextStoryId: number;
}

/** Forces one of the page's states for review: `/dashboard?state=loading`. */
export type DashboardStateOverride = "loading" | "empty" | "error" | null;
