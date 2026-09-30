"use client";

import * as React from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Terminal, Code, Check, ShieldCheck, Users } from "lucide-react";
import { useBrowserOrigin } from "@/lib/useBrowserOrigin";

const ERROR_ROWS = [
  { code: "400 Bad Request", detail: "Missing or malformed fields — `input` and `agentId` are required." },
  { code: "401 Unauthorized", detail: "Missing, empty or unknown API key, or an expired session cookie." },
  { code: "404 Not Found", detail: "The agent id does not exist, or it belongs to another workspace." },
  { code: "429 Too Many Requests", detail: "More than 20 requests in a minute; wait and retry." },
  { code: "502 Bad Gateway", detail: "No inference provider accepted the request. Nothing was executed." },
];

/**
 * Documents only endpoints that exist in this repository. Snippets are built
 * from the running origin so the examples a reader copies are the requests
 * that actually work against their deployment.
 */
export default function DocsPage() {
  const [copiedText, setCopiedText] = React.useState<string | null>(null);
  const origin = useBrowserOrigin();

  const copyCode = (text: string, label: string) => {
    navigator.clipboard.writeText(text).catch(() => undefined);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const endpointUrl = `${origin || "https://fypagent.vercel.app"}/api/execute`;

  const curlSnippet = `curl -X POST ${endpointUrl} \\
  -H "Authorization: Bearer sk_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "665f0c1e8b3f2a0012345678",
    "input": "What is the refund policy?"
  }'`;

  const responseSnippet = `{
  "executed": true,
  "agentId": "665f0c1e8b3f2a0012345678",
  "agentName": "Support Triage Agent",
  "output": "Refunds are available within 14 days of purchase…",
  "model": "moonshotai/kimi-k3",
  "provider": "HuggingFace (Kimi K3)",
  "sources": [
    { "text": "Refunds are issued within 14 days…", "similarity": 0.81 }
  ],
  "executedAt": "2026-09-30T12:04:11.208Z"
}`;

  const inputSnippet = `{
  "agentId": "665f0c1e8b3f2a0012345678",
  "input": "What is the refund policy for billing?",
  "topK": 3
}`;

  const errorSnippet = `{
  "error": "Invalid API key."
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
                  <a href="#trigger" className="text-muted hover:text-foreground transition-colors">Run an Agent</a>
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
            {/* Overview */}
            <div id="overview" className="space-y-3 pb-8 border-b border-border/40 scroll-mt-24">
              <h1 className="font-h1 font-bold text-foreground">AgentFlow API Docs</h1>
              <p className="font-body text-muted text-sm max-w-3xl">
                Send a message to one of your agents and get back a grounded answer: the model response plus the
                knowledge-base chunks that were retrieved to produce it. Requests are authenticated with a Workspace
                API key and return JSON.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                <div className="rounded-xl border border-border/60 bg-surface/20 p-4 space-y-2">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Endpoint</div>
                  <div className="font-mono text-sm text-foreground break-all">POST /api/execute</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface/20 p-4 space-y-2">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Auth</div>
                  <div className="font-mono text-sm text-foreground">Bearer {"<API_KEY>"}</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-surface/20 p-4 space-y-2">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Response</div>
                  <div className="font-mono text-sm text-foreground">JSON + sources[]</div>
                </div>
              </div>
            </div>

            {/* Authentication */}
            <div id="auth" className="space-y-4 scroll-mt-24">
              <h2 className="font-h2 font-bold text-foreground flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-accent-muted flex items-center justify-center text-accent">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                Authentication
              </h2>
              <p className="text-xs text-muted leading-relaxed max-w-3xl">
                Include a Workspace API key in the HTTP <span className="text-accent font-semibold">Authorization</span>{" "}
                header. Create one from the dashboard under Settings — the full key is displayed exactly once and only
                its SHA-256 hash is stored.
              </p>

              <div className="relative font-mono text-[11px] bg-[#131A23] border border-border rounded-lg p-4 text-muted/90 leading-relaxed">
                <pre className="overflow-x-auto">Authorization: Bearer {'<API_KEY>'}</pre>
              </div>

              <div className="text-xs text-muted leading-relaxed max-w-3xl">
                If the key is missing, empty or unknown the API returns a{" "}
                <span className="text-accent font-semibold">401</span>. Signed-in dashboard sessions are also accepted,
                which is how the Deployment Center previews requests.
              </div>
            </div>

            {/* Quickstart */}
            <div id="quickstart" className="space-y-4 scroll-mt-24">
              <h2 className="font-h2 font-bold text-foreground flex items-center gap-2.5">
                <div className="h-7 w-7 rounded bg-accent-muted flex items-center justify-center text-accent">
                  <Terminal className="h-4.5 w-4.5" />
                </div>
                Quickstart: Run an Agent
              </h2>
              <p className="text-xs text-muted leading-relaxed max-w-3xl">
                POST an <span className="text-accent font-semibold">agentId</span> and your{" "}
                <span className="text-accent font-semibold">input</span>. The agent is looked up for the key&apos;s own
                workspace — an id from another account returns 404.
              </p>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Shell curl request</span>
                  <div className="relative font-mono text-[11px] bg-[#131A23] border border-border rounded-lg p-4 text-muted/90 leading-relaxed">
                    <pre className="overflow-x-auto">{curlSnippet}</pre>
                    <button
                      type="button"
                      aria-label="Copy curl example"
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
                      type="button"
                      aria-label="Copy response example"
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
                  <span className="text-foreground font-semibold">Agents</span>: a saved workflow with its prompt,
                  provider and knowledge base. Every run targets exactly one agent id.
                </li>
                <li>
                  <span className="text-foreground font-semibold">Knowledge base</span>: documents you upload, split into
                  chunks and embedded with a local MiniLM model, searched with MongoDB Atlas{" "}
                  <span className="font-mono">$vectorSearch</span>.
                </li>
                <li>
                  <span className="text-foreground font-semibold">Sources</span>: the chunks returned alongside the
                  answer, each with a cosine similarity score, so a response can be traced back to its input.
                </li>
                <li>
                  <span className="text-foreground font-semibold">Workflow graph</span>: the node/edge structure drawn
                  on the canvas. It is what you save and edit; execution today runs the agent&apos;s model step over the
                  retrieved context.
                </li>
              </ul>
            </div>

            {/* Trigger endpoint details */}
            <div id="trigger" className="space-y-4 scroll-mt-24">
              <h2 className="font-h2 font-bold text-foreground">Run an Agent</h2>
              <div className="rounded-xl border border-border/60 bg-surface/20 p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider">POST</div>
                    <div className="font-mono text-sm text-foreground">/api/execute</div>
                  </div>
                  <div className="text-xs text-muted leading-relaxed max-w-xl">
                    Runs one turn: embeds your input, retrieves the closest chunks from this workspace&apos;s knowledge
                    base, then completes with the agent&apos;s instruction. Returns 502 rather than a fake success if no
                    model provider responds.
                  </div>
                </div>
              </div>
            </div>

            {/* Request/Response Examples */}
            <div id="examples" className="space-y-4 scroll-mt-24">
              <h2 className="font-h2 font-bold text-foreground">Request/Response Examples</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Request body</span>
                  <div className="relative font-mono text-[11px] bg-[#131A23] border border-border rounded-lg p-4 text-muted/90 leading-relaxed">
                    <pre className="overflow-x-auto">{inputSnippet}</pre>
                  </div>
                  <p className="text-[10px] text-muted">
                    <span className="text-foreground font-semibold">topK</span> (default 3) controls how many chunks are
                    retrieved.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Error payload</span>
                  <div className="relative font-mono text-[11px] bg-[#131A23] border border-border rounded-lg p-4 text-muted/90 leading-relaxed">
                    <pre className="overflow-x-auto">{errorSnippet}</pre>
                  </div>
                  <p className="text-[10px] text-muted">
                    Failures always carry an <span className="font-mono">error</span> string and a non-2xx status.
                  </p>
                </div>
              </div>
            </div>

            {/* Errors & Limits */}
            <div id="errors" className="space-y-4 scroll-mt-24">
              <h2 className="font-h2 font-bold text-foreground">Errors & Limits</h2>

              <div className="space-y-3 text-xs text-muted leading-relaxed max-w-3xl">
                {ERROR_ROWS.map((row) => (
                  <div key={row.code} className="rounded-xl border border-border/60 bg-surface/20 p-4">
                    <span className="text-foreground font-semibold">{row.code}</span>
                    <div className="text-muted">{row.detail}</div>
                  </div>
                ))}
                <div className="rounded-xl border border-border/60 bg-surface/20 p-4">
                  <span className="text-foreground font-semibold flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-accent" />
                    Workspace isolation
                  </span>
                  <div className="text-muted">
                    Keys are scoped to their owner. Agents, documents and keys from other accounts are never visible,
                    even with a valid key.
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
