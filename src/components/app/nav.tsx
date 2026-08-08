import Link from "next/link";
import {
  FolderKanban,
  MessageSquare,
  Landmark,
  ShieldQuestion,
  HeartHandshake,
  GitCompareArrows,
  Settings,
  Search,
  Scale,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof Scale;
}

const citizenNav: NavItem[] = [
  { href: "/app", label: "Overview", icon: FolderKanban },
  { href: "/app/assistant", label: "Ask NyayAI", icon: MessageSquare },
  { href: "/app/matters", label: "My matters", icon: FolderKanban },
  { href: "/app/case-status", label: "Check a case", icon: Landmark },
  { href: "/app/rights", label: "Know my rights", icon: ShieldQuestion },
  { href: "/app/legal-aid", label: "Free legal aid", icon: HeartHandshake },
  { href: "/app/law-compare", label: "Old vs new law", icon: GitCompareArrows },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const advocateNav: NavItem[] = [
  { href: "/app", label: "Overview", icon: FolderKanban },
  { href: "/app/matters", label: "Matters", icon: FolderKanban },
  { href: "/app/research", label: "Research", icon: Search },
  { href: "/app/case-status", label: "Case status", icon: Landmark },
  { href: "/app/law-compare", label: "Law compare", icon: GitCompareArrows },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function navForRole(role: string): NavItem[] {
  return role === "advocate" ? advocateNav : citizenNav;
}
