"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownContextProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const DropdownContext = React.createContext<DropdownContextProps | null>(null);

export interface DropdownProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Dropdown: React.FC<DropdownProps> = ({ children, className, ...props }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen }}>
      <div
        ref={containerRef}
        className={cn("relative inline-block text-left", className)}
        {...props}
      >
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

export const DropdownTrigger: React.FC<{ children: React.ReactElement<any> }> = ({ children }) => {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error("DropdownTrigger must be used inside Dropdown");

  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      children.props.onClick?.(e);
      context.setIsOpen(!context.isOpen);
    },
  });
};

export interface DropdownMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "right";
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  className,
  align = "right",
  children,
  ...props
}) => {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error("DropdownMenu must be used inside Dropdown");

  if (!context.isOpen) return null;

  return (
    <div
      className={cn(
        "absolute z-50 mt-2 w-56 rounded-lg border border-border bg-surface-light p-1 shadow-lg ring-1 ring-black/5 focus:outline-none animate-in fade-in-50 slide-in-from-top-1 duration-150",
        align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  className,
  children,
  icon,
  onClick,
  ...props
}) => {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error("DropdownItem must be used inside Dropdown");

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center rounded-md px-3 py-2 text-xs font-medium text-foreground/90 transition-colors hover:bg-surface hover:text-accent focus:bg-surface focus:text-accent focus:outline-none",
        className
      )}
      onClick={(e) => {
        onClick?.(e);
        context.setIsOpen(false);
      }}
      {...props}
    >
      {icon && <span className="mr-2.5 h-3.5 w-3.5 text-muted">{icon}</span>}
      {children}
    </button>
  );
};
