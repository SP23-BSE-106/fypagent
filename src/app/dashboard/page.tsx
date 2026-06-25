"use client";

import * as React from "react";
import Link from "next/link";
import { Cpu, GitBranch, Terminal, Activity, ArrowUpRight, Play, Settings, Plus, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

type ChapterHeaderProps = {
  step: string;
  title: string;
  subtitle: string;
};

function DashboardChapterHeader({ step, title, subtitle }: ChapterHeaderProps) {
  const [tilt, setTilt] = React.useState({ rx: 0, ry: 0 });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-surface/20 glass-panel">
      {/* ambient accents */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(91,231,196,0.18),transparent_45%),radial-gradient(circle_at_85%_40%,rgba(56,189,248,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent-muted blur-2xl opacity-80" />
      <div className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-[rgba(56,189,248,0.08)] blur-2xl opacity-70" />

      <div className="relative p-6 sm:p-8">
        <div
          className="transition-transform duration-200 will-change-transform"
          style={{
            transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          }}
          onMouseMove={(e) => {
            const el = e.currentTarget;
            const rect = el.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width; // 0..1
            const py = (e.clientY - rect.top) / rect.height; // 0..1
            const ry = (px - 0.5) * 8; // left/right tilt
            const rx = (0.5 - py) * 6; // up/down tilt
            setTilt({ rx, ry });
          }}
          onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl border border-accent/20 bg-[rgba(91,231,196,0.08)] flex items-center justify-center text-accent font-black">
                  {step}
                </div>
                <div className="h-px w-10 bg-gradient-to-r from-accent/70 to-transparent" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
                  Chapter
                </p>
              </div>
              <h2 className="font-h1 font-bold text-foreground">{title}</h2>
              <p className="text-xs text-muted max-w-2xl">{subtitle}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border/60 bg-surface/20 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-semibold text-foreground/80">Story mode</span>
              </div>
              <div className="hidden md:flex h-10 w-10 rounded-xl border border-border/60 bg-surface/20 items-center justify-center">
                <span className="text-accent font-black text-lg">▣</span>
              </div>
            </div>
          </div>
        </div>

        {/* divider line */}
        <div className="mt-6 h-px w-full bg-gradient-to-r from-accent/50 via-border/40 to-transparent" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const stats = [
    { title: "Total Agents", value: "8", detail: "+2 this week", icon: Cpu },
    { title: "Flow Executions", value: "48,291", detail: "+12.4% vs last week", icon: Activity },
    { title: "Active Keys", value: "3", detail: "Endpoints running", icon: Terminal },
    { title: "Memory (Embeddings)", value: "184 MB", detail: "Indexed RAG store", icon: GitBranch },
  ];

  const recentFlows = [
    {
      name: "Customer Support Agent",
      nodes: 7,
      status: "Active",
      updated: "2 hours ago",
      model: "GPT-4o",
      description: "Classifies incoming emails, searches vector storage docs, and suggests replies.",
    },
    {
      name: "GitHub PR Reviewer",
      nodes: 5,
      status: "Active",
      updated: "1 day ago",
      model: "Claude 3.5 Sonnet",
      description: "Triggered on webhook pull requests, flags code formatting, and runs security checks.",
    },
    {
      name: "Lead Qualification Engine",
      nodes: 9,
      status: "Draft",
      updated: "3 days ago",
      model: "Llama 3.1 70B",
      description: "Fetches user signup info, queries LinkedIn, and creates CRM lead files.",
    },
  ];

  const activityFeed = [
    { event: "Workflow Customer Support compiled successfully", time: "10 mins ago", type: "success" },
    { event: "Agent Lead Gen deployed to production widget", time: "2 hours ago", type: "info" },
    { event: "RAG index 'UserGuide.pdf' completed (48 chunks)", time: "5 hours ago", type: "success" },
    { event: "Sandbox connection test: DeepSeek V3 API successful", time: "1 day ago", type: "success" },
  ];

  return (
    <DashboardLayout>
      <DashboardChapterHeader
        step="01"
        title="Overview"
        subtitle="Your orchestration workspace comes alive—agents, workflows, deployments, and analytics in one story."
      />
      <div className="space-y-8 select-none">
        {/* Welcome Callout Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-left">
            <h2 className="font-h1 font-bold text-foreground">Welcome to AgentFlow</h2>
            <p className="text-xs text-muted mt-1">
              Your orchestration workspace is active. Create collaborative workflows or inspect your deployment API endpoints.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/templates">
              <Button variant="secondary" size="sm">
                Browse Templates
              </Button>
            </Link>
            <Link href="/workflow-builder">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                New Workflow
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} hoverEffect>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider">{stat.title}</span>
                  <div className="h-8 w-8 rounded-lg bg-surface-light flex items-center justify-center text-accent">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                </CardHeader>
                <CardContent className="text-left">
                  <div className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</div>
                  <p className="text-[10px] text-accent mt-1.5 font-medium">{stat.detail}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Mid Grid: Recent Projects & Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Projects List */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <div className="flex items-center justify-between">
              <h3 className="font-h3 font-bold text-foreground">Recent Agent Workflows</h3>
              <Link href="/workflow-builder" className="text-xs text-accent hover:underline font-semibold flex items-center">
                Open Canvas <ArrowUpRight className="h-3 w-3 ml-0.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {recentFlows.map((flow, i) => (
                <Card key={i} hoverEffect className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <Link href="/workflow-builder">
                          <CardTitle className="text-xs font-bold text-foreground hover:text-accent cursor-pointer transition-colors">
                            {flow.name}
                          </CardTitle>
                        </Link>
                        <CardDescription className="text-[10px]">{flow.model} • {flow.nodes} Nodes</CardDescription>
                      </div>
                      <Badge variant={flow.status === "Active" ? "success" : "secondary"}>
                        {flow.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-0">
                    <p className="text-xs text-muted leading-relaxed line-clamp-2">
                      {flow.description}
                    </p>
                  </CardContent>
                  <div className="p-6 pt-4 border-t border-border/40 mt-4 flex items-center justify-between text-[10px] text-muted">
                    <span>Updated {flow.updated}</span>
                    <div className="flex gap-2">
                      <Link href="/testing-sandbox">
                        <button className="p-1 hover:text-accent transition-colors"><Play className="h-3.5 w-3.5" /></button>
                      </Link>
                      <Link href="/workflow-builder">
                        <button className="p-1 hover:text-foreground transition-colors"><Settings className="h-3.5 w-3.5" /></button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}

              {/* Quick Create Card */}
              <div className="border border-dashed border-border/80 hover:border-accent/40 rounded-xl bg-surface/10 hover:bg-surface-light/10 flex flex-col items-center justify-center p-8 text-center transition-all cursor-pointer group">
                <Link href="/workflow-builder" className="flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full border border-dashed border-border group-hover:border-accent/40 bg-surface flex items-center justify-center text-muted group-hover:text-accent mb-3 transition-colors">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">Create New Flow</span>
                  <span className="text-[10px] text-muted mt-1 max-w-[160px]">Drag & drop node blocks to model logical chains.</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Activity Feed Sidebar */}
          <div className="space-y-4 text-left">
            <h3 className="font-h3 font-bold text-foreground">Workspace Activities</h3>
            <Card className="p-5 h-full">
              <div className="space-y-4.5">
                {activityFeed.map((act, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <CheckCircle className="h-4.5 w-4.5 text-accent mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-foreground/90 font-medium leading-normal">{act.event}</span>
                      <span className="text-[10px] text-muted mt-1">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/40 mt-6 pt-4 text-center">
                <Link href="/testing-sandbox">
                  <Button variant="ghost" size="sm" className="w-full text-xs font-semibold">
                    View Execution Logs
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
