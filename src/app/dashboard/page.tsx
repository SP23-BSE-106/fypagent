"use client";

import * as React from "react";
import Link from "next/link";
import { Cpu, GitBranch, Terminal, Activity, ArrowUpRight, Plus, Sparkles, BookOpen, MessageSquare, Play, Settings } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function DashboardPage() {
  type DashboardAgent = {
    _id: string;
    name: string;
    status?: string;
    llmProvider?: string | null;
    workflow?: { nodes?: unknown[] } | null;
    updatedAt?: string;
  };

  const [agents, setAgents] = React.useState<DashboardAgent[]>([]);
  const [activeKeys, setActiveKeys] = React.useState(0);
  const [rag, setRag] = React.useState<{ chunks: number; dimension: number } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const loadDashboard = async () => {
      try {
        const [agentsRes, keysRes, ragRes] = await Promise.all([
          fetch("/api/agents", { credentials: "include" }),
          fetch("/api/settings/api-keys", { credentials: "include" }),
          fetch("/api/rag/status", { credentials: "include" }),
        ]);
        if ([agentsRes, keysRes, ragRes].some((response) => response.status === 401)) {
          throw new Error("Your session has expired. Please log in again.");
        }
        if ([agentsRes, keysRes, ragRes].some((response) => !response.ok)) {
          throw new Error("Some workspace data could not be loaded.");
        }
        const [agentsData, keysData, ragData] = await Promise.all([
          agentsRes.json(),
          keysRes.json(),
          ragRes.json(),
        ]);
        if (cancelled) return;
        setAgents(Array.isArray(agentsData) ? agentsData : []);
        setActiveKeys(Array.isArray(keysData.keys) ? keysData.keys.length : 0);
        setRag({
          chunks: Number(ragData.knowledge_base?.chunks || 0),
          dimension: Number(ragData.knowledge_base?.embedding_dimension || 0),
        });
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadDashboard();
    return () => { cancelled = true; };
  }, []);

  const embeddingBytes = (rag?.chunks || 0) * (rag?.dimension || 0) * 4;
  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const stats = [
    { title: "Total Agents", value: loading ? "—" : String(agents.length), detail: `${agents.filter((agent) => agent.status === "active").length} active`, icon: Cpu },
    { title: "Flow Executions", value: "Not tracked", detail: "No execution history stored", icon: Activity },
    { title: "Active Keys", value: loading ? "—" : String(activeKeys), detail: "Personal API keys", icon: Terminal },
    { title: "Memory (Embeddings)", value: loading ? "—" : formatBytes(embeddingBytes), detail: `${rag?.chunks || 0} indexed chunks`, icon: GitBranch },
  ];

  const recentFlows = [...agents]
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 2);

  return (
    <DashboardLayout>
      <div className="space-y-6 select-none">
        {error && <p className="text-xs text-red-400">{error}</p>}
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
              {recentFlows.length === 0 && !loading && (
                <Card className="p-4 text-xs text-muted">No agents created yet.</Card>
              )}
              {recentFlows.map((flow) => (
                <Card key={flow._id} hoverEffect className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{flow.name}</p>
                      <p className="mt-1 text-[10px] text-muted">{flow.llmProvider || "Provider not set"} • {flow.workflow?.nodes?.length || 0} nodes</p>
                    </div>
                    <Badge variant={flow.status === "active" ? "success" : "secondary"}>{flow.status || "draft"}</Badge>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-4 text-xs text-muted">
              Activity history will appear here once execution events are stored.
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
