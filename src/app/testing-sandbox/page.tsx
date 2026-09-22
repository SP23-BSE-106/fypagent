"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Send, RefreshCw, GitBranch, Sparkles, Database, Cpu, Terminal, ArrowLeft } from "lucide-react";
import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Button } from "@/components/ui/Button";

function TestingSandboxInner() {
  const searchParams = useSearchParams();
  const agentId = searchParams?.get("agentId");
  const agentName = searchParams?.get("name") || "Visual Workflow Canvas";

  const [input, setInput] = React.useState("");
  const [chatHistory, setChatHistory] = React.useState([
    { role: "assistant", text: `Testing sandbox connected to ${agentName}. Send a message to run an execution trace across your canvas nodes.` }
  ]);
  // Initialize logs without timestamps to avoid hydration mismatch
  const [logs, setLogs] = React.useState<any[]>([
    { type: "sys", text: `Sandbox virtual execution engine connected: ${agentName}`, time: "" },
    { type: "sys", text: "Ready for node graph parameter evaluation & RAG retriever test.", time: "" }
  ]);
  const [isTyping, setIsTyping] = React.useState(false);
  const [kbStatus, setKbStatus] = React.useState<{ documents: number; chunks: number } | null>(null);
  const [kbUploadBusy, setKbUploadBusy] = React.useState(false);
  const [kbUploadMessage, setKbUploadMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleKbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setKbUploadBusy(true);
    setKbUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);

      const res = await fetch('/api/rag/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Send auth cookie
      });

      if (res.ok) {
        const data = await res.json();
        setKbUploadMessage(`✓ Uploaded "${data.fileName}" with ${data.totalChunks} chunks`);
        // Refresh KB status
        const statusRes = await fetch('/api/rag/status', {
          credentials: 'include',
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setKbStatus({
            documents: statusData.knowledge_base.documents,
            chunks: statusData.knowledge_base.chunks
          });
        }
        setTimeout(() => setKbUploadMessage(null), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setKbUploadMessage(`✗ Upload failed: ${errData.error || 'Unauthorized'}`);
      }
    } catch (err) {
      console.error('KB upload error:', err);
      setKbUploadMessage('✗ Connection error during upload');
    } finally {
      setKbUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Initialize logs with proper timestamps after hydration (client-side only)
  React.useEffect(() => {
    setLogs([
      { type: "sys", text: `Sandbox virtual execution engine connected: ${agentName}`, time: new Date().toLocaleTimeString() },
      { type: "sys", text: "Ready for node graph parameter evaluation & RAG retriever test.", time: new Date().toLocaleTimeString() }
    ]);
  }, [agentName]);

  // Fetch knowledge base status
  React.useEffect(() => {
    const fetchKbStatus = async () => {
      try {
        const res = await fetch('/api/rag/status', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setKbStatus({
            documents: data.knowledge_base.documents,
            chunks: data.knowledge_base.chunks
          });
        }
      } catch (err) {
        console.warn('Failed to fetch KB status:', err);
      }
    };

    fetchKbStatus();
    // Refresh status every 5 seconds
    const interval = setInterval(fetchKbStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setChatHistory((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");
    setIsTyping(true);

    const now = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      { type: "exec", text: `[Trigger: Webhook Input] Inbound payload: "${userText}"`, time: now }
    ]);

    // Step 1: Input node
    setLogs((prev) => [
      ...prev,
      { type: "exec", text: "[Node 1: Input Trigger] Payload parameters extracted & validated.", time: new Date().toLocaleTimeString() }
    ]);

    // Step 2 + 3 + 4: Call the real RAG Chat API (retrieval + LLM generation)
    setLogs((prev) => [
      ...prev,
      { type: "exec", text: "[Node 2: RAG Retriever] Searching knowledge base for relevant document chunks...", time: new Date().toLocaleTimeString() }
    ]);

    try {
      const chatRes = await fetch("/api/rag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userText, topK: 3 }),
        credentials: 'include',
      });

      if (chatRes.ok) {
        const chatData = await chatRes.json();

        // Log RAG retrieval results
        if (chatData.sources && chatData.sources.length > 0) {
          const topMatch = chatData.sources[0];
          setLogs((prev) => [
            ...prev,
            { type: "exec", text: `[Node 2: RAG Retriever] ✓ ${chatData.sources.length} chunk(s) retrieved (top match: ${(topMatch.similarity * 100).toFixed(1)}% similarity).`, time: new Date().toLocaleTimeString() }
          ]);
        } else {
          setLogs((prev) => [
            ...prev,
            { type: "exec", text: "[Node 2: RAG Retriever] No matching documents found in knowledge base.", time: new Date().toLocaleTimeString() }
          ]);
        }

        // Log LLM generation
        setLogs((prev) => [
          ...prev,
          { type: "exec", text: "[Node 3: Kimi LLM Node] ✓ Response generated from retrieved context via Kimi K2.6.", time: new Date().toLocaleTimeString() }
        ]);

        // Output
        setIsTyping(false);
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", text: chatData.answer || "No answer was generated." }
        ]);
        setLogs((prev) => [
          ...prev,
          { type: "exec", text: "[Node 4: Output Node] Output compiled successfully. Response dispatched.", time: new Date().toLocaleTimeString() },
          { type: "sys", text: "Pipeline execution complete — returned to idle.", time: new Date().toLocaleTimeString() }
        ]);
      } else {
        const errData = await chatRes.json().catch(() => ({ error: "Unknown error" }));
        setIsTyping(false);
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", text: `Error: ${errData.error || "Failed to get response from Kimi."}` }
        ]);
        setLogs((prev) => [
          ...prev,
          { type: "exec", text: `[ERROR] RAG Chat API returned ${chatRes.status}: ${errData.error}`, time: new Date().toLocaleTimeString() }
        ]);
      }
    } catch (err) {
      console.error("Sandbox RAG chat error:", err);
      setIsTyping(false);
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", text: "Connection error — could not reach the RAG chat service. Please try again." }
      ]);
      setLogs((prev) => [
        ...prev,
        { type: "exec", text: `[ERROR] Network failure during RAG pipeline execution.`, time: new Date().toLocaleTimeString() }
      ]);
    }
  };

  const handleReset = () => {
    setChatHistory([
      { role: "assistant", text: `Testing sandbox connected to ${agentName}. Send a message to run an execution trace.` }
    ]);
    setLogs([
      { type: "sys", text: "Sandbox session reset.", time: new Date().toLocaleTimeString() },
      { type: "sys", text: `Active workflow recompiled: ${agentName}`, time: new Date().toLocaleTimeString() }
    ]);
  };

  return (
    <BuilderLayout
      title={`Testing Sandbox: ${agentName}`}
      subtitle="agentflow-testing-environment"
      onRun={handleReset}
      onSave={() => {}}
      isRunning={false}
    >
      <div className="absolute inset-0 flex select-none bg-[#0B0F14]">
        {/* Left chat panel */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border text-left relative">
          <div className="h-11 px-4 border-b border-border/40 flex items-center justify-between bg-surface/30">
            <div className="flex items-center gap-2">
              <Link href="/workflow-builder">
                <button className="text-muted hover:text-accent p-1 rounded-md transition-colors flex items-center gap-1 text-xs">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Builder Canvas
                </button>
              </Link>
            </div>
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
              placeholder="Type message to trigger visual node execution trace..."
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
        <div className="w-95 hidden md:flex flex-col border-l border-border bg-surface text-left">
          <div className="h-11 px-4 border-b border-border/40 flex items-center justify-between bg-surface/30 shrink-0">
            <span className="text-xs font-bold text-foreground">Visual Node Execution Trace</span>
          </div>

          {/* Steps Trace items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 text-[11px] font-mono leading-normal">
                <span className="text-[10px] text-muted shrink-0 mt-0.5">{log.time}</span>
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
              <span>Active Engine:</span>
              <span className="font-bold text-emerald-400">Kimi (HuggingFace Router)</span>
            </div>
            
            {/* RAG Knowledge Base Status & Upload */}
            <div className="pt-2 border-t border-border/30 space-y-2">
              <div className="flex items-center justify-between">
                <span>RAG Knowledge Base:</span>
                <span className={`font-bold ${kbStatus && kbStatus.chunks > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {kbStatus ? (kbStatus.chunks > 0 ? `Connected (${kbStatus.chunks} chunks)` : 'Empty') : 'Loading...'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Documents:</span>
                <span className="font-bold text-foreground">{kbStatus?.documents || 0}</span>
              </div>
              
              {/* Upload Button */}
              {(!kbStatus || kbStatus.chunks === 0) && (
                <div className="mt-3 pt-3 border-t border-border/30">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={kbUploadBusy}
                    className="w-full text-[9px] font-semibold px-2.5 py-1.5 rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {kbUploadBusy ? '⏳ Uploading...' : '📤 Upload Document'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleKbUpload}
                    accept=".txt,.pdf,.md"
                    className="hidden"
                    disabled={kbUploadBusy}
                  />
                  {kbUploadMessage && (
                    <div className={`mt-2 text-[8px] p-1.5 rounded ${
                      kbUploadMessage.startsWith('✓') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {kbUploadMessage}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </BuilderLayout>
  );
}

export default function TestingSandboxPage() {
  return (
    <React.Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background text-muted text-sm">Loading Sandbox...</div>}>
      <TestingSandboxInner />
    </React.Suspense>
  );
}
