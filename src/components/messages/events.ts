// Any island can open Messages in the top bar, optionally at one conversation ("story:35", "dm:deepak"), and
// with a draft already in its box (a nudge, or a message moved over from a story's chat).
export const OPEN_EVENT = "crafthq:open-messages";

export interface OpenDetail {
  key?: string;
  draft?: string;
}

export const openMessages = (key?: string, draft?: string) =>
  window.dispatchEvent(new CustomEvent<OpenDetail>(OPEN_EVENT, { detail: { key, draft } }));
