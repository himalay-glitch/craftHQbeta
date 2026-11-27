import { BookOpen, LayoutDashboard, ListTodo, MessageCircle, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Pinned to the bottom of the sidebar. */
  foot?: boolean;
}

// Ask PM first: the one place to ask what's happening. Then the dashboard and the stories. The bots follow in the
// sidebar itself (Sidebar.tsx). Feature pages are gone from here (Shubham, 26 Nov): they had no page, and a story's
// specification and engineering pages live on that story's page, in its Activity. Docs, the guides on how to use CraftHQ,
// has its own page (src/pages/docs.astro) and sits at the bottom with Connectors, out of the way of the daily work at
// the top but always one click away (Shubham, 26 Nov). Settings isn't here either
// (Shubham, 26 Nov): it's in the account menu under your avatar, top right, the one place for "you" at every width.
export const NAV: NavItem[] = [
  { href: "/ask", label: "Ask PM", icon: MessageCircle },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stories", label: "Stories", icon: ListTodo },
  { href: "/docs", label: "Docs", icon: BookOpen, foot: true },
];

/** The page's path without a trailing slash, to compare with the links. */
export const currentPath = (pathname: string) => pathname.replace(/\/$/, "") || "/";

/** Whether a link is the page you're on or the section it's in: a story's page (/stories/hq-43) is under Stories, an
 *  article under Docs (Shubham, 27 Nov: talking with the agent on a story, Stories wasn't marked). */
export const isCurrent = (path: string, href: string) => path === href || path.startsWith(`${href}/`);
