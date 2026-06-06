"""
graph_engine.py
---------------
Manual implementation of a DIRECTED graph using an Adjacency List.

Data Structure:
    adjacency_list: dict[str, list[str]]
        Key   → Node ID (string label)
        Value → List of neighbor Node IDs (Outgoing edges)

This does NOT use NetworkX or any external graph library.
All graph logic is implemented from scratch using Python built-ins.

Complexity:
    add_node      → O(1)
    remove_node   → O(V + E)   (must clean all neighbor references)
    add_edge      → O(1)
    remove_edge   → O(degree)  (scan neighbor lists)
    get_neighbors → O(1)
    to_dict       → O(V + E)
"""

from __future__ import annotations
import json
from typing import Optional


class GraphError(Exception):
    """Custom exception for graph operation errors."""
    pass


class Graph:
    """
    Directed graph implemented using an Adjacency List.

    Each node is identified by a unique string ID.
    Edges are stored directionally: if A→B exists, B→A might not exist.

    Attributes
    ----------
    adjacency_list : dict[str, list[str]]
        The core data structure. Maps each node ID to its list of outgoing neighbors.
    node_metadata : dict[str, dict]
        Optional per-node metadata (label, color, position, etc.)
    """

    def __init__(self) -> None:
        # Core adjacency list — this IS the graph
        self.adjacency_list: dict[str, list[str]] = {}
        # Optional metadata per node (for frontend display)
        self.node_metadata: dict[str, dict] = {}

    # ------------------------------------------------------------------ #
    #  NODE OPERATIONS                                                      #
    # ------------------------------------------------------------------ #

    def add_node(self, node_id: str, metadata: Optional[dict] = None) -> None:
        """
        Add a new node to the graph.

        Parameters
        ----------
        node_id : str
            Unique identifier for the node.
        metadata : dict, optional
            Arbitrary metadata (label, position, etc.).

        Raises
        ------
        GraphError
            If node_id already exists.
        """
        if node_id in self.adjacency_list:
            raise GraphError(f"Node '{node_id}' already exists.")
        if not node_id or not node_id.strip():
            raise GraphError("Node ID cannot be empty.")

        self.adjacency_list[node_id] = []
        self.node_metadata[node_id] = metadata or {"label": node_id}

    def remove_node(self, node_id: str) -> None:
        """
        Remove a node and all edges connected to it.

        Parameters
        ----------
        node_id : str
            The node to remove.

        Raises
        ------
        GraphError
            If node_id does not exist.
        """
        if node_id not in self.adjacency_list:
            raise GraphError(f"Node '{node_id}' does not exist.")

        # Remove all edges pointing TO this node from neighbors
        for neighbor in self.adjacency_list:
            if node_id in self.adjacency_list[neighbor]:
                self.adjacency_list[neighbor] = [
                    n for n in self.adjacency_list[neighbor] if n != node_id
                ]

        # Remove the node itself
        del self.adjacency_list[node_id]
        if node_id in self.node_metadata:
            del self.node_metadata[node_id]

    def has_node(self, node_id: str) -> bool:
        """Return True if the node exists in the graph."""
        return node_id in self.adjacency_list

    # ------------------------------------------------------------------ #
    #  EDGE OPERATIONS                                                      #
    # ------------------------------------------------------------------ #

    def add_edge(self, node_a: str, node_b: str) -> None:
        """
        Add a DIRECTED edge from node_a to node_b.

        Parameters
        ----------
        node_a, node_b : str
            The two nodes to connect.

        Raises
        ------
        GraphError
            If either node does not exist, if a self-loop is attempted,
            or if the edge already exists.
        """
        if node_a not in self.adjacency_list:
            raise GraphError(f"Node '{node_a}' does not exist.")
        if node_b not in self.adjacency_list:
            raise GraphError(f"Node '{node_b}' does not exist.")
        if node_a == node_b:
            raise GraphError("Self-loops are not allowed.")
        if node_b in self.adjacency_list[node_a]:
            raise GraphError(f"Directed edge '{node_a}' → '{node_b}' already exists.")

        # Add directed edge
        self.adjacency_list[node_a].append(node_b)

    def remove_edge(self, node_a: str, node_b: str) -> None:
        """
        Remove the DIRECTED edge from node_a to node_b.

        Parameters
        ----------
        node_a, node_b : str
            The two nodes whose edge should be removed.

        Raises
        ------
        GraphError
            If either node does not exist or the edge does not exist.
        """
        if node_a not in self.adjacency_list:
            raise GraphError(f"Node '{node_a}' does not exist.")
        if node_b not in self.adjacency_list:
            raise GraphError(f"Node '{node_b}' does not exist.")
        if node_b not in self.adjacency_list[node_a]:
            raise GraphError(f"Directed edge '{node_a}' → '{node_b}' does not exist.")

        self.adjacency_list[node_a].remove(node_b)

    def has_edge(self, node_a: str, node_b: str) -> bool:
        """Return True if a directed edge exists from node_a to node_b."""
        if node_a not in self.adjacency_list:
            return False
        return node_b in self.adjacency_list[node_a]

    # ------------------------------------------------------------------ #
    #  QUERY OPERATIONS                                                     #
    # ------------------------------------------------------------------ #

    def get_neighbors(self, node_id: str) -> list[str]:
        """
        Return the list of neighbors for a given node.

        Parameters
        ----------
        node_id : str
            The node to query.

        Returns
        -------
        list[str]
            Sorted list of neighbor IDs.

        Raises
        ------
        GraphError
            If the node does not exist.
        """
        if node_id not in self.adjacency_list:
            raise GraphError(f"Node '{node_id}' does not exist.")
        return sorted(self.adjacency_list[node_id])

    def get_all_nodes(self) -> list[str]:
        """Return sorted list of all node IDs."""
        return sorted(self.adjacency_list.keys())

    def get_all_edges(self) -> list[tuple[str, str]]:
        """
        Return list of all directed edges as (source, target) tuples.
        """
        edges = []
        for node, neighbors in self.adjacency_list.items():
            for neighbor in neighbors:
                edges.append((node, neighbor))
        return sorted(edges)

    def node_count(self) -> int:
        """Return total number of nodes (V)."""
        return len(self.adjacency_list)

    def edge_count(self) -> int:
        """Return total number of directed edges (E)."""
        return sum(len(neighbors) for neighbors in self.adjacency_list.values())

    def get_adjacency_list_display(self) -> dict[str, list[str]]:
        """
        Return the adjacency list in a sorted, display-friendly format.

        Returns
        -------
        dict[str, list[str]]
            Ordered by node ID, neighbors sorted alphabetically.
        """
        return {
            node: sorted(neighbors)
            for node, neighbors in sorted(self.adjacency_list.items())
        }

    # ------------------------------------------------------------------ #
    #  CENTRALITY ANALYTICS                                                 #
    # ------------------------------------------------------------------ #

    def get_centrality_metrics(self) -> dict:
        """
        Compute Centrality Analytics for the network.
        - Out-Degree: How many people this node follows (outgoing edges).
        - In-Degree: How many people follow this node (incoming edges).

        Returns
        -------
        dict
            {"in_degree": {node_id: int}, "out_degree": {node_id: int}}
        """
        out_degree = {node: len(neighbors) for node, neighbors in self.adjacency_list.items()}
        in_degree = {node: 0 for node in self.adjacency_list}

        for neighbors in self.adjacency_list.values():
            for n in neighbors:
                in_degree[n] += 1

        return {
            "in_degree": in_degree,
            "out_degree": out_degree
        }

    # ------------------------------------------------------------------ #
    #  SERIALIZATION                                                        #
    # ------------------------------------------------------------------ #

    def to_dict(self) -> dict:
        """
        Serialize the graph to a JSON-compatible dictionary.

        Returns
        -------
        dict with keys:
            nodes: list of {id, metadata}
            edges: list of {source, target}
            adjacency_list: dict[str, list[str]]
            analytics: dict of in_degree and out_degree
        """
        return {
            "nodes": [
                {"id": nid, "metadata": self.node_metadata.get(nid, {"label": nid})}
                for nid in self.get_all_nodes()
            ],
            "edges": [
                {"source": a, "target": b}
                for a, b in self.get_all_edges()
            ],
            "adjacency_list": self.get_adjacency_list_display(),
            "analytics": self.get_centrality_metrics()
        }

    def from_dict(self, data: dict) -> None:
        """
        Load graph from a serialized dictionary (replaces current graph).

        Parameters
        ----------
        data : dict
            Must contain 'nodes' and 'edges' keys as produced by to_dict().
        """
        # Clear current state
        self.adjacency_list = {}
        self.node_metadata = {}

        # Load nodes
        for node_data in data.get("nodes", []):
            nid = node_data["id"]
            meta = node_data.get("metadata", {"label": nid})
            self.add_node(nid, meta)

        # Load edges
        for edge_data in data.get("edges", []):
            src = edge_data["source"]
            tgt = edge_data["target"]
            if not self.has_edge(src, tgt):
                self.add_edge(src, tgt)

    def clear(self) -> None:
        """Remove all nodes and edges from the graph."""
        self.adjacency_list = {}
        self.node_metadata = {}

    def __repr__(self) -> str:
        lines = ["Graph (Adjacency List):"]
        for node in self.get_all_nodes():
            neighbors = ", ".join(self.adjacency_list[node]) or "∅"
            lines.append(f"  {node} → [{neighbors}]")
        return "\n".join(lines)
