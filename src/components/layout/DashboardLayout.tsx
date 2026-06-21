"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, HelpCircle } from "lucide-react";
import { Sidebar } from "@/components/ui/Sidebar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    {...props}
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();

  // Determine current page section title
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Overview";
    if (pathname.includes("/agents/create")) return "Agent Creator";
    if (pathname.includes("/rag")) return "Knowledge Base (RAG)";
    if (pathname.includes("/deployment")) return "Deployment Center";
    if (pathname.includes("/analytics")) return "System Analytics";
    if (pathname.includes("/settings")) return "Global Settings";
    if (pathname.includes("/templates")) return "Template Marketplace";
    return "Dashboard";
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Panel View */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Top Control Bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border/60 bg-surface/40 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-sm font-bold text-foreground tracking-tight select-none">
              {getPageTitle()}
            </h1>
            <div className="hidden sm:flex max-w-xs w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                placeholder="Search workflows, agents..."
                className="w-full bg-surface-light/40 border border-border/40 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-muted hover:text-foreground transition-colors p-1.5 hover:bg-surface-light rounded-md"
            >
              <GithubIcon className="h-4 w-4" />
            </a>
            
            <button className="relative text-muted hover:text-foreground transition-colors p-1.5 hover:bg-surface-light rounded-md">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            </button>

            <Link href="/docs">
              <button className="text-muted hover:text-foreground transition-colors p-1.5 hover:bg-surface-light rounded-md">
                <HelpCircle className="h-4 w-4" />
              </button>
            </Link>

            <div className="h-4 w-[1px] bg-border/60 mx-1" />

            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-accent/25 flex items-center justify-center text-[10px] font-bold text-accent border border-accent/20">
                JD
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-background/50">
          <div className="mx-auto max-w-7xl h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
