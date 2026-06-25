"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();

  const publicLinks = [
    { name: "Docs", href: "/docs" },
    { name: "Marketplace", href: "/dashboard/templates" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center ">
            <img
              src="/logo1.png"
              alt="AgentFlow"
              style={{ objectFit: "contain", background: "transparent" }}
              className="h-10 w-10 rounded-lg overflow-hidden"
            />

            <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">

              AgentFlow
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {publicLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "text-xs font-semibold tracking-wide uppercase transition-colors",
                  pathname === link.href
                    ? "text-accent"
                    : "text-muted hover:text-foreground"
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3.5">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground transition-colors"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer menu */}
      {isOpen && (
        <div className="md:hidden border-b border-border bg-surface/95 backdrop-blur-md px-4 py-4 space-y-3.5 animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-3">
            {publicLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "text-sm font-semibold tracking-wide uppercase py-1.5 transition-colors",
                  pathname === link.href ? "text-accent" : "text-muted"
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>
          <div className="h-[1px] bg-border/50" />
          <div className="flex flex-col gap-2 pt-1.5">
            <Link href="/login" onClick={() => setIsOpen(false)} className="w-full">
              <Button variant="secondary" className="w-full" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/signup" onClick={() => setIsOpen(false)} className="w-full">
              <Button className="w-full" size="sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
