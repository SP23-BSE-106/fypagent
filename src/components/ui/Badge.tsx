import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "error" | "info" | "accent";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2",
        {
          "bg-accent/10 border-accent/20 text-accent": variant === "default" || variant === "accent",
          "bg-surface-light border-border text-foreground": variant === "secondary",
          "border-border bg-transparent text-foreground": variant === "outline",
          "bg-emerald-500/10 border-emerald-500/20 text-emerald-400": variant === "success",
          "bg-amber-500/10 border-amber-500/20 text-amber-400": variant === "warning",
          "bg-red-500/10 border-red-500/20 text-red-400": variant === "error",
          "bg-sky-500/10 border-sky-500/20 text-sky-400": variant === "info",
        },
        className
      )}
      {...props}
    />
  );
}
