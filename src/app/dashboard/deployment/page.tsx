"use client";

import * as React from "react";
import Link from "next/link";
import { Key, Copy, Check, Terminal, Gauge, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useBrowserOrigin } from "@/lib/useBrowserOrigin";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  createdAt?: string;
  lastUsedAt?: string | null;
};

type AgentRow = { _id: string; name: string; status?: string };

/**
 * Everything shown here is read from the workspace: the keys are the ones
 * actually issued and hashed by /api/settings/api-keys, the endpoint in the
 * example is the deployed origin, and the counts come from /api/agents. There
 * is no widget script and no custom domain because neither exists.
 */
export default function DeploymentCenterPage() {
  const [keys, setKeys] = React.useState<ApiKeyRow[]>([]);
  const [agents, setAgents] = React.useState<AgentRow[]>([]);
  const origin = useBrowserOrigin();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [keysRes, agentsRes] = await Promise.all([
          fetch("/api/settings/api-keys", { credentials: "include" }),
          fetch("/api/agents", { credentials: "include" }),
        ]);
        if ([keysRes, agentsRes].some((response) => response.status === 401)) {
          throw new Error("Your session has expired. Please log in again.");
        }
        if ([keysRes, agentsRes].some((response) => !response.ok)) {
          throw new Error("Deployment details could not be loaded.");
        }
        const [keysData, agentsData] = await Promise.all([keysRes.json(), agentsRes.json()]);
        if (cancelled) return;
        setKeys(Array.isArray(keysData?.keys) ? keysData.keys : []);
        setAgents(Array.isArray(agentsData) ? agentsData : []);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load deployment details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeAgents = agents.filter((agent) => agent.status === "active").length;
  const exampleAgentId = agents[0]?._id ?? "<your-agent-id>";

  const apiSnippet = `curl -X POST ${origin || "https://fypagent.vercel.app"}/api/execute \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"agentId": "${exampleAgentId}", "input": "Hello Agent"}'`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => undefined);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none text-left">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="font-h1 font-bold text-foreground">Deployment Center</h2>
          <p className="text-xs text-muted">
            Call your agents from outside the dashboard with a workspace API key. Keys are stored hashed and can be
            revoked at any time from Settings.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            {/* Real keys */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
                  <Key className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Workspace API Keys
                  </h3>
                  <p className="text-[10px] text-muted">
                    The full key is shown once when you create it. Only its SHA-256 hash is stored.
                  </p>
                </div>
                <Link href="/dashboard/settings">
                  <Button variant="secondary" size="sm">
                    Manage keys
                    <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface/40 px-4 py-3 text-xs text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading keys…
                </div>
              ) : keys.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 px-4 py-5 text-center">
                  <p className="text-xs font-semibold text-foreground">No keys issued yet</p>
                  <p className="mt-1 text-[11px] text-muted">
                    Generate one in Settings — it will be displayed there exactly once.
                  </p>
                  <Link href="/dashboard/settings" className="mt-3 inline-block">
                    <Button size="sm">Generate a key</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {keys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-[#0B0F14] px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs text-foreground">{key.prefix}</p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {key.name} · last used{" "}
                          {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "never"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Real endpoint */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
                  <Terminal className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Run an agent over HTTPS
                  </h3>
                  <p className="text-[10px] text-muted">
                    POST your message and an agent id; the response carries the model output and the chunks retrieved
                    from your knowledge base.
                  </p>
                </div>
              </div>

              <div className="relative font-mono text-[11px] bg-[#0B0F14] border border-border/80 rounded-lg p-4 text-muted leading-relaxed">
                <pre className="overflow-x-auto">{apiSnippet}</pre>
                <button
                  type="button"
                  onClick={() => copyToClipboard(apiSnippet, "api_code")}
                  aria-label="Copy example request"
                  className="absolute right-3.5 top-3.5 p-1.5 rounded-md hover:bg-surface-light text-muted hover:text-accent transition-colors"
                >
                  {copiedText === "api_code" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <p className="mt-3 text-[10px] leading-relaxed text-muted">
                Requests are limited to 20 per minute per caller and can only reach agents owned by the key. See{" "}
                <Link href="/docs" className="text-accent underline underline-offset-2">
                  the API docs
                </Link>{" "}
                for the response shape and error codes.
              </p>
            </Card>
          </div>

          {/* Real status */}
          <div className="space-y-6">
            <Card className="p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Workspace Status</h4>
              <div className="h-[1px] bg-border/40 w-full" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Agents</span>
                <span className="font-semibold text-foreground">{agents.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Active agents</span>
                <span className="font-semibold text-foreground">{activeAgents}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Keys issued</span>
                <span className="font-semibold text-foreground">{keys.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Endpoint</span>
                <span className="font-mono text-[10px] text-accent truncate max-w-[140px]">POST /api/execute</span>
              </div>
            </Card>

            <Card className="p-5 space-y-3.5 text-xs text-muted leading-relaxed bg-surface/30">
              <h5 className="font-bold text-foreground flex items-center gap-2">
                <Gauge className="h-3.5 w-3.5 text-accent" />
                Abuse protection
              </h5>
              <p>
                Every request is rate limited per caller, authentication failures are counted separately, and agents
                are always scoped to the key that owns them — a key cannot read another workspace&apos;s data.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
