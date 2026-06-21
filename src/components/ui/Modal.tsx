"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}) => {
  React.useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.body.style.overflow = "unset";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          "relative z-50 flex flex-col w-full rounded-xl border border-border bg-surface shadow-2xl p-6 transition-all duration-300 animate-in zoom-in-95 max-h-[90vh]",
          {
            "max-w-sm": size === "sm",
            "max-w-md": size === "md",
            "max-w-lg": size === "lg",
            "max-w-2xl": size === "xl",
          }
        )}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4.5 top-4.5 text-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        {(title || description) && (
          <div className="mb-4 pr-6">
            {title && <h2 className="font-h3 font-semibold text-foreground">{title}</h2>}
            {description && <p className="text-xs text-muted mt-1">{description}</p>}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-2 text-sm text-foreground/90">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/40 pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
