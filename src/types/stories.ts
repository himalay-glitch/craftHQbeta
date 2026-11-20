// Content model of the Stories page. A story is the dashboard's `Story` plus what the person wrote when
// they created it; the dashboard keeps its own slimmer view of the same story.
import type { Person, Story, Viewer } from "@/types/dashboard";

export interface StoryItem extends Story {
  /** The one-line "why", shown under the title. */
  why?: string;
  /** Rules, examples, links, or a pasted spec. */
  detail?: string;
  /** Names of the attached files. Nothing is uploaded yet; only the names are kept. */
  files?: string[];
}

export interface StoriesData {
  /** The project these stories belong to, e.g. "WePop". */
  project: string;
  viewer: Viewer;
  /** Teammates who can own a story. */
  people: Person[];
  stories: StoryItem[];
  /** The ID the next new story gets. */
  nextStoryId: number;
}

/** What the New story dialog hands over when someone presses Create story. */
export interface NewStoryInput {
  title: string;
  why: string;
  detail: string;
  ownerId: string;
  files: File[];
}

/** The Stories page's two views of the same stories (`?view=list`). */
export type StoriesView = "board" | "list";

// ---- One story's page: the conversation with the agent ----

/** A piece of message text: plain words, or a chip for a person, the agent or another story. */
export type Segment =
  | string
  | { type: "person"; name: string; initials: string }
  | { type: "agent" }
  | { type: "story"; id: number; title?: string };

export interface FileRef {
  name: string;
  /** "image", "video" or anything else, for the icon. */
  kind: "image" | "video" | "file";
  /** An object URL while the page is open, for images just attached. */
  preview?: string;
}

/** Who wrote a message: a person (by initials) or the agent. */
export type Author = { kind: "person"; name: string; initials: string } | { kind: "agent" };

/** The agent's report after a run: what happened, what it means, what's next. */
export interface AgentReport {
  outcome: string;
  means?: string;
  next?: string;
  /** The steps behind it, shown on "Show details". */
  details?: string[];
}

/** Every entry may be `fresh`: it arrived while the page was open, so it animates in. */
export type ThreadEntry = ThreadEntryBody & { fresh?: boolean };

type ThreadEntryBody =
  | { kind: "created"; id: string; at: string; by: Author }
  | { kind: "message"; id: string; at: string; author: Author; text?: Segment[]; report?: AgentReport; files?: FileRef[] }
  /** A slim marker: "Plan approved by Skye", "Moved to In review". */
  | { kind: "stage"; id: string; at: string; text: string }
  /** One of the agent's runs, folded into a line that opens into its steps. */
  | { kind: "run"; id: string; at: string; summary: string; steps: string[]; running?: boolean; done?: number }
  /** A question the agent asked, answered in the conversation. */
  | {
      kind: "question";
      id: string;
      at: string;
      question: string;
      options: string[];
      answer?: { option: number; by: string; at: string };
    };

/** What the agent is doing right now, shown at the foot of the conversation. */
export type LiveState =
  | { kind: "thinking" }
  | { kind: "working"; label: string }
  | { kind: "waiting"; text: string }
  | { kind: "quiet"; text: string };

/** The "Needs your OK" card at the end of the conversation when it's the viewer's turn. */
export interface AskCard {
  label: string;
  title: string;
  meta?: string;
  /** Where the decision moves the story, e.g. Planning → Building. */
  move?: { from: string; to: string };
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
}

/** The facts in the right-hand column. */
export interface StoryFacts {
  preview: { state: "ready" | "expired" | "not-built" | "failed"; line: string };
  checks: { state: "passed" | "running" | "none"; line: string };
  plan: string;
  pullRequest: { state: "none" | "open" | "merged"; line: string };
  ownerName?: string;
  source: string;
  repository: string;
  created: string;
}

export interface StoryPageData {
  /** The story as in the sample data; null when it was created in this browser (read from local storage). */
  story: StoryItem | null;
  storyId: number;
  thread: StoryThreadData | null;
  viewer: Viewer;
  people: Person[];
  /** For # links and ‹ › between stories. */
  stories: { id: number; title: string }[];
}

export interface StoryThreadData {
  entries: ThreadEntry[];
  facts: StoryFacts;
}

// ---- The activity log beside the conversation ----

/** What the agent worked on: its pages, the build and what comes out of it, and stage changes. */
export type ActivityKind = "read" | "spec" | "engineering" | "stage" | "build" | "checks" | "preview" | "screenshots" | "markup" | "pr";

export type Device = "web" | "mobile";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  /** "Specification page", "Screenshots · Mobile". */
  title: string;
  /** working: happening now. waiting: blocked on a person (never spins). info: a stage change or a person's action. */
  state: "working" | "waiting" | "done" | "failed" | "info";
  /** "Writing", "Edited with your note", "All 214 checks passed". */
  detail: string;
  at: string;
  /** A build's steps done, of all. */
  progress?: { done: number; total: number };
  /** Screens made, for screenshots and markup. */
  count?: number;
  /** Which preview or screenshots. */
  device?: Device;
  /** Previews only: the preview machine. */
  run?: "off" | "starting" | "on";
  /** Epoch ms, set in handlers only: when it started working, or when a preview started starting or running. */
  startedAt?: number;
  /** Stage changes only: where the story moved, as the board's column names ("Planning" → "Building"). */
  move?: { from: string; to: string };
  /** Just finished (or a stage change just happened): shown at the top for a moment, then it goes down. */
  settling?: boolean;
  /** Epoch ms, set in handlers only: when it finished, so the ready list keeps the order things finished in. */
  doneAt?: number;
  /** Added on this visit: arrives with a little motion. */
  fresh?: boolean;
}

/** What the activity column can do to a preview; the story page owns the state and the timers. */
export interface PreviewActions {
  start: (id: string) => void;
  stop: (id: string) => void;
  device: (id: string, d: Device) => void;
}

