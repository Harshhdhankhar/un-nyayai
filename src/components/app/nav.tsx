import {
  Files,
  FolderKanban,
  Landmark,
  Search,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: typeof Landmark;
}

export const primaryNav: NavItem[] = [
  { href: "/app/case-status", label: "Cases tracker", shortLabel: "Cases", icon: Landmark },
  { href: "/app/case-status?tab=search", label: "Case search", shortLabel: "Search", icon: Search },
  { href: "/app/documents", label: "Doc analyzer", shortLabel: "Docs", icon: Files },
  { href: "/app/matters", label: "Matters", shortLabel: "Matters", icon: FolderKanban },
];

export const secondaryNav: NavItem[] = [];

export const mobileNav: NavItem[] = primaryNav;

export function navForRole(): NavItem[] {
  return primaryNav;
}
