import {
  CalendarDays,
  Hourglass,
  Inbox,
  LayoutGrid,
  ListChecks,
  Moon,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Deferred slices render a stub instead of live data. */
  slice?: string;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/agent", label: "Agent", icon: Sparkles },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/waiting", label: "Waiting", icon: Hourglass },
  { href: "/inbox", label: "Inbox", icon: Inbox, slice: "Slice 7" },
  { href: "/review", label: "Review", icon: Moon, slice: "Stage 12" },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
