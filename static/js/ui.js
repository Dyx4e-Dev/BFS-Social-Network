/**
 * ui.js
 * -----
 * UI Controller — wires all DOM events to graph and BFS logic.
 */

'use strict';

/* ── Initialization ──────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initTranslations(); // From translations.js
  initGraph();        // From graph.js — sets up Cytoscape
  bindSidebarEvents();
  bindSimulationEvents();
  bindGraphToolEvents();
  bindTabEvents();
  bindSpeedSlider();
  bindCanvasButtons();
  bindNodeTapEvent();
  populateInitialStats();
});

function initTranslations() {
  // Apply initial language
  setLanguage(getCurrentLang());

  // Bind toggle button
  const btn = document.getElementById('btn-lang-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = getCurrentLang();
      const next = current === 'en' ? 'id' : 'en';
      setLanguage(next);
    });
  }
}

/* ── Listen for graph changes ────────────────────────────────────────────── */

document.addEventListener('graph:changed', (e) => {
  const graphData = e.detail;
  updateSourceSelect(graphData.nodes || []);
  updateAdjacencyListPanel(graphData.adjacency_list || {});
  updateNodeEdgeLists(graphData.nodes || [], graphData.edges || []);
  updateStatCards(graphData);
});

/* ── Sidebar: Node Operations ────────────────────────────────────────────── */

function bindSidebarEvents() {
  // Add Node
  document.getElementById('btn-add-node').addEventListener('click', async () => {
    const input = document.getElementById('input-node-id');
    const nodeId = (input.value || '').trim();
    if (!nodeId) { showToast(t('toast.enter-node'), 'warning'); return; }

    try {
      const res  = await fetch('/api/graph/node', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: nodeId }),
      });
      const json = await res.json();

      if (json.success) {
        input.value = '';
        renderGraph(json.data.graph);
        showToast(t('toast.node-added', { id: nodeId }), 'success');
      } else {
        showToast(json.error, 'error');
      }
    } catch (e) {
      showToast(t('toast.network-error'), 'error');
    }
  });

  // Allow Enter key to add node
  document.getElementById('input-node-id').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-add-node').click();
  });

  // Add Edge
  document.getElementById('btn-add-edge').addEventListener('click', async () => {
    const source = (document.getElementById('input-edge-source').value || '').trim();
    const target = (document.getElementById('input-edge-target').value || '').trim();
    if (!source || !target) { showToast(t('toast.enter-edge'), 'warning'); return; }

    try {
      const res  = await fetch('/api/graph/edge', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ source, target }),
      });
      const json = await res.json();

      if (json.success) {
        document.getElementById('input-edge-source').value = '';
        document.getElementById('input-edge-target').value = '';
        renderGraph(json.data.graph);
        showToast(t('toast.edge-added', { src: source, tgt: target }), 'success');
      } else {
        showToast(json.error, 'error');
      }
    } catch (e) {
      showToast(t('toast.network-error'), 'error');
    }
  });

  // Delete edge
  document.getElementById('btn-del-edge').addEventListener('click', async () => {
    const source = (document.getElementById('input-del-edge-source').value || '').trim();
    const target = (document.getElementById('input-del-edge-target').value || '').trim();
    if (!source || !target) { showToast(t('toast.enter-edge'), 'warning'); return; }

    try {
      const res  = await fetch('/api/graph/edge', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ source, target }),
      });
      const json = await res.json();

      if (json.success) {
        document.getElementById('input-del-edge-source').value = '';
        document.getElementById('input-del-edge-target').value = '';
        renderGraph(json.data.graph);
        showToast(t('toast.edge-deleted', { src: source, tgt: target }), 'success');
      } else {
        showToast(json.error, 'error');
      }
    } catch (e) {
      showToast(t('toast.network-error'), 'error');
    }
  });
}

/* ── Simulation Controls ─────────────────────────────────────────────────── */

function bindSimulationEvents() {
  document.getElementById('btn-simulate').addEventListener('click', () => {
    const source = getSelectedSource();
    runFullBFS(source);
  });

  document.getElementById('btn-pause').addEventListener('click', pauseBFS);
  document.getElementById('btn-resume').addEventListener('click', resumeBFS);
  document.getElementById('btn-reset-sim').addEventListener('click', stopBFS);

  document.getElementById('btn-step-init').addEventListener('click', () => {
    const source = getSelectedSource();
    initStepBFS(source);
  });

  document.getElementById('btn-step-next').addEventListener('click', stepNextBFS);
}

function getSelectedSource() {
  return (document.getElementById('source-select')?.value || '').trim();
}

/* ── Graph Tool Events ───────────────────────────────────────────────────── */

function bindGraphToolEvents() {
  // Random graph
  document.getElementById('btn-random').addEventListener('click', async () => {
    const nodeCount = parseInt(document.getElementById('random-nodes')?.value || 10);
    const density   = parseFloat(document.getElementById('random-density')?.value || 0.35);

    showLoadingOverlay(true);
    try {
      const res  = await fetch('/api/graph/random', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nodes: nodeCount, density }),
      });
      const json = await res.json();

      if (json.success) {
        renderGraph(json.data.graph);
        stopBFS();
        showToast(t('toast.graph-random', { n: nodeCount }), 'success');
      } else {
        showToast(json.error, 'error');
      }
    } catch (e) {
      showToast(t('toast.network-error'), 'error');
    } finally {
      showLoadingOverlay(false);
    }
  });

  // Save graph
  document.getElementById('btn-save').addEventListener('click', async () => {
    try {
      const res  = await fetch('/api/graph/save');
      const json = await res.json();

      if (json.success) {
        const blob = new Blob(
          [JSON.stringify(json.data, null, 2)],
          { type: 'application/json' }
        );
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `graph_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(t('toast.graph-saved'), 'success');
      }
    } catch (e) {
      showToast(t('toast.save-failed'), 'error');
    }
  });

  // Load graph
  document.getElementById('btn-load').addEventListener('click', () => {
    document.getElementById('load-file-input').click();
  });

  document.getElementById('load-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res  = await fetch('/api/graph/load', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        renderGraph(json.data.graph);
        stopBFS();
        showToast(t('toast.graph-loaded', { name: file.name }), 'success');
      } else {
        showToast(json.error, 'error');
      }
    } catch (err) {
      showToast(t('toast.invalid-json'), 'error');
    }

    e.target.value = '';
  });

  // Reset graph
  document.getElementById('btn-clear').addEventListener('click', async () => {
    if (!confirm(t('confirm.clear-graph'))) return;

    try {
      const res  = await fetch('/api/graph/reset', { method: 'DELETE' });
      const json = await res.json();

      if (json.success) {
        renderGraph(json.data.graph);
        stopBFS();
        showToast(t('toast.graph-cleared'), 'info');
      }
    } catch (e) {
      showToast(t('toast.network-error'), 'error');
    }
  });
}

/* ── Tab Switching ───────────────────────────────────────────────────────── */

function bindTabEvents() {
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;
      document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const content = document.getElementById(targetId);
      if (content) content.classList.add('active');
    });
  });
}

/* ── Speed Slider ────────────────────────────────────────────────────────── */

function bindSpeedSlider() {
  const slider  = document.getElementById('speed-slider');
  const display = document.getElementById('speed-display');
  if (!slider) return;

  slider.addEventListener('input', () => {
    const ms = parseInt(slider.value);
    setAnimationSpeed(ms);
    if (display) {
      display.textContent = ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
    }
  });

  slider.dispatchEvent(new Event('input'));
}

/* ── Canvas Buttons ──────────────────────────────────────────────────────── */

function bindCanvasButtons() {
  document.getElementById('btn-zoom-in')?.addEventListener('click',  zoomIn);
  document.getElementById('btn-zoom-out')?.addEventListener('click', zoomOut);
  document.getElementById('btn-fit')?.addEventListener('click',      fitGraph);
  document.getElementById('btn-relayout')?.addEventListener('click', () => runLayout(true));
}

function bindNodeTapEvent() {
  document.addEventListener('graph:nodeTapped', (e) => {
    const { nodeId } = e.detail;
    const select = document.getElementById('source-select');
    if (select) {
      select.value = nodeId;
      showToast(t('toast.source-set', { id: nodeId }), 'info');
    }
  });
}

/* ── Source Select Update ────────────────────────────────────────────────── */

function updateSourceSelect(nodes) {
  const select = document.getElementById('source-select');
  if (!select) return;

  const current = select.value;
  select.innerHTML = '';

  if (nodes.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = t('entity.no-nodes');
    select.appendChild(opt);
    return;
  }

  nodes.forEach(n => {
    const opt = document.createElement('option');
    opt.value       = n.id;
    opt.textContent = n.id;
    if (n.id === current) opt.selected = true;
    select.appendChild(opt);
  });

  if (nodes.some(n => n.id === current)) {
    select.value = current;
  }

  updateEdgeSelects(nodes);
}

function updateEdgeSelects(nodes) {
  const lists = ['edge-node-list', 'del-edge-node-list'];
  lists.forEach(listId => {
    let dl = document.getElementById(listId);
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = listId;
      document.body.appendChild(dl);
    }
    dl.innerHTML = '';
    nodes.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n.id;
      dl.appendChild(opt);
    });
  });

  ['input-edge-source', 'input-edge-target'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('list', 'edge-node-list');
  });
  ['input-del-edge-source', 'input-del-edge-target'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('list', 'del-edge-node-list');
  });
}

/* ── Adjacency List Panel ────────────────────────────────────────────────── */

function updateAdjacencyListPanel(adjList) {
  const body = document.getElementById('adj-list-body');
  if (!body) return;

  body.innerHTML = '';
  const entries = Object.entries(adjList);

  if (entries.length === 0) {
    body.innerHTML = `<span class="entity-empty">${t('entity.no-graph')}</span>`;
    return;
  }

  entries.forEach(([node, neighbors]) => {
    const row = document.createElement('div');
    row.className = 'adj-row';

    const nodeSpan = document.createElement('span');
    nodeSpan.className = 'adj-node';
    nodeSpan.textContent = node;

    const arrow = document.createElement('span');
    arrow.className = 'adj-arrow';
    arrow.textContent = '→';

    const neighborWrap = document.createElement('div');
    neighborWrap.className = 'adj-neighbors';

    if (neighbors.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'adj-empty-node';
      empty.textContent = '∅';
      neighborWrap.appendChild(empty);
    } else {
      neighbors.forEach(nb => {
        const chip = document.createElement('span');
        chip.className = 'adj-neighbor-chip';
        chip.textContent = nb;
        neighborWrap.appendChild(chip);
      });
    }

    row.appendChild(nodeSpan);
    row.appendChild(arrow);
    row.appendChild(neighborWrap);
    body.appendChild(row);
  });
}

/* ── Node/Edge Quick-Delete Lists ────────────────────────────────────────── */

function updateNodeEdgeLists(nodes, edges) {
  const nodeList = document.getElementById('node-list');
  if (nodeList) {
    nodeList.innerHTML = '';
    if (nodes.length === 0) {
      nodeList.innerHTML = `<span class="entity-empty">${t('entity.no-nodes')}</span>`;
    } else {
      nodes.forEach(n => {
        const item = createEntityItem(n.id, '✕', async () => {
          if (!confirm(t('confirm.delete-node', { id: n.id }))) return;
          await deleteNode(n.id);
        });
        nodeList.appendChild(item);
      });
    }
  }

  const edgeList = document.getElementById('edge-list');
  if (edgeList) {
    edgeList.innerHTML = '';
    if (edges.length === 0) {
      edgeList.innerHTML = `<span class="entity-empty">${t('entity.no-edges')}</span>`;
    } else {
      edges.forEach(e => {
        const label = `${e.source} ↔ ${e.target}`;
        const item  = createEntityItem(label, '✕', async () => {
          await deleteEdge(e.source, e.target);
        });
        edgeList.appendChild(item);
      });
    }
  }
}

function createEntityItem(labelText, btnText, onDelete) {
  const item = document.createElement('div');
  item.className = 'entity-item';

  const label = document.createElement('span');
  label.className = 'entity-label';
  label.textContent = labelText;
  label.title = labelText;

  const del = document.createElement('button');
  del.className = 'entity-delete';
  del.textContent = btnText;
  del.addEventListener('click', onDelete);

  item.appendChild(label);
  item.appendChild(del);
  return item;
}

/* ── Node/Edge Delete Helpers ────────────────────────────────────────────── */

async function deleteNode(nodeId) {
  try {
    const res  = await fetch(`/api/graph/node/${encodeURIComponent(nodeId)}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      renderGraph(json.data.graph);
      stopBFS();
      showToast(t('toast.node-deleted', { id: nodeId }), 'success');
    } else {
      showToast(json.error, 'error');
    }
  } catch (e) {
    showToast(t('toast.network-error'), 'error');
  }
}

async function deleteEdge(source, target) {
  try {
    const res  = await fetch('/api/graph/edge', {
      method:  'POST', // Or DELETE if mapped
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ source, target }),
    });
    const json = await res.json();
    if (json.success) {
      renderGraph(json.data.graph);
      stopBFS();
      showToast(t('toast.edge-deleted', { src: source, tgt: target }), 'success');
    } else {
      showToast(json.error, 'error');
    }
  } catch (e) {
    showToast(t('toast.network-error'), 'error');
  }
}

/* ── Status Badge ────────────────────────────────────────────────────────── */

function updateStatusBadge(type, text) {
  const badge = document.getElementById('status-badge');
  const span = document.getElementById('status-text');
  if (!badge || !span) return;

  badge.className = `status-badge ${type === 'done' ? 'done' : type === 'running' ? 'running' : 'idle'}`;
  span.textContent = text;
}

/* ── Stat Cards Update ───────────────────────────────────────────────────── */

function updateStatCards(graphData) {
  const nodeCount = (graphData.nodes || []).length;
  const edgeCount = (graphData.edges || []).length;

  ['stat-total-nodes', 'adj-stat-nodes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = nodeCount;
  });
  ['stat-total-edges', 'adj-stat-edges'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = edgeCount;
  });

  const analytics = graphData.analytics || { in_degree: {}, out_degree: {} };

  let topInfluencer = '—';
  let maxIn = -1;
  for (const [node, deg] of Object.entries(analytics.in_degree)) {
    if (deg > maxIn) { maxIn = deg; topInfluencer = node; }
  }
  if (maxIn > 0) topInfluencer = `${topInfluencer} (${maxIn})`;

  let mostActive = '—';
  let maxOut = -1;
  for (const [node, deg] of Object.entries(analytics.out_degree)) {
    if (deg > maxOut) { maxOut = deg; mostActive = node; }
  }
  if (maxOut > 0) mostActive = `${mostActive} (${maxOut})`;

  const elInfluencer = document.getElementById('stat-top-influencer');
  if (elInfluencer) elInfluencer.textContent = topInfluencer;

  const elActive = document.getElementById('stat-most-active');
  if (elActive) elActive.textContent = mostActive;
}

function populateInitialStats() {
  updateStatusBadge('idle', t('status.idle'));
}

/* ── Loading Overlay ─────────────────────────────────────────────────────── */

function showLoadingOverlay(visible) {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.toggle('visible', visible);
  }
}

/* ── Toast Notifications ─────────────────────────────────────────────────── */

const TOAST_ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
};

function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || 'ℹ'}</span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}
