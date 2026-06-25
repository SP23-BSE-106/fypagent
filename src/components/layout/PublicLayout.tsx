"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/ui/Navbar";

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-grow">{children}</main>

      {/* Public Footer */}
      <footer className="relative border-t border-border/80 bg-surface/30 py-12 overflow-hidden">
        {/* subtle accent halo */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-[800px] rounded-full bg-accent/10 blur-[90px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.02] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:60px_60px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden border-0 bg-transparent">
                <img
              src="/logo1.png"
              alt="AgentFlow"
              style={{ objectFit: "contain", background: "transparent" }}
              className="h-10 w-10 rounded-lg overflow-hidden"
            />

                  <div className="pointer-events-none absolute inset-0 opacity-0" />
                </div>
                <span className="text-base font-bold text-foreground">AgentFlow</span>
              </div>
              <p className="text-xs text-muted max-w-xs leading-relaxed">
                Next-generation orchestration platform to design, test, and deploy collaborative multi-agent teams.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4 relative pl-3">
                <span className="absolute left-0 top-1 h-3 w-1 rounded-full bg-accent" />
                Product
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link
                    href="/workflow-builder"
                    className="text-muted hover:text-accent transition-colors relative px-1 py-0.5 rounded-md hover:bg-accent-muted"
                  >
                    Workflow Builder
                  </Link>
                </li>
                <li>
                  <Link
                    href="/testing-sandbox"
                    className="text-muted hover:text-accent transition-colors relative px-1 py-0.5 rounded-md hover:bg-accent-muted"
                  >
                    Testing Sandbox
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/templates"
                    className="text-muted hover:text-accent transition-colors relative px-1 py-0.5 rounded-md hover:bg-accent-muted"
                  >
                    Templates
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4 relative pl-3">
                <span className="absolute left-0 top-1 h-3 w-1 rounded-full bg-accent" />
                Resources
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link
                    href="/docs"
                    className="text-muted hover:text-accent transition-colors relative px-1 py-0.5 rounded-md hover:bg-accent-muted"
                  >
                    API Docs
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="text-muted hover:text-accent transition-colors relative px-1 py-0.5 rounded-md hover:bg-accent-muted"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-muted hover:text-accent transition-colors relative px-1 py-0.5 rounded-md hover:bg-accent-muted"
                  >
                    Contact Support
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4 relative pl-3">
                <span className="absolute left-0 top-1 h-3 w-1 rounded-full bg-accent" />
                Legal
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <span className="text-muted hover:text-foreground transition-colors cursor-pointer">
                    Privacy Policy
                  </span>
                </li>
                <li>
                  <span className="text-muted hover:text-foreground transition-colors cursor-pointer">
                    Terms of Service
                  </span>
                </li>
                <li>
                  <span className="text-muted hover:text-foreground transition-colors cursor-pointer">
                    License Agreement
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/40 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-muted gap-4">
            <span className="tracking-wide">&copy; {new Date().getFullYear()} AgentFlow Inc. All rights reserved.</span>

            <div className="flex gap-3 items-center">
              {["Twitter", "GitHub", "Discord"].map((s) => (
                <span
                  key={s}
                  className="px-3 py-1.5 rounded-full border border-border/40 bg-surface/10 hover:border-accent/30 hover:text-foreground transition-all hover:shadow-[0_0_22px_-10px_rgba(91,231,196,0.25)] cursor-pointer"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
