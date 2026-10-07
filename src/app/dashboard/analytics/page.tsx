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
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import {
  Cpu,
  GitMerge,
  Database,
  KeyRound,
  BarChart3,
  Activity,
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

type RunRow = {
  id: string;
  kind: "exec" | "session";
  agentName: string | null;
  status: "success" | "failed";
  input: string;
  sourceCount: number;
  durationMs: number;
  provider: string | null;
  model: string | null;
  createdAt: string | null;
};

type RunSummary = {
  total: number;
  sessions: number;
  succeeded: number;
  failed: number;
  avgDurationMs: number | null;
  lastRunAt: string | null;
};

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
  const [runs, setRuns] = React.useState<RunRow[]>([]);
  const [runSummary, setRunSummary] = React.useState<RunSummary | null>(null);
  const [sizeMetric, setSizeMetric] = React.useState<"nodes" | "edges">("nodes");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [agentsRes, ragRes, keysRes, runsRes] = await Promise.all([
          fetch("/api/agents", { credentials: "include" }),
          fetch("/api/rag/status", { credentials: "include" }),
          fetch("/api/settings/api-keys", { credentials: "include" }),
          // Best-effort: the execution monitor is the newest surface here and
          // it must not be able to blank out the rest of the page.
          fetch("/api/agents/runs", { credentials: "include" }).catch(() => null),
        ]);

        if ([agentsRes, ragRes, keysRes].some((response) => response.status === 401)) {
          throw new Error("Your session has expired. Please log in again.");
        }
        if ([agentsRes, ragRes, keysRes].some((response) => !response.ok)) {
          throw new Error("Workspace analytics could not be loaded.");
        }

        const [agentsData, ragData, keysData, runsData] = await Promise.all([
          agentsRes.json(),
          ragRes.json(),
          keysRes.json(),
          runsRes && runsRes.ok ? runsRes.json() : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setAgents(Array.isArray(agentsData) ? agentsData : []);
        setKnowledge({
          documents: Number(ragData?.knowledge_base?.documents || 0),
          chunks: Number(ragData?.knowledge_base?.chunks || 0),
        });
        setKeyCount(Array.isArray(keysData?.keys) ? keysData.keys.length : 0);
        if (runsData && Array.isArray(runsData.runs)) {
          setRuns(runsData.runs);
          setRunSummary(runsData.summary ?? null);
        }
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

  const toggleAgentStatus = async (agent: AnalyticsAgent) => {
    const nextStatus = agent.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/agents/${agent._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update agent status");
      setAgents((prev) => prev.map((a) => (a._id === agent._id ? { ...a, status: nextStatus } : a)));
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const runsRes = await fetch('/api/agents/runs', { credentials: 'include' });
        if (runsRes.ok) {
          const runsData = await runsRes.json();
          if (runsData && Array.isArray(runsData.runs)) {
            setRuns(runsData.runs);
            setRunSummary(runsData.summary ?? null);
          }
        }
      } catch {
        /* keep last known monitor data */
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

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

        {/* Agent controls */}
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="space-y-1">
              <CardTitle className="text-xs font-bold text-foreground">Agent controls</CardTitle>
              <CardDescription className="text-[10px]">Pause or resume agents without deleting their workflows.</CardDescription>
            </div>
            <Badge variant={agents.some((a) => a.status === "paused") ? "warning" : "success"}>
              {agents.filter((a) => a.status === "active").length} active / {agents.filter((a) => a.status === "paused").length} paused
            </Badge>
          </div>
          {agents.length === 0 ? (
            <EmptyState title="No agents yet" hint="Create an agent to control it here." />
          ) : (
            <div className="space-y-2">
              {agents.map((agent) => (
                <div key={agent._id} className="flex items-center justify-between border border-border/50 rounded-lg p-3">
                  <div>
                    <div className="text-sm font-semibold">{agent.name}</div>
                    <div className="text-[10px] text-muted">{agent.workflow?.nodes?.length ?? 0} nodes · {agent.workflow?.edges?.length ?? 0} edges</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => toggleAgentStatus(agent)}>
                    {agent.status === "active" ? "Pause" : "Resume"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Execution monitor — measured by POST /api/agents/runs */}
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="space-y-1">
              <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-accent" />
                Execution monitor
              </CardTitle>
              <CardDescription className="text-[10px]">
                Written by the Testing Sandbox each time you run a message. Nothing here is estimated.
              </CardDescription>
            </div>
            <Badge variant={runSummary && runSummary.failed > 0 ? "warning" : "success"}>
              {runSummary
                ? `${runSummary.succeeded} succeeded / ${runSummary.failed} failed`
                : "No runs recorded"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Metric label="Runs recorded" value={String(runSummary?.total ?? 0)} />
            <Metric label="Succeeded" value={String(runSummary?.succeeded ?? 0)} />
            <Metric label="Failed" value={String(runSummary?.failed ?? 0)} />
            <Metric
              label="Average latency"
              value={runSummary?.avgDurationMs != null ? `${runSummary.avgDurationMs} ms` : "—"}
            />
          </div>

          {runs.length === 0 ? (
            <EmptyState
              title="No executions recorded yet"
              hint="Open the Testing Sandbox from the sidebar and run a message — every execution lands here with its real latency and model."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Input</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="text-right">Latency</TableHead>
                    <TableHead>Model</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="text-[11px] text-muted whitespace-nowrap align-top">
                        {run.createdAt ? new Date(run.createdAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={run.kind === "session" ? "outline" : "accent"}>
                          {run.kind === "session" ? "session" : "run"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="text-[11px] text-foreground/80 max-w-[260px] truncate align-top"
                        title={run.input}
                      >
                        {run.input || "—"}
                      </TableCell>
                      <TableCell className="text-[11px] align-top">
                        {run.status === "failed" ? (
                          <span className="font-semibold text-red-400">failed</span>
                        ) : (
                          <span className="font-semibold text-emerald-400">success</span>
                        )}
                        {run.sourceCount > 0 && (
                          <span className="text-muted"> · {run.sourceCount} chunks</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px] text-right tabular-nums align-top">
                        {run.durationMs ? `${run.durationMs} ms` : "—"}
                      </TableCell>
                      <TableCell
                        className="text-[11px] text-muted max-w-[170px] truncate align-top"
                        title={[run.provider, run.model].filter(Boolean).join(" — ")}
                      >
                        {run.model || run.provider || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* What is not tracked — stated rather than faked */}
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 shrink-0 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
              <BarChart3 className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xs font-bold text-foreground">
                What is counted, and what still is not
              </CardTitle>
              <CardDescription className="text-[10px] leading-relaxed">
                Run counts and latency come from the execution monitor above — real records written when the Testing
                Sandbox runs a message. Token spend, per-node timings and retry counts are still captured nowhere in
                the platform, so they are left out rather than estimated. Knowledge-base size, workflow structure and
                issued keys are counted directly from your records.
                {agents.length > 0 && (
                  <span className="mt-1 block text-foreground/70">
                    Right now: {agents.length} {agents.length === 1 ? "agent" : "agents"}, {activeAgents} active,{" "}
                    {totalNodes} workflow steps, {knowledge?.documents ?? 0}{" "}
                    {(knowledge?.documents ?? 0) === 1 ? "document" : "documents"} indexed,{" "}
                    {runSummary?.total ?? 0} {(runSummary?.total ?? 0) === 1 ? "run" : "runs"} recorded.
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface/40 px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-lg font-extrabold tabular-nums text-foreground">{value}</div>
    </div>
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
