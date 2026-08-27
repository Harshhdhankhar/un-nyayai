"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "nav" | "hero";
  className?: string;
  href?: string;
}

export function Logo({ size = "nav", className = "", href }: LogoProps) {
  const isHero = size === "hero";

  const content = (
    <span
      className={cn(
        "logo group inline-flex select-none items-baseline font-mono tracking-tight",
        isHero ? "text-5xl sm:text-7xl font-bold" : "text-base font-bold",
        className
      )}
      aria-label="unnyayai"
    >
      <span className="logo__struck mr-0.5">
        un
        <span className="logo__strike" aria-hidden="true" />
      </span>
      <span className="text-foreground">nyayai</span>
      <span className="logo__caret ml-0.5 text-foreground" aria-hidden="true">
        _
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
        {content}
      </Link>
    );
  }

  return content;
}
