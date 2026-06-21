import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-xs font-semibold text-muted tracking-wide uppercase">
            {label}
          </label>
        )}
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/60 transition-all duration-200 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
            error && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-400 font-medium">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-xs text-muted/80">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
