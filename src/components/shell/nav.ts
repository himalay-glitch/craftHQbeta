import { BookOpen, LayoutDashboard, ListTodo, PanelsTopLeft, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Pinned to the bottom of the sidebar. */
  foot?: boolean;
}

// The prototype's links. Only the dashboard is built; the others are shown as agreed and lead nowhere yet.
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stories", label: "Stories", icon: ListTodo },
  { href: "/pages", label: "Feature pages", icon: PanelsTopLeft },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings, foot: true },
];

/** The page's path without a trailing slash, to compare with the links. */
export const currentPath = (pathname: string) => pathname.replace(/\/$/, "") || "/";
