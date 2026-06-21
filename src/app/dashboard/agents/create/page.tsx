"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, Terminal, Cpu, MessageSquare, Send, CheckCircle, ArrowRight, Layers, Sliders } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export default function CreateAgentPage() {
  const [prompt, setPrompt] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = React.useState<any>(null);

  const mockTemplates = [
    { name: "Customer Support Orchestrator", prompt: "Create a customer support agent that reads uploaded PDFs, routes claims, and drafts email responses based on customer sentiment." },
    { name: "SaaS Lead Enrichment", prompt: "Build an automated agent flow that triggers when a user registers, enriches their profile via API lookups, and posts a digest to Slack." },
    { name: "PR Security Guard", prompt: "Design a GitHub workflow agent that reviews pull request diffs, checks for API credential leaks, and posts security comments." }
  ];

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setGeneratedWorkflow(null);

    // Simulate Vibe Coding execution
    setTimeout(() => {
      setIsLoading(false);
      setGeneratedWorkflow({
        name: "AI Generated: Support & Escalation Agent",
        nodes: [
          { name: "Incoming Email Webhook", type: "Input", desc: "Listens for inbound messages." },
          { name: "Intent Classification (GPT-4o)", type: "LLM Router", desc: "Routes query to general, billing, or urgent queues." },
          { name: "RAG Docs Query", type: "Memory Fetch", desc: "Searches corporate PDFs database." },
          { name: "Auto Draft Response", type: "LLM Agent", desc: "Drafts replies using documents context." },
          { name: "Slack Billing Notification", type: "API Action", desc: "Alerts financial team if billing issues occur." }
        ],
        model: "GPT-4o",
        description: "Successfully synthesized from prompt: '" + prompt.slice(0, 50) + "...'"
      });
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 select-none text-left">
        <div className="space-y-1">
          <h2 className="font-h1 font-bold text-foreground">Vibe Coding Agent Creator</h2>
          <p className="text-xs text-muted">
            Describe your team structure, inputs, and desired LLM tools. The engine will compile your description into a functional React Flow node graph.
          </p>
        </div>

        {/* Input prompt zone & History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                    What should this agent flow do?
                  </label>
                  <textarea
                    placeholder="e.g., Build an agent that monitors our production database logs, checks memory vectors for standard error resolutions, drafts custom troubleshooting tips, and logs support tickets..."
                    className="flex min-h-[140px] w-full rounded-lg border border-border bg-surface px-3.5 py-3 text-sm text-foreground placeholder:text-muted/60 transition-all focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" />
                    AI model: GPT-4o Synthesis Engine
                  </span>
                  <Button type="submit" isLoading={isLoading}>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Compile Workflow
                  </Button>
                </div>
              </form>
            </Card>

            {/* AI compilation loader spinner */}
            {isLoading && (
              <div className="border border-accent/20 bg-accent-muted/30 rounded-xl p-8 text-center space-y-4 animate-pulse">
                <Cpu className="h-10 w-10 text-accent animate-spin mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Synthesizing Logic Architecture...</h4>
                  <p className="text-[10px] text-muted">Resolving variable triggers, assigning LLM system prompts, and structuring connector edges.</p>
                </div>
              </div>
            )}

            {/* Generated Workflow Output visualization */}
            {generatedWorkflow && !isLoading && (
              <Card className="border-accent/40 shadow-[0_0_20px_rgba(91,231,196,0.04)] animate-in fade-in zoom-in-95 duration-300">
                <CardHeader className="border-b border-border/40 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4.5 w-4.5 text-accent" />
                        <CardTitle className="text-sm font-bold text-foreground">{generatedWorkflow.name}</CardTitle>
                      </div>
                      <CardDescription className="text-[10px]">{generatedWorkflow.description}</CardDescription>
                    </div>
                    <Link href="/workflow-builder">
                      <Button size="sm">
                        Open in Canvas
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Compiled Operations Trace</h4>
                  <div className="relative border-l-2 border-border/80 pl-6 ml-3 space-y-5">
                    {generatedWorkflow.nodes.map((node: any, idx: number) => (
                      <div key={idx} className="relative group">
                        <div className="absolute -left-9 top-0.5 flex h-6.5 w-6.5 items-center justify-center rounded-full bg-surface border border-border group-hover:border-accent/30 text-muted group-hover:text-accent transition-colors text-[9px] font-bold">
                          {idx + 1}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{node.name}</span>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                              {node.type}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted">{node.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick Suggestions template list */}
          <div className="space-y-4">
            <h3 className="font-h3 font-bold text-foreground">Quick Templates</h3>
            <div className="space-y-4">
              {mockTemplates.map((temp, i) => (
                <Card
                  key={i}
                  hoverEffect
                  className="p-4 cursor-pointer text-left border border-border/60 hover:border-accent/30"
                  onClick={() => setPrompt(temp.prompt)}
                >
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-accent" />
                    {temp.name}
                  </h4>
                  <p className="text-[10px] text-muted mt-2 leading-relaxed">
                    {temp.prompt.slice(0, 110)}...
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
