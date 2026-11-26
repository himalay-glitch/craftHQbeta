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
  /** A robot run under way on this story (cards and rows show it live, with a turning mark). */
  live?: LiveRun;
  /** Done stories: merged (its pull request went in), done (nothing to merge), or closed (its pull request was closed
   *  without merging), so the card says which. */
  outcome?: "merged" | "done" | "closed";
  /** The story's pull request, once someone creates it from In review (Shubham, 26 Nov). */
  pr?: PullRequest;
  /** Other stories changing the same part of the product, so the team can choose an order before they collide. */
  overlaps?: number[];
  /** Built stories: where the branch stands against main, always shown, never asked for (Shubham, 26 Nov). */
  main?: MainState;
  /** Epoch ms, for stories created in this browser: so the page says "Today" rather than a sample date. */
  createdAt?: number;
  /** Imported from a ticket tool, so the story links back to the ticket ("From Jira · WEP-142"). */
  importedFrom?: ImportedFrom;
}

/** Where a built story's branch stands against main. When another story merges and touches the same files, the PM
 *  brings main into this branch by itself: a merge, never a rebase, on the same branch and the same pull request. */
export interface MainState {
  /** Stories merged into main since this branch last took it in. Empty: up to date. */
  behind: number[];
  /** When it was last compared with main, in words ("2m ago"). */
  checked: string;
  /** Clashes with what's behind where both sides can stay: the robots settle them, keeping both. */
  clashes?: number;
  /** The last update settled this many clashes, keeping both sides. */
  settled?: number;
}

/** While a pull request waits to be merged, what's happening to it. ready: up to date and passing, with the person who
 *  merges. updating, checks, conflict and failing are the robots' work (the PM hands it to Builder): bringing in the
 *  latest main after another story merged, running the checks again, fitting in a story that changed the same lines,
 *  fixing a failed check. blocked: GitHub refused the update (CraftHQ can't write to it), so the pull request is behind
 *  this story's work; it's stuck until someone reconnects GitHub, never shown as ready (hq-35, 25 Nov). */
export type PrMerge = "ready" | "updating" | "checks" | "conflict" | "failing" | "blocked";

export interface PullRequest {
  state: "open" | "merged" | "closed";
  number?: number;
  merge?: PrMerge;
  /** The story that merged first and changed the same lines ("Fixing conflicts with hq-5"). */
  conflictWith?: number;
  /** Updates saved on the story's branch that GitHub doesn't have yet ("2 updates aren't on GitHub yet"). */
  unsent?: number;
}

/** A robot run under way. The sample (rendered on the server) gives `minutesAgo`; the browser turns it into a
 *  time once, so the elapsed time ticks. Runs started in the browser carry `startedAt` (epoch ms) instead. */
export interface LiveRun {
  phase: PhaseKey;
  minutesAgo?: number;
  startedAt?: number;
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
  /** Initials of the one person with GitHub access, who checks and merges every pull request. */
  merger?: string;
}

/** What the New story dialog hands over when someone presses Create story. */
export interface NewStoryInput {
  title: string;
  why: string;
  detail: string;
  ownerId: string;
  files: File[];
  /** Imported from a ticket: the link back, and the ticket's attachments (names only, for now). */
  source?: ImportedFrom;
  attachments?: string[];
}

/** Where an imported story came from (Shubham, 26 Nov: import from Jira and other ticket tools). */
export interface ImportedFrom {
  /** The tool's name: "Jira", "Linear", "GitHub Issues". */
  tool: string;
  /** The ticket's own key there: "WEP-142", "#214". */
  key: string;
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

/** Every entry may be `fresh`: it arrived while the page was open, so it animates in. `ts` (epoch ms) is set on
 *  entries added on this visit and on teammates' messages, so the two can be put in the order they happened. */
export type ThreadEntry = ThreadEntryBody & { fresh?: boolean; ts?: number };

type ThreadEntryBody =
  | { kind: "created"; id: string; at: string; by: Author }
  /** `run`: the phases behind this reply, folded into one line under it. `to`: who a person's message tagged, by
   *  name ("the agent" first when it was tagged too); with only teammates, the agent doesn't reply. `seen`: on your
   *  own message to teammates, whether they've read it ("Seen", "Not seen yet"). */
  | { kind: "message"; id: string; at: string; author: Author; text?: Segment[]; report?: AgentReport; files?: FileRef[]; run?: RunPhase[] }
  /** A slim marker: "Plan approved by Skye", "Moved to In review". */
  | { kind: "stage"; id: string; at: string; text: string }
  /** One of the agent's runs, folded into a line that opens into its steps. */
  /** An older run, listed by steps: folded to its summary once done; while running, the live line shows it. */
  | { kind: "run"; id: string; at: string; summary: string; steps: string[]; running?: boolean; done?: number }
  /** A question the agent asked, answered in the conversation. The richer fields make it a full decision, as the live
   *  product's decision cards are (Shubham, 26 Nov, hq-73): what was found, options that each say what happens, the
   *  recommended one and why, what happens with no answer, where to read more, and room for your own answer. */
  | {
      kind: "question";
      id: string;
      at: string;
      question: string;
      /** Full sentences: each says what happens if it's chosen. Shown as A, B, C. */
      options: string[];
      /** `text`: answered in their own words under "Something else" (`option` is then -1). */
      answer?: { option: number; by: string; at: string; text?: string };
      /** The decision's number, to refer to it ("decision #148"). */
      number?: number;
      /** What the agent found that led to the question, in a sentence or two, before the options. */
      context?: string;
      /** The option the agent recommends, and why, in plain words. */
      recommended?: { option: number; why: string };
      /** What happens if nobody answers, and by when ("3 Dec"). */
      fallback?: { option: number; by: string };
      /** The section of the plan with the detail ("What exists today"). */
      readMore?: string;
      /** Offer "Something else…", to answer in your own words. */
      other?: boolean;
    };

/** What the agent is doing right now, shown at the foot of the conversation. */
/** The phases of one of the agent's runs, in the order they happen. Shown one at a time while it works. */
export type PhaseKey = "plan" | "implement" | "ui-check" | "review" | "verify" | "resume" | "reply";

/** A finished phase and how long it took, for the summary folded under the agent's reply. */
export interface RunPhase {
  key: PhaseKey;
  ms: number;
}

export type LiveState =
  | { kind: "thinking" }
  /** `phase`: the run's current phase, one at a time; `step` of `of` and the elapsed time since `since` go beside it. */
  | { kind: "working"; label: string; phase?: PhaseKey; step?: number; of?: number; since?: number }
  | { kind: "waiting"; text: string }
  | { kind: "quiet"; text: string };

/** The "Needs your OK" card at the end of the conversation when it's the viewer's turn. */
export interface AskCard {
  label: string;
  /** Stuck (a stopped build, a refused pull request update): the label's dot in the negative tone, not attention. */
  tone?: "stuck";
  title: string;
  meta?: string;
  /** Where the decision moves the story, e.g. Planning → Building. */
  move?: { from: string; to: string };
  primary?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
  /** "Send to someone": hand this decision to a teammate. The story then waits on them and is paused for you until
   *  they act or you take it back (Shubham, 26 Nov). */
  handoff?: { people: { name: string; initials: string }[]; onSend: (initials: string) => void };
}

/** A decision's button was pressed on a story a teammate had just changed: nothing was applied. Shown in place of
 *  the buttons, with `fix` to catch the page up ("See the change"). */
export interface AskRefusal {
  text: string;
  fix?: { label: string; onClick: () => void };
}

/** A decision kept on the story for good (Shubham, 26 Nov: "remembered forever", so a misunderstanding or a debate
 *  can always be settled): what was decided, by whom, when, and where in the chat. People make them directly: by
 *  answering a question, by approving or moving the story, or by saving a message as a decision. Never edited or
 *  deleted; a change is a new decision that replaces the old one, which stays, crossed out. */
export interface Decision {
  id: string;
  /** The outcome in one line: "A new record beside each person". */
  text: string;
  /** answer: chosen in a question card. approval: a move someone made (plan approved, pull request created).
   *  saved: a message someone saved as a decision, or a change to an earlier decision. */
  kind: "answer" | "approval" | "saved";
  /** Who decided: a name, or "You". */
  by: string;
  /** When, as the chat says it ("Nov 14", "Today"). */
  at: string;
  /** Epoch ms for decisions made here, so they sort and read right after a reload. */
  ts?: number;
  /** The chat entry it came from, for "See in chat". */
  entryId?: string;
  /** What it answered: "Where should the new profile details be kept?" */
  question?: string;
  /** The choices that weren't taken. */
  others?: string[];
  /** Saved from a message: who wrote it. */
  from?: string;
  /** A change: the decision this one replaces. */
  replaces?: string;
  /** Filled in when reading: the decision that replaced this one. */
  replacedBy?: { by: string; at: string };
}

/** The facts in the right-hand column. */
export interface StoryFacts {
  preview: { state: "ready" | "expired" | "not-built" | "failed"; line: string };
  checks: { state: "passed" | "running" | "none"; line: string };
  plan: string;
  pullRequest: { state: "none" | "open" | "merged" | "closed"; line: string };
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
  /** Every story, in the dashboard's order, with what Previous and Next need to find the ones that need you. */
  queue: StoryNavItem[];
  /** Initials of the one person with GitHub access, who merges pull requests. */
  merger?: string;
}

/** A story as Previous and Next in the story page's ⋯ see it. */
export type StoryNavItem = Pick<StoryItem, "id" | "title" | "status" | "need" | "waitingOn" | "meta" | "outcome" | "pr" | "updated">;

export interface StoryThreadData {
  entries: ThreadEntry[];
  facts: StoryFacts;
}

// ---- The activity log beside the conversation ----

/** What the agent worked on: its pages, the build and what comes out of it, and stage changes. */
export type ActivityKind = "read" | "spec" | "engineering" | "stage" | "build" | "checks" | "preview" | "screenshots" | "markup" | "pr" | "main";

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

