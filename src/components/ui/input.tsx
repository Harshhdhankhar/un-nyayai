import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-md border border-ink-200 bg-white px-3 text-sm text-ink-900",
      "placeholder:text-ink-400",
      "focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-100",
      "disabled:cursor-not-allowed disabled:bg-ink-100",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900",
      "placeholder:text-ink-400",
      "focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-100",
      "disabled:cursor-not-allowed disabled:bg-ink-100",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1 block text-xs font-medium text-ink-700", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full appearance-none rounded-md border border-ink-200 bg-white px-3 text-sm text-ink-900",
        "focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-100",
        className
      )}
      {...props}
    />
  );
}
