"use client";

import * as React from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Terminal, Code, Check, ShieldCheck } from "lucide-react";



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
                <li>
                  <a href="#overview" className="text-accent font-semibold hover:text-foreground transition-colors">Overview</a>
                </li>
                <li>
                  <a href="#auth" className="text-muted hover:text-foreground transition-colors">Authentication</a>
                </li>
                <li>
                  <a href="#quickstart" className="text-muted hover:text-foreground transition-colors">Quickstart Guide</a>
                </li>
                <li>
                  <a href="#core-concepts" className="text-muted hover:text-foreground transition-colors">Core Concepts</a>
                </li>
              </ul>
            </div>

            <div className="space-y-1">
              <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider">API Reference</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#trigger" className="text-muted hover:text-foreground transition-colors">Trigger Workflows</a>
                </li>
                <li>
                  <a href="#examples" className="text-muted hover:text-foreground transition-colors">Request/Response Examples</a>
                </li>
                <li>
                  <a href="#errors" className="text-muted hover:text-foreground transition-colors">Errors & Limits</a>
                </li>
              </ul>
            </div>
          </aside>


          {/* Center Docs Content & Right Code blocks */}
          <div className="flex-1 space-y-12">
            {/* Quickstart Header */}
            <div id="overview" className="space-y-3 pb-8 border-b border-border/40 scroll-mt-24">
              <h1 className="font-h1 font-bold text-foreground">AgentFlow API Docs</h1>
              <p className="font-body text-muted text-sm max-w-3xl">
                Build and run collaborative multi-agent workflows from your app. Requests return standardized JSON payloads and are protected using your Workspace API key.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                <div className="rounded-xl border border-border/60 bg-surface/20 p-4 space-y-2">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Base URL</div>
                  <div className="font-mono text-sm text-foreground">https://api.agentflow.ai/v1</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface/20 p-4 space-y-2">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Auth</div>
                  <div className="font-mono text-sm text-foreground">Bearer {"<API_KEY>"}</div>

                </div>
                <div className="rounded-xl border border-border/60 bg-surface/20 p-4 space-y-2">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Response</div>
                  <div className="font-mono text-sm text-foreground">JSON + execution_id</div>
                </div>
              </div>
            </div>

            {/* Step 1: Authentication API keys */}
            <div id="auth" className="space-y-4 scroll-mt-24">
              <h2 className="font-h2 font-bold text-foreground flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-accent-muted flex items-center justify-center text-accent">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                Authentication
              </h2>
              <p className="text-xs text-muted leading-relaxed max-w-3xl">
                Include your Workspace API key in the HTTP <span className="text-accent font-semibold">Authorization</span> header:
              </p>

              <div className="relative font-mono text-[11px] bg-[#131A23] border border-border rounded-lg p-4 text-muted/90 leading-relaxed">
                <pre className="overflow-x-auto">Authorization: Bearer {'<API_KEY>'}</pre>






              </div>




              <div className="text-xs text-muted leading-relaxed max-w-3xl">
                If the key is missing or invalid, the API returns a <span className="text-accent font-semibold">401</span> error.
              </div>
            </div>

            {/* Step 2: Triggering Execution with curl sample code */}
            <div id="quickstart" className="space-y-4 scroll-mt-24">
              <h2 className="font-h2 font-bold text-foreground flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-accent-muted flex items-center justify-center text-accent">
                  <Terminal className="h-4.5 w-4.5" />
                </div>
                Quickstart: Trigger a Workflow
              </h2>
              <p className="text-xs text-muted leading-relaxed max-w-3xl">
                Send a POST request to start an AgentFlow workflow run. The API responds with an <span className="text-accent font-semibold">execution_id</span> and structured output.
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

            {/* Core Concepts */}
            <div id="core-concepts" className="space-y-4 scroll-mt-24">
              <h2 className="font-h2 font-bold text-foreground">Core Concepts</h2>
              <ul className="space-y-3 text-xs text-muted leading-relaxed max-w-3xl">
                <li>
                  <span className="text-foreground font-semibold">Workflows</span>: reusable orchestration graphs that define the node chain.
                </li>
                <li>
                  <span className="text-foreground font-semibold">Runs</span>: a specific execution of a workflow with your input variables.
                </li>
                <li>
                  <span className="text-foreground font-semibold">Outputs</span>: deterministic JSON objects containing intent and resolution fields (shape depends on the workflow).
                </li>
              </ul>
            </div>

            {/* Trigger endpoint details */}
            <div id="trigger" className="space-y-4 scroll-mt-24">
              <h2 className="font-h2 font-bold text-foreground">Trigger Workflows</h2>
              <div className="rounded-xl border border-border/60 bg-surface/20 p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider">POST</div>
                    <div className="font-mono text-sm text-foreground">/workflows/run</div>
                  </div>
                  <div className="text-xs text-muted leading-relaxed max-w-xl">
                    Starts a workflow run. Provide your input payload and optional context fields.
                  </div>
                </div>
              </div>
            </div>

            {/* Request/Response Examples */}
            <div id="examples" className="space-y-4 scroll-mt-24">
              <h2 className="font-h2 font-bold text-foreground">Request/Response Examples</h2>
              <p className="text-xs text-muted leading-relaxed max-w-3xl">
                Use the same endpoint with different input/context fields to run different workflows.
              </p>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Example input payload</span>
                  <div className="relative font-mono text-[11px] bg-[#131A23] border border-border rounded-lg p-4 text-muted/90 leading-relaxed">
                    <pre className="overflow-x-auto">{`{
  "message": "What’s the refund policy for billing?",
  "context": {
    "user_id": "usr_1234567890"
  }
}`}</pre>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Example output payload</span>
                  <div className="relative font-mono text-[11px] bg-[#131A23] border border-border rounded-lg p-4 text-muted/90 leading-relaxed">
                    <pre className="overflow-x-auto">{`{
  "status": "success",
  "execution_id": "run_ABC123",
  "elapsed_seconds": 2.84,
  "output": {
    "intent": "billing_refund",
    "resolution_suggested": "eligible_for_refund"
  }
}`}</pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Errors & Limits */}
            <div id="errors" className="space-y-4 scroll-mt-24">
              <h2 className="font-h2 font-bold text-foreground">Errors & Limits</h2>

              <div className="space-y-3 text-xs text-muted leading-relaxed max-w-3xl">
                <div className="rounded-xl border border-border/60 bg-surface/20 p-4">
                  <span className="text-foreground font-semibold">401 Unauthorized</span>
                  <div className="text-muted">Missing/invalid API key.</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface/20 p-4">
                  <span className="text-foreground font-semibold">429 Too Many Requests</span>
                  <div className="text-muted">Rate limited; retry after the server-provided window.</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface/20 p-4">
                  <span className="text-foreground font-semibold">400 Bad Request</span>
                  <div className="text-muted">Malformed JSON body or missing required fields.</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
