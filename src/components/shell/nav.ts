import { BookOpen, LayoutDashboard, ListTodo, MessageCircle, PanelsTopLeft, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Pinned to the bottom of the sidebar. */
  foot?: boolean;
}

// Ask PM first: the one place to ask what's happening. Then the prototype's links; Feature pages and Docs
// lead nowhere yet. No bots in the sidebar: the PM is the only one you talk to.
export const NAV: NavItem[] = [
  { href: "/ask", label: "Ask PM", icon: MessageCircle },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stories", label: "Stories", icon: ListTodo },
  { href: "/pages", label: "Feature pages", icon: PanelsTopLeft },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings, foot: true },
];

/** The page's path without a trailing slash, to compare with the links. */
export const currentPath = (pathname: string) => pathname.replace(/\/$/, "") || "/";
