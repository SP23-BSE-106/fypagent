"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  Node,
  Edge,
  Handle,
  Position,
  Connection,
} from "reactflow";
import "reactflow/dist/style.css";

import { BuilderLayout } from "@/components/layout/BuilderLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Cpu,
  GitBranch,
  Terminal,
  Database,
  Trash2,
  Zap,
  Sliders,
  Send,
  Bot,
  Plus,
  Undo2,
  X,
  ChevronDown,
} from "lucide-react";
import {
  NODE_CATALOG,
  QUICK_COMMANDS,
  applyActions,
  labelOf,
  planAddNode,
  runKimiCommand,
  toCanvasType,
  toPersistedType,
  typeOf,
} from "@/lib/workflow/kimiEngine";

/**
 * The glyph for a node kind. Deliberately a switch rather than a lookup table:
 * resolving an icon through a map builds the component reference during render,
 * which is exactly what react-hooks/static-components warns about.
 */
const TypeIcon = ({ type, className }: { type?: string; className?: string }) => {
  switch (type) {
    case "Input":
      return <Zap className={className} />;
    case "LLM Node":
      return <Cpu className={className} />;
    case "RAG Node":
      return <Database className={className} />;
    case "API Node":
    case "Condition":
      return <GitBranch className={className} />;
    case "Output":
      return <Terminal className={className} />;
    default:
      return <Cpu className={className} />;
  }
};

/**
 * Fits the viewport to whatever is on the canvas. Lives *inside* ReactFlow so
 * it can reach `useReactFlow`, and only runs when the token changes — adding a
 * node from the library or from Kimi would otherwise drop it out of view.
 */
const AutoFit = ({ token }: { token: number }) => {
  const { fitView } = useReactFlow();
  React.useEffect(() => {
    if (token > 0) void fitView({ padding: 0.3, duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  return null;
};

// Custom node styling layout matching Vercel/Linear
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomNodeComponent = ({ id, data, selected }: { id: string; data: any; selected: boolean }) => {
  const { deleteElements } = useReactFlow();

  /** Deleting from the card itself, without a trip through the side panel.
   *  React Flow removes the attached edges along with the node. */
  const handleCardDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div
      className={`group relative rounded-lg border bg-[#131A23] p-3 text-left w-52 transition-all duration-300 ${
        selected ? "border-accent shadow-[0_0_15px_rgba(91,231,196,0.15)]" : "border-border/80 hover:border-border-light"
      }`}
    >
      <button
        type="button"
        data-card-control
        aria-label={`Delete ${data.label}`}
        title={`Delete ${data.label}`}
        onClick={handleCardDelete}
        onMouseDown={(e) => e.stopPropagation()}
        className="nodrag nopan absolute -right-2.5 -top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border/80 bg-[#131A23] text-muted opacity-60 shadow-lg transition-all duration-200 hover:border-red-500/60 hover:bg-[#131A23] hover:text-red-400 focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Top Handles */}
      {data.type !== "Input" && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-2.5 h-2.5 bg-accent border-2 border-[#0B0F14]"
        />
      )}

      <div className="flex items-center justify-between mb-2 pr-4">
        <div className="flex items-center gap-2">
          <div className="h-6.5 w-6.5 rounded bg-accent-muted flex items-center justify-center text-accent">
            <TypeIcon type={data.type} className="h-3.5 w-3.5" />
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWorkflowToCanvas(workflow: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedNodes: Node[] = (workflow?.nodes || []).map((n: any, i: number) => {
    const entry = toCanvasType(n.type);
    return {
      id: n.id,
      type: "customNode",
      position: { x: 260 + (i % 2) * 240, y: 80 + Math.floor(i / 2) * 180 },
      data: {
        label: n.name,
        type: entry.type,
        description: n.description,
      },
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const [isRunning, setIsRunning] = React.useState(false);

  // Selection is derived from React Flow's own `selected` flags instead of a
  // separate copy, so it can never go stale after a delete, a rename or an edit
  // made from the assistant.
  const selectedNodes = React.useMemo(() => nodes.filter((n) => n.selected), [nodes]);
  const selectedEdges = React.useMemo(() => edges.filter((e) => e.selected), [edges]);
  const selectedNode = selectedNodes[0] ?? null;
  const hasSelection = selectedNodes.length > 0 || selectedEdges.length > 0;

  const [saveBusy, setSaveBusy] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [assistantInput, setAssistantInput] = React.useState("");
  const [generateInput, setGenerateInput] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [addMenuOpen, setAddMenuOpen] = React.useState(false);
  const [fitToken, setFitToken] = React.useState(0);
  const [canUndo, setCanUndo] = React.useState(false);
  const [assistantMessages, setAssistantMessages] = React.useState<Array<{ role: "assistant" | "user"; content: string }>>([
    {
      role: "assistant",
      content: "Kimi is ready. Ask me to add, remove, rename or connect nodes and I'll update the canvas instantly.",
    },
  ]);
  const [logs, setLogs] = React.useState<string[]>([
    "[SYSTEM] Workflow canvas initialized.",
    "[SYSTEM] Waiting for a workflow or a prompt from Kimi Assistant...",
  ]);

  // ── Undo history ────────────────────────────────────────────────────────
  // A snapshot is taken only for structural changes (a node or an edge appearing
  // or disappearing), plus Kimi renames. Dragging a card or typing in the name
  // field therefore cannot bury the useful history under keystrokes.
  const historyRef = React.useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const prevGraphRef = React.useRef<{ nodes: Node[]; edges: Edge[] }>({ nodes: initialNodes, edges: initialEdges });
  const suppressHistoryRef = React.useRef(false);
  const lastHandledRenameRef = React.useRef(0);

  // A rename from Kimi leaves the node count untouched, so it needs its own
  // signal rather than being inferred from the graph's shape. Kept as state
  // because this is the value the effect below watches.
  const [renameRequest, setRenameRequest] = React.useState(0);

  React.useEffect(() => {
    const previous = prevGraphRef.current;
    const structural = previous.nodes.length !== nodes.length || previous.edges.length !== edges.length;
    const labelEdit = renameRequest !== lastHandledRenameRef.current;

    if (suppressHistoryRef.current) {
      suppressHistoryRef.current = false;
    } else if (structural || labelEdit) {
      historyRef.current.push(previous);
      if (historyRef.current.length > 50) historyRef.current.shift();
      setCanUndo(historyRef.current.length > 0);
    }

    lastHandledRenameRef.current = renameRequest;
    prevGraphRef.current = { nodes, edges };
  }, [nodes, edges, renameRequest]);

  /** Close the floating add-node menu when clicking anywhere outside it. */
  React.useEffect(() => {
    if (!addMenuOpen) return undefined;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target && target.closest("[data-add-menu]")) return;
      setAddMenuOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [addMenuOpen]);

  // Track if workflow has been loaded from persistent storage
  const workflowLoadedFromStorage = React.useRef(false);

  React.useEffect(() => {
    const workflowFromQuery = searchParams?.get("workflow");
    const workflowFromSession = typeof window !== "undefined" ? window.sessionStorage.getItem("pendingWorkflow") : null;

    const loadWorkflow = (workflow: any) => {
      console.log("[LOAD] Loading workflow:", workflow);
      const { nodes: mappedNodes, edges: mappedEdges } = mapWorkflowToCanvas(workflow);
      // The loaded graph becomes the new baseline: undo should not be able to
      // wipe it back to an empty canvas.
      historyRef.current = [];
      suppressHistoryRef.current = true;
      setCanUndo(false);
      setNodes(mappedNodes);
      setEdges(mappedEdges);
      workflowLoadedFromStorage.current = true;
      initialLoadDone.current = false; // Reset so auto-save will trigger after load
      setLogs((prev) => [...prev, "[SYSTEM] Loaded workflow into the canvas."]);
    };

    if (workflowFromQuery) {
      try {
        const parsed = JSON.parse(workflowFromQuery);
        loadWorkflow(parsed);
        return;
      } catch (error) {
        console.error("[ERROR] Failed to parse workflow from query:", error);
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
        console.error("[ERROR] Failed to parse workflow from session:", error);
      }
    }

    if (!agentId) {
      setNodes([]);
      setEdges([]);
      workflowLoadedFromStorage.current = false;
      return;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const abortController = new AbortController();
    console.log("[LOAD] Fetching agent:", agentId);
    fetch(`/api/agents/${agentId}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((agent) => {
        console.log("[LOAD] Agent data:", agent);
        if (agent?.workflow) {
          loadWorkflow(agent.workflow);
          setLogs((prev) => [...prev, `[SYSTEM] Loaded workflow graph from agent: ${agent.name}`]);
        } else {
          console.log("[LOAD] No workflow found in agent");
          setNodes([]);
          setEdges([]);
          workflowLoadedFromStorage.current = true;
        }
      })
      .catch((err) => {
        console.error("[ERROR] Failed to load agent workflow:", err);
        setLogs((prev) => [...prev, "[SYSTEM] Failed to load agent workflow."]);
      });
  }, [agentId, searchParams, setNodes, setEdges]);

  // ── Auto-save draft every 3s after changes ───────────────────────────
  const [autoSaveStatus, setAutoSaveStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  // Why the last save failed. Without this the only signal is a red "Save
  // Failed" badge plus a console line that names neither the endpoint nor the
  // server's reason.
  const [autoSaveError, setAutoSaveError] = React.useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = React.useState<Date | null>(null);
  const initialLoadDone = React.useRef(false);
  const unsavedChanges = React.useRef(false);

  React.useEffect(() => {
    // Skip the very first render (initial load / workflow fetch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      console.log("[AUTO-SAVE] Initial load skipped, will save on next change");
      return;
    }

    // Only track changes after workflow has been loaded
    if (!workflowLoadedFromStorage.current && nodes.length === 0) {
      console.log("[AUTO-SAVE] No nodes and workflow not loaded yet, skipping save");
      return;
    }

    unsavedChanges.current = true;
    console.log("[AUTO-SAVE] Unsaved changes detected:", nodes.length, "nodes");

    const timer = setTimeout(async () => {
      setAutoSaveStatus("saving");
      // Computed outside `try` so a thrown request can still name what it was
      // talking to — a bare "Error:" tells you nothing about which call failed.
      const saveTarget = agentId ? `PATCH /api/agents/${agentId}` : "POST /api/agents";
      console.log("[AUTO-SAVE] Starting save...", { agentId, nodeCount: nodes.length, edgeCount: edges.length });
      try {
        const draftName = (agentNameFromQuery || "Untitled Draft").trim() || "Untitled Draft";
        const workflowPayload = {
          name: draftName,
          description: "Workflow saved from the visual builder.",
          nodes: nodes.map((node) => ({
            id: node.id,
            name: node.data?.label ?? "Untitled",
            type: toPersistedType(node.data?.type),
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
          ? // Deliberately no `name` on update. The builder has no name field, so
            // whatever the URL carries can be stale or belong to a different
            // agent — sending it would trip the "no two agents share a name"
            // guard, return 409, and block every future autosave. The stored
            // name stays the source of truth.
            { workflow: workflowPayload, status: "draft" }
          : {
              name: draftName,
              description: "Auto-saved draft from the visual builder.",
              prompt: "",
              workflow: workflowPayload,
              status: "draft",
              // The builder never asks for a name, so it accepts a numbered
              // variant instead of failing the save on a collision.
              autoName: true,
            };

        console.log("[AUTO-SAVE] Sending to", endpoint, "with", method);
        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          console.log("[AUTO-SAVE] Success! Saved agent:", data._id);
          // Update URL with agentId if this was a new save
          if (data?._id && !agentId && typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            params.set("agentId", data._id);
            params.set("agentName", data.name || draftName);
            router.replace(`${window.location.pathname}?${params.toString()}`);
          }
          setAutoSaveStatus("saved");
          setAutoSaveError(null);
          setLastSavedTime(new Date());
          unsavedChanges.current = false;
          // Reset to idle after 2s
          setTimeout(() => setAutoSaveStatus("idle"), 2000);
        } else {
          const raw = await res.text().catch(() => "");
          let reason = raw.slice(0, 400);
          if (raw.startsWith("{")) {
            try {
              const parsed = JSON.parse(raw) as { error?: unknown };
              if (typeof parsed.error === "string" && parsed.error) reason = parsed.error;
            } catch {
              reason = raw.slice(0, 400);
            }
          }
          if (!reason) reason = "empty response body";
          console.error(`[AUTO-SAVE] ${saveTarget} -> HTTP ${res.status} ${res.statusText}: ${reason}`);
          setAutoSaveError(`${saveTarget} returned ${res.status}: ${reason}`);
          setAutoSaveStatus("error");
          setTimeout(() => {
            setAutoSaveStatus("idle");
            setAutoSaveError(null);
          }, 8000);
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.error(`[AUTO-SAVE] ${saveTarget} threw: ${reason}`);
        setAutoSaveError(`${saveTarget} failed: ${reason}`);
        setAutoSaveStatus("error");
        setTimeout(() => {
          setAutoSaveStatus("idle");
          setAutoSaveError(null);
        }, 8000);
      }
    }, 3000); // 3 second debounce

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // ── Warn on unsaved changes before leaving ───────────────────────────
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges.current && autoSaveStatus !== "saved") {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [autoSaveStatus]);

  // Handle flow connect
  const onConnect = React.useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Clicking empty canvas clears the selection. Only touch the array when
  // something is actually selected, so a stray click cannot trigger a save.
  const onPaneClick = React.useCallback(() => {
    setNodes((nds) =>
      nds.some((n) => n.selected) ? nds.map((n) => (n.selected ? { ...n, selected: false } : n)) : nds,
    );
  }, [setNodes]);

  /**
   * Writes a builder activity to the run history (Monitoring & Control).
   * Best-effort: a monitoring failure must never surface as a failed compile.
   */
  const recordBuilderRun = (
    status: "success" | "failed",
    input: string,
    output: string,
    durationMs: number,
  ) => {
    void fetch("/api/agents/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        kind: "exec",
        agentId,
        agentName: agentNameFromQuery || null,
        status,
        input,
        output,
        durationMs,
      }),
    }).catch(() => {
      /* monitoring is best-effort */
    });
  };

  /**
   * "Run" on the authoring canvas is a real compile pass: every node is checked
   * against the catalogue, every connection against the graph, and the result is
   * recorded. It deliberately does not claim to have called a model — the log
   * says so plainly and points at the Testing Sandbox, which does make a live
   * round-trip.
   */
  const handleRun = () => {
    if (isRunning) return;
    setIsRunning(true);

    const startedAt = Date.now();
    setLogs((prev) => [
      ...prev,
      `[COMPILE] Checking ${nodes.length} node(s) and ${edges.length} connection(s)...`,
    ]);

    const issues: string[] = [];
    const knownTypes = new Set(NODE_CATALOG.map((entry) => entry.type));
    const nodeIds = new Set(nodes.map((node) => node.id));
    const linked = new Set<string>();

    if (nodes.length === 0) issues.push("the canvas is empty");

    for (const edge of edges) {
      linked.add(edge.source);
      linked.add(edge.target);
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        issues.push(`a connection points at a node that no longer exists`);
      }
    }

    const typeCounts = new Map<string, number>();
    for (const node of nodes) {
      const type = typeOf(node);
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);

      if (!knownTypes.has(type)) {
        issues.push(`'${labelOf(node) || node.id}' has an unknown node type '${type}'`);
      }
      if (nodes.length > 1 && !linked.has(node.id)) {
        issues.push(`'${labelOf(node) || node.id}' is not connected to anything`);
      }
    }

    if (nodes.length > 0) {
      if (!typeCounts.has("Input")) issues.push("no Input Trigger — nothing starts the flow");
      if (!typeCounts.has("Output")) issues.push("no Response Output — the flow never produces a result");
    }

    // Kahn's algorithm: any node that never reaches indegree 0 sits on a cycle,
    // which would loop forever at execution time.
    const indegree = new Map<string, number>(nodes.map((node) => [node.id, 0]));
    for (const edge of edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
      indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    }
    const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
    let settled = 0;
    while (queue.length > 0) {
      const id = queue.shift() as string;
      settled += 1;
      for (const edge of edges) {
        if (edge.source !== id || !nodeIds.has(edge.target)) continue;
        const next = (indegree.get(edge.target) ?? 0) - 1;
        indegree.set(edge.target, next);
        if (next === 0) queue.push(edge.target);
      }
    }
    if (nodes.length > 0 && settled < nodeIds.size) issues.push("the flow contains a cycle");

    const durationMs = Date.now() - startedAt;
    const summary = issues.length === 0
      ? `Compiled ${nodes.length} node(s) / ${edges.length} connection(s) with no issues.`
      : `${issues.length} issue(s): ${issues.join("; ")}`;

    setLogs((prev) => [
      ...prev,
      ...(issues.length === 0
        ? [
            `[COMPILE] ✓ Catalogue, connections, entry point, output and acyclicity all check out.`,
            `[COMPILE] ✓ ${summary}`,
            "[SYSTEM] Nothing was executed — open Testing Sandbox for a live model call.",
          ]
        : [
            ...issues.map((issue) => `[COMPILE] ✗ ${issue}`),
            `[SYSTEM] Compile finished with ${issues.length} issue(s). Nothing was executed.`,
          ]),
    ]);

    recordBuilderRun(
      issues.length === 0 ? "success" : "failed",
      `Compile check (${nodes.length} nodes, ${edges.length} connections)`,
      summary,
      durationMs,
    );
    setIsRunning(false);
  };

  /**
   * Deploy sets the agent live. It is a real write: the status the dashboard
   * and the agents list read is what changes, and the log names the endpoint
   * the agent becomes reachable on.
   */
  const handleDeploy = async () => {
    if (!agentId) {
      setLogs((prev) => [
        ...prev,
        "[DEPLOY] Nothing to deploy yet — save the draft first so it has an agent id.",
      ]);
      return;
    }

    setSaveBusy(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "active" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setLogs((prev) => [
        ...prev,
        "[DEPLOY] Status set to active.",
        "[DEPLOY] Reachable at POST /api/execute with a personal API key.",
      ]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "deploy failed";
      setLogs((prev) => [...prev, `[DEPLOY] ✗ ${reason}`]);
    } finally {
      setSaveBusy(false);
    }
  };

  /**
   * Everything the assistant needs to reason about the canvas right now.
   * Reads component state only — no refs — so it stays safe to hand to handlers.
   */
  const graphSnapshot = () => ({
    nodes,
    edges,
    selectedId: selectedNode?.id ?? null,
    // The engine only needs to know whether "undo" is a real option.
    historyDepth: canUndo ? 1 : 0,
  });

  /** Add a node of `type`, on a free grid slot with a unique id and title. */
  const handleAddNode = (type: string) => {
    const graph = graphSnapshot();
    const actions = planAddNode(graph, { type });
    const next = applyActions(graph, actions);
    const created = actions.find((a) => a.kind === "add-node");
    const title = created && created.kind === "add-node" ? labelOf(created.node) : type;

    setNodes(next.nodes);
    setEdges(next.edges);
    setFitToken((t) => t + 1);
    setLogs((prev) => [...prev, `[SYSTEM] Added ${type} node '${title}' to the canvas.`]);
  };

  /**
   * Delete whatever is selected: nodes (React Flow drops their edges too) or
   * loose connections. Shared by the canvas toolbar and the panel's Remove Node
   * button so there is one deletion path.
   */
  const handleDeleteSelection = () => {
    if (selectedNodes.length > 0) {
      const ids = new Set(selectedNodes.map((n) => n.id));
      const titles = selectedNodes.map((n) => `'${labelOf(n) || "(untitled)"}'`).join(", ");
      const lost = edges.filter((e) => ids.has(e.source) || ids.has(e.target)).length;

      setNodes((nds) => nds.filter((n) => !ids.has(n.id)));
      setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)));
      setLogs((prev) => [
        ...prev,
        `[SYSTEM] Removed ${titles}${lost ? ` and ${lost} connection${lost === 1 ? "" : "s"}` : ""}.`,
      ]);
      return;
    }

    if (selectedEdges.length > 0) {
      const ids = new Set(selectedEdges.map((e) => e.id));
      setEdges((eds) => eds.filter((e) => !ids.has(e.id)));
      setLogs((prev) => [...prev, `[SYSTEM] Removed ${ids.size} connection${ids.size === 1 ? "" : "s"}.`]);
    }
  };

  /** Step back to the graph as it was before the last structural edit. */
  const handleUndo = () => {
    const previous = historyRef.current[historyRef.current.length - 1];
    if (!previous) return;

    const unchanged = previous.nodes === nodes && previous.edges === edges;
    historyRef.current.pop();
    setCanUndo(historyRef.current.length > 0);
    if (unchanged) return;

    suppressHistoryRef.current = true;
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setLogs((prev) => [...prev, "[SYSTEM] Undo: restored the previous canvas state."]);
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
          type: toPersistedType(node.data?.type),
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
            // No `name` here either — see the autosave. Renaming is not what a
            // "Save draft" button is for, and sending a name we never displayed
            // could collide with another agent and fail the save.
            workflow: workflowPayload,
            status: "draft",
          }
        : {
            name: draftName,
            description: "Saved draft from the visual builder.",
            prompt: "",
            workflow: workflowPayload,
            status: "draft",
            autoName: true,
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

  /**
   * Ask the deterministic engine what this prompt means, then apply whatever it
   * comes back with. The engine never guesses: if a reference resolves to zero
   * or several nodes it says so and returns no actions, which is what keeps the
   * canvas from drifting every time the prompt is something it didn't expect.
   */
  const submitPrompt = (raw: string) => {
    const promptText = raw.trim();
    if (!promptText) return;

    setAssistantMessages((prev) => [...prev, { role: "user", content: promptText }]);
    setAssistantInput("");

    const graph = graphSnapshot();
    const result = runKimiCommand(promptText, graph);
    const firstLine = result.reply.split("\n")[0];
    setLogs((prev) => [...prev, `[KIMI] ${firstLine}`]);

    const wantsUndo = result.actions.some((a) => a.kind === "undo");
    if (wantsUndo) {
      handleUndo();
    } else if (result.actions.length > 0) {
      // A rename leaves the node count alone, so tell the history effect about
      // it explicitly; structural edits are picked up automatically.
      if (result.actions.some((a) => a.kind === "rename-node")) setRenameRequest((n) => n + 1);

      const next = applyActions(graph, result.actions);
      const grew = next.nodes.length > graph.nodes.length;
      setNodes(next.nodes);
      setEdges(next.edges);
      if (grew) setFitToken((t) => t + 1);
    }

    setAssistantMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
  };

  const handleAssistantSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submitPrompt(assistantInput);
  };

  const generateFromDescription = async (event: React.FormEvent) => {
    event.preventDefault();
    const prompt = generateInput.trim();
    if (!prompt || generating) return;
    setGenerating(true);
    setLogs((prev) => [...prev, `[AI] Generating workflow for: ${prompt}`]);
    try {
      const res = await fetch('/api/agents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const workflow = data.workflow || data;
      const mapped = mapWorkflowToCanvas(workflow);
      setNodes(mapped.nodes);
      setEdges(mapped.edges);
      setFitToken((t) => t + 1);
      setLogs((prev) => [...prev, `[AI] Generated workflow with ${mapped.nodes.length} node(s) and ${mapped.edges.length} edge(s).`]);
      setAssistantMessages((prev) => [...prev, { role: 'assistant', content: `Workflow generated from your description. You can edit it with Kimi or drag nodes manually.` }]);
      setGenerateInput('');
    } catch (err) {
      setLogs((prev) => [...prev, `[AI] Generation failed: ${err instanceof Error ? err.message : 'unknown error'}`]);
    } finally {
      setGenerating(false);
    }
  };

  /** Quick-command chip. The prompt rides on the element so this stays a named
   *  handler rather than a fresh closure per item. */
  const handleQuickCommand = (event: React.MouseEvent<HTMLButtonElement>) => {
    const prompt = event.currentTarget.getAttribute("data-prompt");
    if (prompt) submitPrompt(prompt);
  };

  // Render left library
  const renderLeftPanel = () => (
    <div className="flex-1 flex flex-col min-h-0 text-left select-none">
      <div className="p-4 border-b border-border/40 flex items-center justify-between">
        <span className="text-xs font-bold text-foreground uppercase tracking-wide">Node Library</span>
        <span className="text-[10px] text-muted">{NODE_CATALOG.length} kinds</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {NODE_CATALOG.map((node) => {
          return (
            <div
              key={node.type}
              role="button"
              tabIndex={0}
              onClick={() => handleAddNode(node.type)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleAddNode(node.type);
                }
              }}
              aria-label={`Add ${node.label}`}
              className="border border-border/80 hover:border-accent/40 rounded-lg p-3 bg-[#131a23]/30 hover:bg-[#131a23]/70 cursor-pointer flex gap-3 transition-all duration-200 select-none group"
            >
              <div className="h-8.5 w-8.5 rounded-lg bg-surface-light border border-border group-hover:border-accent/20 flex items-center justify-center text-muted group-hover:text-accent transition-colors flex-shrink-0">
                <TypeIcon type={node.type} className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">
                  {node.label}
                </span>
                <span className="text-[9px] text-muted mt-1 leading-relaxed">
                  {node.description}
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
            I read what is actually on the canvas and edit it directly — add, remove, rename, connect or undo. If I
            cannot tell which node you mean, I say so instead of guessing.
          </p>
        </div>

        <form onSubmit={generateFromDescription} className="space-y-2">
          <textarea
            value={generateInput}
            onChange={(e) => setGenerateInput(e.target.value)}
            placeholder="Describe a workflow and let Vibe Coding build it"
            className="min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/40"
          />
          <Button type="submit" size="sm" className="w-full" disabled={generating}>
            <Bot className="mr-1.5 h-3.5 w-3.5" />
            {generating ? 'Generating...' : 'Generate from description'}
          </Button>
        </form>

        <form onSubmit={handleAssistantSubmit} className="space-y-2">
          <textarea
            value={assistantInput}
            onChange={(e) => setAssistantInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter keeps the newline.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="e.g. add a RAG node and connect it to the trigger"
            className="min-h-24 w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/40"
          />
          <Button type="submit" size="sm" className="w-full">
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Send to Kimi
          </Button>
        </form>

        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Try</span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_COMMANDS.map((command) => (
              <button
                key={command}
                type="button"
                data-prompt={command}
                onClick={handleQuickCommand}
                className="rounded-md border border-border/70 bg-surface/70 px-2 py-1 text-[10px] text-muted transition-colors hover:border-accent/40 hover:text-accent"
              >
                {command}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {assistantMessages.map((msg, index) => (
            <div key={`${msg.role}-${index}`} className={`rounded-lg border px-3 py-2 text-[10px] leading-relaxed ${msg.role === "assistant" ? "border-accent/20 bg-accent/10 text-foreground" : "border-border/50 bg-surface/80 text-muted"}`}>
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider opacity-70">{msg.role === "assistant" ? "Kimi" : "You"}</div>
              <div className="whitespace-pre-line">{msg.content}</div>
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

              <Button variant="danger" size="sm" className="w-full text-xs font-semibold" onClick={handleDeleteSelection}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Remove {selectedNodes.length > 1 ? `${selectedNodes.length} Nodes` : "Node"}
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
      isSaving={saveBusy}
      onDeploy={handleDeploy}
      sandboxHref={
        agentId
          ? `/testing-sandbox?agentId=${encodeURIComponent(agentId)}&name=${encodeURIComponent(agentNameFromQuery || "Visual Workflow Canvas")}`
          : "/testing-sandbox"
      }
      autoSaveStatus={autoSaveStatus}
      autoSaveError={autoSaveError}
      lastSavedTime={lastSavedTime}
    >
      <div className="relative h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onPaneClick={onPaneClick}
          // Guarded by React Flow against keystrokes typed into inputs, so
          // Backspace still edits text in the properties panel.
          deleteKeyCode={["Backspace", "Delete"]}
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
          <AutoFit token={fitToken} />
        </ReactFlow>

        {/* Canvas toolbar — add, delete and undo without leaving the graph. */}
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2">
          <div data-add-menu className="pointer-events-auto relative">
            <button
              type="button"
              onClick={() => setAddMenuOpen((open) => !open)}
              aria-expanded={addMenuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-surface/90 px-3 py-2 text-[11px] font-semibold text-accent shadow-lg backdrop-blur transition-colors hover:border-accent"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Node
              <ChevronDown className={`h-3 w-3 transition-transform ${addMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {addMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-lg border border-border/80 bg-surface shadow-2xl"
              >
                {NODE_CATALOG.map((entry) => {
                  return (
                    <button
                      key={entry.type}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAddMenuOpen(false);
                        handleAddNode(entry.type);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-accent/10 hover:text-accent"
                    >
                      <TypeIcon type={entry.type} className="h-3.5 w-3.5 shrink-0 text-accent" />
                      <span className="flex-1">{entry.label}</span>
                      <span className="text-[9px] text-muted">{entry.type}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleDeleteSelection}
            disabled={!hasSelection}
            title={hasSelection ? `Delete ${selectedNodes.length + selectedEdges.length} selected` : "Select a node or a connection first"}
            className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface/90 px-3 py-2 text-[11px] font-semibold text-muted shadow-lg backdrop-blur transition-colors hover:border-red-500/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border/80 disabled:hover:text-muted"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
            {hasSelection && (
              <span className="rounded bg-surface-light px-1 text-[9px] text-foreground">
                {selectedNodes.length + selectedEdges.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            title={canUndo ? "Undo the last structural change" : "Nothing to undo yet"}
            className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface/90 px-3 py-2 text-[11px] font-semibold text-muted shadow-lg backdrop-blur transition-colors hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border/80 disabled:hover:text-muted"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </button>
        </div>

        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-md rounded-2xl border border-dashed border-border/70 bg-surface/80 px-6 py-5 text-center shadow-lg backdrop-blur">
              <p className="text-sm font-semibold text-foreground">Canvas is ready for your workflow</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Use Add Node above, the library on the left, or Kimi Assistant to place the first nodes and shape the
                flow.
              </p>
            </div>
          </div>
        )}

        {saveMessage && (
          <div className="absolute right-4 top-4 rounded-lg border border-accent/20 bg-surface/90 px-3 py-2 text-[10px] text-foreground shadow-lg backdrop-blur">
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
