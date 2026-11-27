import { dashboardData } from "@/pages/dashboard/_sample-data";
import type { StoriesData, StoryItem } from "@/types/stories";

// The dashboard's sample stories, so both pages show the same project, until this page talks to the
// CraftHQ API (GET /api/stories). The finished ones below are placeholders so the Done group can be
// reviewed; the dashboard's sample has none.
// (The leading underscore keeps Astro from treating this file as a route.)

export const finished: StoryItem[] = [
  { id: 1, title: "Sign up with your email", status: "done", owner: "DT", updated: "12d ago", updatedMinutes: 12 * 1440, outcome: "merged", pr: { state: "merged", number: 103 } },
  { id: 5, title: "Home feed: upcoming events near you", status: "done", owner: "R", updated: "2h ago", updatedMinutes: 120, outcome: "merged", pr: { state: "merged", number: 115 } },
  { id: 8, title: "Event card: date, place and host", status: "done", owner: "DT", updated: "9d ago", updatedMinutes: 9 * 1440, outcome: "done" },
  // Its pull request was closed on GitHub without merging: the team chose another way.
  { id: 12, title: "Share an event to WhatsApp", status: "done", owner: "R", updated: "5d ago", updatedMinutes: 5 * 1440, outcome: "closed", pr: { state: "closed", number: 136 } },
  { id: 9, title: "Old onboarding carousel", status: "cancelled", owner: "R", updated: "14d ago", updatedMinutes: 14 * 1440 },
];

// Laid over the dashboard's stories by ID, so its file is never edited (the dashboard lays it over its own list too).
// Robots at work right now, matching the dashboard's sample: two builds, and three replies on stories in review (its
// "Agent run started" activity). Minutes, not times: this page is rendered ahead of time, and the browser turns them
// into times. Then the Pull request column (Shubham, 26 Nov): hq-53's is ready for Deepak to merge. hq-26 and hq-25 are
// the conflict example (Shubham, 27 Nov): hq-25 is Deepak's, already merged into main; hq-26 is yours, in review, and
// changes the same lines. Creating its pull request checks it against main first, finds the 6 conflicts, and asks
// once; then they're settled (both sides kept), the checks run again and the pull request is created. The refused
// update ("Reconnect GitHub") is still shown on hq-35's demo. And stories that change the same part say so from the
// start.
export const working: Record<number, Partial<StoryItem>> = {
  57: { live: { phase: "implement", minutesAgo: 4 } },
  54: { live: { phase: "ui-check", minutesAgo: 1 } },
  34: { live: { phase: "reply", minutesAgo: 0 } },
  // hq-35, the live story from 17–25 Nov (Shubham, 26 Nov): back in review after a rebuild, waiting for you, with its pull
  // request #38 still on the version before it, as it was for Aakash. So it's under Mine on the dashboard, and its page
  // plays a demo of how main moving on under it is handled now (MainDemo), starting with "Update pull request".
  35: {
    status: "in_review",
    need: "review",
    waitingOn: "You",
    owner: "J",
    action: "Try the preview, then update pull request #38.",
    pr: { state: "open", number: 38 },
    main: { behind: [], checked: "1h ago" },
    updated: "just now",
    updatedMinutes: 0,
  },
  27: { live: { phase: "reply", minutesAgo: 0 } },
  53: { status: "pull_request", need: undefined, waitingOn: undefined, pr: { state: "open", number: 259, merge: "ready" } },
  26: {
    status: "in_review",
    need: "review",
    waitingOn: "You",
    owner: "J",
    action: "Try the preview, then create the pull request.",
    main: { behind: [25], checked: "1h ago", clashes: 6, onPush: true },
    updated: "6m ago",
    updatedMinutes: 6,
  },
  25: {
    status: "done",
    need: undefined,
    waitingOn: undefined,
    owner: "DT",
    outcome: "merged",
    pr: { state: "merged", number: 175 },
    updated: "20m ago",
    updatedMinutes: 20,
  },
  33: { overlaps: [44] },
  44: { overlaps: [33] },
  // A story written the long way, with a pasted spec: the chat folds it to four lines and Story details shows it all
  // (Shubham, 26 Nov).
  // hq-28: the live product's "create a login screen" (hq-73), the example of a first decision (Shubham, 26 Nov).
  28: {
    why: "Nothing more, just a minimal login screen with a few ways in: social accounts, a one-time code, and a username and password.",
  },
  23: {
    why: "New people drop off on the second onboarding screen; most of them never see what WePop is for.",
    detail: [
      "The onboarding today is three static screens and a Skip button. In last month's numbers, 61% of new people leave on screen two, and the ones who stay pick their language only after they've signed up, in Settings. We want onboarding to show the value in the first ten seconds and to speak their language from the first screen.",
      "## Value slider",
      "- Replace the three screens with one horizontal slider of four cards: find events near you, go with friends, host your own, get reminded.",
      "- Each card is an illustration, a headline of at most six words and one line under it.",
      "- Swipe on phones; arrow buttons and the keyboard on the web. Dots under the slider show where you are.",
      "- The last card's button is “Get started”; every card keeps Skip in the top corner.",
      "## Language switch",
      "1. A language button sits in the top corner of every onboarding card, beside Skip.",
      "2. It opens a short list: English, हिन्दी, मराठी, தமிழ். The phone's own language is chosen first when it's one of these.",
      "3. Changing it changes the cards at once, with no reload, and the choice carries into sign-up and the app.",
      "Copy for all four languages is in the onboarding sheet: https://docs.google.com/spreadsheets/d/wepop-onboarding-copy. Illustrations are in the attached files. Keep the slider working with the screen reader: each card is announced with its place, “2 of 4”.",
      "Out of scope: the sign-up form itself, and choosing interests (that's hq-29).",
    ].join("\n\n"),
    files: ["onboarding-cards.png", "language-menu.png"],
  },
};

/** The one person with GitHub access, who checks and merges every pull request (Deepak Tewatia). */
export const MERGER = "DT";

// Teammates behind the owners' initials in the sample stories, so names show on the story page.
const teammates = [
  { id: "skye", name: "Skye Rao", initials: "S" },
  { id: "esha", name: "Esha Nair", initials: "E" },
  { id: "pranav", name: "Pranav Iyer", initials: "P" },
  { id: "meera", name: "Meera Shah", initials: "MS" },
];

export const storiesData: StoriesData = {
  project: dashboardData.project,
  viewer: dashboardData.viewer,
  people: [...dashboardData.people, ...teammates],
  stories: [...dashboardData.stories.map((st) => ({ ...st, ...working[st.id] })), ...finished],
  nextStoryId: dashboardData.nextStoryId,
  merger: MERGER,
};
