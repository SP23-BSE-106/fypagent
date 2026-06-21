"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
}) => {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            "absolute z-50 whitespace-nowrap rounded bg-[#0B0F14] border border-border px-2.5 py-1.5 text-[10px] font-semibold text-foreground shadow-md animate-in fade-in-50 duration-150 pointer-events-none",
            {
              "bottom-full left-1/2 -translate-x-1/2 mb-2": position === "top",
              "top-full left-1/2 -translate-x-1/2 mt-2": position === "bottom",
              "right-full top-1/2 -translate-y-1/2 mr-2": position === "left",
              "left-full top-1/2 -translate-y-1/2 ml-2": position === "right",
            }
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
