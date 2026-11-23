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
  { id: 9, title: "Old onboarding carousel", status: "cancelled", owner: "R", updated: "14d ago", updatedMinutes: 14 * 1440 },
];

// Robots at work right now, by story, matching the dashboard's sample: two builds, and three replies on stories
// in review (its "Agent run started" activity). Laid over the dashboard's stories by ID, so its file is never
// edited. Minutes, not times: this page is rendered ahead of time, and the browser turns them into times.
export const working: Record<number, Partial<StoryItem>> = {
  57: { live: { phase: "implement", minutesAgo: 4 } },
  54: { live: { phase: "ui-check", minutesAgo: 1 } },
  34: { live: { phase: "reply", minutesAgo: 0 } },
  35: { live: { phase: "reply", minutesAgo: 0 } },
  27: { live: { phase: "reply", minutesAgo: 0 } },
};

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
};
