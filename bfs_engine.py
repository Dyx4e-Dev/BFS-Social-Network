"""
bfs_engine.py
-------------
Manual implementation of Breadth-First Search (BFS) for graph traversal.

Data Structures Used:
    Queue   → collections.deque  (O(1) enqueue/dequeue from both ends)
    Visited → set                (O(1) membership check)
    Levels  → list[list[str]]    (stores BFS level groupings)

Algorithm:
    1. Initialize queue with source node, mark as visited.
    2. While queue is not empty:
       a. Dequeue a node (FIFO order).
       b. For each unvisited neighbor:
          - Mark as visited.
          - Enqueue.
    3. Record the BFS order and level-by-level spread.

Time Complexity  : O(V + E)
    - Each node   is enqueued and dequeued exactly once → O(V)
    - Each edge   is examined exactly twice             → O(E)

Space Complexity : O(V)
    - Queue holds at most V nodes at any time
    - Visited set holds at most V entries
    - Output arrays hold V nodes total
"""

from __future__ import annotations
from collections import deque
from typing import Iterator, Optional

from graph_engine import Graph, GraphError


class BFSResult:
    """
    Container for the full result of a BFS traversal.

    Attributes
    ----------
    source : str
        The starting node.
    bfs_order : list[str]
        Nodes in the exact order they were dequeued (visited).
    levels : list[list[str]]
        Nodes grouped by BFS level (distance from source).
        levels[0] = [source], levels[1] = direct neighbors, etc.
    queue_snapshots : list[list[str]]
        State of the queue after each enqueue event.
        Used to animate the queue visualization step by step.
    step_events : list[dict]
        Fine-grained event log for step-by-step animation.
        Each event: {type, node, level, queue_state, newly_enqueued}
    total_nodes : int
        Number of nodes in the full graph.
    visited_count : int
        Number of nodes reached by BFS from source.
    reachability_pct : float
        Percentage of graph nodes reachable from source.
    spread_depth : int
        Maximum BFS level (diameter from source to farthest reached node).
    """

    def __init__(self) -> None:
        self.source: str = ""
        self.bfs_order: list[str] = []
        self.levels: list[list[str]] = []
        self.queue_snapshots: list[list[str]] = []
        self.step_events: list[dict] = []
        self.total_nodes: int = 0
        self.visited_count: int = 0
        self.reachability_pct: float = 0.0
        self.spread_depth: int = 0

    @property
    def first_informed(self) -> Optional[str]:
        """The source node (first informed)."""
        return self.bfs_order[0] if self.bfs_order else None

    @property
    def last_informed(self) -> Optional[str]:
        """The last node reached by BFS."""
        return self.bfs_order[-1] if self.bfs_order else None

    def to_dict(self) -> dict:
        """Serialize BFS result to JSON-compatible dictionary."""
        return {
            "source": self.source,
            "bfs_order": self.bfs_order,
            "levels": self.levels,
            "queue_snapshots": self.queue_snapshots,
            "step_events": self.step_events,
            "total_nodes": self.total_nodes,
            "visited_count": self.visited_count,
            "reachability_pct": round(self.reachability_pct, 1),
            "spread_depth": self.spread_depth,
            "first_informed": self.first_informed,
            "last_informed": self.last_informed,
        }


class BFSEngine:
    """
    BFS traversal engine that operates on a Graph instance.

    Supports two modes:
    1. Full BFS  → run_bfs(source)  returns complete BFSResult at once.
    2. Step BFS  → init_step_bfs(source) + next_step() for animated mode.

    The Queue is implemented using collections.deque (double-ended queue),
    using only append() (enqueue from right) and popleft() (dequeue from left),
    preserving FIFO semantics.
    """

    def __init__(self, graph: Graph) -> None:
        self.graph = graph
        # Internal state for step-by-step mode
        self._step_queue: Optional[deque] = None
        self._step_visited: Optional[set] = None
        self._step_level_map: Optional[dict] = None
        self._step_result: Optional[BFSResult] = None
        self._step_initialized: bool = False
        self._step_done: bool = False

    # ------------------------------------------------------------------ #
    #  FULL BFS                                                             #
    # ------------------------------------------------------------------ #

    def run_bfs(self, source: str) -> BFSResult:
        """
        Execute a complete BFS from the source node.

        Algorithm (Adjacency List + Queue):
        ------------------------------------
        queue   = deque([source])
        visited = {source}
        level_map[source] = 0

        while queue:
            node = queue.popleft()          ← FIFO dequeue
            for neighbor in adj[node]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    level_map[neighbor] = level_map[node] + 1
                    queue.append(neighbor)  ← enqueue

        Parameters
        ----------
        source : str
            The starting node for BFS.

        Returns
        -------
        BFSResult
            Complete traversal result with levels, order, snapshots, events.

        Raises
        ------
        GraphError
            If source node does not exist or graph is empty.
        """
        if not self.graph.has_node(source):
            raise GraphError(f"Source node '{source}' does not exist.")
        if self.graph.node_count() == 0:
            raise GraphError("Graph is empty. Add nodes before running BFS.")

        result = BFSResult()
        result.source = source
        result.total_nodes = self.graph.node_count()

        # ── Initialize BFS data structures ──────────────────────────────
        queue: deque[str] = deque()          # The Queue (FIFO)
        visited: set[str] = set()            # Visited / "informed" set
        level_map: dict[str, int] = {}       # node → BFS level (distance)

        # Enqueue source
        queue.append(source)
        visited.add(source)
        level_map[source] = 0

        # Record initial queue snapshot and step event
        result.queue_snapshots.append(list(queue))
        result.step_events.append({
            "type": "enqueue",
            "node": source,
            "level": 0,
            "queue_state": [source],
            "newly_enqueued": [source],
        })

        # ── BFS Main Loop ────────────────────────────────────────────────
        while queue:
            # Dequeue (FIFO: from left)
            current = queue.popleft()
            current_level = level_map[current]
            result.bfs_order.append(current)

            # Record dequeue event
            result.step_events.append({
                "type": "dequeue",
                "node": current,
                "level": current_level,
                "queue_state": list(queue),
                "newly_enqueued": [],
            })

            # Process neighbors in sorted order (deterministic output)
            newly_enqueued = []
            for neighbor in self.graph.get_neighbors(current):
                if neighbor not in visited:
                    visited.add(neighbor)
                    level_map[neighbor] = current_level + 1
                    queue.append(neighbor)
                    newly_enqueued.append(neighbor)

            if newly_enqueued:
                result.queue_snapshots.append(list(queue))
                result.step_events.append({
                    "type": "enqueue_batch",
                    "node": current,
                    "level": current_level,
                    "queue_state": list(queue),
                    "newly_enqueued": newly_enqueued,
                })

        # ── Build level groupings ────────────────────────────────────────
        max_level = max(level_map.values()) if level_map else 0
        levels: list[list[str]] = [[] for _ in range(max_level + 1)]
        for node, lvl in level_map.items():
            levels[lvl].append(node)
        # Sort within each level for deterministic display
        for lvl_nodes in levels:
            lvl_nodes.sort()

        result.levels = levels
        result.visited_count = len(visited)
        result.spread_depth = max_level
        result.reachability_pct = (
            (len(visited) / result.total_nodes * 100)
            if result.total_nodes > 0 else 0.0
        )

        return result

    # ------------------------------------------------------------------ #
    #  STEP-BY-STEP BFS                                                    #
    # ------------------------------------------------------------------ #

    def init_step_bfs(self, source: str) -> dict:
        """
        Initialize the step-by-step BFS mode.

        After calling this, call next_step() repeatedly to advance one
        dequeue operation at a time.

        Parameters
        ----------
        source : str
            The starting node.

        Returns
        -------
        dict
            Initial state describing the starting configuration.
        """
        if not self.graph.has_node(source):
            raise GraphError(f"Source node '{source}' does not exist.")

        self._step_queue = deque()
        self._step_visited = set()
        self._step_level_map = {}
        self._step_result = BFSResult()
        self._step_result.source = source
        self._step_result.total_nodes = self.graph.node_count()
        self._step_initialized = True
        self._step_done = False

        # Enqueue source
        self._step_queue.append(source)
        self._step_visited.add(source)
        self._step_level_map[source] = 0

        return {
            "initialized": True,
            "source": source,
            "queue": [source],
            "visited": [source],
            "done": False,
            "message": f"BFS initialized. Source node '{source}' enqueued at Level 0.",
        }

    def next_step(self) -> dict:
        """
        Advance BFS by one dequeue step.

        Returns
        -------
        dict
            State after this step:
                node      : node that was dequeued
                level     : its BFS level
                neighbors : its neighbors
                enqueued  : neighbors newly added to queue
                queue     : current queue state
                visited   : all visited nodes so far
                done      : True if BFS is complete
                message   : human-readable description of this step
        """
        if not self._step_initialized:
            raise GraphError("Call init_step_bfs() first.")
        if self._step_done or not self._step_queue:
            self._step_done = True
            # Finalize result
            max_level = max(self._step_level_map.values(), default=0)
            levels = [[] for _ in range(max_level + 1)]
            for node, lvl in self._step_level_map.items():
                if node in self._step_visited and node in self._step_result.bfs_order:
                    levels[lvl].append(node)
            for lvl_nodes in levels:
                lvl_nodes.sort()
            self._step_result.levels = levels
            self._step_result.visited_count = len(self._step_visited)
            visited_count = len(self._step_visited)
            total = self._step_result.total_nodes
            self._step_result.reachability_pct = (
                visited_count / total * 100 if total > 0 else 0.0
            )
            self._step_result.spread_depth = max_level
            return {
                "done": True,
                "message": "BFS traversal complete.",
                "queue": [],
                "visited": sorted(self._step_visited),
                "bfs_order": self._step_result.bfs_order,
                "levels": levels,
                "reachability_pct": round(self._step_result.reachability_pct, 1),
                "spread_depth": max_level,
                "first_informed": self._step_result.bfs_order[0] if self._step_result.bfs_order else None,
                "last_informed": self._step_result.bfs_order[-1] if self._step_result.bfs_order else None,
            }

        # Dequeue next node
        current = self._step_queue.popleft()
        current_level = self._step_level_map[current]
        self._step_result.bfs_order.append(current)

        neighbors = self.graph.get_neighbors(current)
        newly_enqueued = []

        for neighbor in neighbors:
            if neighbor not in self._step_visited:
                self._step_visited.add(neighbor)
                self._step_level_map[neighbor] = current_level + 1
                self._step_queue.append(neighbor)
                newly_enqueued.append(neighbor)

        done = len(self._step_queue) == 0
        if done:
            self._step_done = True

        message = (
            f"Dequeued '{current}' (Level {current_level}). "
            f"Enqueued neighbors: {newly_enqueued if newly_enqueued else 'none'}."
        )

        return {
            "done": done,
            "node": current,
            "level": current_level,
            "neighbors": neighbors,
            "enqueued": newly_enqueued,
            "queue": list(self._step_queue),
            "visited": sorted(self._step_visited),
            "bfs_order": list(self._step_result.bfs_order),
            "message": message,
        }

    def is_step_done(self) -> bool:
        """Return True if the current step-by-step BFS session is complete."""
        return self._step_done or (
            self._step_initialized and not self._step_queue
        )

    def reset_step(self) -> None:
        """Reset step-by-step state."""
        self._step_queue = None
        self._step_visited = None
        self._step_level_map = None
        self._step_result = None
        self._step_initialized = False
        self._step_done = False
