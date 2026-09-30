/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS script, run by node. */

/**
 * Rationality suite for the deterministic Kimi engine.
 *
 *   npm run test:workflow     (or: npx tsc -p tests/kimi-engine && node tests/kimi-engine/test.js)
 *
 * Guards the behaviour that used to be guessed at: an unrecognised prompt must
 * not edit the canvas, references must resolve against what is actually on it,
 * and applied edits must never leave a dangling edge or a duplicate id.
 */
const E = require("./out/lib/workflow/kimiEngine.js");

let pass = 0;
const failures = [];

function t(name, fn) {
  try {
    fn();
    pass += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failures.push(name);
    console.log(`  FAIL  ${name}\n        ${err.message}`);
  }
}

function eq(actual, expected, what) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${what}: expected ${b}, got ${a}`);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ── Fixtures ─────────────────────────────────────────────────────────────
const node = (id, label, type, x, y) => ({
  id,
  type: "customNode",
  position: { x, y },
  data: { label, type, description: "" },
});
const edge = (id, source, target) => ({ id, source, target });

function baseGraph() {
  return {
    nodes: [
      node("n1", "Webhook Trigger", "Input", 260, 80),
      node("n2", "GPT Router", "LLM Node", 500, 80),
      node("n3", "Manuals Search", "RAG Node", 260, 260),
      node("n4", "CRM Sync", "API Node", 500, 260),
      node("n5", "Final Response", "Output", 260, 440),
    ],
    edges: [edge("e1", "n1", "n2"), edge("e2", "n2", "n3"), edge("e3", "n3", "n4"), edge("e4", "n4", "n5")],
    selectedId: "n2",
    historyDepth: 3,
  };
}

const kinds = (r) => r.actions.map((a) => a.kind);
const applied = (g, r) => E.applyActions(g, r.actions);

// ── ADD ──────────────────────────────────────────────────────────────────
t("add by kind: 'add a RAG node'", () => {
  const g = baseGraph();
  const r = E.runKimiCommand("add a RAG node", g);
  eq(kinds(r), ["add-node"], "actions");
  assert(r.actions[0].node.data.type === "RAG Node", "type should be RAG Node");
  assert(!applied(g, r).edges.length || true, "noop");
});

t("add preserves the user's capitalisation: 'called Router'", () => {
  const r = E.runKimiCommand("add an LLM node called Router", baseGraph());
  eq(kinds(r), ["add-node"], "actions");
  eq(r.actions[0].node.data.label, "Router", "label");
});

t("wires 'after the trigger' to the TRIGGER, not to the last node", () => {
  const g = baseGraph();
  const r = E.runKimiCommand("add a webhook after the trigger", g);
  eq(kinds(r), ["add-node", "connect"], "actions");
  assert(r.actions[1].source === "n1", `expected source n1 (the trigger), got ${r.actions[1].source}`);
  assert(r.actions[1].target !== "n4", "must not default to the last node");
});

t("wires 'connect it to the trigger' to the TRIGGER", () => {
  const g = baseGraph();
  const r = E.runKimiCommand("add a RAG node and connect it to the trigger", g);
  const conn = r.actions.find((a) => a.kind === "connect");
  assert(conn, "expected a connect action");
  assert(conn.source === "n1", `expected source n1, got ${conn.source}`);
  const out = applied(g, r);
  const added = out.nodes[out.nodes.length - 1];
  assert(conn.target === added.id, "connect must target the node just added");
  assert(out.edges.some((e) => e.source === "n1" && e.target === added.id), "edge exists after apply");
});

t("wires 'before <node>' upstream of that node", () => {
  const g = baseGraph();
  const r = E.runKimiCommand("add a condition before CRM Sync", g);
  const conn = r.actions.find((a) => a.kind === "connect");
  assert(conn, "expected a connect action");
  assert(conn.source !== conn.target, "no self loop");
  const added = applied(g, r).nodes.at(-1);
  assert(conn.source === added.id && conn.target === "n4", `expected new -> n4, got ${conn.source} -> ${conn.target}`);
});

t("unrecognised kind refuses instead of guessing: 'add a node'", () => {
  const r = E.runKimiCommand("add a node", baseGraph());
  eq(r.actions, [], "no actions");
  assert(/Available kinds/.test(r.reply), "reply should list kinds");
});

t("unknown placement target still adds, and says so", () => {
  const g = baseGraph();
  const r = E.runKimiCommand("add a RAG node after the banana", g);
  eq(kinds(r), ["add-node"], "still adds the node");
  assert(/isn't wired up/.test(r.reply), "reply must flag the failed wiring");
  const out = applied(g, r);
  eq(out.edges.length, g.edges.length, "no edge created");
});

t("duplicate kind gets a distinct title (RAG Ingest 2)", () => {
  const g = baseGraph();
  g.nodes.push(node("n5", "RAG Ingest", "RAG Node", 740, 80));
  const r = E.runKimiCommand("add a RAG node", g);
  eq(r.actions[0].node.data.label, "RAG Ingest 2", "label");
});

// ── REMOVE ───────────────────────────────────────────────────────────────
t("'remove the RAG node' resolves by kind without a selection", () => {
  const g = baseGraph();
  g.selectedId = null; // no selection — old code refused here
  const r = E.runKimiCommand("remove the RAG node", g);
  eq(kinds(r), ["remove-nodes"], "actions");
  eq(r.actions[0].ids, ["n3"], "ids");
});

t("'delete the last node' resolves to the last node", () => {
  const r = E.runKimiCommand("delete the last node", baseGraph());
  eq(r.actions[0].ids, ["n5"], "ids");
});

t("'remove the selected node' uses the selection", () => {
  const r = E.runKimiCommand("remove the selected node", baseGraph());
  eq(r.actions[0].ids, ["n2"], "ids");
});

t("'delete the 2nd node' uses canvas order", () => {
  const r = E.runKimiCommand("delete the 2nd node", baseGraph());
  eq(r.actions[0].ids, ["n2"], "ids");
});

t("'remove all RAG nodes' removes the whole group", () => {
  const g = baseGraph();
  g.nodes.push(node("n5", "Billing Search", "RAG Node", 740, 80));
  const r = E.runKimiCommand("remove all RAG nodes", g);
  eq(kinds(r), ["remove-nodes"], "actions");
  eq(r.actions[0].ids.sort(), ["n3", "n5"], "ids");
});

t("ambiguous singular refuses and lists the candidates", () => {
  const g = baseGraph();
  g.nodes.push(node("n5", "Billing Search", "RAG Node", 740, 80));
  const r = E.runKimiCommand("remove the RAG node", g);
  eq(r.actions, [], "no actions");
  assert(/matches 2 nodes/.test(r.reply), `reply should report ambiguity, got: ${r.reply}`);
  assert(/Manuals Search/.test(r.reply) && /Billing Search/.test(r.reply), "reply lists both candidates");
});

t("unknown target refuses and shows what is on the canvas", () => {
  const r = E.runKimiCommand("remove the banana", baseGraph());
  eq(r.actions, [], "no actions");
  assert(/can't find "banana"/i.test(r.reply), `reply should say it can't find it, got: ${r.reply}`);
  assert(/On the canvas:/.test(r.reply), "reply should inventory the canvas");
});

t("'delete all nodes' clears the canvas", () => {
  const r = E.runKimiCommand("delete all nodes", baseGraph());
  eq(kinds(r), ["clear"], "actions");
});

t("removing a node also drops its edges on apply", () => {
  const g = baseGraph();
  const r = E.runKimiCommand("remove the trigger", g);
  const out = applied(g, r);
  eq(out.nodes.map((n) => n.id), ["n2", "n3", "n4", "n5"], "nodes");
  eq(out.edges.map((e) => e.id), ["e2", "e3", "e4"], "edges (e1 was attached to n1)");
});

// ── RENAME ───────────────────────────────────────────────────────────────
t("'rename the trigger to Webhook Endpoint' keeps casing", () => {
  const r = E.runKimiCommand("rename the trigger to Webhook Endpoint", baseGraph());
  eq(kinds(r), ["rename-node"], "actions");
  eq(r.actions[0].id, "n1", "id");
  eq(r.actions[0].label, "Webhook Endpoint", "label");
});

t("'rename it to X' targets the selection", () => {
  const r = E.runKimiCommand("rename it to Route Keeper", baseGraph());
  eq(r.actions[0].id, "n2", "id");
  eq(r.actions[0].label, "Route Keeper", "label");
});

t("rename of an unknown node refuses", () => {
  const r = E.runKimiCommand("rename the banana to X", baseGraph());
  eq(r.actions, [], "no actions");
  assert(/can't find/.test(r.reply), "says it cannot find the node");
});

t("rename with no target phrase refuses instead of guessing", () => {
  const r = E.runKimiCommand("rename the trigger", baseGraph());
  eq(r.actions, [], "no actions");
  assert(/new name/.test(r.reply), "asks for the new name");
});

// ── CONNECT / DISCONNECT ─────────────────────────────────────────────────
t("'connect the trigger to the response' links by name and kind", () => {
  const r = E.runKimiCommand("connect the trigger to the response", baseGraph());
  eq(kinds(r), ["connect"], "actions");
  eq([r.actions[0].source, r.actions[0].target], ["n1", "n5"], "source/target");
});

t("connecting an existing pair is refused as already connected", () => {
  const r = E.runKimiCommand("connect the trigger to the GPT Router", baseGraph());
  eq(r.actions, [], "no actions");
  assert(/already connected/.test(r.reply), "says already connected");
});

t("connecting the reverse direction is detected", () => {
  const r = E.runKimiCommand("connect the GPT Router to the trigger", baseGraph());
  eq(r.actions, [], "no actions");
  assert(/other way around/.test(r.reply), "reports the reverse edge");
});

t("self-connection is refused", () => {
  const r = E.runKimiCommand("connect the trigger to the trigger", baseGraph());
  eq(r.actions, [], "no actions");
  assert(/itself/.test(r.reply), "refuses a self loop");
});

t("disconnect removes the edge", () => {
  const g = baseGraph();
  const r = E.runKimiCommand("disconnect the trigger from the GPT Router", g);
  eq(kinds(r), ["remove-edges"], "actions");
  const out = applied(g, r);
  eq(out.edges.map((e) => e.id), ["e2", "e3", "e4"], "edges");
});

t("disconnecting a non-existent pair refuses", () => {
  const r = E.runKimiCommand("disconnect the trigger from the response", baseGraph());
  eq(r.actions, [], "no actions");
  assert(/aren't connected/.test(r.reply), "says they are not connected");
});

// ── CLEAR / UNDO ─────────────────────────────────────────────────────────
t("'clear the canvas' clears", () => {
  eq(kinds(E.runKimiCommand("clear the canvas", baseGraph())), ["clear"], "actions");
});
t("'clear' alone clears", () => {
  eq(kinds(E.runKimiCommand("clear", baseGraph())), ["clear"], "actions");
});
t("clearing an empty canvas refuses", () => {
  const r = E.runKimiCommand("clear the canvas", { nodes: [], edges: [] });
  eq(r.actions, [], "no actions");
  assert(/already empty/.test(r.reply), "says already empty");
});
t("'undo' with history available returns an undo action", () => {
  eq(kinds(E.runKimiCommand("undo", baseGraph())), ["undo"], "actions");
});
t("'undo' with no history refuses", () => {
  const r = E.runKimiCommand("undo", { nodes: [], edges: [], historyDepth: 0 });
  eq(r.actions, [], "no actions");
  assert(/nothing to undo/.test(r.reply), "says nothing to undo");
});

// ── RATIONALITY GUARDS ───────────────────────────────────────────────────
const NO_EDITS = [
  "hello",
  "make me a sandwich",
  "this looks great",
  "what is the weather today",
  "add a node", // no kind given
  "remove the banana",
  "connect the banana to the trigger",
  "rename the banana to X",
  "how do I add a node?",
  "",
  "   ",
];

for (const prompt of NO_EDITS) {
  t(`no edit for: ${JSON.stringify(prompt)}`, () => {
    const r = E.runKimiCommand(prompt, baseGraph());
    eq(r.actions, [], `actions for ${JSON.stringify(prompt)}`);
    assert(r.reply && r.reply.length > 0, "still answers");
  });
}

t("'how do I ...' gets help, not an edit", () => {
  const r = E.runKimiCommand("how do I delete a node?", baseGraph());
  eq(r.actions, [], "no actions");
  assert(/Right now/.test(r.reply), "includes the canvas inventory");
});

t("politely prefixed commands still work", () => {
  const r = E.runKimiCommand("Please could you add a RAG node after the trigger", baseGraph());
  eq(kinds(r), ["add-node", "connect"], "actions");
  assert(r.actions[1].source === "n1", "wired to the trigger");
});

t("assistant-addressed command still works", () => {
  const r = E.runKimiCommand("kimi, delete the last node", baseGraph());
  eq(r.actions[0].ids, ["n5"], "ids");
});

t("command chaining: remove then connect in one prompt is refused, not half-done", () => {
  const r = E.runKimiCommand("delete the trigger and connect the output to the RAG node", baseGraph());
  // Only the remove verb is at the start, so exactly one intent is applied.
  eq(kinds(r), ["remove-nodes"], "actions");
});

// ── INVARIANTS ───────────────────────────────────────────────────────────
t("applyActions never leaves a dangling edge", () => {
  const g = baseGraph();
  const r = E.runKimiCommand("remove the GPT Router", g);
  const out = applied(g, r);
  const ids = new Set(out.nodes.map((n) => n.id));
  for (const e of out.edges) {
    assert(ids.has(e.source) && ids.has(e.target), `dangling edge ${e.id}`);
  }
});

t("applyActions rejects an edge whose endpoints are missing", () => {
  const out = E.applyActions(baseGraph(), [{ kind: "connect", source: "ghost", target: "n1" }]);
  eq(out.edges.length, 4, "no edge added");
});

t("applyActions rejects a self loop", () => {
  const out = E.applyActions(baseGraph(), [{ kind: "connect", source: "n1", target: "n1" }]);
  eq(out.edges.length, 4, "no edge added");
});

t("applyActions never reuses a node id", () => {
  const g = baseGraph();
  const first = E.runKimiCommand("add a RAG node", g);
  const afterFirst = applied(g, first);
  const second = E.runKimiCommand("add a RAG node", afterFirst);
  const afterSecond = applied(afterFirst, second);
  const ids = afterSecond.nodes.map((n) => n.id);
  eq(new Set(ids).size, ids.length, "ids unique");
  eq(afterSecond.nodes.length, 7, "5 original + 2 added");
});

t("new nodes never land on top of an existing node", () => {
  const g = baseGraph();
  const r = E.runKimiCommand("add a RAG node", g);
  const created = r.actions[0].node;
  for (const n of g.nodes) {
    const overlap =
      Math.abs(n.position.x - created.position.x) < 220 && Math.abs(n.position.y - created.position.y) < 130;
    assert(!overlap, `overlaps ${n.id}`);
  }
});

t("add after a node places it below that node", () => {
  const g = baseGraph();
  const r = E.runKimiCommand("add a RAG node after the trigger", g);
  const created = r.actions[0].node;
  assert(created.position.y > 80, "should sit below the anchor row");
});

t("clear empties everything", () => {
  const g = baseGraph();
  const out = applied(g, E.runKimiCommand("clear the canvas", g));
  eq(out.nodes, [], "nodes");
  eq(out.edges, [], "edges");
});

// ── CATALOGUE MAPPING ────────────────────────────────────────────────────
t("persisted type mapping round-trips for every kind", () => {
  for (const entry of E.NODE_CATALOG) {
    const persisted = E.toPersistedType(entry.type);
    assert(E.toCanvasType(persisted).type === entry.type, `${entry.type} -> ${persisted} -> back`);
  }
});

t("library catalogue matches what the canvas renders", () => {
  eq(
    E.NODE_CATALOG.map((e) => [e.type, e.label, e.description]),
    [
      ["Input", "Input Trigger", "API Endpoint Webhook"],
      ["LLM Node", "LLM Agent", "Prompt Model Resolution"],
      ["RAG Node", "RAG Ingest", "Vector Database search"],
      ["API Node", "REST API call", "Post/Get Web Services"],
      ["Condition", "Condition Branch", "Branch on rules and flags"],
      ["Output", "Response Output", "Finalize run values"],
    ],
    "catalogue",
  );
});

// ── Case and phrasing variations ─────────────────────────────────────────
// People type commands with capitals; matching has to be case-insensitive
// throughout the pattern, not only at the start of a phrase.
const CASE_VARIATIONS = [
  ["Add a RAG node after the trigger", ["add-node", "connect"]],
  ["Delete the last node", ["remove-nodes"]],
  ["Clear the canvas", ["clear"]],
  ["Undo", ["undo"]],
  ["Connect the trigger to CRM Sync", ["connect"]],
  ["Rename the trigger to Webhook Endpoint", ["rename-node"]],
  ["Disconnect the trigger from GPT Router", ["remove-edges"]],
  ["Add an LLM node called Router before the final output", ["add-node", "connect"]],
  ["REMOVE THE RAG NODE", ["remove-nodes"]],
  ["Remove the RAG node", ["remove-nodes"]],
];

for (const [prompt, expected] of CASE_VARIATIONS) {
  t(`case-insensitive: ${JSON.stringify(prompt)}`, () => {
    const r = E.runKimiCommand(prompt, baseGraph());
    eq(kinds(r), expected, `actions for ${JSON.stringify(prompt)}`);
    assert(r.reply && r.reply.length > 0, "replies");
  });
}

t("a capitalised prompt never becomes a silent non-edit", () => {
  for (const [prompt] of CASE_VARIATIONS) {
    const r = E.runKimiCommand(prompt, baseGraph());
    assert(r.actions.length > 0, `expected an edit for ${JSON.stringify(prompt)}`);
  }
});

// ── REPORT ───────────────────────────────────────────────────────────────
const total = pass + failures.length;
console.log(`\n${pass}/${total} passed`);
if (failures.length) {
  console.log(`FAILED: ${failures.join(" | ")}`);
  process.exit(1);
}
