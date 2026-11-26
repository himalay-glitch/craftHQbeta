import type { StoryThreadData } from "@/types/stories";
import { AGENT, buildFacts } from "@/components/stories/thread";
import { storiesData } from "./_sample-data";

// Hand-written conversations for a few stories, so the page can be reviewed with real-looking content.
// Every other story gets one written from its stage (src/components/stories/thread.ts).
// (The leading underscore keeps Astro from treating this file as a route.)

const skye = { kind: "person", name: "Skye Rao", initials: "S" } as const;
const meera = { kind: "person", name: "Meera Shah", initials: "MS" } as const;
const rtdp = { kind: "person", name: "rtdp", initials: "R" } as const;
const josh = { kind: "person", name: "Josh", initials: "J" } as const;
const story = (id: number) => storiesData.stories.find((s) => s.id === id)!;

export const threads: Record<number, StoryThreadData> = {
  // The live product's hq-73 (Shubham, 26 Nov): the screen already exists, so the agent asks what the story should add,
  // as one full decision: what it found, options that say what happens, the one it recommends and why, the default.
  28: {
    facts: { ...buildFacts(story(28), "Josh"), created: "Today" },
    entries: [
      { kind: "created", id: "28-c", at: "Today", by: josh },
      {
        kind: "message",
        id: "28-ask",
        at: "Today",
        author: josh,
        text: ["Nothing more, just a minimal login screen with a few ways in: social accounts, a one-time code, and a username and password."],
      },
      { kind: "message", id: "28-ask-2", at: "Today", author: josh, text: ["Because I want a mobile number OTP login as well."] },
      {
        kind: "message",
        id: "28-plan",
        at: "Today",
        author: AGENT,
        text: [
          "I’ve read it. The login screen you asked for already exists, so there’s one choice to make before I write the plan: what this story should add. It’s below, with what I found.",
        ],
      },
      {
        kind: "question",
        id: "28-q148",
        at: "Today",
        number: 148,
        question: "The login screen already exists. What should this story add to it?",
        context:
          "It already has a mobile number, email or username with a password; “Text me a code”, a one-time code sent to the mobile number; a passkey; and Apple and Google buttons (plus Kakao in Korea). One gap: on the web app the social buttons show but are greyed out. They need each company’s web sign-in keys.",
        options: [
          "Change nothing. Check the existing screen against your list in a preview, send screenshots, and close the story. Social sign-in on the web becomes its own story.",
          "Make Apple, Google and Kakao sign-in work on the web in this story. You supply each company’s developer keys first (Apple needs a paid account). It takes several days and can’t be fully proven before the keys arrive.",
          "Make “Text me a code” the main login button and move the password below it. Phone login comes first, but returning users see a changed screen, and the phone apps need the same change.",
        ],
        recommended: { option: 0, why: "Everything you asked for is already there, and web social sign-in needs keys only you can supply." },
        fallback: { option: 0, by: "3 Dec" },
        readMore: "What exists today",
        other: true,
      },
    ],
  },
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
      { kind: "stage", id: "53-review", at: "Nov 19", text: "Moved to In review" },
      {
        kind: "message",
        id: "53-report",
        at: "Nov 19",
        author: AGENT,
        report: {
          outcome: "Ready for your review. All 1,253 automated checks passed, and the “more” fix on the bio holds.",
          means: "The profile page works as the story asks, in English and Korean. Event places still show the venue name rather than the area, as noted before.",
          next: "Skye: open Profile in the preview and try the card and list switch and “more”. When it’s right, create the pull request; Deepak merges it on GitHub.",
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
      { kind: "stage", id: "53-pr", at: "Nov 20", text: "Pull request created by Skye Rao · the PM opened #259 on GitHub, with Deepak Tewatia to merge" },
    ],
  },
};
