/**
 * Deterministic intent engine behind the Kimi Assistant panel.
 *
 * The assistant used to guess: any prompt it did not recognise silently added a
 * random node, "remove" only ever worked on the selected node, and a request to
 * "connect it to the trigger" wired the node to whatever happened to be last in
 * the array. Every one of those is a guess about state the prompt never mentioned.
 *
 * This module resolves the prompt against the graph that is actually on the
 * canvas and returns a list of concrete actions. It never invents a node id: a
 * reference that cannot be resolved to exactly one node produces an explanation
 * of what *is* on the canvas instead of an edit. The page applies whatever
 * actions come back, so there is exactly one place where edits are planned.
 *
 * Pure by design — no React, no React Flow runtime — so it is unit testable.
 */

import type { Node, Edge } from "reactflow";

export interface GraphSnapshot {
  nodes: Node[];
  edges: Edge[];
}

export interface CommandContext extends GraphSnapshot {
  /** id of the node the user currently has selected, if any */
  selectedId?: string | null;
  /** how many undo snapshots are available, so "undo" can answer honestly */
  historyDepth?: number;
}

// ── Node catalogue ───────────────────────────────────────────────────────
export interface CatalogEntry {
  /** Value stored in `node.data.type` — what the canvas and API speak. */
  type: string;
  /** Title given to a freshly created node of this kind. */
  label: string;
  /** Card body shown on the node and in the left-hand library. */
  description: string;
  /** Words that identify this kind of node inside a prompt. */
  aliases: string[];
}

export const NODE_CATALOG: CatalogEntry[] = [
  {
    type: "Input",
    label: "Input Trigger",
    description: "API Endpoint Webhook",
    aliases: ["input", "trigger", "webhook", "start", "begin", "ingest", "ingestion", "entry", "entrypoint", "source"],
  },
  {
    type: "LLM Node",
    label: "LLM Agent",
    description: "Prompt Model Resolution",
    aliases: ["llm", "model", "ai", "gpt", "prompt", "agent", "generate", "generation", "chat", "kimi", "reason"],
  },
  {
    type: "RAG Node",
    label: "RAG Ingest",
    description: "Vector Database search",
    aliases: ["rag", "vector", "retrieval", "retrieve", "knowledge", "search", "embedding", "document", "documents", "lookup"],
  },
  {
    type: "API Node",
    label: "REST API call",
    description: "Post/Get Web Services",
    aliases: ["api", "http", "rest", "request", "fetch", "endpoint"],
  },
  {
    type: "Condition",
    label: "Condition Branch",
    description: "Branch on rules and flags",
    aliases: ["condition", "branch", "if", "switch", "decision", "rule", "check", "filter"],
  },
  {
    type: "Output",
    label: "Response Output",
    description: "Finalize run values",
    aliases: ["output", "response", "reply", "result", "results", "return", "answer", "final", "finalise", "finalize"],
  },
];

export function catalogEntryForType(type: string): CatalogEntry | undefined {
  return NODE_CATALOG.find((e) => e.type === type);
}

/** Canvas type -> the value persisted on the agent record. */
export function toPersistedType(canvasType: string | undefined): string {
  switch (canvasType) {
    case "Input":
      return "trigger";
    case "Output":
      return "output";
    case "RAG Node":
      return "rag";
    case "Condition":
      return "condition";
    case "API Node":
      return "api";
    default:
      return "llm";
  }
}

/** Persisted type -> the catalogue entry the canvas renders with. */
export function toCanvasType(persisted: string | undefined): CatalogEntry {
  return NODE_CATALOG.find((e) => toPersistedType(e.type) === persisted) ?? NODE_CATALOG[1];
}

// ── Small helpers ────────────────────────────────────────────────────────
export function labelOf(node: Node): string {
  return String(node?.data?.label ?? "").trim();
}

export function typeOf(node: Node): string {
  return String(node?.data?.type ?? "LLM Node").trim();
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function quote(value: string): string {
  return `"${value}"`;
}

/** Describe the canvas for an error message, capped so the bubble stays readable. */
function inventory(nodes: Node[]): string {
  if (nodes.length === 0) return "The canvas is empty.";
  const shown = nodes.slice(0, 8);
  const list = shown.map((n, i) => `${i + 1}. ${labelOf(n) || "(untitled)"} (${typeOf(n)})`).join(", ");
  const more = nodes.length > shown.length ? `, +${nodes.length - shown.length} more` : "";
  return `On the canvas: ${list}${more}.`;
}

/** "RAG Ingest" -> "RAG Ingest 2" when the plain title is already in use. */
export function uniqueLabel(nodes: Node[], base: string): string {
  const wanted = base.trim().toLowerCase();
  if (!wanted) return base;
  const taken = (candidate: string) => nodes.some((n) => labelOf(n).toLowerCase() === candidate.toLowerCase());
  if (!taken(wanted)) return base;
  let i = 2;
  while (taken(`${base} ${i}`)) i += 1;
  return `${base} ${i}`;
}

// ── Canvas placement ─────────────────────────────────────────────────────
const NODE_WIDTH = 220;
const NODE_HEIGHT = 130;
const COL_WIDTH = 260;
const ROW_HEIGHT = 190;

function isFree(nodes: Node[], pos: { x: number; y: number }): boolean {
  return !nodes.some(
    (n) => Math.abs(n.position.x - pos.x) < NODE_WIDTH && Math.abs(n.position.y - pos.y) < NODE_HEIGHT,
  );
}

/**
 * First grid slot that does not overlap an existing node, filled row by row
 * from the top left, so repeated adds land in a tidy lattice instead of at
 * `Math.random()` coordinates where cards stack on top of each other.
 */
export function findFreeSlot(nodes: Node[], origin = { x: 120, y: 100 }): { x: number; y: number } {
  for (let row = 0; row < 80; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const pos = { x: origin.x + col * COL_WIDTH, y: origin.y + row * ROW_HEIGHT };
      if (isFree(nodes, pos)) return pos;
    }
  }
  return { x: origin.x, y: origin.y + 80 * ROW_HEIGHT };
}

/** Place a new node below the node it is being wired onto. */
function positionAfter(nodes: Node[], anchor: Node): { x: number; y: number } {
  const candidates = [
    { x: anchor.position.x, y: anchor.position.y + ROW_HEIGHT },
    { x: anchor.position.x + COL_WIDTH, y: anchor.position.y + ROW_HEIGHT },
    { x: anchor.position.x - COL_WIDTH, y: anchor.position.y + ROW_HEIGHT },
    { x: anchor.position.x + COL_WIDTH, y: anchor.position.y },
    { x: anchor.position.x, y: anchor.position.y + ROW_HEIGHT * 2 },
  ];
  for (const candidate of candidates) {
    if (isFree(nodes, candidate)) return candidate;
  }
  return findFreeSlot(nodes, { x: anchor.position.x, y: anchor.position.y + ROW_HEIGHT });
}

// ── Reference resolution ─────────────────────────────────────────────────
export interface ResolveOutcome {
  /** Every node the reference could mean, in canvas order. */
  matches: Node[];
  /** The prompt asked for a set ("all rag nodes") rather than one node. */
  group: boolean;
  /** The reference as the user wrote it, for error messages. */
  query: string;
}

const PRONOUN_RE =
  /^(?:it|itself|this|this node|that|that node|selected|selected node|current|current node|active|active node|my node)$/;

const GENERIC_RE = /^(?:node|nodes|step|steps|block|blocks|card|cards|element|elements|item|items|one|thing)$/;

const ORDINAL_WORDS: Record<string, number | "last"> = {
  first: 1,
  "1st": 1,
  second: 2,
  "2nd": 2,
  third: 3,
  "3rd": 3,
  fourth: 4,
  "4th": 4,
  fifth: 5,
  "5th": 5,
  last: "last",
  latest: "last",
  newest: "last",
  "most recent": "last",
  oldest: 1,
};

/** Splits "last rag node" / "node 2" / "the third" into an index plus a filter. */
function parseOrdinal(text: string): { pick: number | "last"; filter: string } | null {
  const numeric = text.match(/^(?:node|step|block|position|item|#)?\s*(\d+)$/);
  if (numeric) return { pick: parseInt(numeric[1], 10), filter: "" };

  const bare = text.match(
    /^(first|second|third|fourth|fifth|last|latest|newest|oldest|most recent|\d+(?:st|nd|rd|th))$/,
  );
  if (bare) {
    const word = bare[1];
    const pick = ORDINAL_WORDS[word] ?? parseInt(word, 10);
    return { pick: Number.isNaN(pick) ? "last" : pick, filter: "" };
  }

  const prefixed = text.match(
    /^(first|second|third|fourth|fifth|last|latest|newest|oldest|most recent|\d+(?:st|nd|rd|th))\s+(.+)$/,
  );
  if (prefixed) {
    const word = prefixed[1];
    const pick = ORDINAL_WORDS[word] ?? parseInt(word, 10);
    return { pick: Number.isNaN(pick) ? "last" : pick, filter: prefixed[2].trim() };
  }

  return null;
}

function normalize(raw: string): { text: string; group: boolean } {
  let text = raw.toLowerCase().trim();
  const group = /\b(?:all|every|each)\b/.test(text);
  text = text.replace(/\b(?:all|every|each)\b/g, " ");
  text = text.replace(/[.!?,]+$/g, "");
  text = text.replace(/^(?:the|a|an|my|of the|on the|in the|for the)\s+/, "");
  // People write "the CRM Sync node"; the node's title is "CRM Sync".
  text = text.replace(/\s+(?:node|nodes|step|steps|block|blocks|card|cards)$/, "");
  text = text.replace(/\s+/g, " ").trim();
  return { text, group };
}

function matchesCatalog(text: string): CatalogEntry | undefined {
  if (!text) return undefined;
  return NODE_CATALOG.find((entry) =>
    entry.aliases.some((alias) => new RegExp(`\\b${escapeRe(alias)}\\b`, "i").test(text)),
  );
}

/**
 * Turn a phrase such as "the last rag node" into concrete nodes.
 *
 * Resolution order, most specific first: explicit selection, position within the
 * canvas, exact title, node kind, then a title substring. A kind or substring
 * that matches several nodes returns all of them and lets the caller decide
 * whether it asked for one ("remove the rag node") or a set ("remove all").
 */
export function resolveNodes(ctx: CommandContext, raw: string): ResolveOutcome {
  const { text, group } = normalize(raw);
  const nodes = ctx.nodes;
  const query = raw.trim().replace(/[.!?,]+$/, "");

  if (nodes.length === 0) return { matches: [], group, query: query || "(canvas)" };

  if (!text) {
    const selected = nodes.find((n) => n.id === ctx.selectedId);
    return { matches: selected ? [selected] : [], group: false, query: query || "the selected node" };
  }

  if (PRONOUN_RE.test(text)) {
    const selected = nodes.find((n) => n.id === ctx.selectedId);
    return { matches: selected ? [selected] : [], group: false, query };
  }

  const ordinal = parseOrdinal(text);
  if (ordinal) {
    let pool = nodes;
    if (ordinal.filter && !GENERIC_RE.test(ordinal.filter)) {
      const filtered = resolveNodes(ctx, ordinal.filter);
      if (filtered.matches.length > 0) pool = filtered.matches;
      else if (!matchesCatalog(ordinal.filter)) return { matches: [], group, query };
    }
    const pick = ordinal.pick === "last" ? pool.length : ordinal.pick;
    const node = pick >= 1 && pick <= pool.length ? pool[pick - 1] : undefined;
    return { matches: node ? [node] : [], group: false, query };
  }

  const exact = nodes.filter((n) => labelOf(n).toLowerCase() === text);
  if (exact.length > 0) return { matches: exact, group, query };

  const kind = matchesCatalog(text);
  if (kind) {
    const typed = nodes.filter((n) => typeOf(n) === kind.type);
    if (typed.length > 0) return { matches: typed, group, query };
  }

  const partial = nodes.filter((n) => labelOf(n).toLowerCase().includes(text));
  if (partial.length > 0) return { matches: partial, group, query };

  return { matches: [], group, query };
}

// ── Actions ──────────────────────────────────────────────────────────────
export type KimiAction =
  | { kind: "add-node"; node: Node }
  | { kind: "connect"; source: string; target: string }
  | { kind: "remove-nodes"; ids: string[] }
  | { kind: "remove-edges"; ids: string[] }
  | { kind: "rename-node"; id: string; label: string }
  | { kind: "clear" }
  | { kind: "undo" };

export interface KimiResult {
  reply: string;
  actions: KimiAction[];
}

function ok(reply: string, ...actions: KimiAction[]): KimiResult {
  return { reply, actions };
}

function refuse(reply: string): KimiResult {
  return { reply, actions: [] };
}

// ── Action application ───────────────────────────────────────────────────
let edgeSeq = 0;

function nextEdgeId(graph: GraphSnapshot, source: string, target: string): string {
  const taken = new Set(graph.edges.map((e) => e.id));
  for (let i = edgeSeq + 1; i < edgeSeq + 5000; i += 1) {
    const id = `e_${i}`;
    if (!taken.has(id)) {
      edgeSeq = i;
      return id;
    }
  }
  return `e_${source}_${target}_${Date.now()}`;
}

/**
 * Fold a list of actions onto a graph. Defensive: an action that would leave a
 * dangling edge or a self-loop is dropped rather than corrupting the canvas.
 */
export function applyActions(graph: GraphSnapshot, actions: KimiAction[]): GraphSnapshot {
  let nodes = graph.nodes.slice();
  let edges = graph.edges.slice();

  for (const action of actions) {
    switch (action.kind) {
      case "add-node": {
        if (nodes.some((n) => n.id === action.node.id)) break;
        nodes = [...nodes, action.node];
        break;
      }
      case "connect": {
        const sourceExists = nodes.some((n) => n.id === action.source);
        const targetExists = nodes.some((n) => n.id === action.target);
        if (!sourceExists || !targetExists || action.source === action.target) break;
        if (edges.some((e) => e.source === action.source && e.target === action.target)) break;
        edges = [
          ...edges,
          {
            id: nextEdgeId({ nodes, edges }, action.source, action.target),
            source: action.source,
            target: action.target,
          },
        ];
        break;
      }
      case "remove-nodes": {
        const doomed = new Set(action.ids);
        nodes = nodes.filter((n) => !doomed.has(n.id));
        edges = edges.filter((e) => !doomed.has(e.source) && !doomed.has(e.target));
        break;
      }
      case "remove-edges": {
        const doomed = new Set(action.ids);
        edges = edges.filter((e) => !doomed.has(e.id));
        break;
      }
      case "rename-node": {
        nodes = nodes.map((n) => (n.id === action.id ? { ...n, data: { ...n.data, label: action.label } } : n));
        break;
      }
      case "clear": {
        nodes = [];
        edges = [];
        break;
      }
      case "undo":
        break;
    }
  }

  return { nodes, edges };
}

// ── Node creation ────────────────────────────────────────────────────────
export interface AddNodeOptions {
  type: string;
  label?: string;
  /** Id of the node this one should follow (new node lands downstream). */
  sourceId?: string | null;
  /** Id of the node this one should precede (new node lands upstream). */
  targetId?: string | null;
}

/** Build the actions that add one node, optionally wiring it into the flow. */
export function planAddNode(graph: CommandContext, options: AddNodeOptions): KimiAction[] {
  const entry = catalogEntryForType(options.type) ?? NODE_CATALOG[1];
  const label = uniqueLabel(graph.nodes, options.label?.trim() || entry.label);

  const anchorId = options.sourceId ?? options.targetId ?? null;
  const anchor = anchorId ? graph.nodes.find((n) => n.id === anchorId) : undefined;
  const position = anchor ? positionAfter(graph.nodes, anchor) : findFreeSlot(graph.nodes);

  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "node";
  let counter = graph.nodes.length + 1;
  let id = `n_${slug}_${counter}`;
  while (graph.nodes.some((n) => n.id === id)) {
    counter += 1;
    id = `n_${slug}_${counter}`;
  }

  const node: Node = {
    id,
    type: "customNode",
    position,
    data: {
      label,
      type: entry.type,
      description: entry.description,
    },
  };

  const actions: KimiAction[] = [{ kind: "add-node", node }];
  if (options.sourceId) actions.push({ kind: "connect", source: options.sourceId, target: node.id });
  if (options.targetId) actions.push({ kind: "connect", source: node.id, target: options.targetId });
  return actions;
}

// ── Prompt parsing ───────────────────────────────────────────────────────
export const HELP_LINES = [
  "I edit this canvas directly. Try:",
  '· "add a RAG node after the trigger"',
  '· "add an LLM node called Router"',
  '· "remove the condition node" / "delete the last node"',
  '· "rename the trigger to webhook"',
  '· "connect the trigger to the RAG node"',
  '· "disconnect the trigger from the RAG node"',
  '· "clear the canvas" · "undo"',
];

export const QUICK_COMMANDS = [
  "add a RAG node after the trigger",
  "rename the trigger to webhook",
  "delete the last node",
  "undo",
];

const VERBS = "(?:remove|delete|drop|erase|clear|get rid of|take out|hide)";
const ADD_VERB = "(?:add|create|insert|append|put|make|include|spawn|give me)";
const CONNECT_VERB = "(?:connect|link|wire|hook up|hook|join|attach|merge)";
const INTERROGATIVE = /^(?:how|what|where|when|why|who|which|do you|does|is it|are there|explain|define|tell me)\b/i;

function stripPoliteness(input: string): string {
  let text = input.trim();
  for (let pass = 0; pass < 3; pass += 1) {
    const next = text
      .replace(/^(?:kimi|assistant)[,.!:\s]+/i, "")
      .replace(
        /^(?:please|pls|kindly|can you|could you|would you|will you|i (?:want|need) to|i'd like to|let'?s)\s+/i,
        "",
      );
    if (next === text) break;
    text = next;
  }
  return text.replace(/\s+/g, " ").trim();
}

function describeMatches(outcome: ResolveOutcome): string {
  return outcome.matches.map((n, i) => `${i + 1}. ${labelOf(n) || "(untitled)"} (${typeOf(n)})`).join(", ");
}

function notFound(outcome: ResolveOutcome, ctx: CommandContext): string {
  return `I can't find ${quote(outcome.query)} on the canvas — so I didn't change anything. ${inventory(ctx.nodes)}`;
}

function ambiguous(outcome: ResolveOutcome): string {
  return `${quote(outcome.query)} matches ${outcome.matches.length} nodes: ${describeMatches(
    outcome,
  )}. Tell me which one — use its name, or say "the first/last".`;
}

/** Resolve a reference for an operation that must act on exactly one node. */
function resolveOne(ctx: CommandContext, ref: string): { node: Node } | { failure: string } {
  const outcome = resolveNodes(ctx, ref);
  if (outcome.matches.length === 0) return { failure: notFound(outcome, ctx) };
  if (outcome.matches.length > 1 && !outcome.group) return { failure: ambiguous(outcome) };
  return { node: outcome.matches[0] };
}

/**
 * Turn a prompt into a reply plus the edits needed to make it true.
 *
 * Commands are matched most-specific-first so "remove the connection between A
 * and B" is not swallowed by generic node removal, and an unrecognised prompt
 * never silently mutates the canvas.
 */
export function runKimiCommand(input: string, ctx: CommandContext): KimiResult {
  const text = stripPoliteness(input);
  if (!text) return refuse('Type a command — for example, "add a RAG node after the trigger".');

  const inventoryLine = inventory(ctx.nodes);

  // 0. Questions get an answer, not an edit.
  if (INTERROGATIVE.test(text)) {
    return refuse(`${HELP_LINES.join("\n")}\n\nRight now — ${inventoryLine}`);
  }

  // 1. Clear the canvas ----------------------------------------------------
  if (
    /^(?:clear|reset|empty|wipe|erase)(?:\s+(?:it|everything|all|the (?:canvas|flow|workflow|graph|board)))?$/i.test(
      text,
    ) ||
    /\b(?:clear|reset|empty|wipe|erase)\s+(?:the\s+)?(?:canvas|flow|workflow|graph|board)\b/i.test(text) ||
    /\b(?:delete|remove|clear|purge|drop)\s+(?:all|every)\s+(?:nodes|steps|blocks|cards|elements|items)\b/i.test(text)
  ) {
    if (ctx.nodes.length === 0) return refuse("The canvas is already empty.");
    return ok(
      `Cleared the canvas — removed ${ctx.nodes.length} node${ctx.nodes.length === 1 ? "" : "s"} and ${
        ctx.edges.length
      } connection${ctx.edges.length === 1 ? "" : "s"}.`,
      { kind: "clear" },
    );
  }

  // 2. Undo ----------------------------------------------------------------
  if (/\b(?:undo|revert|step back|go back|take that back)\b/i.test(text)) {
    if (!ctx.historyDepth) return refuse("There's nothing to undo yet.");
    return ok("Stepped back to the previous canvas state.", { kind: "undo" });
  }

  // 3. Disconnect two nodes -------------------------------------------------
  // Anchored: "delete the trigger and disconnect A from B" must reach the
  // removal branch below rather than being swallowed by this one.
  const lead = "(?:and\\s+|then\\s+)?";
  const disconnect =
    text.match(new RegExp(`^${lead}\\b(?:disconnect|unlink|break)\\s+(.+?)\\s+(?:from|to|and|with)\\s+(.+)$`, "i")) ??
    text.match(
      new RegExp(
        `^${lead}\\b(?:remove|delete)\\s+(?:the\\s+)?(?:link|connection|edge|line)\\s+(?:between\\s+)?(.+?)\\s+(?:and|to|from|with)\\s+(.+)$`,
        "i",
      ),
    );
  const wantsDisconnect =
    /^(?:and\s+|then\s+)?\b(?:disconnect|unlink|break)\b/i.test(text) ||
    /\b(?:remove|delete)\s+(?:the\s+)?(?:link|connection|edge|line)\b/i.test(text);
  if (disconnect || wantsDisconnect) {
    if (!disconnect) {
      return refuse('Tell me which two nodes, e.g. "disconnect the trigger from the RAG node".');
    }
    const left = resolveOne(ctx, disconnect[1]);
    if ("failure" in left) return refuse(left.failure);
    const right = resolveOne(ctx, disconnect[2]);
    if ("failure" in right) return refuse(right.failure);
    if (left.node.id === right.node.id) return refuse("Those are the same node — nothing to disconnect.");

    const edge = ctx.edges.find(
      (e) =>
        (e.source === left.node.id && e.target === right.node.id) ||
        (e.source === right.node.id && e.target === left.node.id),
    );
    if (!edge) {
      return refuse(
        `${quote(labelOf(left.node))} and ${quote(labelOf(right.node))} aren't connected, so there was nothing to remove.`,
      );
    }
    return ok(`Disconnected ${quote(labelOf(left.node))} and ${quote(labelOf(right.node))}.`, {
      kind: "remove-edges",
      ids: [edge.id],
    });
  }

  // 4. Connect two nodes -----------------------------------------------------
  const connect = text.match(new RegExp(`^${lead}\\b${CONNECT_VERB}\\s+(.+?)\\s+(?:to|with|into|onto)\\s+(.+)$`, "i"));
  if (connect) {
    const source = resolveOne(ctx, connect[1].trim());
    if ("failure" in source) return refuse(source.failure);
    const target = resolveOne(ctx, connect[2].trim());
    if ("failure" in target) return refuse(target.failure);
    if (source.node.id === target.node.id) return refuse("A node can't connect to itself.");

    if (ctx.edges.some((e) => e.source === source.node.id && e.target === target.node.id)) {
      return refuse(`${quote(labelOf(source.node))} is already connected to ${quote(labelOf(target.node))}.`);
    }
    if (ctx.edges.some((e) => e.source === target.node.id && e.target === source.node.id)) {
      return refuse(
        `They're already connected the other way around: ${quote(labelOf(target.node))} → ${quote(
          labelOf(source.node),
        )}.`,
      );
    }

    return ok(`Connected ${quote(labelOf(source.node))} → ${quote(labelOf(target.node))}.`, {
      kind: "connect",
      source: source.node.id,
      target: target.node.id,
    });
  }

  // 5. Rename a node ----------------------------------------------------------
  const rename = text.match(
    new RegExp(`^${lead}\\b(?:rename|name|label)\\s+(.+?)\\s+(?:to|as)\\s+(.+?)(?:\\s+(?:and|then|so)\\s+.*)?$`, "i"),
  );
  if (rename || /^(?:and\s+|then\s+)?\b(?:rename|retitle)\b/i.test(text)) {
    if (!rename) return refuse('Tell me the new name, e.g. "rename the trigger to webhook".');

    const target = resolveOne(ctx, rename[1]);
    if ("failure" in target) return refuse(target.failure);

    const newLabel = rename[2].trim().replace(/[.!?,]+$/, "");
    if (!newLabel) return refuse('That name is empty — try "rename the trigger to webhook".');
    if (newLabel.length > 60) return refuse("That name is too long (60 characters max).");

    const previous = labelOf(target.node);
    if (previous === newLabel) return refuse(`${quote(previous)} already has that name.`);
    return ok(`Renamed ${quote(previous)} to ${quote(newLabel)}.`, {
      kind: "rename-node",
      id: target.node.id,
      label: newLabel,
    });
  }

  // 6. Remove one or more nodes -------------------------------------------------
  const remove = text.match(new RegExp(`^${VERBS}\\s+(?:the\\s+)?(.+)$`, "i"));
  if (remove) {
    const outcome = resolveNodes(ctx, remove[1]);
    if (outcome.matches.length === 0) return refuse(notFound(outcome, ctx));
    if (outcome.matches.length > 1 && !outcome.group) return refuse(ambiguous(outcome));

    const ids = outcome.matches.map((n) => n.id);
    const names = outcome.matches.map((n) => quote(labelOf(n) || "(untitled)")).join(", ");
    const lostEdges = ctx.edges.filter((e) => ids.includes(e.source) || ids.includes(e.target)).length;

    if (outcome.matches.length === 1) {
      return ok(
        `Removed ${names}${lostEdges ? ` and ${lostEdges} connection${lostEdges === 1 ? "" : "s"}` : ""}.`,
        { kind: "remove-nodes", ids },
      );
    }
    return ok(`Removed ${outcome.matches.length} nodes: ${names}.`, { kind: "remove-nodes", ids });
  }

  // 7. Add a node ---------------------------------------------------------------
  const wantsVerb = text.match(new RegExp(`^${ADD_VERB}\\b\\s*(.*)$`, "i"));
  const impliedAdd = /\b(?:a|an|another|new|one)\b/i.test(text) && /\bnode\b/i.test(text);
  if (wantsVerb || impliedAdd) {
    let rest = wantsVerb ? wantsVerb[1].trim() : text;

    // Optional explicit title.
    let label: string | undefined;
    const quoted = rest.match(/["']([^"']{1,60})["']/);
    if (quoted) {
      label = quoted[1].trim();
      rest = rest.replace(quoted[0], " ");
    }
    if (!label) {
      const named = rest.match(
        /\b(?:called|named|labelled|labeled|titled)\s+(.+?)(?=\s+(?:after|before|under|next|and|then|from|to)\b|[.,]|$)/i,
      );
      if (named) {
        label = named[1].trim();
        rest = rest.replace(named[0], " ");
      }
    }

    // Optional wiring: "connect it to X", "after X", "before X".
    let sourceRef: string | null = null;
    let targetRef: string | null = null;

    const wired = rest.match(/\b(?:connect|link|wire|hook)\s+(?:it|this|them)\s+(?:to|into|with)\s+(.+)$/i);
    if (wired) {
      sourceRef = wired[1].trim();
      rest = rest.replace(wired[0], " ");
    }
    if (!sourceRef) {
      const after = rest.match(/\b(?:after|following|downstream of|under)\s+(.+)$/i);
      if (after) {
        sourceRef = after[1].trim();
        rest = rest.replace(after[0], " ");
      }
    }
    const before = rest.match(/\b(?:before|preceding|upstream of)\s+(.+)$/i);
    if (before) {
      targetRef = before[1].trim();
      rest = rest.replace(before[0], " ");
    }

    rest = rest
      .replace(/\s+/g, " ")
      .replace(/^(?:a|an|the|another|new|one|some)\s+/i, "")
      .trim();

    const entry = matchesCatalog(rest);
    if (!entry) {
      const kinds = NODE_CATALOG.map((e) => `${e.type} ("${e.label}")`).join(", ");
      return refuse(
        `I couldn't tell which kind of node you mean, so I didn't add anything. Available kinds: ${kinds}.`,
      );
    }

    let sourceId: string | null = null;
    let targetId: string | null = null;
    let wiringNote: string | null = null;

    if (sourceRef) {
      const source = resolveOne(ctx, sourceRef);
      if ("failure" in source) {
        wiringNote = `I couldn't match ${quote(sourceRef)} to a node, so the new one isn't wired up.`;
      } else {
        sourceId = source.node.id;
      }
    }
    if (targetRef) {
      const target = resolveOne(ctx, targetRef);
      if ("failure" in target) {
        wiringNote = `I couldn't match ${quote(targetRef)} to a node, so the new one isn't wired up.`;
      } else {
        targetId = target.node.id;
      }
    }

    const actions = planAddNode(ctx, { type: entry.type, label, sourceId, targetId });
    const created = (actions[0] as Extract<KimiAction, { kind: "add-node" }>).node;
    const createdLabel = labelOf(created);

    let reply: string;
    if (sourceId) {
      const sourceNode = ctx.nodes.find((n) => n.id === sourceId);
      reply = `Added ${quote(createdLabel)} (${entry.type}) and wired ${quote(
        sourceNode ? labelOf(sourceNode) : sourceRef ?? "",
      )} → ${quote(createdLabel)}.`;
    } else if (targetId) {
      const targetNode = ctx.nodes.find((n) => n.id === targetId);
      reply = `Added ${quote(createdLabel)} (${entry.type}) and wired ${quote(createdLabel)} → ${quote(
        targetNode ? labelOf(targetNode) : targetRef ?? "",
      )}.`;
    } else if (ctx.nodes.length === 0) {
      reply = `Added ${quote(createdLabel)} (${entry.type}) as the first node.`;
    } else {
      reply = `Added ${quote(createdLabel)} (${entry.type}). It isn't connected yet — say "connect the trigger to ${quote(
        createdLabel,
      )}" or drag from a handle.`;
    }
    if (wiringNote) reply += ` ${wiringNote}`;

    return ok(reply, ...actions);
  }

  // 8. Help / nothing recognised ------------------------------------------------
  if (/\b(?:help|commands?|what can you do|instructions|usage|capabilities)\b/i.test(text)) {
    return refuse(`${HELP_LINES.join("\n")}\n\nRight now — ${inventoryLine}`);
  }

  return refuse(
    `I didn't recognise that as an edit, so I left the canvas alone.\n\n${HELP_LINES.join(
      "\n",
    )}\n\nRight now — ${inventoryLine}`,
  );
}
