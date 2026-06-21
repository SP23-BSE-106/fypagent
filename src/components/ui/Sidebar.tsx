"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Cpu,
  GitBranch,
  Database,
  Terminal,
  CloudLightning,
  BarChart3,
  Sliders,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Create Agent", href: "/dashboard/agents/create", icon: Cpu },
    { name: "Workflow Builder", href: "/workflow-builder", icon: GitBranch },
    { name: "Knowledge Base", href: "/dashboard/rag", icon: Database },
    { name: "Testing Sandbox", href: "/testing-sandbox", icon: Terminal },
    { name: "Deployments", href: "/dashboard/deployment", icon: CloudLightning },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Templates", href: "/dashboard/templates", icon: Boxes },
    { name: "Documentation", href: "/docs", icon: BookOpen },
    { name: "Settings", href: "/dashboard/settings", icon: Sliders },
  ];

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 70 : 260 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className={cn(
        "relative flex flex-col h-screen bg-surface border-r border-border/80 flex-shrink-0 text-foreground",
        className
      )}
    >
      {/* Brand logo header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border/40">
        <Link href="/dashboard" className="flex items-center gap-3.5 select-none overflow-hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-[#0B0F14] font-bold shadow-[0_0_15px_rgba(91,231,196,0.25)] flex-shrink-0">
            AF
          </div>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-base font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent tracking-tight whitespace-nowrap"
            >
              AgentFlow
            </motion.span>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-[#0B0F14] hover:bg-surface-light text-muted hover:text-foreground shadow-md transition-colors"
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-lg px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all relative",
                isActive
                  ? "text-accent bg-accent-muted border border-accent/25"
                  : "text-muted hover:bg-surface-light/40 hover:text-foreground border border-transparent"
              )}
            >
              <Icon className={cn("h-4.5 w-4.5 flex-shrink-0", isActive ? "text-accent" : "text-muted group-hover:text-foreground")} />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 }}
                  className="ml-3.5 whitespace-nowrap"
                >
                  {item.name}
                </motion.span>
              )}
              {isCollapsed && (
                <div className="absolute left-16 scale-0 rounded bg-[#0B0F14] border border-border px-2 py-1 text-[10px] text-foreground font-semibold shadow-md group-hover:scale-100 transition-all z-50 pointer-events-none whitespace-nowrap">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Profile Mock */}
      <div className="p-3 border-t border-border/40 bg-surface/30">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-8.5 w-8.5 rounded-full bg-accent/20 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
            JD
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col text-left overflow-hidden"
            >
              <span className="text-xs font-bold text-foreground leading-none">John Doe</span>
              <span className="text-[10px] text-muted truncate mt-1">john@agentflow.ai</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.aside>
  );
};
