# Information Spread Analysis Using Graph and BFS

> **University Final Project — Data Structures Course**
> 
> Demonstrates practical implementation of **Graph (Adjacency List)**, **Queue**, and **Breadth-First Search (BFS)** through a real-world simulation of information propagation in a social network.

---

## Table of Contents

1. [Project Description](#1-project-description)
2. [System Architecture](#2-system-architecture)
3. [Data Structure Explanation](#3-data-structure-explanation)
4. [BFS Algorithm Explanation](#4-bfs-algorithm-explanation)
5. [Flowchart](#5-flowchart)
6. [Use Cases](#6-use-cases)
7. [Complexity Analysis](#7-complexity-analysis)
8. [Installation Guide](#8-installation-guide)
9. [User Guide](#9-user-guide)
10. [Presentation Notes](#10-presentation-notes)

---

## 1. Project Description

This project simulates how **information (news, rumors, viruses)** propagates through a social network modeled as an **undirected graph**.

### Core Idea

- **Each person** = a **Node** in the graph  
- **Each friendship/connection** = an **Edge** between nodes  
- **Information spread** = BFS traversal starting from a source node

The system visualizes the spread **level-by-level**, exactly the way BFS explores a graph — making it a perfect educational demonstration of the algorithm.

### Key Objectives

| Objective | Implementation |
|-----------|---------------|
| Model a social network | Undirected Graph with Adjacency List |
| Efficient traversal | BFS using `collections.deque` |
| Level-by-level spread | BFS level tracking (`level_map`) |
| Real-time visualization | Cytoscape.js + animated node colors |
| Queue visibility | Live queue panel updates |

---

## 2. System Architecture

```
project/
│
├── app.py              ← Flask REST API (Controller + Entry Point)
├── graph_engine.py     ← Graph data structure (Model)
├── bfs_engine.py       ← BFS algorithm (Model)
├── requirements.txt    ← Python dependencies
│
├── static/
│   ├── css/
│   │   └── style.css   ← Dark academic UI design system
│   └── js/
│       ├── graph.js    ← Cytoscape.js rendering + node state colors
│       ├── bfs.js      ← BFS animation controller (auto-play + step-by-step)
│       └── ui.js       ← DOM event handlers, panels, notifications
│
└── templates/
    └── index.html      ← Single-page dashboard (View)
```

### MVC-Like Pattern

```
User ──→ index.html (View)
              │
              ▼
        ui.js / bfs.js / graph.js  (Controller logic in browser)
              │  fetch() JSON API
              ▼
         app.py Flask (Controller + Router)
              │
              ▼
  graph_engine.py + bfs_engine.py  (Model — pure Python, no NetworkX)
```

### API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Serve main dashboard |
| GET | `/api/graph` | Get full graph state |
| POST | `/api/graph/node` | Add a node |
| DELETE | `/api/graph/node/<id>` | Delete a node |
| POST | `/api/graph/edge` | Add an edge |
| DELETE | `/api/graph/edge` | Delete an edge |
| POST | `/api/graph/random` | Generate random graph |
| POST | `/api/graph/load` | Load graph from JSON |
| GET | `/api/graph/save` | Export graph as JSON |
| DELETE | `/api/graph/reset` | Clear all nodes/edges |
| POST | `/api/bfs/run` | Run full BFS |
| POST | `/api/bfs/init` | Init step-by-step BFS |
| GET | `/api/bfs/next` | Advance one BFS step |

---

## 3. Data Structure Explanation

### 3.1 Graph (Adjacency List)

```python
# graph_engine.py — core data structure
adjacency_list: dict[str, list[str]]
```

**How it works:**
- Each **key** = a node ID (person's name)
- Each **value** = a Python `list` of neighbor node IDs

**Example:**
```
Alice → [Bob, Carol, Dave]
Bob   → [Alice, Eve, Frank]
Carol → [Alice, Grace]
Dave  → [Alice, Hank]
```

**Why Adjacency List (not Matrix)?**

| Criterion | Adjacency List | Adjacency Matrix |
|-----------|---------------|-----------------|
| Space | **O(V + E)** | O(V²) |
| Add edge | **O(1)** | O(1) |
| Get neighbors | **O(degree)** | O(V) |
| Best for | **Sparse graphs** | Dense graphs |

Social networks are **sparse** (each person has far fewer connections than total people), making adjacency lists the optimal choice.

### 3.2 Queue (`collections.deque`)

```python
from collections import deque

queue: deque = deque()
queue.append(node)      # Enqueue → O(1)
node = queue.popleft()  # Dequeue → O(1)
```

The Queue enforces **FIFO (First In, First Out)** order — the defining characteristic of BFS.

> **Why `deque` and not `list`?**  
> `list.pop(0)` is **O(n)** because all elements shift.  
> `deque.popleft()` is **O(1)** — a true doubly-linked list.

### 3.3 Visited Set

```python
visited: set[str] = set()
```

Prevents revisiting nodes. Set membership check is **O(1)** average.

---

## 4. BFS Algorithm Explanation

### Algorithm Steps

```
BFS(Graph G, source s):
  1. queue   ← deque([s])     ← enqueue source
  2. visited ← {s}            ← mark source visited
  3. level[s] ← 0             ← source is at level 0

  4. while queue is not empty:
  5.   u ← queue.popleft()    ← FIFO dequeue
  6.   for each neighbor v of adjacency_list[u]:
  7.     if v not in visited:
  8.       visited.add(v)     ← mark visited
  9.       level[v] ← level[u] + 1
 10.       queue.append(v)    ← enqueue for later processing
```

### BFS Guarantees

- Every reachable node is visited **exactly once**
- Nodes are visited in **non-decreasing order of distance** from source
- Produces the **shortest path** (minimum hops) to every reachable node

### Information Spread Analogy

| BFS Concept | Social Network Analogy |
|-------------|----------------------|
| Source node | Person who first receives the news |
| Level 0 | Source (knows immediately) |
| Level 1 | Direct friends of source |
| Level 2 | Friends-of-friends |
| Level k | Nodes k hops from source |
| Visited set | People who have heard the news |
| Queue | People waiting to "spread" the news to their friends |

---

## 5. Flowchart

```
         ┌─────────────────────────┐
         │     START               │
         │  User selects source    │
         └────────────┬────────────┘
                      │
         ┌────────────▼────────────┐
         │  Initialize BFS:        │
         │  queue ← [source]       │
         │  visited ← {source}     │
         │  level[source] ← 0      │
         └────────────┬────────────┘
                      │
         ┌────────────▼────────────┐
         │   Is queue empty?       │──YES──→ [ DONE ]
         └────────────┬────────────┘
                      │ NO
         ┌────────────▼────────────┐
         │  u ← queue.popleft()   │
         │  Animate: u = INFORMED  │
         └────────────┬────────────┘
                      │
         ┌────────────▼────────────┐
         │  For each neighbor v    │
         │  of u in adj_list[u]:   │
         └────────────┬────────────┘
                      │
         ┌────────────▼────────────┐
         │  v already visited?     │──YES──→ [ Skip ]──┐
         └────────────┬────────────┘                    │
                      │ NO                              │
         ┌────────────▼────────────┐                    │
         │  visited.add(v)         │                    │
         │  level[v] ← level[u]+1  │                    │
         │  queue.append(v)        │                    │
         │  Animate: v = QUEUED    │                    │
         └────────────┬────────────┘                    │
                      └────────────────────────────────┘
                      │
                      └──→ (back to "Is queue empty?")
```

---

## 6. Use Cases

### Use Case 1: Simulate Information Spread

**Actor:** Student / Presenter  
**Goal:** Demonstrate BFS propagation from a chosen person  
**Steps:**
1. Select source node from dropdown
2. Click **Start Simulation**
3. Watch nodes turn orange (queued) → green (informed) level by level

### Use Case 2: Step-by-Step Analysis

**Actor:** Student learning BFS  
**Steps:**
1. Select source node
2. Click **Initialize BFS** in sidebar
3. Click **Next Step** repeatedly
4. Observe Queue panel updating at each step
5. Read Step Log for human-readable description

### Use Case 3: Manage the Graph

**Actor:** Instructor or student  
**Actions:**
- Add new person (node) with any name
- Connect two people (add edge)
- Remove connections (delete edge)
- Remove a person entirely (delete node)
- Auto-generate random social network

### Use Case 4: Save and Reload Scenarios

**Actor:** Student preparing a demo  
**Steps:**
1. Build a graph manually or randomly
2. Click **Save to JSON** — downloads a `.json` file
3. Later: Click **Load from JSON** to restore it
4. Present the same graph to the class

---

## 7. Complexity Analysis

### BFS Time Complexity: O(V + E)

| Operation | Cost | Reason |
|-----------|------|--------|
| Enqueue source | O(1) | Single deque.append |
| Dequeue per node | O(1) × V | Each node dequeued once |
| Scan neighbors | O(degree(u)) | BFS examines each edge twice total |
| **Total** | **O(V + E)** | V dequeues + E neighbor checks |

### BFS Space Complexity: O(V)

| Structure | Space | Reason |
|-----------|-------|--------|
| Queue | O(V) | Holds at most V nodes |
| Visited set | O(V) | Each node recorded once |
| Level map | O(V) | One entry per node |
| **Total** | **O(V)** | Dominated by V-sized structures |

### Graph Storage: O(V + E)

The adjacency list stores V node entries plus a total of 2E neighbor references (each undirected edge stored twice).

---

## 8. Installation Guide

### Prerequisites

- Python 3.10 or higher
- pip (Python package installer)
- Internet connection (for Cytoscape.js CDN)

### Steps

```bash
# 1. Navigate to the project folder
cd bfs-social-network

# 2. (Recommended) Create a virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the Flask server
python app.py

# 5. Open in browser
# http://127.0.0.1:5000
```

### Requirements

```
flask>=3.0.0
```

All other logic (Graph, BFS, Queue) is implemented in pure Python standard library. No NetworkX. No external graph packages.

---

## 9. User Guide

### Header

| Control | Action |
|---------|--------|
| **Source Node** dropdown | Select which node BFS starts from |
| **▶ Start Simulation** | Run full BFS auto-play animation |
| **⏸ Pause** | Pause the animation mid-way |
| **▶ Resume** | Continue from where it paused |
| **↺ Reset** | Stop and reset all node colors |

### Left Sidebar

| Section | Controls |
|---------|----------|
| **Add Node** | Type name → click `+` or press Enter |
| **Add Edge** | Enter source & target → click **Add Edge** |
| **Delete Edge** | Enter source & target → click **Remove Edge** |
| **Generate Random Graph** | Set node count (5–30) + density (0.1–0.9) → **Generate** |
| **Graph File** | Save / Load / Clear |
| **Step-by-Step BFS** | Initialize then advance one step at a time |
| **Animation Speed** | Drag slider (100ms = fastest, 2.5s = slowest) |

### Right Panel Tabs

| Tab | Content |
|-----|---------|
| **📊 Analytics** | Stat cards, reachability bar, BFS order, level breakdown, step log |
| **📭 Queue** | Live queue visualization, operation log |
| **🔗 Adj. List** | Real-time adjacency list display |
| **⚙ Complexity** | Time/space complexity analysis and BFS pseudocode |

### Canvas Controls

| Button | Action |
|--------|--------|
| `+` | Zoom in |
| `−` | Zoom out |
| `⊡` | Fit graph to screen |
| `⟳` | Re-run force-directed layout |

**Tip:** Click any node on the canvas to set it as the source node.

---

## 10. Presentation Notes

### Key Talking Points

1. **Graph as Social Network**  
   *"We represent each person as a Node. Two people knowing each other is an Edge. This forms an Adjacency List where each person maps to their list of friends."*

2. **BFS as Information Spread**  
   *"BFS explores level-by-level, which is exactly how news spreads — first your direct friends hear it, then their friends, and so on."*

3. **The Queue's Role**  
   *"The Queue is the brain of BFS. It tells us who to process next. Since it's FIFO, we always finish one level before moving to the next."*

4. **Node Colors**  
   - 🔵 Blue = Source (original news owner)  
   - ⚫ Gray = Uninformed (hasn't heard yet)  
   - 🟠 Orange = In Queue (discovered, will hear soon)  
   - 🟢 Green = Informed (has received the news)

5. **Complexity**  
   *"BFS is O(V + E) — we touch each node once and each edge twice. This is optimal for graph traversal."*

### Demo Flow (5 minutes)

1. Show the pre-loaded social network graph (8 nodes, natural connections)
2. Select "Alice" as source, run **Start Simulation** at medium speed
3. Point out the Queue panel — show dequeue/enqueue
4. Point out the Level breakdown: Level 0 = Alice, Level 1 = her friends, etc.
5. Reset → switch to **Step-by-Step** mode → click Next Step slowly and explain each step
6. Show the Adjacency List tab — explain the data structure
7. Show the Complexity tab — explain O(V+E) and O(V)
8. Generate a random graph with 15 nodes → re-run BFS to show scalability

### What This Demonstrates

- ✅ Graph data structure (Adjacency List)
- ✅ Queue (FIFO, `collections.deque`, O(1) operations)
- ✅ BFS traversal (manual implementation, no NetworkX)
- ✅ Level-by-level exploration
- ✅ Real-world application (social network simulation)
- ✅ Algorithmic complexity analysis
- ✅ Interactive visualization for presentations
