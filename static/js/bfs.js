/**
 * bfs.js
 * ------
 * BFS Simulation Controller
 */

'use strict';

/* ── State ───────────────────────────────────────────────────────────────── */

const BFSState = {
  idle:     'idle',
  running:  'running',
  paused:   'paused',
  stepping: 'stepping',
  done:     'done',
};

let bfsStatus        = BFSState.idle;
let autoPlayTimer    = null;
let autoPlaySpeed    = 800;
let stepEvents       = [];
let stepEventIndex   = 0;
let currentBFSResult = null;
let bfsOrderSoFar    = [];
let stepLogCounter   = 0;

/* ── Public API ─────────────────────────────────────────────────────────── */

async function runFullBFS(sourceNode) {
  if (bfsStatus === BFSState.running) return;
  if (!sourceNode) { showToast(t('toast.select-source'), 'warning'); return; }

  setBFSStatus(BFSState.running);
  resetBFSDisplay();
  markSourceNode(sourceNode);
  updateStatusBadge('running', t('status.simulating'));

  try {
    const res  = await fetch('/api/bfs/run', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ source: sourceNode }),
    });
    const json = await res.json();

    if (!json.success) {
      showToast(json.error || t('toast.bfs-failed'), 'error');
      setBFSStatus(BFSState.idle);
      updateStatusBadge('idle', t('status.idle'));
      return;
    }

    currentBFSResult = json.data;
    stepEvents       = json.data.step_events || [];
    stepEventIndex   = 0;
    bfsOrderSoFar    = [];
    stepLogCounter   = 0;

    updateAnalytics(json.data, false);
    animateNextEvent();

  } catch (e) {
    console.error('BFS run error:', e);
    showToast(t('toast.network-error'), 'error');
    setBFSStatus(BFSState.idle);
  }
}

function animateNextEvent() {
  if (bfsStatus !== BFSState.running) return;

  if (stepEventIndex >= stepEvents.length) {
    finishBFSAnimation();
    return;
  }

  const event = stepEvents[stepEventIndex++];
  applyStepEvent(event);

  autoPlayTimer = setTimeout(animateNextEvent, autoPlaySpeed);
}

function applyStepEvent(event) {
  stepLogCounter++;

  switch (event.type) {
    case 'enqueue':
      setNodeState(event.node, 'source');
      updateQueueDisplay(event.queue_state, null);
      logStep(stepLogCounter, 'init', t('log.init', { node: event.node }));
      break;

    case 'dequeue': {
      setNodeState(event.node, 'current');
      highlightEdges(event.node, 'edge-active');
      bfsOrderSoFar.push(event.node);
      updateQueueDisplay(event.queue_state, event.node);
      updateBFSOrderDisplay(bfsOrderSoFar);
      logStep(stepLogCounter, 'dequeue', t('log.dequeue', { node: event.node, level: event.level }));

      setTimeout(() => {
        if (event.node !== (currentBFSResult?.source)) {
          setNodeState(event.node, 'informed');
        }
      }, autoPlaySpeed * 0.4);
      break;
    }

    case 'enqueue_batch':
      for (const neighbor of event.newly_enqueued) {
        setNodeState(neighbor, 'queued');
      }
      updateQueueDisplay(event.queue_state, null);
      if (event.newly_enqueued.length > 0) {
        logStep(stepLogCounter, 'enqueue', t('log.enqueue', { nodes: event.newly_enqueued.join(', ') }));
      }
      break;
  }

  syncLevelDisplay();
}

function finishBFSAnimation() {
  setBFSStatus(BFSState.done);

  if (currentBFSResult) {
    for (const node of currentBFSResult.bfs_order) {
      if (node === currentBFSResult.source) {
        setNodeState(node, 'source');
      } else {
        setNodeState(node, 'informed');
      }
    }
    cy.edges().removeClass('edge-active edge-queued');

    updateQueueDisplay([], null);
    updateBFSOrderDisplay(currentBFSResult.bfs_order);
    updateLevelDisplay(currentBFSResult.levels);
    updateAnalytics(currentBFSResult, true);
    updateStatusBadge('done', t('status.done'));
    logStep(++stepLogCounter, 'done', t('log.done', { count: currentBFSResult.visited_count }));
    showToast(t('toast.bfs-complete', { pct: currentBFSResult.reachability_pct }), 'success');
  }
}

/* ── Step-by-Step Mode ──────────────────────────────────────────────────── */

async function initStepBFS(sourceNode) {
  if (!sourceNode) { showToast(t('toast.select-source'), 'warning'); return; }

  resetBFSDisplay();
  markSourceNode(sourceNode);
  bfsOrderSoFar  = [];
  stepLogCounter = 0;

  try {
    const res  = await fetch('/api/bfs/init', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ source: sourceNode }),
    });
    const json = await res.json();

    if (!json.success) {
      showToast(json.error || t('toast.bfs-init-failed'), 'error');
      return;
    }

    setBFSStatus(BFSState.stepping);
    updateStatusBadge('running', t('status.step'));

    const data = json.data;
    setNodeState(sourceNode, 'source');
    updateQueueDisplay(data.queue, null);
    logStep(++stepLogCounter, 'init', t('log.init', { node: sourceNode }));
    showToast(t('toast.step-ready'), 'info');

    const btn = document.getElementById('btn-step-next');
    if (btn) btn.disabled = false;
    const btnDone = document.getElementById('btn-step-done-msg');
    if (btnDone) btnDone.classList.add('hidden');

  } catch (e) {
    console.error('BFS init error:', e);
    showToast(t('toast.network-error'), 'error');
  }
}

async function stepNextBFS() {
  if (bfsStatus !== BFSState.stepping) return;

  try {
    const res  = await fetch('/api/bfs/next');
    const json = await res.json();

    if (!json.success) {
      showToast(json.error || 'Step failed.', 'error');
      return;
    }

    const data = json.data;
    stepLogCounter++;

    if (data.done && !data.node) {
      finishStepMode(data);
      return;
    }

    setNodeState(data.node, 'current');
    highlightEdges(data.node, 'edge-active');
    bfsOrderSoFar.push(data.node);

    for (const enqueued of (data.enqueued || [])) {
      setNodeState(enqueued, 'queued');
    }

    updateQueueDisplay(data.queue, data.node);
    updateBFSOrderDisplay(bfsOrderSoFar);
    syncLevelDisplay();

    logStep(stepLogCounter, 'dequeue', t('log.dequeue', { node: data.node, level: data.level }));

    if (data.enqueued && data.enqueued.length > 0) {
      logStep(++stepLogCounter, 'enqueue', t('log.enqueue', { nodes: data.enqueued.join(', ') }));
    }

    setTimeout(() => {
      if (bfsOrderSoFar.indexOf(data.node) === 0) {
        setNodeState(data.node, 'source');
      } else {
        setNodeState(data.node, 'informed');
      }
    }, 200);

    if (data.done) {
      finishStepMode(data);
    }

  } catch (e) {
    console.error('BFS step error:', e);
    showToast(t('toast.network-error'), 'error');
  }
}

function finishStepMode(data) {
  setBFSStatus(BFSState.done);
  updateStatusBadge('done', t('status.done'));

  for (const node of (data.bfs_order || bfsOrderSoFar)) {
    if (node === (data.bfs_order?.[0] || bfsOrderSoFar[0])) {
      setNodeState(node, 'source');
    } else {
      setNodeState(node, 'informed');
    }
  }

  cy.edges().removeClass('edge-active edge-queued');
  updateQueueDisplay([], null);

  if (data.levels) updateLevelDisplay(data.levels);
  if (data.bfs_order) updateBFSOrderDisplay(data.bfs_order);

  const analyticsData = {
    source:           bfsOrderSoFar[0] || '',
    bfs_order:        data.bfs_order || bfsOrderSoFar,
    levels:           data.levels || [],
    total_nodes:      data.total_nodes || cy.nodes().length,
    visited_count:    data.visited_count || bfsOrderSoFar.length,
    reachability_pct: data.reachability_pct || 0,
    spread_depth:     data.spread_depth || 0,
    first_informed:   (data.bfs_order || bfsOrderSoFar)[0] || '',
    last_informed:    (data.bfs_order || bfsOrderSoFar).at(-1) || '',
  };
  updateAnalytics(analyticsData, true);

  logStep(++stepLogCounter, 'done', t('log.complete'));
  showToast(t('toast.step-done'), 'success');

  const btn = document.getElementById('btn-step-next');
  if (btn) btn.disabled = true;
}

/* ── Playback Controls ──────────────────────────────────────────────────── */

function pauseBFS() {
  if (bfsStatus !== BFSState.running) return;
  clearTimeout(autoPlayTimer);
  setBFSStatus(BFSState.paused);
  updateStatusBadge('running', t('status.paused'));
  showToast(t('toast.paused'), 'info');
}

function resumeBFS() {
  if (bfsStatus !== BFSState.paused) return;
  setBFSStatus(BFSState.running);
  updateStatusBadge('running', t('status.simulating'));
  animateNextEvent();
  showToast(t('toast.resumed'), 'info');
}

function stopBFS() {
  clearTimeout(autoPlayTimer);
  setBFSStatus(BFSState.idle);
  resetBFSDisplay();
  updateStatusBadge('idle', t('status.idle'));
  showToast(t('toast.reset'), 'info');
}

function setAnimationSpeed(ms) {
  autoPlaySpeed = Math.max(100, Math.min(2500, ms));
}

/* ── Display Updaters ───────────────────────────────────────────────────── */

function resetBFSDisplay() {
  resetNodeStates();
  updateQueueDisplay([], null);
  updateBFSOrderDisplay([]);
  updateLevelDisplay([]);
  clearStepLog();
  clearAnalytics();
  stepEvents     = [];
  stepEventIndex = 0;
  bfsOrderSoFar  = [];
  stepLogCounter = 0;
}

function updateQueueDisplay(queueItems, justDequeued) {
  const track = document.getElementById('queue-track');
  const countBadge = document.getElementById('queue-count');
  if (!track) return;

  track.innerHTML = '';

  if (!queueItems || queueItems.length === 0) {
    track.innerHTML = `<span class="queue-empty">${t('queue.empty')}</span>`;
    if (countBadge) countBadge.textContent = '0';
    return;
  }

  if (countBadge) countBadge.textContent = queueItems.length;

  queueItems.forEach((item, idx) => {
    if (idx > 0) {
      const arrow = document.createElement('span');
      arrow.className = 'queue-arrow';
      arrow.textContent = '→';
      track.appendChild(arrow);
    }

    const chip = document.createElement('span');
    chip.className = 'queue-item';
    chip.textContent = item;
    if (item === justDequeued) {
      chip.style.opacity = '0.4';
    }
    track.appendChild(chip);
  });
}

function updateBFSOrderDisplay(order) {
  ['bfs-order-chips', 'bfs-order-chips-queue'].forEach(containerId => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    order.forEach((node, idx) => {
      const chip = document.createElement('span');
      chip.className = 'bfs-order-chip';
      chip.innerHTML = `<span class="chip-index">${idx + 1}.</span>${node}`;
      container.appendChild(chip);
    });
  });

  const srcLog  = document.getElementById('step-log');
  const dstLog  = document.getElementById('step-log-queue');
  if (srcLog && dstLog) {
    dstLog.innerHTML = srcLog.innerHTML;
  }
}

function updateLevelDisplay(levels) {
  const container = document.getElementById('levels-display');
  if (!container) return;

  container.innerHTML = '';
  levels.forEach((levelNodes, idx) => {
    const row = document.createElement('div');
    row.className = 'level-row';

    const badge = document.createElement('span');
    badge.className = `level-badge ${idx === 0 ? 'level-0' : 'level-other'}`;
    badge.textContent = `L${idx}`;

    const pills = document.createElement('div');
    pills.className = 'level-nodes';

    levelNodes.forEach(node => {
      const pill = document.createElement('span');
      pill.className = 'node-pill informed';
      pill.textContent = node;
      pills.appendChild(pill);
    });

    row.appendChild(badge);
    row.appendChild(pills);
    container.appendChild(row);
  });
}

function syncLevelDisplay() {
  if (!currentBFSResult) return;

  const visitedSet = new Set(bfsOrderSoFar);
  const partialLevels = currentBFSResult.levels.map(
    levelNodes => levelNodes.filter(n => visitedSet.has(n))
  ).filter(l => l.length > 0);

  updateLevelDisplay(partialLevels);
}

function updateAnalytics(data, complete) {
  setText('stat-total-nodes',    data.total_nodes     ?? '—');
  setText('stat-total-edges',    cy.edges().length    ?? '—');
  setText('stat-visited',        complete ? data.visited_count  : '—');
  setText('stat-depth',          complete ? data.spread_depth   : '—');
  setText('stat-first-informed', complete ? data.first_informed : '—');
  setText('stat-last-informed',  complete ? data.last_informed  : '—');

  const orderEl = document.getElementById('stat-bfs-order');
  if (orderEl && complete) {
    orderEl.textContent = data.bfs_order?.join(' → ') || '—';
  }

  const pct = complete ? (data.reachability_pct ?? 0) : 0;
  const fill = document.getElementById('reach-bar-fill');
  const label = document.getElementById('reach-pct-label');
  if (fill)  fill.style.width  = `${pct}%`;
  if (label) label.textContent = complete ? `${pct}%` : '—';
}

function clearAnalytics() {
  const ids = [
    'stat-total-nodes', 'stat-total-edges', 'stat-visited',
    'stat-depth', 'stat-first-informed', 'stat-last-informed',
  ];
  ids.forEach(id => setText(id, '—'));

  const orderEl = document.getElementById('stat-bfs-order');
  if (orderEl) orderEl.textContent = '—';

  const fill  = document.getElementById('reach-bar-fill');
  const label = document.getElementById('reach-pct-label');
  if (fill)  fill.style.width  = '0%';
  if (label) label.textContent = '—';

  const container = document.getElementById('levels-display');
  if (container) container.innerHTML = '';
}

/* ── Step Log ────────────────────────────────────────────────────────────── */

function logStep(index, type, message) {
  const log = document.getElementById('step-log');
  if (!log) return;

  const entry = document.createElement('div');
  entry.className = `step-log-entry ${type}`;
  entry.innerHTML = `<span class="step-log-index">${index}</span>${message}`;

  log.insertBefore(entry, log.firstChild);

  while (log.children.length > 100) {
    log.removeChild(log.lastChild);
  }
}

function clearStepLog() {
  const log = document.getElementById('step-log');
  if (log) log.innerHTML = '';
  stepLogCounter = 0;
}

/* ── Internal Helpers ────────────────────────────────────────────────────── */

function setBFSStatus(status) {
  bfsStatus = status;
  updateSimulationButtons(status);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateSimulationButtons(status) {
  const btnRun    = document.getElementById('btn-simulate');
  const btnPause  = document.getElementById('btn-pause');
  const btnResume = document.getElementById('btn-resume');
  const btnReset  = document.getElementById('btn-reset-sim');
  const btnStep   = document.getElementById('btn-step-init');
  const btnNext   = document.getElementById('btn-step-next');

  if (btnRun)    btnRun.disabled    = (status === BFSState.running || status === BFSState.stepping);
  if (btnPause)  btnPause.disabled  = (status !== BFSState.running);
  if (btnResume) btnResume.disabled = (status !== BFSState.paused);
  if (btnReset)  btnReset.disabled  = (status === BFSState.idle);
  if (btnStep)   btnStep.disabled   = (status === BFSState.running || status === BFSState.stepping);
  if (btnNext)   btnNext.disabled   = (status !== BFSState.stepping);
}

function getBFSStatus() {
  return bfsStatus;
}
