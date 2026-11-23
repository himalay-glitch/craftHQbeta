import type { Person } from "@/types/dashboard";
import type { Message } from "@/types/messages";
import { storiesData } from "@/pages/stories/_sample-data";
import { parseText } from "@/components/stories/RichText";
import { findCreated } from "@/components/stories/created";

// Front end only: the sample team and stories, so Messages has the same people and story titles on every
// page (the top bar gets only the viewer). The CraftHQ API sends both later.

export const TEAM: Person[] = storiesData.people;
/** The signed-in person in the sample data; the seeded messages are written to and from them. */
export const SAMPLE_VIEWER = storiesData.viewer.id;
export const STORIES: { id: number; title: string }[] = storiesData.stories.map(({ id, title }) => ({ id, title }));

export const personById = (id: string) => TEAM.find((p) => p.id === id);
export const nameOf = (id: string) => personById(id)?.name ?? id;
export const firstName = (id: string) => nameOf(id).split(" ")[0];

/** A story's title, including stories created in this browser. */
export function storyTitle(id: number) {
  return STORIES.find((s) => s.id === id)?.title ?? findCreated(id)?.title;
}

const MIN = 60_000;

/** What's waiting when someone opens Messages for the first time: two unread, two already read. */
export function seedMessages(viewerId: string, now: number): Message[] {
  const text = (t: string) => parseText(t, TEAM, STORIES);
  const ago = (m: number) => now - m * MIN;
  return [
    {
      id: "seed-1",
      from: viewerId,
      to: ["esha"],
      storyId: 26,
      text: text("@Esha can you write the offline copy for this one? The agent used placeholder text."),
      at: ago(26 * 60),
      seen: { esha: ago(25 * 60) },
    },
    {
      id: "seed-2",
      from: "esha",
      to: [viewerId],
      storyId: 26,
      text: text("Done, it’s in the story now. Tell me if it needs to be shorter."),
      at: ago(24 * 60),
      seen: { [viewerId]: ago(23 * 60) },
    },
    {
      id: "seed-3",
      from: "rtdp",
      to: [viewerId],
      text: text("Are we showing the check-in flow on Monday? I can record a walkthrough of #34 tonight."),
      at: ago(130),
      seen: { [viewerId]: ago(125) },
    },
    {
      id: "seed-4",
      from: viewerId,
      to: ["rtdp"],
      text: text("Yes please. Keep it under two minutes."),
      at: ago(122),
      seen: { rtdp: ago(118) },
    },
    {
      id: "seed-5",
      from: "deepak",
      to: [viewerId],
      storyId: 35,
      text: text("@Aakash the arrival-time copy reads a bit oddly on Android. Can you try the preview before I merge it?"),
      at: ago(26),
      seen: {},
      // Deepak waits for an answer before merging: it shows as waiting on the viewer until they reply.
      ask: { of: [viewerId] },
    },
    {
      id: "seed-6",
      from: "skye",
      to: [viewerId],
      text: text("Quick one: who’s reviewing #32 today? It’s been waiting since yesterday."),
      at: ago(9),
      seen: {},
    },
  ];
}

/**
 * Front end only: what a teammate writes back, so the round trip can be tried on one computer. Until the
 * CraftHQ API delivers messages between people, the person you wrote to reads it a few seconds later and
 * answers once.
 */
export function sampleReply(words: string) {
  const w = words.toLowerCase();
  if (/review|pull request|\bpr\b|merge/.test(w)) return "Got your message. I’ve just reviewed it: two small notes on the pull request, then it’s good to merge.";
  if (/preview|try|test|check/.test(w)) return "Just tried it on my phone. Works for me, and the copy reads fine now.";
  if (w.trim().endsWith("?")) return "Good question. Let me look and get back to you this afternoon.";
  return "Got it, thanks. I’ll pick it up after the story I’m on.";
}
