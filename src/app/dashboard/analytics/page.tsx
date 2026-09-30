"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Cpu,
  GitMerge,
  Database,
  KeyRound,
  BarChart3,
  AlertTriangle,
  Loader2,
} from "lucide-react";

type AnalyticsAgent = {
  _id: string;
  name: string;
  status?: string;
  llmProvider?: string | null;
  workflow?: { nodes?: unknown[]; edges?: unknown[] } | null;
};

type ChartRow = { name: string; nodes: number; edges: number };

const CHART_TOOLTIP = {
  backgroundColor: "#131A23",
  borderColor: "#1E293B",
  borderRadius: "8px",
  fontSize: "11px",
  color: "#F8FAFC",
};

function truncate(value: string, max = 18) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Every number on this page is counted from the caller's own workspace —
 * agents, their saved graphs, the vector index and issued keys. Nothing here
 * is sampled or invented, and the things that genuinely are not tracked yet
 * (execution runs, latency, spend) say so instead of showing a plausible value.
 */
export default function AnalyticsPage() {
  const [agents, setAgents] = React.useState<AnalyticsAgent[]>([]);
  const [knowledge, setKnowledge] = React.useState<{ documents: number; chunks: number } | null>(null);
  const [keyCount, setKeyCount] = React.useState(0);
  const [sizeMetric, setSizeMetric] = React.useState<"nodes" | "edges">("nodes");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [agentsRes, ragRes, keysRes] = await Promise.all([
          fetch("/api/agents", { credentials: "include" }),
          fetch("/api/rag/status", { credentials: "include" }),
          fetch("/api/settings/api-keys", { credentials: "include" }),
        ]);

        if ([agentsRes, ragRes, keysRes].some((response) => response.status === 401)) {
          throw new Error("Your session has expired. Please log in again.");
        }
        if ([agentsRes, ragRes, keysRes].some((response) => !response.ok)) {
          throw new Error("Workspace analytics could not be loaded.");
        }

        const [agentsData, ragData, keysData] = await Promise.all([
          agentsRes.json(),
          ragRes.json(),
          keysRes.json(),
        ]);

        if (cancelled) return;

        setAgents(Array.isArray(agentsData) ? agentsData : []);
        setKnowledge({
          documents: Number(ragData?.knowledge_base?.documents || 0),
          chunks: Number(ragData?.knowledge_base?.chunks || 0),
        });
        setKeyCount(Array.isArray(keysData?.keys) ? keysData.keys.length : 0);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load analytics.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const sizeRows = React.useMemo<ChartRow[]>(
    () =>
      agents
        .map((agent) => ({
          name: truncate(agent.name),
          nodes: agent.workflow?.nodes?.length ?? 0,
          edges: agent.workflow?.edges?.length ?? 0,
        }))
        .sort((a, b) => b.nodes - a.nodes),
    [agents],
  );

  const providerRows = React.useMemo(() => {
    const tally = new Map<string, number>();
    for (const agent of agents) {
      const label = agent.llmProvider?.trim() || "Not configured";
      tally.set(label, (tally.get(label) ?? 0) + 1);
    }
    return [...tally.entries()].map(([name, count]) => ({ name, count }));
  }, [agents]);

  const totalNodes = agents.reduce((sum, agent) => sum + (agent.workflow?.nodes?.length ?? 0), 0);
  const activeAgents = agents.filter((agent) => agent.status === "active").length;

  const stats = [
    { label: "Agents", value: String(agents.length), icon: Cpu },
    { label: "Workflow steps", value: String(totalNodes), icon: GitMerge },
    { label: "Indexed chunks", value: String(knowledge?.chunks ?? 0), icon: Database },
    { label: "API keys issued", value: String(keyCount), icon: KeyRound },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none text-left">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="font-h1 font-bold text-foreground">Workspace Analytics</h2>
          <p className="text-xs text-muted">
            Live counts from your workspace: agents, saved workflow steps, the vector index and issued API keys.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface/40 px-4 py-3 text-xs text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading workspace totals…
          </div>
        )}

        {/* Live KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wide">{stat.label}</span>
                  <div className="text-xl font-extrabold text-foreground">{stat.value}</div>
                </div>
                <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 p-6 flex flex-col justify-between min-h-[350px]">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div className="space-y-1">
                <CardTitle className="text-xs font-bold text-foreground">Workflow size by agent</CardTitle>
                <CardDescription className="text-[10px]">
                  Counted from each saved graph.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant={sizeMetric === "nodes" ? "accent" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setSizeMetric("nodes")}
                >
                  Nodes
                </Badge>
                <Badge
                  variant={sizeMetric === "edges" ? "accent" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setSizeMetric("edges")}
                >
                  Connections
                </Badge>
              </div>
            </div>

            <div className="flex-1 w-full min-h-[220px]">
              {sizeRows.length === 0 ? (
                <EmptyState
                  title="No workflows to chart yet"
                  hint="Create an agent and draw its flow — its steps will show up here."
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sizeRows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} allowDecimals={false} />
                    <ChartTooltip contentStyle={CHART_TOOLTIP} />
                    <Legend wrapperStyle={{ fontSize: "10px", marginTop: "10px" }} />
                    <Bar
                      dataKey={sizeMetric}
                      fill="#5BE7C4"
                      radius={[4, 4, 0, 0]}
                      name={sizeMetric === "nodes" ? "Steps" : "Connections"}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="p-6 flex flex-col justify-between min-h-[350px]">
            <div className="mb-6 flex-shrink-0">
              <CardTitle className="text-xs font-bold text-foreground">Agents by model provider</CardTitle>
              <CardDescription className="text-[10px]">Configured on each agent.</CardDescription>
            </div>

            <div className="flex-1 w-full min-h-[220px]">
              {providerRows.length === 0 ? (
                <EmptyState
                  title="Nothing configured yet"
                  hint="Pick a provider while creating an agent."
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={providerRows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} allowDecimals={false} />
                    <ChartTooltip contentStyle={CHART_TOOLTIP} />
                    <Bar dataKey="count" fill="#38BDF8" radius={[4, 4, 0, 0]} name="Agents" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* What is not tracked — stated rather than faked */}
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
              <BarChart3 className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xs font-bold text-foreground">
                Execution history is not recorded yet
              </CardTitle>
              <CardDescription className="text-[10px] leading-relaxed">
                Run counts, latency, token spend and success rate are deliberately left empty — the platform does not
                persist workflow executions, so showing figures for them would be inventing data. Knowledge-base size
                and workflow structure above are counted directly from your records.
                {agents.length > 0 && (
                  <span className="mt-1 block text-foreground/70">
                    Right now: {agents.length} {agents.length === 1 ? "agent" : "agents"}, {activeAgents} active,{" "}
                    {totalNodes} workflow steps, {knowledge?.documents ?? 0}{" "}
                    {(knowledge?.documents ?? 0) === 1 ? "document" : "documents"} indexed.
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 px-6 text-center">
      <p className="text-xs font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 max-w-xs text-[11px] leading-relaxed text-muted">{hint}</p>
    </div>
  );
}
