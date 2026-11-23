// Messages between teammates: a story's people chat (Team, on the story page) and direct conversations.
import type { FileRef, Segment } from "@/types/stories";

/** One message from a person to one or more teammates. People are referred to by their `Person.id`. */
export interface Message {
  id: string;
  from: string;
  to: string[];
  /** Set when the message is about a story: it's part of that story's Team conversation. */
  storyId?: number;
  text: Segment[];
  /** Names only: attached files aren't uploaded anywhere yet. */
  files?: Omit<FileRef, "preview">[];
  /** Epoch ms. */
  at: number;
  /** When each recipient first saw it, by person ID. */
  seen: Record<string, number>;
  /** "Wait for a reply": the people in `of` owe an answer, so the story shows it's waiting on them until one of
   *  them writes back in the story's conversation, or the writer withdraws it. Story conversations only. */
  ask?: { of: string[]; withdrawnAt?: number };
}

/**
 * A conversation as one person sees it: every message about one story they wrote or were tagged in, or
 * every direct message between them and one teammate.
 */
export interface Conversation {
  /** "story:35" or "dm:deepak". */
  key: string;
  storyId?: number;
  /** The other people in it, by ID, in the order they first appear. */
  with: string[];
  /** Oldest first. */
  messages: Message[];
  /** Messages to the viewer they haven't seen. */
  unread: number;
  /** Someone asked the viewer for a reply here, and they haven't given one yet. */
  askedYou: boolean;
}
