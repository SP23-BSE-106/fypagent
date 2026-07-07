"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, HelpCircle } from "lucide-react";

import { Sidebar } from "@/components/ui/Sidebar";

interface UserProfile {
  fullName?: string;
  email?: string;
}

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
  const [user, setUser] = React.useState<UserProfile | null>(null)
  const [userLoading, setUserLoading] = React.useState(true)


  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = (await res.json().catch(() => ({}))) as { user?: UserProfile }
        setUser(data.user ?? null)
      } catch {
        setUser(null)
      } finally {
        setUserLoading(false)
      }
    }
    fetchUser()
  }, []);

  React.useEffect(() => {
    if (userLoading) return;
    if (user) return;
    // Not logged in -> force login
    window.location.href = '/login';
  }, [user, userLoading]);



  const getUserInitials = () => {
    if (!user) return "??";
    const name = user.fullName || user.email || "";
    if (name) return name.split(" ").map((p: string) => p[0]).join("").toUpperCase().slice(0, 2);
    return "??";
  };


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

  if (userLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <span className="text-sm text-muted">Loading…</span>
      </div>
    );
  }

  // Avoid rendering restricted UI briefly while redirecting.
  if (!user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <span className="text-sm text-muted">Redirecting to login…</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">

        <header className="relative h-16 flex items-center justify-between px-6 border-b border-border/60 bg-surface/35 backdrop-blur-md flex-shrink-0">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(91,231,196,0.22),transparent_55%)] opacity-60" />
          <div className="relative flex items-center justify-between flex-1">
            <div className="flex items-center gap-4 flex-1">
              <h1 className="text-sm font-bold text-foreground tracking-tight select-none">
                {getPageTitle()}
              </h1>
              <div className="hidden sm:flex max-w-xs w-full relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
                <input
                  type="text"
                  placeholder="Search workflows, agents..."
                  className="w-full bg-surface-light/30 border border-border/40 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all duration-200 hover:border-accent/25"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 relative">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="text-muted hover:text-foreground transition-colors p-1.5 hover:bg-surface-light rounded-md hover:shadow-[0_0_22px_-10px_rgba(91,231,196,0.35)]"
              >
                <GithubIcon className="h-4 w-4" />
              </a>
              <button className="relative text-muted hover:text-foreground transition-colors p-1.5 hover:bg-surface-light rounded-md hover:shadow-[0_0_22px_-10px_rgba(91,231,196,0.35)]">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              </button>
              <Link href="/docs">
                <button className="text-muted hover:text-foreground transition-colors p-1.5 hover:bg-surface-light rounded-md hover:shadow-[0_0_22px_-10px_rgba(91,231,196,0.35)]">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </Link>
              <div className="h-4 w-px bg-border/60 mx-1" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent border border-accent/20">
                  {userLoading ? "..." : getUserInitials()}
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-[linear-gradient(to_bottom,rgba(19,26,35,0.55),rgba(11,15,20,0.35))]">
          <div className="mx-auto max-w-7xl h-full relative">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};