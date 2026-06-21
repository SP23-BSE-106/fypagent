import * as React from "react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "warning" | "destructive" | "success" | "info";
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
          {
            "bg-surface border-border text-foreground": variant === "default",
            "bg-amber-500/5 border-amber-500/25 text-amber-400 [&>svg]:text-amber-400": variant === "warning",
            "bg-red-500/5 border-red-500/25 text-red-400 [&>svg]:text-red-400": variant === "destructive",
            "bg-emerald-500/5 border-emerald-500/25 text-emerald-400 [&>svg]:text-emerald-400": variant === "success",
            "bg-sky-500/5 border-sky-500/25 text-sky-400 [&>svg]:text-sky-400": variant === "info",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn("mb-1 font-semibold text-sm leading-none tracking-tight", className)}
      {...props}
    />
  )
);
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-xs text-muted/90 [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
);
AlertDescription.displayName = "AlertDescription";
