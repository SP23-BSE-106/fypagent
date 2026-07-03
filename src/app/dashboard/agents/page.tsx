"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus, Cpu, ArrowUpRight, Trash2, Play, Calendar,
  Layers, ChevronRight, Loader2, AlertTriangle, Tag
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Agent } from "@/lib/mongo/agent";

type AgentRow = Omit<Agent, "_id"> & { _id: string };

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  groq: "Groq",
  gemini: "Gemini",
  cohere: "Cohere",
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-2xl border border-dashed border-border/80 bg-surface flex items-center justify-center mb-5">
        <Cpu className="h-7 w-7 text-muted" />
      </div>
      <h3 className="font-bold text-foreground text-sm">No agents yet</h3>
      <p className="text-[11px] text-muted mt-1 max-w-xs">
        Create your first AI agent using our Nemotron Nano workflow generator.
      </p>
      <Link href="/dashboard/agents/create" className="mt-5">
        <Button size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Create Agent
        </Button>
      </Link>
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = React.useState<AgentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);

  // ── Fetch agents ────────────────────────────────────────────────────────
  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/agents");
        if (!res.ok) throw new Error("Failed to load agents.");
        const data = await res.json();
        setAgents(data as AgentRow[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Delete agent ────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this agent? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      setAgents((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none text-left">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-h1 font-bold text-foreground flex items-center gap-2">
              <Cpu className="h-5 w-5 text-accent" />
              My Agents
            </h2>
            <p className="text-xs text-muted">
              All agents you have created. Click &quot;Open in Canvas&quot; to edit the workflow graph.
            </p>
          </div>
          <Link href="/dashboard/agents/create">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Agent
            </Button>
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 gap-3">
            <Loader2 className="h-5 w-5 text-accent animate-spin" />
            <span className="text-xs text-muted">Loading agents…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <Card className="p-5 border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4.5 w-4.5 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          </Card>
        )}

        {/* Empty state */}
        {!loading && !error && agents.length === 0 && <EmptyState />}

        {/* Agents grid */}
        {!loading && !error && agents.length > 0 && (
          <>
            {/* Summary bar */}
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                {agents.length} Agent{agents.length !== 1 ? "s" : ""}
              </span>
              <span className="text-border/60">·</span>
              <span className="text-[10px] text-muted">
                {agents.filter((a) => a.status === "active").length} Active
              </span>
              <span className="text-[10px] text-muted">
                {agents.filter((a) => a.status !== "active").length} Draft
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {agents.map((agent) => {
                const nodeCount = agent.workflow?.nodes?.length ?? 0;
                const providerLabel = PROVIDER_LABELS[agent.llmProvider ?? ""] ?? agent.llmProvider ?? "—";

                return (
                  <Card
                    key={agent._id}
                    hoverEffect
                    className="flex flex-col justify-between"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <CardTitle className="text-xs font-bold text-foreground truncate">
                            {agent.name}
                          </CardTitle>
                          <CardDescription className="text-[10px] line-clamp-2">
                            {agent.description || agent.prompt?.slice(0, 80) || "No description"}
                          </CardDescription>
                        </div>
                        <Badge variant={agent.status === "active" ? "success" : "secondary"} className="flex-shrink-0">
                          {agent.status === "active" ? "Active" : "Draft"}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="py-0 space-y-3">
                      {/* Stats row */}
                      <div className="flex items-center gap-4 text-[10px] text-muted">
                        <span className="flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {nodeCount} node{nodeCount !== 1 ? "s" : ""}
                        </span>
                        {agent.llmProvider && (
                          <span className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            {providerLabel}
                          </span>
                        )}
                        <span className="flex items-center gap-1 ml-auto">
                          <Calendar className="h-3 w-3" />
                          {formatDate(agent.createdAt)}
                        </span>
                      </div>

                      {/* Tags */}
                      {agent.tags && agent.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {agent.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-0.5 text-[9px] border border-border/50 rounded px-1.5 py-0.5 text-muted"
                            >
                              <Tag className="h-2.5 w-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>

                    {/* Actions footer */}
                    <div className="p-6 pt-4 border-t border-border/40 mt-4 flex items-center justify-between gap-2">
                      <Link href="/workflow-builder" className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full text-[10px]">
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                          Open Canvas
                        </Button>
                      </Link>
                      <Link href="/testing-sandbox">
                        <button className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent-muted/30 transition-colors" title="Run in Sandbox">
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(agent._id)}
                        disabled={deleting === agent._id}
                        className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Delete agent"
                      >
                        {deleting === agent._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </Card>
                );
              })}

              {/* Quick-create card */}
              <Link href="/dashboard/agents/create">
                <div className="h-full min-h-[200px] border border-dashed border-border/80 hover:border-accent/40 rounded-xl bg-surface/10 hover:bg-surface-light/10 flex flex-col items-center justify-center p-8 text-center transition-all cursor-pointer group">
                  <div className="h-10 w-10 rounded-full border border-dashed border-border group-hover:border-accent/40 bg-surface flex items-center justify-center text-muted group-hover:text-accent mb-3 transition-colors">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">
                    New Agent
                  </span>
                  <span className="text-[10px] text-muted mt-1">
                    Generate from plain-English prompt
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted group-hover:text-accent mt-3 transition-colors" />
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
