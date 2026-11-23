import type { StoryThreadData } from "@/types/stories";
import { AGENT, buildFacts } from "@/components/stories/thread";
import { storiesData } from "./_sample-data";

// Hand-written conversations for a few stories, so the page can be reviewed with real-looking content.
// Every other story gets one written from its stage (src/components/stories/thread.ts).
// (The leading underscore keeps Astro from treating this file as a route.)

const skye = { kind: "person", name: "Skye Rao", initials: "S" } as const;
const meera = { kind: "person", name: "Meera Shah", initials: "MS" } as const;
const rtdp = { kind: "person", name: "rtdp", initials: "R" } as const;
const story = (id: number) => storiesData.stories.find((s) => s.id === id)!;

export const threads: Record<number, StoryThreadData> = {
  53: {
    facts: { ...buildFacts(story(53), "Skye Rao"), checks: { state: "passed", line: "All 1,253 checks passed" }, created: "Nov 14" },
    entries: [
      { kind: "created", id: "53-c", at: "Nov 14", by: skye },
      {
        kind: "message",
        id: "53-ask",
        at: "Nov 14",
        author: skye,
        text: [
          "Give every signed-in person a profile page: their photo, name, counts, bio and the clubs they belong to, plus tabs for what they’ve created. Follow the attached screens. Editing the profile and following people come later, in their own stories.",
        ],
        files: [
          { name: "profile-cards.png", kind: "image" },
          { name: "profile-list.png", kind: "image" },
          { name: "profile-empty.png", kind: "image" },
        ],
      },
      { kind: "message", id: "53-read", at: "Nov 14", author: AGENT, text: ["I’ve read this and I’m writing the plan. One question first."] },
      {
        kind: "question",
        id: "53-q1",
        at: "Nov 14",
        question: "Where should the new profile details be kept?",
        options: ["A new record beside each person", "New fields on each person’s existing record"],
        answer: { option: 0, by: "Skye Rao", at: "Nov 14" },
      },
      { kind: "stage", id: "53-plan", at: "Nov 15", text: "Plan written · approved by Skye Rao" },
      {
        kind: "run",
        id: "53-run1",
        at: "Nov 15",
        summary: "Built in 42m · 6 steps",
        steps: ["Read the plan and the screens", "Built the profile page", "Added the card and list views", "Reused the sample events", "Ran 1,253 checks: all passed", "Built the preview"],
      },
      {
        kind: "message",
        id: "53-rtdp",
        at: "Nov 18",
        author: rtdp,
        text: [
          "Please bring in the latest main first (it adds the seed data for previews), re-run the checks and restart the preview. ",
          { type: "agent" },
          " ask before resolving anything that conflicts.",
        ],
      },
      { kind: "stage", id: "53-verified", at: "Nov 19", text: "Verified by Checker · it does what the story asks" },
      { kind: "stage", id: "53-pr", at: "Nov 19", text: "Pull request #259 updated" },
      { kind: "stage", id: "53-review", at: "Nov 19", text: "Moved to In review" },
      {
        kind: "message",
        id: "53-report",
        at: "Nov 19",
        author: AGENT,
        report: {
          outcome: "Ready for your review. All 1,253 automated checks passed, and the “more” fix on the bio holds.",
          means: "The profile page works as the story asks, in English and Korean. Event places still show the venue name rather than the area, as noted before.",
          next: "Skye: open Profile in the preview, try the card and list switch and “more”, then merge pull request #259 and mark the story Done.",
          details: ["Merged main: no conflicts", "Checked on web and Android sizes", "No other screens changed"],
        },
      },
      {
        kind: "message",
        id: "53-meera",
        at: "Nov 19",
        author: meera,
        text: [{ type: "person", name: "Skye Rao", initials: "S" }, " the clubs row will need ", { type: "story", id: 33 }, " once that lands. Fine for now."],
      },
    ],
  },
};
