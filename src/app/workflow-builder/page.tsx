"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
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
import { Cpu, GitBranch, Terminal, Database, MessageSquare, Plus, Trash2, Zap, Play, Sliders } from "lucide-react";

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

// Initial nodes on canvas
const initialNodes: Node[] = [
  {
    id: "node_1",
    type: "customNode",
    position: { x: 250, y: 50 },
    data: {
      label: "GitHub Webhook Trigger",
      type: "Input",
      description: "Fires on pull_request events from GitHub via webhook.",
      icon: Zap,
    },
  },
  {
    id: "node_2",
    type: "customNode",
    position: { x: 250, y: 190 },
    data: {
      label: "Intent Classifier (LLM)",
      type: "LLM Node",
      description: "Analyses the incoming payload and classifies the user intent into categories.",
      icon: Cpu,
    },
  },
  {
    id: "node_3",
    type: "customNode",
    position: { x: 250, y: 330 },
    data: {
      label: "Knowledge Base Retrieval (RAG)",
      type: "RAG Node",
      description: "Performs vector similarity search over indexed documents to fetch relevant context.",
      icon: Database,
    },
  },
  {
    id: "node_4",
    type: "customNode",
    position: { x: 250, y: 470 },
    data: {
      label: "External API Call",
      type: "API Node",
      description: "Calls a third-party REST API to enrich or act on the data.",
      icon: GitBranch,
    },
  },
  {
    id: "node_5",
    type: "customNode",
    position: { x: 250, y: 610 },
    data: {
      label: "Decision Gate",
      type: "Condition",
      description: "Routes the flow based on the classified intent or API response.",
      icon: GitBranch,
    },
  },
  {
    id: "node_6",
    type: "customNode",
    position: { x: 250, y: 750 },
    data: {
      label: "Response Generator (LLM)",
      type: "LLM Node",
      description: "Generates a detailed code-review comment using the retrieved diff context.",
      icon: Cpu,
    },
  },
  {
    id: "node_7",
    type: "customNode",
    position: { x: 250, y: 890 },
    data: {
      label: "Slack Notification",
      type: "API Node",
      description: "Posts a formatted message to the configured Slack channel.",
      icon: MessageSquare,
    },
  },
  {
    id: "node_8",
    type: "customNode",
    position: { x: 250, y: 1030 },
    data: {
      label: "Database / CRM Update",
      type: "API Node",
      description: "Writes the result or ticket record to the connected database or CRM system.",
      icon: Database,
    },
  },
  {
    id: "node_out",
    type: "customNode",
    position: { x: 250, y: 1170 },
    data: {
      label: "Output",
      type: "Output",
      description: "Delivers the final response to the end channel (email, webhook, dashboard).",
      icon: Terminal,
    },
  },
];

// Initial edges connecting them
const initialEdges: Edge[] = [
  { id: "edge_1", source: "node_1", target: "node_2" },
  { id: "edge_2", source: "node_2", target: "node_3" },
  { id: "edge_3", source: "node_3", target: "node_4" },
  { id: "edge_4", source: "node_4", target: "node_5" },
  { id: "edge_5", source: "node_5", target: "node_6" },
  { id: "edge_6", source: "node_6", target: "node_7" },
  { id: "edge_7", source: "node_7", target: "node_8" },
  { id: "edge_8", source: "node_8", target: "node_out" },
];

function WorkflowBuilderInner() {
  const searchParams = useSearchParams();
  const agentId = searchParams?.get("agentId");

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = React.useState<Node | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [logs, setLogs] = React.useState<string[]>([
    "[SYSTEM] Workflow engine initialized.",
    "[SYSTEM] Waiting for trigger event or manual run execution...",
  ]);

  React.useEffect(() => {
    if (!agentId) return;
    
    setLogs(prev => [...prev, `[SYSTEM] Fetching agent workflow...`]);
    fetch(`/api/agents/${agentId}`)
      .then(res => res.json())
      .then(agent => {
        if (agent && agent.workflow) {
          const typeIcons: Record<string, any> = {
            trigger: { type: "Input", icon: Zap },
            llm: { type: "LLM Node", icon: Cpu },
            rag: { type: "RAG Node", icon: Database },
            api: { type: "API Node", icon: GitBranch },
            condition: { type: "Condition", icon: GitBranch },
            output: { type: "Output", icon: Terminal },
          };

          const mappedNodes: Node[] = (agent.workflow.nodes || []).map((n: any, i: number) => {
            const mapInfo = typeIcons[n.type] || { type: "LLM Node", icon: Cpu };
            return {
              id: n.id,
              type: "customNode",
              position: { x: 250, y: 50 + (i * 140) },
              data: {
                label: n.name,
                type: mapInfo.type,
                description: n.description,
                icon: mapInfo.icon,
              }
            };
          });

          setNodes(mappedNodes);
          setEdges((agent.workflow.edges || []).map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target
          })));
          setLogs(prev => [...prev, `[SYSTEM] Loaded workflow graph from agent: ${agent.name}`]);
        }
      })
      .catch(err => {
        console.error(err);
        setLogs(prev => [...prev, `[SYSTEM] Failed to load agent workflow.`]);
      });
  }, [agentId, setNodes, setEdges]);

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
        <span className="text-xs font-bold text-foreground uppercase tracking-wide">Node Properties</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {selectedNode ? (
          <>
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
            </div>

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

            <div className="h-[1px] bg-border/40 my-4" />

            <Button variant="danger" size="sm" className="w-full text-xs font-semibold" onClick={handleDeleteNode}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Remove Node
            </Button>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-muted py-12">
            <Sliders className="h-8 w-8 text-muted/60 mb-2.5" />
            <span>Select a node on the canvas to configure parameters.</span>
          </div>
        )}
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
      onSave={() => setLogs((prev) => [...prev, "[SYSTEM] Save request successful. Draft version registered."])}
      onDeploy={() => setLogs((prev) => [...prev, "[SYSTEM] Workflow compiled and deployed to public production endpoint."])}
    >
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
