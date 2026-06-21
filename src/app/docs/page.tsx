"use client";

import * as React from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BookOpen, Key, Terminal, Code, Check } from "lucide-react";

export default function DocsPage() {
  const [copiedText, setCopiedText] = React.useState<string | null>(null);

  const copyCode = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const curlSnippet = `curl -X POST https://api.agentflow.ai/v1/workflows/run \\
  -H "Authorization: Bearer sk_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Verify user billing issue",
    "context": {
      "user_id": "usr_94a3b8e2e8f"
    }
  }'`;

  const responseSnippet = `{
  "status": "success",
  "execution_id": "run_0b0f14131a23",
  "elapsed_seconds": 2.84,
  "output": {
    "intent": "escalate_billing",
    "resolution_suggested": "eligible_for_refund",
    "refund_window_days": 14
  }
}`;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-left select-none">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Left Docs Navigation */}
          <aside className="w-full lg:w-60 flex-shrink-0 space-y-6">
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">Getting Started</h4>
              <ul className="space-y-2 text-xs">
                <li><span className="text-accent font-semibold cursor-pointer">Quickstart Guide</span></li>
                <li><span className="text-muted hover:text-foreground cursor-pointer transition-colors">Core Concepts</span></li>
                <li><span className="text-muted hover:text-foreground cursor-pointer transition-colors">Node Types Library</span></li>
              </ul>
            </div>
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">API Reference</h4>
              <ul className="space-y-2 text-xs">
                <li><span className="text-muted hover:text-foreground cursor-pointer transition-colors">Trigger Workflows</span></li>
                <li><span className="text-muted hover:text-foreground cursor-pointer transition-colors">Vector Ingestion</span></li>
                <li><span className="text-muted hover:text-foreground cursor-pointer transition-colors">Authentication</span></li>
              </ul>
            </div>
          </aside>

          {/* Center Docs Content & Right Code blocks */}
          <div className="flex-1 space-y-12">
            {/* Quickstart Header */}
            <div className="space-y-3 pb-8 border-b border-border/40">
              <h1 className="font-h1 font-bold text-foreground">API Quickstart Guide</h1>
              <p className="font-body text-muted text-sm max-w-3xl">
                Integrate compiled AgentFlow logic loops directly into your websites, chat clients, or server endpoints. Our web services respond with standardized JSON structures.
              </p>
            </div>

            {/* Step 1: Authentication API keys */}
            <div className="space-y-4">
              <h2 className="font-h2 font-bold text-foreground flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-accent-muted flex items-center justify-center text-accent">
                  <Key className="h-4.5 w-4.5" />
                </div>
                1. Authenticate Request
              </h2>
              <p className="text-xs text-muted leading-relaxed max-w-3xl">
                All requests must carry your Workspace API key as a bearer token inside the HTTP Headers metadata. You can generate production keys inside the <span className="text-accent underline cursor-pointer">Deployment Center</span> layout settings.
              </p>
            </div>

            {/* Step 2: Triggering Execution with curl sample code */}
            <div className="space-y-4">
              <h2 className="font-h2 font-bold text-foreground flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-accent-muted flex items-center justify-center text-accent">
                  <Terminal className="h-4.5 w-4.5" />
                </div>
                2. Execute Agent Flow
              </h2>
              <p className="text-xs text-muted leading-relaxed max-w-3xl">
                Send a POST request payload containing user input variables to initiate the node chain sequence.
              </p>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Shell curl request</span>
                  <div className="relative font-mono text-[11px] bg-[#131A23] border border-border rounded-lg p-4 text-muted/90 leading-relaxed">
                    <pre className="overflow-x-auto">{curlSnippet}</pre>
                    <button
                      onClick={() => copyCode(curlSnippet, "curl")}
                      className="absolute right-3 top-3 p-1.5 rounded-md hover:bg-surface-light text-muted hover:text-accent transition-colors"
                    >
                      {copiedText === "curl" ? <Check className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">JSON response payload</span>
                  <div className="relative font-mono text-[11px] bg-[#131A23] border border-border rounded-lg p-4 text-muted/90 leading-relaxed">
                    <pre className="overflow-x-auto">{responseSnippet}</pre>
                    <button
                      onClick={() => copyCode(responseSnippet, "resp")}
                      className="absolute right-3 top-3 p-1.5 rounded-md hover:bg-surface-light text-muted hover:text-accent transition-colors"
                    >
                      {copiedText === "resp" ? <Check className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
