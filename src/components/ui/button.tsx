"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-foreground disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-xs",
  secondary:
    "bg-paper-warm text-foreground border border-border hover:bg-[#ede9df] focus-visible:ring-border cursor-pointer",
  ghost:
    "bg-transparent text-foreground hover:bg-paper-warm focus-visible:ring-border cursor-pointer",
  outline:
    "border border-border bg-white text-foreground hover:bg-paper-warm hover:border-foreground/60 focus-visible:ring-border cursor-pointer shadow-2xs",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 cursor-pointer shadow-xs",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";
