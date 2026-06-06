"""
app.py
------
Flask application entry point and REST API for the
Information Spread Analysis (BFS Social Network Simulator).

Routes
------
GET  /                        → Serve the main dashboard UI
GET  /api/graph               → Get full graph state (nodes, edges, adjacency list)
POST /api/graph/node          → Add a node
DELETE /api/graph/node/<id>   → Delete a node
POST /api/graph/edge          → Add an edge
DELETE /api/graph/edge        → Delete an edge
POST /api/graph/random        → Generate a random graph
POST /api/graph/load          → Load graph from JSON payload
GET  /api/graph/save          → Export current graph as JSON
DELETE /api/graph/reset       → Clear all nodes and edges

POST /api/bfs/run             → Run full BFS from a source node
POST /api/bfs/init            → Initialize step-by-step BFS
GET  /api/bfs/next            → Advance one BFS step

Architecture: MVC-like
  Model      → graph_engine.Graph  +  bfs_engine.BFSEngine
  Controller → Flask routes (this file)
  View       → templates/index.html + static/ (JS/CSS)
"""

from __future__ import annotations

import random
import string
from flask import Flask, jsonify, render_template, request, Response

from graph_engine import Graph, GraphError
from bfs_engine import BFSEngine

# ── Application factory ───────────────────────────────────────────────────────
app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

# ── Shared graph instance (in-memory, single-session) ─────────────────────────
# In production this would be per-session; for a demo/university project,
# a module-level singleton is clear and sufficient.
graph = Graph()
bfs_engine = BFSEngine(graph)

# Pre-populate with a sample social network so the UI is not blank on first load
_SAMPLE_NODES = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Hank"]
_SAMPLE_EDGES = [
    ("Alice", "Bob"), ("Alice", "Carol"), ("Alice", "Dave"),
    ("Bob", "Eve"), ("Bob", "Frank"),
    ("Carol", "Grace"),
    ("Dave", "Hank"),
    ("Eve", "Grace"),
]

for _n in _SAMPLE_NODES:
    graph.add_node(_n)
for _a, _b in _SAMPLE_EDGES:
    graph.add_edge(_a, _b)


# ── Helper ────────────────────────────────────────────────────────────────────

def ok(data: dict | list, status: int = 200) -> Response:
    """Return a JSON success response."""
    return jsonify({"success": True, "data": data}), status


def err(message: str, status: int = 400) -> Response:
    """Return a JSON error response."""
    return jsonify({"success": False, "error": message}), status


# ── UI Route ──────────────────────────────────────────────────────────────────

@app.route("/")
def index() -> str:
    """Serve the main single-page dashboard."""
    return render_template("index.html")


# ── Graph API ─────────────────────────────────────────────────────────────────

@app.route("/api/graph", methods=["GET"])
def get_graph() -> Response:
    """Return the full graph state: nodes, edges, and adjacency list."""
    return ok(graph.to_dict())


@app.route("/api/graph/node", methods=["POST"])
def add_node() -> Response:
    """
    Add a new node to the graph.

    Body (JSON):
        { "id": "NodeName" }
    """
    body = request.get_json(silent=True) or {}
    node_id = (body.get("id") or "").strip()

    if not node_id:
        return err("Node ID is required.")

    try:
        graph.add_node(node_id)
        return ok({"graph": graph.to_dict(), "added_node": node_id}, status=201)
    except GraphError as e:
        return err(str(e))


@app.route("/api/graph/node/<path:node_id>", methods=["DELETE"])
def delete_node(node_id: str) -> Response:
    """
    Delete a node (and all its edges) from the graph.

    URL param: node_id — the node to remove.
    """
    try:
        graph.remove_node(node_id)
        return ok({"graph": graph.to_dict(), "removed_node": node_id})
    except GraphError as e:
        return err(str(e))


@app.route("/api/graph/edge", methods=["POST"])
def add_edge() -> Response:
    """
    Add an undirected edge between two nodes.

    Body (JSON):
        { "source": "A", "target": "B" }
    """
    body = request.get_json(silent=True) or {}
    source = (body.get("source") or "").strip()
    target = (body.get("target") or "").strip()

    if not source or not target:
        return err("Both 'source' and 'target' are required.")

    try:
        graph.add_edge(source, target)
        return ok({"graph": graph.to_dict(), "added_edge": [source, target]}, status=201)
    except GraphError as e:
        return err(str(e))


@app.route("/api/graph/edge", methods=["DELETE"])
def delete_edge() -> Response:
    """
    Delete an edge between two nodes.

    Body (JSON):
        { "source": "A", "target": "B" }
    """
    body = request.get_json(silent=True) or {}
    source = (body.get("source") or "").strip()
    target = (body.get("target") or "").strip()

    if not source or not target:
        return err("Both 'source' and 'target' are required.")

    try:
        graph.remove_edge(source, target)
        return ok({"graph": graph.to_dict(), "removed_edge": [source, target]})
    except GraphError as e:
        return err(str(e))


@app.route("/api/graph/save", methods=["GET"])
def save_graph() -> Response:
    """Export the current graph as a JSON download."""
    return ok(graph.to_dict())


@app.route("/api/graph/load", methods=["POST"])
def load_graph() -> Response:
    """
    Replace the current graph with one loaded from JSON.

    Body (JSON): a graph dict as produced by /api/graph/save.
    """
    body = request.get_json(silent=True)
    if not body:
        return err("Request body must be a valid JSON graph.")

    try:
        graph.from_dict(body)
        # Re-bind the BFS engine to the updated graph
        bfs_engine.graph = graph
        bfs_engine.reset_step()
        return ok({"graph": graph.to_dict()})
    except (GraphError, KeyError, TypeError) as e:
        return err(f"Failed to load graph: {e}")


@app.route("/api/graph/random", methods=["POST"])
def random_graph() -> Response:
    """
    Generate a random connected social network graph.

    Body (JSON, optional):
        { "nodes": 10, "density": 0.35 }
        nodes   → number of nodes (5–30, default 10)
        density → edge probability (0.1–0.9, default 0.35)
    """
    body = request.get_json(silent=True) or {}
    n_nodes = max(5, min(30, int(body.get("nodes", 10))))
    density = max(0.1, min(0.9, float(body.get("density", 0.35))))

    # Build a list of name-like node IDs
    first_names = [
        "Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Hank",
        "Iris", "Jack", "Karen", "Leo", "Mia", "Nick", "Olivia", "Pete",
        "Quinn", "Rose", "Sam", "Tina", "Uma", "Vince", "Wendy", "Xander",
        "Yara", "Zoe", "Alex", "Blake", "Casey", "Dana", "Muhammad", "Ahmad", 
        "Rizky", "Dimas", "Fajar", "Andi", "Bayu", "Rafi",
        "Aldi", "Aditya", "Bima", "Yoga", "Arif", "Reza", "Iqbal",
        "Siti", "Aisyah", "Putri", "Nabila", "Nurul", "Fitri", "Intan",
        "Dinda", "Rina", "Kartika", "Zahra", "Aulia", "Maya", "Citra", "Nadia"
    ]
    random.shuffle(first_names)
    names = first_names[:n_nodes]

    graph.clear()
    bfs_engine.reset_step()

    for name in names:
        graph.add_node(name)

    # Guarantee connectivity: chain all nodes first
    for i in range(len(names) - 1):
        graph.add_edge(names[i], names[i + 1])

    # Add random additional edges based on density
    for i in range(n_nodes):
        for j in range(n_nodes):
            if i != j and random.random() < density:
                if not graph.has_edge(names[i], names[j]):
                    graph.add_edge(names[i], names[j])

    return ok({"graph": graph.to_dict()})


@app.route("/api/graph/reset", methods=["DELETE"])
def reset_graph() -> Response:
    """Remove all nodes and edges, resetting to an empty graph."""
    graph.clear()
    bfs_engine.reset_step()
    return ok({"graph": graph.to_dict(), "message": "Graph cleared."})


# ── BFS API ───────────────────────────────────────────────────────────────────

@app.route("/api/bfs/run", methods=["POST"])
def bfs_run() -> Response:
    """
    Execute a complete BFS traversal and return the full result.

    Body (JSON):
        { "source": "Alice" }

    Returns the BFSResult as a dict, including:
        bfs_order, levels, queue_snapshots, step_events,
        reachability_pct, spread_depth, first/last informed.
    """
    body = request.get_json(silent=True) or {}
    source = (body.get("source") or "").strip()

    if not source:
        return err("'source' node ID is required.")

    try:
        result = bfs_engine.run_bfs(source)
        return ok(result.to_dict())
    except GraphError as e:
        return err(str(e))


@app.route("/api/bfs/init", methods=["POST"])
def bfs_init() -> Response:
    """
    Initialize a step-by-step BFS session.

    Body (JSON):
        { "source": "Alice" }

    After calling this, repeatedly call GET /api/bfs/next to advance.
    """
    body = request.get_json(silent=True) or {}
    source = (body.get("source") or "").strip()

    if not source:
        return err("'source' node ID is required.")

    try:
        state = bfs_engine.init_step_bfs(source)
        return ok(state)
    except GraphError as e:
        return err(str(e))


@app.route("/api/bfs/next", methods=["GET"])
def bfs_next() -> Response:
    """
    Advance the step-by-step BFS by one dequeue operation.

    Must call POST /api/bfs/init first.
    Returns done=True when traversal is complete.
    """
    try:
        state = bfs_engine.next_step()
        return ok(state)
    except GraphError as e:
        return err(str(e))


# ── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  BFS Social Network Simulator")
    print("  Data Structures — University Project")
    print("  Server: http://127.0.0.1:5000")
    print("=" * 60)
    app.run(debug=True, host="127.0.0.1", port=5000)
