"use client";

import * as React from "react";
import Link from "next/link";
import { Terminal, Send, Play, Cpu, Server, CheckCircle, RefreshCw, Layers, Shield } from "lucide-react";
import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export default function TestingSandboxPage() {
  const [input, setInput] = React.useState("");
  const [chatHistory, setChatHistory] = React.useState([
    { role: "assistant", text: "Hello! Testing sandbox active. Send a message to run a simulated execution trace against the current node graph." }
  ]);
  const [logs, setLogs] = React.useState<any[]>([
    { type: "sys", text: "Sandbox virtual execution environment ready.", time: "14:02:11" },
    { type: "sys", text: "Active workflow compiled: Support & Escalation Agent.", time: "14:02:12" }
  ]);
  const [isTyping, setIsTyping] = React.useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setChatHistory((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");
    setIsTyping(true);

    const now = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      { type: "exec", text: `[Trigger] Inbound user query received: "${userText}"`, time: now }
    ]);

    // Step 1: Input node
    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        { type: "exec", text: "[Node 1: Webhook Ingestion] Resolved input, passing parameters to Router.", time: new Date().toLocaleTimeString() }
      ]);
    }, 600);

    // Step 2: LLM Router node
    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        { type: "exec", text: "[Node 2: Model Router (GPT-4o)] Triggered. Running inference. Query class: 'RAG Lookup Needed'. Tokens: 92 in, 14 out.", time: new Date().toLocaleTimeString() }
      ]);
    }, 1300);

    // Step 3: RAG Node
    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        { type: "exec", text: "[Node 3: Knowledge Retrieval] Searching Vector DB index 'Manuals Core Base' for semantic overlaps. Match found: 'Refund_Policy_Rules.txt' (Confidence: 0.94).", time: new Date().toLocaleTimeString() }
      ]);
    }, 2100);

    // Step 4: Output Node
    setTimeout(() => {
      setIsTyping(false);
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", text: "Based on our refund policy rules, claims are eligible for a full refund if requested within 14 days of purchase. Would you like me to open a ticket?" }
      ]);
      setLogs((prev) => [
        ...prev,
        { type: "exec", text: "[Node 5: Compiled Output] Generated response payload. Execution completed in 2.84 seconds.", time: new Date().toLocaleTimeString() },
        { type: "sys", text: "Inbound channel socket connection idle.", time: new Date().toLocaleTimeString() }
      ]);
    }, 2900);
  };

  const handleReset = () => {
    setChatHistory([
      { role: "assistant", text: "Hello! Testing sandbox active. Send a message to run a simulated execution trace against the current node graph." }
    ]);
    setLogs([
      { type: "sys", text: "Sandbox virtual execution environment reset.", time: new Date().toLocaleTimeString() },
      { type: "sys", text: "Active workflow compiled: Support & Escalation Agent.", time: new Date().toLocaleTimeString() }
    ]);
  };

  return (
    <BuilderLayout
      title="Testing Sandbox Simulator"
      subtitle="agentflow-testing-environment"
      onRun={handleReset}
      onSave={() => {}}
      isRunning={false}
    >
      <div className="absolute inset-0 flex select-none bg-[#0B0F14]">
        {/* Left chat panel */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border text-left relative">
          <div className="h-11 px-4 border-b border-border/40 flex items-center justify-between bg-surface/30">
            <span className="text-xs font-bold text-foreground">Chat Simulator</span>
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-[10px] font-semibold text-muted hover:text-accent">
              <RefreshCw className="h-3 w-3 mr-1" />
              Reset Session
            </Button>
          </div>

          {/* Messages feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-xl p-3.5 text-xs leading-relaxed border ${
                    msg.role === "user"
                      ? "bg-accent/10 border-accent/20 text-accent font-semibold"
                      : "bg-surface border-border text-foreground"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-xl p-3 bg-surface border border-border flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-4 border-t border-border/40 bg-surface/20 flex gap-2">
            <input
              type="text"
              placeholder="Type message to trigger node trace..."
              className="flex-1 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/40"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
            />
            <Button type="submit" size="sm" disabled={isTyping}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>

        {/* Right Node execution trace panel */}
        <div className="w-[380px] hidden md:flex flex-col border-l border-border bg-surface text-left">
          <div className="h-11 px-4 border-b border-border/40 flex items-center justify-between bg-surface/30 flex-shrink-0">
            <span className="text-xs font-bold text-foreground">Execution Steps Trace</span>
          </div>

          {/* Steps Trace items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 text-[11px] font-mono leading-normal">
                <span className="text-[10px] text-muted flex-shrink-0 mt-0.5">{log.time}</span>
                <div className="flex flex-col">
                  {log.type === "sys" ? (
                    <span className="text-accent font-semibold">{log.text}</span>
                  ) : (
                    <span className="text-foreground/90">{log.text}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Metrics summary */}
          <div className="p-4 border-t border-border/40 bg-surface/50 text-[10px] text-muted space-y-3">
            <div className="flex items-center justify-between">
              <span>Selected model:</span>
              <span className="font-bold text-foreground">GPT-4o</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Accumulated tokens:</span>
              <span className="font-bold text-foreground">106</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Avg Latency:</span>
              <span className="font-bold text-foreground">2.84s</span>
            </div>
          </div>
        </div>
      </div>
    </BuilderLayout>
  );
}
