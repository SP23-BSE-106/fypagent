"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles, Send, CheckCircle, ArrowRight, ArrowLeft,
  Cpu, MessageSquare, AlertTriangle, Loader2, Key,
  ChevronRight, Save, ExternalLink, Tag, Info,
  Zap, Database, GitMerge, Globe, BrainCircuit, Terminal, Layers
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { WorkflowGraph, WorkflowNode, NodeType } from "@/lib/mongo/workflow";

// ─── Types ──────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

type LLMProvider = {
  id: string;
  label: string;
  placeholder: string;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const PROVIDERS: LLMProvider[] = [
  { id: "openai",    label: "OpenAI",    placeholder: "sk-..." },
  { id: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
  { id: "groq",      label: "Groq",      placeholder: "gsk_..." },
  { id: "gemini",    label: "Gemini",    placeholder: "AIza..." },
  { id: "cohere",    label: "Cohere",    placeholder: "..." },
];

const QUICK_TEMPLATES = [
  {
    name: "Customer Support Orchestrator",
    prompt:
      "Create a customer support agent that reads uploaded PDFs, classifies customer intent, searches the knowledge base, and drafts personalized email responses based on sentiment.",
  },
  {
    name: "SaaS Lead Enrichment",
    prompt:
      "Build an automated agent flow that triggers when a user registers, enriches their profile via LinkedIn and Clearbit API lookups, scores them, and posts a digest to Slack.",
  },
  {
    name: "PR Security Guard",
    prompt:
      "Design a GitHub workflow agent that reviews pull request diffs, checks for API credential leaks and SQL injection patterns, and posts inline security review comments.",
  },
  {
    name: "Invoice Processing Bot",
    prompt:
      "Create an agent that ingests incoming invoice PDFs via email, extracts fields using OCR, validates against purchase orders, and updates the accounting system.",
  },
];

// ─── Node type → icon / colour mapping ──────────────────────────────────────

const NODE_META: Record<NodeType, { icon: React.FC<{ className?: string }>; colour: string }> = {
  trigger:   { icon: Zap,         colour: "text-yellow-400" },
  llm:       { icon: BrainCircuit, colour: "text-accent" },
  rag:       { icon: Database,    colour: "text-purple-400" },
  api:       { icon: Globe,       colour: "text-blue-400" },
  condition: { icon: GitMerge,    colour: "text-orange-400" },
  output:    { icon: Terminal,    colour: "text-green-400" },
  tool:      { icon: Layers,      colour: "text-pink-400" },
  memory:    { icon: Cpu,         colour: "text-cyan-400" },
};

function getNodeMeta(type: string) {
  return NODE_META[type as NodeType] ?? { icon: Cpu, colour: "text-muted" };
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1 as Step, label: "Describe" },
    { n: 2 as Step, label: "Review" },
    { n: 3 as Step, label: "Save" },
  ];
  return (
    <div className="flex items-center gap-0 select-none">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={[
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all",
                current === s.n
                  ? "bg-accent border-accent text-[#0B0F14]"
                  : current > s.n
                  ? "bg-accent/20 border-accent/40 text-accent"
                  : "bg-surface border-border/60 text-muted",
              ].join(" ")}
            >
              {current > s.n ? <CheckCircle className="h-4 w-4" /> : s.n}
            </div>
            <span className={`text-[10px] font-semibold ${current >= s.n ? "text-foreground" : "text-muted"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-16 mb-4 mx-1 transition-colors ${current > s.n ? "bg-accent/50" : "bg-border/50"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Workflow node card ──────────────────────────────────────────────────────

function NodeCard({ node, index }: { node: WorkflowNode; index: number }) {
  const meta = getNodeMeta(node.type);
  const Icon = meta.icon;
  return (
    <div className="relative group flex gap-4 pl-2">
      {/* connector line */}
      <div className="flex flex-col items-center">
        <div className="h-8 w-8 rounded-xl border border-border bg-surface flex items-center justify-center flex-shrink-0">
          <Icon className={`h-3.5 w-3.5 ${meta.colour}`} />
        </div>
        <div className="w-px flex-1 bg-border/50 mt-1 mb-0 min-h-[16px]" />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted font-bold">#{index + 1}</span>
          <span className="text-xs font-bold text-foreground">{node.name}</span>
          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${meta.colour} border-current/30`}>
            {node.type}
          </Badge>
        </div>
        <p className="text-[10px] text-muted mt-1 leading-relaxed">{node.description}</p>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function CreateAgentPage() {
  const router = useRouter();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [step, setStep] = React.useState<Step>(1);
  const [prompt, setPrompt] = React.useState("");

  // Step 2 — generated workflow + metadata
  const [workflow, setWorkflow] = React.useState<WorkflowGraph | null>(null);
  const [agentName, setAgentName] = React.useState("");
  const [agentDesc, setAgentDesc] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [provider, setProvider] = React.useState(PROVIDERS[0].id);
  const [apiKey, setApiKey] = React.useState("");
  const [showKey, setShowKey] = React.useState(false);

  // ── Async state ────────────────────────────────────────────────────────────
  const [generating, setGenerating] = React.useState(false);
  const [generateError, setGenerateError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [savedAgent, setSavedAgent] = React.useState<{ _id: string; name: string } | null>(null);
  const [isMock, setIsMock] = React.useState(false);

  // ── Typewriter log lines while generating ──────────────────────────────────
  const [logLines, setLogLines] = React.useState<string[]>([]);
  const logTimers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  function startGeneratingLog() {
    const messages = [
      "Parsing intent from prompt…",
      "Identifying node types and data flows…",
      "Resolving LLM trigger chains…",
      "Mapping RAG retrieval steps…",
      "Structuring conditional branches…",
      "Assigning connector edges…",
      "Validating workflow schema…",
      "Finalising output…",
    ];
    setLogLines([]);
    logTimers.current.forEach(clearTimeout);
    logTimers.current = [];
    messages.forEach((msg, i) => {
      const t = setTimeout(() => {
        setLogLines((prev) => [...prev, msg]);
      }, i * 900);
      logTimers.current.push(t);
    });
  }

  function clearLog() {
    logTimers.current.forEach(clearTimeout);
    logTimers.current = [];
    setLogLines([]);
  }

  // ── Step 1 → Generate ──────────────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || generating) return;

    setGenerating(true);
    setGenerateError(null);
    setWorkflow(null);
    setIsMock(false);
    startGeneratingLog();

    try {
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        let errMsg = data?.error || "Generation failed.";
        if (data?.hint) errMsg += `\n\n${data.hint}`;
        if (data?.detail) errMsg += `\n${data.detail}`;
        throw new Error(errMsg);
      }

      clearLog();
      setIsMock(!!data._mock);
      setWorkflow(data.workflow as WorkflowGraph);
      // Pre-fill agent name from workflow name if provided
      if (data.workflow?.name) {
        setAgentName(data.workflow.name);
        setAgentDesc(data.workflow.description ?? "");
      }
      setStep(2);
    } catch (err) {
      clearLog();
      setGenerateError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Step 3 → Save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!workflow || saving) return;
    if (!agentName.trim()) {
      alert("Please enter a name for the agent.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName,
          description: agentDesc,
          prompt,
          workflow,
          llmProvider: provider,
          userApiKey: apiKey || undefined,
          status: "draft",
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed.");
      setSavedAgent({ _id: data._id, name: data.name });
      setStep(3);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save agent.");
    } finally {
      setSaving(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-8 select-none text-left max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-h1 font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Create Agent
            </h2>
            <p className="text-xs text-muted max-w-xl">
              Describe your agent in plain English. Our fine-tuned Nemotron Nano model will
              compile a structured workflow graph — then add your LLM key and save.
            </p>
          </div>
          <StepIndicator current={step} />
        </div>

        {/* ─── STEP 1 — Describe ───────────────────────────────────────────── */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Main form */}
            <div className="lg:col-span-2 space-y-5">
              <Card className="p-6">
                <form onSubmit={handleGenerate} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="agent-prompt" className="text-xs font-semibold text-muted uppercase tracking-wider">
                      What should this agent do?
                    </label>
                    <textarea
                      id="agent-prompt"
                      placeholder="e.g., Build an agent that monitors production database logs, searches vector storage for known error resolutions, drafts troubleshooting steps, and logs support tickets automatically…"
                      className="flex min-h-[160px] w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-foreground placeholder:text-muted/50 transition-all focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/30 resize-none"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      disabled={generating}
                    />
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <span className="text-[10px] text-muted flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" />
                      Powered by Nemotron Nano (local model — no external API needed)
                    </span>
                    <Button type="submit" isLoading={generating} disabled={!prompt.trim() || generating}>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Generate Workflow
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Generating log */}
              {generating && (
                <Card className="p-5 border-accent/20 bg-accent-muted/20">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="h-4 w-4 text-accent animate-spin" />
                    <span className="text-xs font-bold text-foreground">
                      Nemotron is compiling your workflow…
                    </span>
                  </div>
                  <div className="space-y-2 font-mono">
                    {logLines.map((line, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-muted">
                        <ChevronRight className="h-3 w-3 text-accent flex-shrink-0" />
                        {line}
                      </div>
                    ))}
                    {logLines.length > 0 && (
                      <span className="inline-block w-1.5 h-3 bg-accent animate-pulse rounded-sm ml-5" />
                    )}
                  </div>
                </Card>
              )}

              {/* Error */}
              {generateError && !generating && (
                <Card className="p-5 border-red-500/30 bg-red-500/5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4.5 w-4.5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-red-400">Generation Failed</p>
                      <p className="text-[11px] text-muted whitespace-pre-wrap">{generateError}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Quick templates */}
            <div className="space-y-4">
              <h3 className="font-h3 font-bold text-foreground text-sm">Quick Templates</h3>
              <div className="space-y-3">
                {QUICK_TEMPLATES.map((t, i) => (
                  <Card
                    key={i}
                    hoverEffect
                    className="p-4 cursor-pointer border border-border/60 hover:border-accent/30"
                    onClick={() => setPrompt(t.prompt)}
                  >
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                      {t.name}
                    </h4>
                    <p className="text-[10px] text-muted mt-2 leading-relaxed line-clamp-3">
                      {t.prompt}
                    </p>
                  </Card>
                ))}
              </div>

              <div className="rounded-xl border border-border/40 bg-surface/20 p-4 space-y-2">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="h-3 w-3" /> How it works
                </p>
                <ul className="space-y-1.5 text-[10px] text-muted">
                  <li className="flex gap-2"><span className="text-accent font-bold">1.</span> You describe the agent goal</li>
                  <li className="flex gap-2"><span className="text-accent font-bold">2.</span> Nemotron Nano generates the workflow graph</li>
                  <li className="flex gap-2"><span className="text-accent font-bold">3.</span> Add your LLM provider key (for runtime)</li>
                  <li className="flex gap-2"><span className="text-accent font-bold">4.</span> Save and open in Canvas</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2 — Review & Configure ─────────────────────────────────── */}
        {step === 2 && workflow && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Workflow preview */}
            <div className="lg:col-span-2 space-y-5">
              <Card className="border-accent/30 shadow-[0_0_24px_rgba(91,231,196,0.05)]">
                <CardHeader className="border-b border-border/40 pb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4.5 w-4.5 text-accent" />
                    <CardTitle className="text-sm font-bold">
                      Generated Workflow — {workflow.nodes?.length ?? 0} Nodes
                    </CardTitle>
                    <Badge variant="success" className="ml-auto">
                      Ready to review
                    </Badge>
                  </div>
                  <CardDescription className="text-[10px] mt-1">
                    Review the compiled logic chain. Rename the agent and add your LLM key on the right.
                  </CardDescription>
                </CardHeader>

                {isMock && (
                  <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-3 flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-yellow-500">Using Dev-Mode Mock Workflow</p>
                      <p className="text-[10px] text-yellow-500/80 mt-0.5 leading-relaxed">
                        The Nemotron inference server was unreachable. This is a smart mock generated based on your prompt keywords.
                        To generate real workflows, ensure <code className="bg-yellow-500/20 px-1 py-0.5 rounded text-yellow-600">inference_server.py</code> is running.
                      </p>
                    </div>
                  </div>
                )}

                <CardContent className="pt-5">
                  {/* Node chain */}
                  <div className="space-y-0">
                    {(workflow.nodes ?? []).map((node, idx) => (
                      <NodeCard key={node.id ?? idx} node={node} index={idx} />
                    ))}
                  </div>

                  {/* Edges summary */}
                  {(workflow.edges ?? []).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/40">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">
                        Connections ({workflow.edges.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {workflow.edges.map((edge, i) => {
                          const src = workflow.nodes?.find((n) => n.id === edge.source)?.name ?? edge.source;
                          const tgt = workflow.nodes?.find((n) => n.id === edge.target)?.name ?? edge.target;
                          return (
                            <span key={edge.id ?? i} className="text-[9px] border border-border/60 rounded px-2 py-0.5 text-muted">
                              {src} → {tgt}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="secondary" onClick={() => { setStep(1); setWorkflow(null); }}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  Back
                </Button>
                <Button onClick={handleSave} isLoading={saving} disabled={!agentName.trim() || saving}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Agent
                </Button>
              </div>
            </div>

            {/* Config panel */}
            <div className="space-y-5">
              {/* Agent metadata */}
              <Card className="p-5 space-y-4">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Agent Details
                </h3>

                <div className="space-y-1.5">
                  <label htmlFor="agent-name" className="text-[10px] font-semibold text-muted">
                    Agent Name *
                  </label>
                  <input
                    id="agent-name"
                    type="text"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
                    placeholder="My Support Agent"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="agent-desc" className="text-[10px] font-semibold text-muted">
                    Description
                  </label>
                  <textarea
                    id="agent-desc"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 resize-none min-h-[70px]"
                    placeholder="Short description of what this agent does"
                    value={agentDesc}
                    onChange={(e) => setAgentDesc(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="agent-tags" className="text-[10px] font-semibold text-muted flex items-center gap-1.5">
                    <Tag className="h-3 w-3" /> Tags (comma-separated)
                  </label>
                  <input
                    id="agent-tags"
                    type="text"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
                    placeholder="support, email, automation"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
              </Card>

              {/* API Key config */}
              <Card className="p-5 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-accent" />
                    Runtime LLM Key
                  </h3>
                  <p className="text-[10px] text-muted mt-1">
                    Your key is used only when the agent runs — it&apos;s stored AES-256 encrypted.
                    Leave blank to configure later.
                  </p>
                </div>

                {/* Provider selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-muted">LLM Provider</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProvider(p.id)}
                        className={[
                          "text-[10px] font-semibold px-2 py-1.5 rounded-lg border transition-all",
                          provider === p.id
                            ? "border-accent/50 bg-accent-muted/30 text-accent"
                            : "border-border/60 text-muted hover:border-accent/20 hover:text-foreground",
                        ].join(" ")}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* API key input */}
                <div className="space-y-1.5">
                  <label htmlFor="api-key" className="text-[10px] font-semibold text-muted">
                    API Key (optional)
                  </label>
                  <div className="relative">
                    <input
                      id="api-key"
                      type={showKey ? "text" : "password"}
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-16 text-xs text-foreground placeholder:text-muted/50 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 font-mono"
                      placeholder={PROVIDERS.find((p) => p.id === provider)?.placeholder ?? "..."}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted hover:text-foreground px-1.5 py-0.5 rounded"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ─── STEP 3 — Saved ──────────────────────────────────────────────── */}
        {step === 3 && savedAgent && (
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center border-accent/30 shadow-[0_0_40px_rgba(91,231,196,0.07)]">
              <div className="flex flex-col items-center gap-5">
                {/* Success icon */}
                <div className="h-16 w-16 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-accent" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-h1 font-bold text-foreground">Agent Saved!</h3>
                  <p className="text-xs text-muted">
                    <span className="font-semibold text-foreground">{savedAgent.name}</span> has been
                    saved as a draft. Open it in the Canvas to customise nodes visually.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <Link href="/workflow-builder" className="flex-1">
                    <Button className="w-full">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open in Canvas
                    </Button>
                  </Link>
                  <Link href="/dashboard/agents" className="flex-1">
                    <Button variant="secondary" className="w-full">
                      <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                      View All Agents
                    </Button>
                  </Link>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setPrompt("");
                    setWorkflow(null);
                    setAgentName("");
                    setAgentDesc("");
                    setTags("");
                    setApiKey("");
                    setSavedAgent(null);
                    setGenerateError(null);
                  }}
                  className="text-[10px] text-muted hover:text-foreground underline underline-offset-2"
                >
                  Create another agent
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}