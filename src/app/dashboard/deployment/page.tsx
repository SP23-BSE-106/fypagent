"use client";

import * as React from "react";
import { CloudLightning, Copy, Check, Eye, EyeOff, Plus, FileCode, Globe, Key } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function DeploymentCenterPage() {
  const [copiedText, setCopiedText] = React.useState<string | null>(null);
  const [showKey, setShowKey] = React.useState(false);
  const [apiKey, setApiKey] = React.useState("sk_live_agentflow_5bee7c494a3b8e2e8f000b0f14");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const widgetSnippet = `<script
  src="https://cdn.agentflow.ai/widget.js"
  data-agent-id="agent_9f8e7d6c5b"
  data-theme="dark"
  async
></script>`;

  const apiSnippet = `curl -X POST https://api.agentflow.ai/v1/workflows/run \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello Agent"}'`;

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none text-left">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="font-h1 font-bold text-foreground">Deployment Center</h2>
          <p className="text-xs text-muted">
            Configure how your compiled agent workflows integrate into websites, client apps, and slack backends.
          </p>
        </div>

        {/* Deployment Types Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Card 1: API Endpoint access */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
                  <Key className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Workspace API Access Keys</h3>
                  <p className="text-[10px] text-muted">Use this key to query agent pipelines from external services.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 relative font-mono text-xs bg-[#0B0F14] border border-border rounded-lg px-3.5 py-2.5 overflow-hidden text-ellipsis whitespace-nowrap">
                  {showKey ? apiKey : "••••••••••••••••••••••••••••••••••••••••••••••••"}
                </div>
                <Button variant="secondary" size="icon" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button onClick={() => copyToClipboard(apiKey, "api_key")}>
                  {copiedText === "api_key" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1.5" />
                      Copy Key
                    </>
                  )}
                </Button>
              </div>

              <div className="border-t border-border/40 mt-6 pt-5 space-y-3">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Example API Request Payload</span>
                <div className="relative font-mono text-[11px] bg-[#0B0F14] border border-border/80 rounded-lg p-4 text-muted leading-relaxed">
                  <pre className="overflow-x-auto">{apiSnippet}</pre>
                  <button
                    onClick={() => copyToClipboard(apiSnippet, "api_code")}
                    className="absolute right-3.5 top-3.5 p-1.5 rounded-md hover:bg-surface-light text-muted hover:text-accent transition-colors"
                  >
                    {copiedText === "api_code" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </Card>

            {/* Public Widget scripts integrations */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
                  <Globe className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">In-App Chat Widget</h3>
                  <p className="text-[10px] text-muted">Embed a floating support chat bubble into your HTML frontend pages.</p>
                </div>
              </div>

              <div className="relative font-mono text-[11px] bg-[#0B0F14] border border-border/80 rounded-lg p-4 text-muted leading-relaxed">
                <pre className="overflow-x-auto">{widgetSnippet}</pre>
                <button
                  onClick={() => copyToClipboard(widgetSnippet, "widget_code")}
                  className="absolute right-3.5 top-3.5 p-1.5 rounded-md hover:bg-surface-light text-muted hover:text-accent transition-colors"
                >
                  {copiedText === "widget_code" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </Card>
          </div>

          {/* Right Status Panel */}
          <div className="space-y-6">
            <Card className="p-5 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Deployment Status</h4>
              <div className="h-[1px] bg-border/40 w-full" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Production Flow:</span>
                <span className="font-semibold text-foreground">Customer Support Agent</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Status:</span>
                <Badge variant="success">Active</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Widget Domain URL:</span>
                <span className="font-semibold text-accent underline cursor-pointer truncate max-w-[130px]">agentflow-view.net</span>
              </div>
            </Card>

            <Card className="p-5 space-y-3.5 text-xs text-muted leading-relaxed bg-surface/30">
              <h5 className="font-bold text-foreground">Enterprise Guardrails</h5>
              <p>
                All endpoint calls compile through our built-in safety filter. Requests exceeding 50 tokens per user-session are throttled automatically to prevent cost overruns.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
