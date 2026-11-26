import { LayoutDashboard, ListTodo, MessageCircle, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Pinned to the bottom of the sidebar. */
  foot?: boolean;
}

// Ask PM first: the one place to ask what's happening. Then the dashboard and the stories. The bots follow in the
// sidebar itself (Sidebar.tsx). Feature pages and Docs are gone from here (Shubham, 26 Nov): neither had a page, and a
// story's specification and engineering pages live on that story's page, in its Activity. Settings isn't here either
// (Shubham, 26 Nov): it's in the account menu under your avatar, top right, the one place for "you" at every width.
export const NAV: NavItem[] = [
  { href: "/ask", label: "Ask PM", icon: MessageCircle },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stories", label: "Stories", icon: ListTodo },
];

/** The page's path without a trailing slash, to compare with the links. */
export const currentPath = (pathname: string) => pathname.replace(/\/$/, "") || "/";
