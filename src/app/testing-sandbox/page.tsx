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
  const [logs, setLogs] = React.useState<any[]>([]);
  const [isTyping, setIsTyping] = React.useState(false);
  // The model that actually answered, read back from the response. This panel
  // used to print "Kimi (HuggingFace Router)" unconditionally, including when
  // no provider answered at all.
  const [engine, setEngine] = React.useState<{ provider: string | null; model: string | null } | null>(null);
  const [recorded, setRecorded] = React.useState(0);
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const lastQuestionRef = React.useRef<string | null>(null);
  const [kbStatus, setKbStatus] = React.useState<{ documents: number; chunks: number } | null>(null);
  const [kbUploadBusy, setKbUploadBusy] = React.useState(false);
  const [kbUploadMessage, setKbUploadMessage] = React.useState<string | null>(null);
  const [kbClearBusy, setKbClearBusy] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const refreshKbStatus = React.useCallback(async () => {
    try {
      const res = await fetch('/api/rag/status', { credentials: 'include' });
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
  }, []);

  const handleKbClear = async () => {
    if (!window.confirm('Delete ALL documents and chunks from the knowledge base?')) return;
    setKbClearBusy(true);
    setKbUploadMessage(null);
    try {
      const res = await fetch('/api/rag/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to clear knowledge base');
      await refreshKbStatus();
      setKbUploadMessage('✓ Knowledge base cleared — ready to re-upload');
      setTimeout(() => setKbUploadMessage(null), 4000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setKbUploadMessage(`✗ Clear failed: ${message}`);
    } finally {
      setKbClearBusy(false);
    }
  };

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
        await refreshKbStatus();
        setTimeout(() => setKbUploadMessage(null), 3000);
      } else {
        // Never default to "Unauthorized": a Vercel gateway/timeout page or a
        // 404 returns HTML, `res.json()` fails, and the old `|| 'Unauthorized'`
        // fallback blamed auth for what was really a 5xx.
        const raw = await res.text().catch(() => "");
        let errData: { error?: string } = {};
        try {
          errData = raw ? JSON.parse(raw) : {};
        } catch {
          /* non-JSON error page — fall through to the status line below */
        }

        if (res.status === 401) {
          setKbUploadMessage("✗ Session expired — log in again, then retry the upload.");
        } else if (errData.error) {
          setKbUploadMessage(`✗ Upload failed (${res.status}): ${errData.error}`);
        } else {
          const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 140);
          setKbUploadMessage(
            `✗ Upload failed — HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}` +
              (snippet ? ` — ${snippet}` : ""),
          );
        }
      }
    } catch (err) {
      console.error('KB upload error:', err);
      setKbUploadMessage('✗ Connection error during upload');
    } finally {
      setKbUploadBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /**
   * The boot banner is derived rather than stored, so it follows `agentName`
   * without a state write inside an effect. Its timestamps are deliberately
   * blank: those lines predate the client clock and must match SSR output.
   */
  const bootLogs = React.useMemo(
    () => [
      { type: "sys", text: `Sandbox virtual execution engine connected: ${agentName}`, time: "" },
      { type: "sys", text: "Ready for node graph parameter evaluation & RAG retriever test.", time: "" },
    ],
    [agentName],
  );
  const visibleLogs = React.useMemo(() => [...bootLogs, ...logs], [bootLogs, logs]);

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

  /**
   * Every execution is written to the run history so Monitoring & Control has
   * real numbers to show. Fire-and-forget: a monitoring failure must never be
   * able to fail the test it is recording.
   */
  const recordRun = (
    kind: "exec" | "session",
    payload: {
      input: string;
      output: string;
      status: "success" | "failed";
      durationMs?: number;
      sourceCount?: number;
      provider?: string | null;
      model?: string | null;
      error?: string | null;
    },
  ) => {
    void fetch("/api/agents/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ kind, agentId, agentName, ...payload }),
    })
      .then(() => setRecorded((count) => count + 1))
      .catch(() => {
        /* recording is best-effort; the run itself already happened */
      });
  };

  const runQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || isTyping) return;

    lastQuestionRef.current = question;
    setChatHistory((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setIsTyping(true);

    const startedAt = Date.now();
    const stamp = () => new Date().toLocaleTimeString();

    setLogs((prev) => [
      ...prev,
      {
        type: "exec",
        text: `[Node 1: Input Trigger] Executing with payload: "${question}"`,
        time: stamp(),
      },
      { type: "exec", text: "[Node 2: RAG Retriever] Querying the vector index...", time: stamp() },
    ]);

    try {
      const chatRes = await fetch("/api/rag/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, topK: 3 }),
        credentials: "include",
      });

      const elapsedMs = Date.now() - startedAt;

      if (!chatRes.ok) {
        const errData = await chatRes.json().catch(() => ({}));
        const reason: string = errData.error || `HTTP ${chatRes.status}`;

        setIsTyping(false);
        setEngine(null);
        setChatHistory((prev) => [...prev, { role: "assistant", text: `Error: ${reason}` }]);
        setLogs((prev) => [
          ...prev,
          { type: "exec", text: `[Node 2: RAG Retriever] ✗ ${reason}`, time: stamp() },
          { type: "sys", text: `Execution failed after ${elapsedMs} ms — recorded.`, time: stamp() },
        ]);

        recordRun("exec", {
          input: question,
          output: reason,
          status: "failed",
          durationMs: elapsedMs,
          error: reason,
        });
        return;
      }

      const chatData = await chatRes.json();
      const sources: Array<{ similarity?: number }> = Array.isArray(chatData.sources)
        ? chatData.sources
        : [];
      const provider: string | null = chatData.provider ?? null;
      const model: string | null = chatData.model ?? null;
      const answer: string = chatData.answer || "No answer was generated.";
      const engineLabel = model || provider || "unconfigured model";

      setEngine({ provider, model });
      setIsTyping(false);
      setChatHistory((prev) => [...prev, { role: "assistant", text: answer }]);

      const topSimilarity = Number(sources[0]?.similarity ?? 0);
      setLogs((prev) => [
        ...prev,
        sources.length > 0
          ? {
              type: "exec",
              text: `[Node 2: RAG Retriever] ✓ ${sources.length} chunk(s) retrieved (top match ${(topSimilarity * 100).toFixed(1)}% similar).`,
              time: stamp(),
            }
          : {
              type: "exec",
              text: "[Node 2: RAG Retriever] 0 chunks matched — answering without retrieved context.",
              time: stamp(),
            },
        {
          type: "exec",
          text: `[Node 3: LLM Node] ✓ Answer produced by ${engineLabel} in ${elapsedMs} ms.`,
          time: stamp(),
        },
        {
          type: "exec",
          text: `[Node 4: Output Node] Response dispatched (${answer.length} chars).`,
          time: stamp(),
        },
        { type: "sys", text: "Execution recorded in the run history.", time: stamp() },
      ]);

      recordRun("exec", {
        input: question,
        output: answer,
        status: "success",
        durationMs: elapsedMs,
        sourceCount: sources.length,
        provider,
        model,
      });
    } catch (err) {
      const elapsedMs = Date.now() - startedAt;
      const reason = err instanceof Error ? err.message : "network failure";

      console.error("Sandbox RAG chat error:", err);
      setIsTyping(false);
      setEngine(null);
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", text: "Connection error — could not reach the RAG chat service. Please try again." },
      ]);
      setLogs((prev) => [
        ...prev,
        { type: "exec", text: `[ERROR] Network failure after ${elapsedMs} ms: ${reason}`, time: stamp() },
      ]);

      recordRun("exec", {
        input: question,
        output: reason,
        status: "failed",
        durationMs: elapsedMs,
        error: reason,
      });
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    void runQuestion(input);
  };

  /**
   * "Run Agent" re-executes the last question. It used to call the reset
   * handler, so the button that said Run quietly threw the session away.
   */
  const handleRerun = () => {
    const last = lastQuestionRef.current;
    if (!last) {
      setLogs((prev) => [
        ...prev,
        {
          type: "sys",
          text: "Nothing to run yet — send a message first, then Run Agent repeats it.",
          time: new Date().toLocaleTimeString(),
        },
      ]);
      return;
    }
    void runQuestion(last);
  };

  /** Saves the whole conversation to the run history, where the dashboard can read it back. */
  const handleSaveSession = async () => {
    if (chatHistory.length < 2) {
      setSaveStatus("error");
      setSaveError("Nothing to save yet — run at least one exchange first.");
      window.setTimeout(() => setSaveStatus("idle"), 6000);
      return;
    }

    const transcript = chatHistory
      .map((message) => `${message.role === "user" ? "User" : "Agent"}: ${message.text}`)
      .join("\n");

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const res = await fetch("/api/agents/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          kind: "session",
          agentId,
          agentName,
          input: transcript,
          output: chatHistory[chatHistory.length - 1]?.text ?? "",
          status: "success",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);

      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 4000);
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err instanceof Error ? err.message : "Could not save the session.");
      window.setTimeout(() => setSaveStatus("idle"), 8000);
    }
  };

  const handleReset = () => {
    lastQuestionRef.current = null;
    setEngine(null);
    setSaveStatus("idle");
    setSaveError(null);
    setChatHistory([
      { role: "assistant", text: `Testing sandbox connected to ${agentName}. Send a message to run an execution trace.` }
    ]);
    // Dropping the trace returns the right-hand panel to its boot banner.
    setLogs([]);
  };

  return (
    <BuilderLayout
      title={`Testing Sandbox: ${agentName}`}
      subtitle="agentflow-testing-environment"
      onRun={handleRerun}
      isRunning={isTyping}
      onSave={handleSaveSession}
      saveLabel="Save Session"
      isSaving={saveStatus === "saving"}
      autoSaveStatus={saveStatus}
      autoSaveError={saveError}
    >
      <div className="absolute inset-0 flex select-none bg-[#0B0F14]">
        {/* Left chat panel */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border text-left relative">
          <div className="h-11 px-4 border-b border-border/40 flex items-center justify-between bg-surface/30">
            <div className="flex items-center gap-2">
              <Link
                href={
                  agentId
                    ? `/workflow-builder?agentId=${encodeURIComponent(agentId)}&agentName=${encodeURIComponent(agentName)}`
                    : "/workflow-builder"
                }
              >
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
            {visibleLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 text-[11px] font-mono leading-normal">
                <span className="text-[10px] text-muted shrink-0 mt-0.5">{log.time || "—"}</span>
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
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0">Engine:</span>
              <span
                className={`font-bold truncate ${engine ? "text-emerald-400" : "text-muted"}`}
                title={
                  engine
                    ? [engine.provider, engine.model].filter(Boolean).join(" — ")
                    : undefined
                }
              >
                {engine ? engine.model || engine.provider || "unconfigured" : "not run yet"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0">Provider:</span>
              <span className={`font-bold truncate ${engine?.provider ? "text-sky-400" : "text-muted"}`}>
                {engine?.provider || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Recorded this session:</span>
              <span className="font-bold text-emerald-400">{recorded}</span>
            </div>
            <Link
              href="/dashboard/analytics"
              className="inline-block pt-1 text-[9px] font-semibold text-accent hover:underline"
            >
              View run history →
            </Link>
            
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
              
              {/* Upload / Clear Buttons */}
              <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                {(!kbStatus || kbStatus.chunks === 0) ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={kbUploadBusy}
                    className="w-full text-[9px] font-semibold px-2.5 py-1.5 rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {kbUploadBusy ? '⏳ Uploading...' : '📤 Upload Document'}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={kbUploadBusy || kbClearBusy}
                      className="flex-1 text-[9px] font-semibold px-2.5 py-1.5 rounded bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {kbUploadBusy ? '⏳ Uploading...' : '📤 Upload'}
                    </button>
                    <button
                      onClick={handleKbClear}
                      disabled={kbUploadBusy || kbClearBusy}
                      className="flex-1 text-[9px] font-semibold px-2.5 py-1.5 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {kbClearBusy ? '⏳ Clearing...' : '🗑️ Clear All'}
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleKbUpload}
                  accept=".txt,.pdf,.md"
                  className="hidden"
                  disabled={kbUploadBusy}
                />
                {kbUploadMessage && (
                  <div className={`text-[8px] p-1.5 rounded ${
                    kbUploadMessage.startsWith('✓') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {kbUploadMessage}
                  </div>
                )}
              </div>
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
