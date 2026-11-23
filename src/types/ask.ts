// The Ask PM demo: one place to ask what's happening, where the PM answers and brings in the right bot.
import type { TicketStatus } from "@/types/status";

export type BotId = "pm" | "builder" | "designer" | "checker" | "fixer";

export interface Bot {
  id: BotId;
  name: string;
  /** One line: what it's for. */
  role: string;
  /** A sentence for its profile. */
  does: string;
  /** What it's on right now, for the team list. */
  now: string;
  /** Its fur colour (the avatar's backdrop tint and accents). */
  colour: string;
  tint: string;
  /** Still, composited on white. Missing files fall back to a soft blob in its colour. */
  poster: string;
  /** Optional idle loop, as .webm and .mp4 without the extension. */
  video?: string;
}

export interface StoryRef {
  id: number;
  title: string;
  status: TicketStatus;
  /** A short muted line after the title. */
  detail?: string;
}

export type Block =
  | { kind: "text"; text: string }
  | { kind: "stats"; items: { label: string; value: number }[] }
  | { kind: "stories"; items: StoryRef[] }
  | { kind: "handoff"; to: BotId; task: string }
  | { kind: "designs"; options: { id: string; label: string; layout: "list" | "cards" | "split" }[] }
  | { kind: "steps"; story: { id: number; title: string }; steps: string[] }
  | { kind: "checks"; story: { id: number; title: string }; passed: number; failed: number; note: string }
  | { kind: "team" }
  | { kind: "suggest"; items: string[] };

export interface ChatMessage {
  id: string;
  from: "me" | BotId;
  blocks: Block[];
  /** When it was sent, ms since the epoch (older saved chats may not have it). */
  at?: number;
  /** Files sent with your message (demo: name and size only). */
  files?: { name: string; size: number }[];
}

/** A past chat in the history. `updatedAt` is ms since the epoch. */
export interface SavedChat {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  /** A removed chat's marker (keeps example chats from coming back). */
  deleted?: boolean;
}

/** One reply from a bot, after it "thinks" for `delay` ms. */
export interface Turn {
  from: BotId;
  delay: number;
  blocks: Block[];
  /** What this bot is on once it has replied, for the Bots sidebar. */
  status?: { now: string; working: boolean };
}

/** A bot's line in the Bots sidebar. `since` is when it started, for "4m". */
export interface Activity {
  now: string;
  working: boolean;
  since: number;
}

/** What the page hands the chat: the project's stories, already shaped for answers. */
export interface AskData {
  project: string;
  firstName: string;
  needsYou: StoryRef[];
  stuck: StoryRef[];
  review: StoryRef[];
  running: StoryRef[];
  merged: StoryRef[];
  nextStoryId: number;
}
