"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, HelpCircle } from "lucide-react";

import { Sidebar } from "@/components/ui/Sidebar";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { ExpirationLockModal } from "@/components/billing/ExpirationLockModal";

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

/** Pages the header search can reach. Client-side only, so it is instant and works offline. */
const SEARCHABLE_PAGES = [
  { title: "Dashboard", href: "/dashboard", keywords: "home overview workspace" },
  { title: "My Agents", href: "/dashboard/agents", keywords: "agents list saved" },
  { title: "Create Agent", href: "/dashboard/agents/create", keywords: "new build generate" },
  { title: "Workflow Builder", href: "/workflow-builder", keywords: "canvas nodes graph editor" },
  { title: "Testing Sandbox", href: "/testing-sandbox", keywords: "test run trace execute" },
  { title: "Knowledge Base", href: "/dashboard/rag", keywords: "rag documents vector upload embeddings" },
  { title: "Deployments", href: "/dashboard/deployment", keywords: "api keys endpoint deploy" },
  { title: "Execution Monitor", href: "/dashboard/analytics", keywords: "analytics monitoring runs latency metrics" },
  { title: "Templates", href: "/dashboard/templates", keywords: "marketplace presets" },
  { title: "Billing", href: "/dashboard/payment", keywords: "payment stripe subscription price plan" },
  { title: "Profile", href: "/dashboard/profile", keywords: "account avatar email password" },
  { title: "Settings", href: "/dashboard/settings", keywords: "preferences configuration" },
  { title: "Documentation", href: "/docs", keywords: "docs api reference help guide" },
];

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<UserProfile | null>(null)
  const [userLoading, setUserLoading] = React.useState(true)
  // The header search box used to be an input with no handler at all — typing
  // into it did nothing anywhere in the app. It now navigates to a match.
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  // The bell used to pulse a decorative dot forever. It now reflects real
  // failures out of the execution monitor, and only once that has loaded.
  const [failedRuns, setFailedRuns] = React.useState(0);
  const [runsLoaded, setRunsLoaded] = React.useState(false);
  const [density, setDensity] = React.useState<'comfortable' | 'compact'>('comfortable');

  React.useEffect(() => {
    fetch('/api/settings/workspace')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings?.appearance?.density === 'compact') setDensity('compact');
      })
      .catch(() => undefined);
  }, []);


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

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/agents/runs', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && data.summary) {
          setFailedRuns(Number(data.summary.failed) || 0);
        }
      })
      .catch(() => {
        /* the header must still render if monitoring is unreachable */
      })
      .finally(() => {
        if (!cancelled) setRunsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);




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

  const goToPage = (href: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(href);
  };

  const trimmedSearch = searchQuery.trim().toLowerCase();
  const searchMatches = trimmedSearch
    ? SEARCHABLE_PAGES.filter((page) =>
        `${page.title} ${page.keywords}`.toLowerCase().includes(trimmedSearch),
      ).slice(0, 6)
    : [];

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
                  placeholder="Search pages… (Enter to open)"
                  aria-label="Search pages"
                  className="w-full bg-surface-light/30 border border-border/40 rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all duration-200 hover:border-accent/25"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setSearchOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchMatches.length > 0) {
                      e.preventDefault();
                      goToPage(searchMatches[0].href);
                    } else if (e.key === "Escape") {
                      setSearchOpen(false);
                    }
                  }}
                />
                {searchOpen && searchMatches.length > 0 && (
                  <ul className="absolute left-0 top-full mt-1 w-full z-50 rounded-lg border border-border/60 bg-surface shadow-xl overflow-hidden">
                    {searchMatches.map((page) => (
                      <li key={page.href}>
                        <button
                          type="button"
                          // mousedown fires before blur, so navigation wins the race.
                          onMouseDown={(e) => {
                            e.preventDefault();
                            goToPage(page.href);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-surface-light transition-colors"
                        >
                          {page.title}
                          <span className="ml-2 text-[10px] text-muted">{page.href}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 relative">
              <a
                href="https://github.com/SP23-BSE-106/fypagent"
                target="_blank"
                rel="noreferrer"
                aria-label="Open the project repository"
                className="text-muted hover:text-foreground transition-colors p-1.5 hover:bg-surface-light rounded-md hover:shadow-[0_0_22px_-10px_rgba(91,231,196,0.35)]"
              >
                <GithubIcon className="h-4 w-4" />
              </a>
              <Link
                href="/dashboard/analytics"
                aria-label={
                  failedRuns > 0
                    ? `Monitoring: ${failedRuns} failed run${failedRuns === 1 ? "" : "s"}`
                    : "Open the execution monitor"
                }
                title={
                  failedRuns > 0
                    ? `${failedRuns} failed run${failedRuns === 1 ? "" : "s"} — open monitoring`
                    : "Open monitoring"
                }
                className="relative text-muted hover:text-foreground transition-colors p-1.5 hover:bg-surface-light rounded-md hover:shadow-[0_0_22px_-10px_rgba(91,231,196,0.35)]"
              >
                <Bell className="h-4 w-4" />
                {runsLoaded && failedRuns > 0 && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                )}
              </Link>
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
        <TrialBanner />
        <ExpirationLockModal />
        <main className={`flex-1 overflow-y-auto ${density === 'compact' ? 'p-4' : 'p-6'} bg-[linear-gradient(to_bottom,rgba(19,26,35,0.55),rgba(11,15,20,0.35))]`}>
          <div className="mx-auto max-w-7xl h-full relative">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};