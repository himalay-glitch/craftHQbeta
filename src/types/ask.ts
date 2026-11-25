// The Ask PM demo: one place to ask what's happening. You only talk to the PM: it answers, hands work to the
// right bot, and brings back what that bot made. The other bots never speak in the chat; their work shows as
// handoff and activity lines, and as results credited "by <bot>".
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
  /** What it never does, for the Team tab. */
  never: string;
  /** Its fur colour (the avatar's backdrop tint and accents). */
  colour: string;
  tint: string;
  /** Its face, as a path without the size: `<poster>-128.webp`, `-256` and `-384` exist (on white). */
  poster: string;
  /** Optional idle loop, without the extension: `.webm`/`.mp4` at 288 px, plus `-1x` copies at 144 px for 1x screens. */
  video?: string;
}

export interface StoryRef {
  id: number;
  title: string;
  status: TicketStatus;
  /** A short muted line after the title. */
  detail?: string;
}

/** One line of a bot's work log: done, a problem it hit, or still going. */
export interface ActivityLine {
  text: string;
  tone?: "done" | "warn" | "work";
}

export type Block =
  | { kind: "text"; text: string }
  | { kind: "stats"; items: { label: string; value: number }[] }
  | { kind: "stories"; items: StoryRef[] }
  /** The PM giving a job to a bot. `story` adds a Watch link to that story's page. */
  | { kind: "handoff"; to: BotId; task: string; story?: number }
  /** What a bot did, as quiet log lines (it doesn't speak). */
  | { kind: "activity"; by: BotId; lines: ActivityLine[] }
  /** Something that needs your OK. Yes asks the PM `ask`; No just closes it. */
  | { kind: "approval"; title: string; body: string; by?: BotId; yes: { label: string; ask: string }; no: string }
  | { kind: "designs"; by?: BotId; options: { id: string; label: string; layout: "list" | "cards" | "split" }[] }
  | { kind: "steps"; by?: BotId; story: { id: number; title: string }; steps: string[] }
  | { kind: "checks"; by?: BotId; story: { id: number; title: string }; passed: number; failed: number; note: string }
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

/** One message from the PM, after `delay` ms. */
export interface Turn {
  from: BotId;
  delay: number;
  blocks: Block[];
  /** The bot working while you wait ("Designer is sketching…"); its handoff ticks when this message lands. */
  wait?: BotId;
  /** Where a bot stands once this message lands, for the Team tab. */
  status?: { bot: BotId; now: string; working: boolean };
}

/** A bot's line in the Team tab. `since` is when it started, for "4m". */
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
