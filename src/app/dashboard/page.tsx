"use client";

import * as React from "react";
import Link from "next/link";
import { Cpu, GitBranch, Terminal, Activity, ArrowUpRight, Plus, Sparkles, BookOpen, MessageSquare, Play, Settings, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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
    { event: "Support workflow compiled successfully", time: "10 mins ago" },
    { event: "Knowledge base updated with 3 new docs", time: "2 hours ago" },
    { event: "Sandbox test completed", time: "1 day ago" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 select-none">
        <div className="rounded-2xl border border-border/60 bg-surface/70 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Workspace overview</p>
              <h2 className="font-h1 font-bold text-foreground">Welcome back</h2>
              <p className="text-xs text-muted max-w-2xl">
                Create agents, attach knowledge, and keep your workflows focused without extra visual noise.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/agents/create">
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create Agent
                </Button>
              </Link>
              <Link href="/workflow-builder">
                <Button variant="secondary" size="sm">
                  Open Builder
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <Card key={i} hoverEffect className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{stat.title}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-light text-accent">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                </div>
                <div className="mt-4 text-2xl font-bold tracking-tight text-foreground">{stat.value}</div>
                <p className="mt-1 text-[10px] text-accent">{stat.detail}</p>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-h3 font-bold text-foreground">Start with a template</h3>
              <Link href="/dashboard/templates" className="text-xs font-semibold text-accent hover:underline">
                View all
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { title: "Support Agent", desc: "Handle FAQs and tickets with grounded responses.", icon: Sparkles },
                { title: "Knowledge Assistant", desc: "Answer questions from policy and product docs.", icon: BookOpen },
                { title: "Sales Agent", desc: "Enrich leads and create first-touch messages.", icon: MessageSquare },
              ].map((template) => {
                const Icon = template.icon;
                return (
                  <Link key={template.title} href="/dashboard/templates" className="block">
                    <Card hoverEffect className="h-full p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/20 bg-accent-muted/20 text-accent">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <CardTitle className="mt-3 text-xs font-bold text-foreground">{template.title}</CardTitle>
                      <CardDescription className="mt-2 text-[10px] text-muted leading-relaxed">{template.desc}</CardDescription>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-h3 font-bold text-foreground">Recent work</h3>
              <Link href="/workflow-builder" className="text-xs font-semibold text-accent hover:underline">
                Open builder
              </Link>
            </div>
            <div className="space-y-3">
              {recentFlows.slice(0, 2).map((flow, i) => (
                <Card key={i} hoverEffect className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{flow.name}</p>
                      <p className="mt-1 text-[10px] text-muted">{flow.model} • {flow.nodes} nodes</p>
                    </div>
                    <Badge variant={flow.status === "Active" ? "success" : "secondary"}>{flow.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-4">
              <div className="space-y-3">
                {activityFeed.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted">
                    <CheckCircle className="mt-0.5 h-4 w-4 text-accent" />
                    <div>
                      <p className="text-foreground">{item.event}</p>
                      <p className="mt-0.5 text-[10px] text-muted">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
