import {
  BookOpenText,
  CircleHelp,
  Files,
  FolderOpen,
  Home,
  Landmark,
  MessageSquareText,
  Search,
  Settings,
  Scale,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: typeof Scale;
}

export const primaryNav: NavItem[] = [
  { href: "/app", label: "Overview", shortLabel: "Home", icon: Home },
  { href: "/app/matters", label: "Matters", icon: FolderOpen },
  { href: "/app/research", label: "Research", icon: Search },
  { href: "/app/case-status", label: "Cases", icon: Landmark },
  { href: "/app/documents", label: "Documents", icon: Files },
  { href: "/app/legal-aid", label: "Legal help", icon: CircleHelp },
];

export const secondaryNav: NavItem[] = [
  { href: "/app/assistant", label: "Ask NyayAI", shortLabel: "Ask", icon: MessageSquareText },
  { href: "/app/rights", label: "Know your rights", icon: BookOpenText },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export const mobileNav: NavItem[] = [
  primaryNav[0],
  primaryNav[1],
  secondaryNav[0],
  primaryNav[3],
  { href: "/app/menu", label: "More", icon: Scale },
];

export function navForRole(): NavItem[] {
  return primaryNav;
}
