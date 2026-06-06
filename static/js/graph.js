/**
 * graph.js
 * --------
 * Cytoscape.js initialization and graph rendering engine.
 *
 * Responsibilities:
 *   - Initialize Cytoscape instance with styles
 *   - Translate graph state from API into Cytoscape elements
 *   - Apply BFS state colors (uninformed / queued / informed / source)
 *   - Provide helpers: addNode, removeNode, addEdge, removeEdge
 *   - Emit events: graph:changed
 */

'use strict';

/* ── Cytoscape Instance ─────────────────────────────────────────────────── */

/**
 * Global Cytoscape instance, initialized when DOM is ready.
 * @type {cytoscape.Core}
 */
let cy;

/**
 * Tracks BFS state per node: 'uninformed' | 'queued' | 'informed' | 'source'
 * @type {Map<string, string>}
 */
const nodeStateMap = new Map();

/** Initialize Cytoscape and load the initial graph from the API. */
function initGraph() {
  cy = cytoscape({
    container: document.getElementById('cy'),

    // ── Visual Style Sheet ──────────────────────────────────────────────
    style: [
      {
        selector: 'node',
        style: {
          'label':              'data(label)',
          'background-color':   '#64748b',
          'color':              '#f0f4ff',
          'font-family':        'Inter, sans-serif',
          'font-size':          '11px',
          'font-weight':        '600',
          'text-valign':        'center',
          'text-halign':        'center',
          'text-outline-width': '2px',
          'text-outline-color': 'rgba(0,0,0,0.6)',
          'width':              '42px',
          'height':             '42px',
          'border-width':       '2px',
          'border-color':       'rgba(255,255,255,0.15)',
          'transition-property': 'background-color, border-color, width, height',
          'transition-duration': '0.35s',
          'transition-timing-function': 'ease',
          'z-index':            10,
        }
      },
      {
        selector: 'node[?isSource]',
        style: {
          'background-color': '#63b3ed',
          'border-color':     '#90cdf4',
          'border-width':     '3px',
          'width':            '50px',
          'height':           '50px',
          'font-size':        '12px',
        }
      },
      {
        selector: 'node.state-queued',
        style: {
          'background-color': '#ed8936',
          'border-color':     '#f6ad55',
          'border-width':     '2.5px',
        }
      },
      {
        selector: 'node.state-informed',
        style: {
          'background-color': '#48bb78',
          'border-color':     '#68d391',
          'border-width':     '2.5px',
        }
      },
      {
        selector: 'node.state-source',
        style: {
          'background-color': '#63b3ed',
          'border-color':     '#90cdf4',
          'border-width':     '3px',
          'width':            '50px',
          'height':           '50px',
        }
      },
      {
        selector: 'node.state-current',
        style: {
          'border-width':  '4px',
          'border-color':  '#f6c90e',
          'width':         '52px',
          'height':        '52px',
        }
      },
      {
        selector: 'node:selected',
        style: {
          'border-width': '3px',
          'border-color': '#b794f4',
        }
      },
      {
        selector: 'edge',
        style: {
          'width':              2,
          'line-color':         'rgba(148,163,184,0.25)',
          'curve-style':        'bezier',
          'opacity':            0.9,
          'target-arrow-shape': 'triangle',
          'target-arrow-color': 'rgba(148,163,184,0.25)',
          'arrow-scale':        1.2,
          'transition-property': 'line-color, target-arrow-color, width, opacity',
          'transition-duration': '0.35s',
        }
      },
      {
        selector: 'edge.edge-active',
        style: {
          'line-color': '#48bb78',
          'target-arrow-color': '#48bb78',
          'width':      3,
          'opacity':    1,
        }
      },
      {
        selector: 'edge.edge-queued',
        style: {
          'line-color': '#ed8936',
          'target-arrow-color': '#ed8936',
          'width':      2.5,
        }
      },
      {
        selector: 'edge:selected',
        style: {
          'line-color': '#b794f4',
          'target-arrow-color': '#b794f4',
          'width':      3,
        }
      }
    ],

    // ── Layout ──────────────────────────────────────────────────────────
    layout: {
      name:        'cose',
      animate:     true,
      animationDuration: 500,
      nodeRepulsion: () => 8000,
      idealEdgeLength: () => 150,
      edgeElasticity: () => 32,
      nodeOverlap: 20,
      gravity:     0.1,
      fit:         true,
      padding:     40,
      randomize:   false,
    },

    // ── Interaction ──────────────────────────────────────────────────────
    userZoomingEnabled:    true,
    userPanningEnabled:    true,
    boxSelectionEnabled:   false,
    autoungrabify:         false,
    minZoom:               0.1,
    maxZoom:               4.0,
    zoom:                  0.5,
  });

  // Context: show node ID in tooltip on hover
  cy.on('mouseover', 'node', function(event) {
    const node = event.target;
    node.style('cursor', 'grab');
  });

  cy.on('mouseout', 'node', function(event) {
    event.target.style('cursor', 'default');
  });

  // Notify UI when user taps a node (for selecting source)
  cy.on('tap', 'node', function(event) {
    const nodeId = event.target.id();
    document.dispatchEvent(new CustomEvent('graph:nodeTapped', { detail: { nodeId } }));
  });

  // Load initial data
  loadGraphFromAPI();
}

/* ── API Communication ──────────────────────────────────────────────────── */

/** Fetch graph data from the backend and render it. */
async function loadGraphFromAPI() {
  try {
    const res  = await fetch('/api/graph');
    const json = await res.json();
    if (json.success) {
      renderGraph(json.data);
    }
  } catch (e) {
    console.error('Failed to load graph:', e);
  }
}

/* ── Rendering ──────────────────────────────────────────────────────────── */

/**
 * Replace the Cytoscape graph with data from the API response.
 *
 * @param {Object} graphData - { nodes: [{id, metadata}], edges: [{source, target}] }
 */
function renderGraph(graphData) {
  nodeStateMap.clear();

  const elements = [];

  // Nodes
  for (const n of graphData.nodes) {
    elements.push({
      group: 'nodes',
      data: {
        id:    n.id,
        label: n.metadata?.label || n.id,
      }
    });
    nodeStateMap.set(n.id, 'uninformed');
  }

  // Edges
  for (const e of graphData.edges) {
    elements.push({
      group: 'edges',
      data: {
        id:     `${e.source}__${e.target}`,
        source: e.source,
        target: e.target,
      }
    });
  }

  cy.elements().remove();
  cy.add(elements);

  // Run layout after adding
  runLayout();

  // Update empty graph message
  toggleEmptyMessage(graphData.nodes.length === 0);

  // Notify other modules
  document.dispatchEvent(new CustomEvent('graph:changed', { detail: graphData }));
}

/** Run Cytoscape force-directed layout. */
function runLayout(animate = true) {
  cy.layout({
    name:        'cose',
    animate,
    animationDuration: animate ? 600 : 0,
    nodeRepulsion: () => 8000,
    idealEdgeLength: () => 150,
    edgeElasticity: () => 32,
    nodeOverlap: 20,
    gravity:     0.1,
    fit:         true,
    padding:     40,
    randomize:   false,
  }).run();
}

/** Show/hide the "Graph is empty" placeholder message. */
function toggleEmptyMessage(isEmpty) {
  const msg = document.getElementById('empty-graph-msg');
  if (msg) {
    msg.style.display = isEmpty ? 'block' : 'none';
  }
}

/* ── Node State Colors (BFS Animation) ──────────────────────────────────── */

/**
 * Apply a BFS visual state to a node.
 *
 * @param {string} nodeId
 * @param {'uninformed'|'queued'|'informed'|'source'|'current'} state
 */
function setNodeState(nodeId, state) {
  const node = cy.getElementById(nodeId);
  if (!node || node.length === 0) return;

  // Remove all state classes first
  node.removeClass('state-queued state-informed state-source state-current');
  node.removeData('isSource');

  switch (state) {
    case 'source':
      node.addClass('state-source');
      node.data('isSource', true);
      break;
    case 'queued':
      node.addClass('state-queued');
      break;
    case 'informed':
      node.addClass('state-informed');
      break;
    case 'current':
      node.addClass('state-informed state-current');
      break;
    case 'uninformed':
    default:
      // No class needed — default style applies
      break;
  }

  nodeStateMap.set(nodeId, state);
}

/**
 * Highlight the edges connected to a node as "active".
 *
 * @param {string} nodeId - The node whose edges to highlight.
 * @param {string} edgeClass - CSS class to apply ('edge-active' | 'edge-queued')
 */
function highlightEdges(nodeId, edgeClass) {
  cy.edges().removeClass('edge-active edge-queued');
  cy.getElementById(nodeId)
    .connectedEdges()
    .addClass(edgeClass);
}

/** Reset all nodes and edges to their default (uninformed) visual state. */
function resetNodeStates() {
  cy.nodes().removeClass('state-queued state-informed state-source state-current');
  cy.nodes().removeData('isSource');
  cy.edges().removeClass('edge-active edge-queued');
  nodeStateMap.clear();
  cy.nodes().forEach(n => nodeStateMap.set(n.id(), 'uninformed'));
}

/* ── Graph Mutation Helpers ──────────────────────────────────────────────── */

/**
 * Add a node to Cytoscape immediately (optimistic UI update).
 * The actual source of truth is always the backend.
 *
 * @param {string} nodeId
 */
function addNodeToGraph(nodeId) {
  if (cy.getElementById(nodeId).length > 0) return;
  cy.add({ group: 'nodes', data: { id: nodeId, label: nodeId } });
  nodeStateMap.set(nodeId, 'uninformed');
  toggleEmptyMessage(false);
}

/**
 * Remove a node from Cytoscape immediately.
 *
 * @param {string} nodeId
 */
function removeNodeFromGraph(nodeId) {
  cy.getElementById(nodeId).remove();
  nodeStateMap.delete(nodeId);
  toggleEmptyMessage(cy.nodes().length === 0);
}

/**
 * Add an edge to Cytoscape immediately.
 *
 * @param {string} source
 * @param {string} target
 */
function addEdgeToGraph(source, target) {
  const edgeId = `${source}__${target}`;
  const edgeIdRev = `${target}__${source}`;
  if (
    cy.getElementById(edgeId).length > 0 ||
    cy.getElementById(edgeIdRev).length > 0
  ) return;
  cy.add({ group: 'edges', data: { id: edgeId, source, target } });
}

/**
 * Remove an edge from Cytoscape.
 *
 * @param {string} source
 * @param {string} target
 */
function removeEdgeFromGraph(source, target) {
  const edgeId    = `${source}__${target}`;
  const edgeIdRev = `${target}__${source}`;
  cy.getElementById(edgeId).remove();
  cy.getElementById(edgeIdRev).remove();
}

/* ── Viewport Helpers ───────────────────────────────────────────────────── */

/** Fit the graph into the viewport. */
function fitGraph() {
  cy.fit(undefined, 50);
}

/** Reset zoom to 1:1. */
function resetZoom() {
  cy.zoom(1);
  cy.center();
}

/** Zoom in by 20%. */
function zoomIn() {
  cy.zoom(cy.zoom() * 1.2);
  cy.center();
}

/** Zoom out by 20%. */
function zoomOut() {
  cy.zoom(cy.zoom() / 1.2);
  cy.center();
}

/* ── Source Node Highlight ─────────────────────────────────────────────── */

/**
 * Visually mark the source node before BFS starts.
 *
 * @param {string} nodeId
 */
function markSourceNode(nodeId) {
  resetNodeStates();
  setNodeState(nodeId, 'source');
}

/* ── Export ─────────────────────────────────────────────────────────────── */

// All functions are global (attached to window implicitly via script tag).
// Graph module is initialized by calling initGraph() from ui.js on DOMContentLoaded.
