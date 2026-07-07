"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Handle,
  Position,
  Connection,
} from "reactflow";
import "reactflow/dist/style.css";

import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Cpu, GitBranch, Terminal, Database, MessageSquare, Plus, Trash2, Zap, Play, Sliders, Send, Bot } from "lucide-react";

// Custom node styling layout matching Vercel/Linear
const CustomNodeComponent = ({ data, selected }: { data: any; selected: boolean }) => {
  const Icon = data.icon;
  return (
    <div
      className={`rounded-lg border bg-[#131A23] p-3 text-left w-52 transition-all duration-300 ${
        selected ? "border-accent shadow-[0_0_15px_rgba(91,231,196,0.15)]" : "border-border/80 hover:border-border-light"
      }`}
    >
      {/* Top Handles */}
      {data.type !== "Input" && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-2.5 h-2.5 bg-accent border-2 border-[#0B0F14]"
        />
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-6.5 w-6.5 rounded bg-accent-muted flex items-center justify-center text-accent">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-bold text-foreground leading-none">{data.label}</span>
            <span className="text-[8px] text-muted tracking-wide uppercase mt-0.5">{data.type}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        </div>
      </div>

      <p className="text-[9px] text-muted/90 leading-relaxed font-medium mt-1 select-none">
        {data.description}
      </p>

      {/* Bottom Handles */}
      {data.type !== "Output" && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-2.5 h-2.5 bg-accent border-2 border-[#0B0F14]"
        />
      )}
    </div>
  );
};

const nodeTypes = {
  customNode: CustomNodeComponent,
};

// Empty canvas by default; workflows are loaded from Create Agent or an existing agent.
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

function mapWorkflowToCanvas(workflow: any) {
  const typeIcons: Record<string, { type: string; icon: any }> = {
    trigger: { type: "Input", icon: Zap },
    llm: { type: "LLM Node", icon: Cpu },
    rag: { type: "RAG Node", icon: Database },
    api: { type: "API Node", icon: GitBranch },
    condition: { type: "Condition", icon: GitBranch },
    output: { type: "Output", icon: Terminal },
  };

  const mappedNodes: Node[] = (workflow?.nodes || []).map((n: any, i: number) => {
    const mapInfo = typeIcons[n.type] || { type: "LLM Node", icon: Cpu };
    return {
      id: n.id,
      type: "customNode",
      position: { x: 260 + (i % 2) * 240, y: 80 + Math.floor(i / 2) * 180 },
      data: {
        label: n.name,
        type: mapInfo.type,
        description: n.description,
        icon: mapInfo.icon,
      },
    };
  });

  const mappedEdges: Edge[] = (workflow?.edges || []).map((e: any) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));

  return { nodes: mappedNodes, edges: mappedEdges };
}

function WorkflowBuilderInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const agentId = searchParams?.get("agentId");
  const agentNameFromQuery = searchParams?.get("agentName") ?? "";

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [saveBusy, setSaveBusy] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [assistantInput, setAssistantInput] = React.useState("");
  const [assistantBusy, setAssistantBusy] = React.useState(false);
  const [assistantMessages, setAssistantMessages] = React.useState<Array<{ role: "assistant" | "user"; content: string }>>([
    {
      role: "assistant",
      content: "Kimi is ready. Ask me to add, remove, or rename nodes and I’ll update the canvas instantly.",
    },
  ]);
  const [logs, setLogs] = React.useState<string[]>([
    "[SYSTEM] Workflow canvas initialized.",
    "[SYSTEM] Waiting for a workflow or a prompt from Kimi Assistant...",
  ]);

  React.useEffect(() => {
    const workflowFromQuery = searchParams?.get("workflow");
    const workflowFromSession = typeof window !== "undefined" ? window.sessionStorage.getItem("pendingWorkflow") : null;

    const loadWorkflow = (workflow: any) => {
      const { nodes: mappedNodes, edges: mappedEdges } = mapWorkflowToCanvas(workflow);
      setNodes(mappedNodes);
      setEdges(mappedEdges);
      setLogs((prev) => [...prev, "[SYSTEM] Loaded workflow into the canvas."]);
    };

    if (workflowFromQuery) {
      try {
        const parsed = JSON.parse(decodeURIComponent(workflowFromQuery));
        loadWorkflow(parsed);
        return;
      } catch (error) {
        console.error(error);
      }
    }

    if (workflowFromSession) {
      try {
        const parsed = JSON.parse(workflowFromSession);
        loadWorkflow(parsed);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem("pendingWorkflow");
        }
        return;
      } catch (error) {
        console.error(error);
      }
    }

    if (!agentId) {
      setNodes([]);
      setEdges([]);
      return;
    }

    setLogs((prev) => [...prev, "[SYSTEM] Fetching agent workflow..."]);
    fetch(`/api/agents/${agentId}`)
      .then((res) => res.json())
      .then((agent) => {
        if (agent?.workflow) {
          loadWorkflow(agent.workflow);
          setLogs((prev) => [...prev, `[SYSTEM] Loaded workflow graph from agent: ${agent.name}`]);
        }
      })
      .catch((err) => {
        console.error(err);
        setLogs((prev) => [...prev, "[SYSTEM] Failed to load agent workflow."]);
      });
  }, [agentId, searchParams, setNodes, setEdges]);

  // Handle flow connect
  const onConnect = React.useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Catch node selection
  const onNodeClick = React.useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = React.useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Run execution simulation
  const handleRun = () => {
    setIsRunning(true);
    setLogs((prev) => [...prev, "[EXECUTION] Initializing manual run request..."]);

    const steps = [
      { msg: "[EXECUTION] Step 1: Webhook Ingestion triggered - Payload collected.", delay: 800 },
      { msg: "[EXECUTION] Step 2: Model Router (GPT-4o) processed intent (Class: Escalation).", delay: 1600 },
      { msg: "[EXECUTION] Step 3: Querying RAG Database index: Ingested 2 relevant chunks.", delay: 2400 },
      { msg: "[EXECUTION] Step 4: Syncing payload with CRM API Salesforce Endpoint.", delay: 3200 },
      { msg: "[EXECUTION] Step 5: Compiled Output finalized. Output: { success: true }.", delay: 4000 },
      { msg: "[SYSTEM] Flow completed successfully in 4.02 seconds.", delay: 4100 },
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, step.msg]);
        if (step.msg.includes("completed")) {
          setIsRunning(false);
        }
      }, step.delay);
    });
  };

  const handleAddNode = (type: string) => {
    const id = (nodes.length + 1).toString();
    const icons = { Input: Zap, "LLM Node": Cpu, "RAG Node": Database, "API Node": GitBranch, Output: Terminal };
    const label = `New ${type}`;
    
    const newNode: Node = {
      id,
      type: "customNode",
      position: { x: 100 + Math.random() * 200, y: 150 + Math.random() * 200 },
      data: {
        label,
        type,
        description: `Set up details configuration inside parameters panel.`,
        icon: (icons as any)[type] || Cpu,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setLogs((prev) => [...prev, `[SYSTEM] Added new ${type} node to canvas.`]);
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setLogs((prev) => [...prev, `[SYSTEM] Deleted node '${selectedNode.data.label}' from canvas.`]);
    setSelectedNode(null);
  };

  const handleSaveDraft = async () => {
    const draftName = (agentNameFromQuery || "Untitled Draft").trim() || "Untitled Draft";

    setSaveBusy(true);
    setSaveMessage(null);

    try {
      const workflowPayload = {
        name: draftName,
        description: "Workflow saved from the visual builder.",
        nodes: nodes.map((node) => ({
          id: node.id,
          name: node.data?.label ?? "Untitled",
          type: node.data?.type === "Input" ? "trigger" : node.data?.type === "Output" ? "output" : node.data?.type === "RAG Node" ? "rag" : node.data?.type === "Condition" ? "condition" : node.data?.type === "API Node" ? "api" : "llm",
          description: node.data?.description ?? "",
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
        })),
      };

      const endpoint = agentId ? `/api/agents/${agentId}` : "/api/agents";
      const method = agentId ? "PATCH" : "POST";
      const body = agentId
        ? {
            workflow: workflowPayload,
            status: "draft",
            name: draftName,
          }
        : {
            name: draftName,
            description: "Saved draft from the visual builder.",
            prompt: "",
            workflow: workflowPayload,
            status: "draft",
          };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save draft.");

      if (data?._id && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        params.set("agentId", data._id);
        params.set("agentName", data.name || draftName);
        router.replace(`${window.location.pathname}?${params.toString()}`);
      }

      setSaveMessage("Draft saved to My Agents.");
      setLogs((prev) => [...prev, "[SYSTEM] Draft saved successfully to the agent record."]);
      router.refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save draft.";
      setSaveMessage(msg);
      setLogs((prev) => [...prev, `[SYSTEM] ${msg}`]);
    } finally {
      setSaveBusy(false);
    }
  };

  const handleAssistantSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const promptText = assistantInput.trim();
    if (!promptText) return;

    setAssistantBusy(true);
    setAssistantMessages((prev) => [...prev, { role: "user", content: promptText }]);

    const lower = promptText.toLowerCase();
    const nodeTypeMatch = /(trigger|llm|rag|api|condition|output)/i.exec(lower);
    const typeKey = nodeTypeMatch?.[1]?.toLowerCase() || "llm";
    const typeMap: Record<string, string> = {
      trigger: "Input",
      llm: "LLM Node",
      rag: "RAG Node",
      api: "API Node",
      condition: "Condition",
      output: "Output",
    };

    const icons = { Input: Zap, "LLM Node": Cpu, "RAG Node": Database, "API Node": GitBranch, Output: Terminal, Condition: GitBranch };

    let reply = "Kimi added a new node to the canvas.";

    if (lower.includes("remove") || lower.includes("delete")) {
      if (selectedNode) {
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
        setSelectedNode(null);
        reply = `Removed the selected node from the canvas.`;
      } else {
        reply = "Select a node first, or ask me to remove the most recent node.";
      }
    } else if (lower.includes("rename") && selectedNode) {
      const renameMatch = promptText.match(/rename(?:\s+it|\s+the)?\s+(.+?)\s+to\s+(.+)/i);
      const newLabel = renameMatch?.[2]?.trim() || `Updated ${selectedNode.data.label}`;
      setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, label: newLabel } } : n)));
      setSelectedNode((prev: any) => (prev ? { ...prev, data: { ...prev.data, label: newLabel } } : prev));
      reply = `Renamed the selected node to ${newLabel}.`;
    } else {
      const nextId = `${Date.now()}`;
      const label = typeKey === "llm"
        ? "Kimi Suggested Node"
        : `${typeMap[typeKey]} Added`;
      const newNode: Node = {
        id: nextId,
        type: "customNode",
        position: { x: 180 + Math.random() * 220, y: 100 + Math.random() * 220 },
        data: {
          label,
          type: typeMap[typeKey] || "LLM Node",
          description: `Added by Kimi Assistant from prompt: ${promptText}`,
          icon: (icons as any)[typeMap[typeKey] || "LLM Node"] || Cpu,
        },
      };

      setNodes((prevNodes) => {
        const nextNodes = [...prevNodes, newNode];
        if (prevNodes.length > 0) {
          const lastNode = prevNodes[prevNodes.length - 1];
          setEdges((prevEdges) => [...prevEdges, { id: `edge_${Date.now()}`, source: lastNode.id, target: newNode.id }]);
        }
        return nextNodes;
      });

      setLogs((prev) => [...prev, `[KIMI] Added ${typeMap[typeKey] || "LLM Node"} from prompt.`]);
    }

    setAssistantMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setAssistantInput("");
    setAssistantBusy(false);
  };

  // Render left library
  const renderLeftPanel = () => (
    <div className="flex-1 flex flex-col min-h-0 text-left select-none">
      <div className="p-4 border-b border-border/40 flex items-center justify-between">
        <span className="text-xs font-bold text-foreground uppercase tracking-wide">Node Library</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {[
          { name: "Input Trigger", type: "Input", icon: Zap, desc: "API Endpoint Webhook" },
          { name: "LLM Agent", type: "LLM Node", icon: Cpu, desc: "Prompt Model Resolution" },
          { name: "RAG Ingest", type: "RAG Node", icon: Database, desc: "Vector Database search" },
          { name: "REST API call", type: "API Node", icon: GitBranch, desc: "Post/Get Web Services" },
          { name: "Response Output", type: "Output", icon: Terminal, desc: "Finalize run values" },
        ].map((node) => {
          const Icon = node.icon;
          return (
            <div
              key={node.name}
              onClick={() => handleAddNode(node.type)}
              className="border border-border/80 hover:border-accent/40 rounded-lg p-3 bg-[#131a23]/30 hover:bg-[#131a23]/70 cursor-pointer flex gap-3 transition-all duration-200 select-none group"
            >
              <div className="h-8.5 w-8.5 rounded-lg bg-surface-light border border-border group-hover:border-accent/20 flex items-center justify-center text-muted group-hover:text-accent transition-colors flex-shrink-0">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">
                  {node.name}
                </span>
                <span className="text-[9px] text-muted mt-1 leading-relaxed">
                  {node.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render right properties editor
  const renderRightPanel = () => (
    <div className="flex-grow flex flex-col min-h-0 text-left select-none">
      <div className="p-4 border-b border-border/40 flex items-center justify-between">
        <span className="text-xs font-bold text-foreground uppercase tracking-wide">Kimi Assistant</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-xl border border-accent/20 bg-accent/10 p-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-accent">
            <Bot className="h-3.5 w-3.5" />
            Live workflow editing
          </div>
          <p className="mt-2 text-[10px] text-muted leading-relaxed">
            Ask Kimi to add a RAG node, rename the trigger, or remove a selected node. Changes appear instantly.
          </p>
        </div>

        <form onSubmit={handleAssistantSubmit} className="space-y-2">
          <textarea
            value={assistantInput}
            onChange={(e) => setAssistantInput(e.target.value)}
            placeholder="e.g. add a RAG node and connect it to the trigger"
            className="min-h-24 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/40"
          />
          <Button type="submit" size="sm" className="w-full" isLoading={assistantBusy}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Send to Kimi
          </Button>
        </form>

        <div className="space-y-2">
          {assistantMessages.map((msg, index) => (
            <div key={`${msg.role}-${index}`} className={`rounded-lg border px-3 py-2 text-[10px] leading-relaxed ${msg.role === "assistant" ? "border-accent/20 bg-accent/10 text-foreground" : "border-border/50 bg-surface/80 text-muted"}`}>
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider opacity-70">{msg.role === "assistant" ? "Kimi" : "You"}</div>
              <div>{msg.content}</div>
            </div>
          ))}
        </div>

        <div className="border-t border-border/40 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">Node Properties</span>
          </div>
          {selectedNode ? (
            <div className="space-y-3.5">
              <Input
                label="Node Name"
                value={selectedNode.data.label}
                onChange={(e) => {
                  const val = e.target.value;
                  setNodes((nds) =>
                    nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, label: val } } : n))
                  );
                  setSelectedNode((prev: any) => ({ ...prev, data: { ...prev.data, label: val } }));
                }}
              />
              <Input
                label="Configuration / Info"
                value={selectedNode.data.description}
                onChange={(e) => {
                  const val = e.target.value;
                  setNodes((nds) =>
                    nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, description: val } } : n))
                  );
                  setSelectedNode((prev: any) => ({ ...prev, data: { ...prev.data, description: val } }));
                }}
              />

              {selectedNode.data.type === "LLM Node" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">Model</label>
                    <select className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent/40">
                      <option>GPT-4o (Standard)</option>
                      <option>Claude 3.5 Sonnet</option>
                      <option>DeepSeek V3 API</option>
                      <option>Llama 3.1 8B (Local)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">System Prompt</label>
                    <textarea
                      placeholder="You are an helpful assistant..."
                      className="w-full h-24 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/40"
                    />
                  </div>
                </div>
              )}

              {selectedNode.data.type === "RAG Node" && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">Index Database</label>
                    <select className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent/40">
                      <option>Manuals Core Base</option>
                      <option>Billing Policies Directory</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 font-medium text-[10px] text-muted bg-surface-light/40 border border-border/40 p-3.5 rounded-lg leading-normal">
                    Returns top 3 vector matches based on cosine lookup value mappings.
                  </div>
                </div>
              )}

              <Button variant="danger" size="sm" className="w-full text-xs font-semibold" onClick={handleDeleteNode}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Remove Node
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-xs text-muted py-8">
              <Sliders className="h-8 w-8 text-muted/60 mb-2.5" />
              <span>Select a node on the canvas to configure parameters.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render bottom log panel
  const renderBottomLogs = () => (
    <div className="h-full p-4 font-mono text-[11px] text-muted flex flex-col gap-1.5 text-left select-text">
      {logs.map((log, i) => {
        let color = "text-muted";
        if (log.includes("[SYSTEM]")) color = "text-accent font-semibold";
        if (log.includes("[EXECUTION]")) color = "text-foreground/90";
        return (
          <div key={i} className={color}>
            {log}
          </div>
        );
      })}
    </div>
  );

  return (
    <BuilderLayout
      title="Visual Workflow Canvas"
      subtitle="agentflow-main-workspace"
      leftPanel={renderLeftPanel()}
      rightPanel={renderRightPanel()}
      bottomLogs={renderBottomLogs()}
      onRun={handleRun}
      isRunning={isRunning}
      onSave={handleSaveDraft}
      onDeploy={() => setLogs((prev) => [...prev, "[SYSTEM] Workflow compiled and deployed to public production endpoint."])}
    >
      <div className="relative h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
        >
          <MiniMap
            nodeColor="#131A23"
            nodeStrokeColor="#1E293B"
            maskColor="rgba(11, 15, 20, 0.7)"
            className="border border-border/80 bg-surface rounded-lg hidden sm:block"
          />
          <Controls className="border border-border/80 bg-surface rounded-lg" />
          <Background color="#1E293B" gap={16} />
        </ReactFlow>

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-md rounded-2xl border border-dashed border-border/70 bg-surface/80 px-6 py-5 text-center shadow-lg backdrop-blur">
              <p className="text-sm font-semibold text-foreground">Canvas is ready for your workflow</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Generate one from Create Agent or use Kimi Assistant to add the first nodes and shape the flow.
              </p>
            </div>
          </div>
        )}

        {saveMessage && (
          <div className="absolute left-4 top-4 rounded-lg border border-accent/20 bg-surface/90 px-3 py-2 text-[10px] text-foreground shadow-lg backdrop-blur">
            {saveMessage}
          </div>
        )}
      </div>
    </BuilderLayout>
  );
}

export default function WorkflowBuilderPage() {
  return (
    <React.Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-background text-muted text-sm">Loading workflow engine...</div>}>
      <WorkflowBuilderInner />
    </React.Suspense>
  );
}
