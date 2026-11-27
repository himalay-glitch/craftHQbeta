import { NEED_STATUS, rowAction } from "@/components/dashboard/format";
import { dashboardData as d } from "@/pages/dashboard/_sample-data";
import type { AskData, StoryRef } from "@/types/ask";

// What the chats answer from (demo): the same stories the dashboard shows. Nothing here talks to an API yet.

const ref = (s: (typeof d.stories)[number]): StoryRef => ({
  id: s.id,
  title: s.title,
  status: NEED_STATUS[s.need!],
  detail: rowAction(s) || undefined,
});
const needs = d.stories.filter((s) => s.need);

export const askData: AskData = {
  project: d.project,
  firstName: d.viewer.name.split(" ")[0],
  needsYou: needs.filter((s) => s.waitingOn === "You").map(ref),
  stuck: needs.filter((s) => s.need === "stuck").map(ref),
  review: needs.filter((s) => s.need === "review").map(ref),
  running: d.running.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status === "In progress" ? "building" : "checking",
    detail: r.updated || undefined,
  })),
  // This week's merges: the dashboard's "Shipped this week".
  merged: d.shipped.map((s) => ({ id: s.id, title: s.title, status: "merged", detail: `Merged ${s.when}` })),
  nextStoryId: d.nextStoryId,
};

/** The page's viewer and the top bar's search list (it's a separate island). */
export const askViewer = d.viewer;
export const askSearch = d.stories.map(({ id, title, status }) => ({ id, title, status }));
