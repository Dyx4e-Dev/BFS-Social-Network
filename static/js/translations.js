/**
 * translations.js
 * ---------------
 * Bilingual dictionary for the BFS Social Network Simulator.
 * Supports: English (en) | Bahasa Indonesia (id)
 *
 * Usage:
 *   t('key')               → returns translated string for current language
 *   t('key', {val: 'X'})  → returns string with {val} replaced by 'X'
 *   setLanguage('id')      → switch to Indonesian
 *   setLanguage('en')      → switch to English
 *   getCurrentLang()       → returns 'en' or 'id'
 */

'use strict';

/* ── Active language (persisted to localStorage) ────────────────────────── */
let _currentLang = localStorage.getItem('bfs_lang') || 'en';

/** Return current active language code. */
function getCurrentLang() { return _currentLang; }

/**
 * Translate a key into the current language.
 * @param {string} key
 * @param {Object} [vars] - Optional substitution vars, e.g. {name:'Alice'}
 * @returns {string}
 */
function t(key, vars = {}) {
  const dict = TRANSLATIONS[_currentLang] || TRANSLATIONS['en'];
  let str = dict[key] ?? TRANSLATIONS['en'][key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, v);
  }
  return str;
}

/**
 * Switch the active language and re-render all i18n DOM elements.
 * @param {'en'|'id'} lang
 */
function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) return;
  _currentLang = lang;
  localStorage.setItem('bfs_lang', lang);
  applyTranslations();
  updateLangToggleButton();
  document.documentElement.lang = lang;
}

/** Apply all translations to elements bearing data-i18n attributes. */
function applyTranslations() {
  // data-i18n → textContent
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  // data-i18n-html → innerHTML (for rich text blocks)
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    el.innerHTML = t(key);
  });

  // data-i18n-placeholder → placeholder attribute
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });

  // data-i18n-title → title attribute
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
  });

  // data-i18n-label → aria-label attribute
  document.querySelectorAll('[data-i18n-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-label');
    el.setAttribute('aria-label', t(key));
  });

  // Update queue empty text if queue is currently empty
  const queueTrack = document.getElementById('queue-track');
  if (queueTrack && queueTrack.querySelector('.queue-empty')) {
    queueTrack.querySelector('.queue-empty').textContent = t('queue.empty');
  }

  // Update page title
  document.title = t('page.title');
}

/** Update the language toggle button appearance. */
function updateLangToggleButton() {
  const btn = document.getElementById('btn-lang-toggle');
  if (!btn) return;
  const isEn = _currentLang === 'en';
  btn.innerHTML = isEn
    ? '<span class="lang-flag">🇮🇩</span> ID'
    : '<span class="lang-flag">🇬🇧</span> EN';
  btn.title = isEn ? 'Switch to Bahasa Indonesia' : 'Switch to English';
}

/* ── Translation Dictionary ─────────────────────────────────────────────── */
const TRANSLATIONS = {

  /* ════════════════════════════════════════════
     ENGLISH
  ════════════════════════════════════════════ */
  en: {
    'page.title': 'BFS Social Network Simulator — Data Structures Project',

    /* Header */
    'header.title':          'BFS Social Network Simulator',
    'header.subtitle':       'Data Structures · Graph · BFS · Queue · Adjacency List',
    'header.source-label':   'Source Node:',
    'header.btn-simulate':   '▶ Start Simulation',
    'header.btn-pause':      '⏸ Pause',
    'header.btn-resume':     '▶ Resume',
    'header.btn-reset':      '↺ Reset',

    /* Sidebar — Add Node */
    'sidebar.add-node.title':       'Add Node',
    'sidebar.add-node.label':       'Node Name / ID',
    'sidebar.add-node.placeholder': 'e.g. Alice',
    'sidebar.add-node.btn-title':   'Add node',

    /* Sidebar — Add Edge */
    'sidebar.add-edge.title':   'Add Edge',
    'sidebar.add-edge.from':    'From',
    'sidebar.add-edge.to':      'To',
    'sidebar.add-edge.from-ph': 'Source node',
    'sidebar.add-edge.to-ph':   'Target node',
    'sidebar.add-edge.btn':     '＋ Add Edge',

    /* Sidebar — Delete Edge */
    'sidebar.del-edge.title':   'Delete Edge',
    'sidebar.del-edge.from':    'From',
    'sidebar.del-edge.to':      'To',
    'sidebar.del-edge.from-ph': 'Source node',
    'sidebar.del-edge.to-ph':   'Target node',
    'sidebar.del-edge.btn':     '✕ Remove Edge',

    /* Sidebar — Random Graph */
    'sidebar.random.title':         'Generate Random Graph',
    'sidebar.random.nodes-label':   'Nodes',
    'sidebar.random.density-label': 'Density',
    'sidebar.random.btn':           '⚡ Generate',

    /* Sidebar — File */
    'sidebar.file.title': 'Graph File',
    'sidebar.file.save':  '💾 Save to JSON',
    'sidebar.file.load':  '📂 Load from JSON',
    'sidebar.file.clear': '🗑 Clear Graph',

    /* Sidebar — Step BFS */
    'sidebar.step.title': 'Step-by-Step BFS',
    'sidebar.step.init':  '⚙ Initialize BFS',
    'sidebar.step.next':  '⏭ Next Step',

    /* Sidebar — Speed */
    'sidebar.speed.title': 'Animation Speed',
    'sidebar.speed.label': 'Delay',
    'sidebar.speed.fast':  'Fast (100ms)',
    'sidebar.speed.slow':  'Slow (2.5s)',

    /* Sidebar — Legend */
    'sidebar.legend.title':       'Node State Legend',
    'sidebar.legend.source':      'Source node (BFS start)',
    'sidebar.legend.uninformed':  'Uninformed (not yet reached)',
    'sidebar.legend.queued':      'Queued (discovered, waiting)',
    'sidebar.legend.informed':    'Informed (visited / spread)',

    /* Canvas */
    'canvas.empty.title':     'Graph is empty',
    'canvas.empty.desc':      'Add nodes using the sidebar, or generate a random graph.',
    'canvas.btn.zoom-in':     'Zoom in',
    'canvas.btn.zoom-out':    'Zoom out',
    'canvas.btn.fit':         'Fit to screen',
    'canvas.btn.relayout':    'Re-run layout',

    /* Right panel tabs */
    'tab.analytics':   'Analytics',
    'tab.queue':       'Queue',
    'tab.adj':         'Adj. List',
    'tab.complexity':  'Complexity',

    /* Analytics tab */
    'analytics.total-nodes':       'Total Nodes (V)',
    'analytics.total-edges':       'Total Edges (E)',
    'analytics.visited':           'Nodes Informed',
    'analytics.depth':             'Spread Depth',
    'analytics.reachability':      'Network Reachability',
    'analytics.first':             'First Informed',
    'analytics.last':              'Last Informed',
    'analytics.bfs-order-chips':   'BFS Traversal Order',
    'analytics.bfs-order-text':    'BFS Order (sequence)',
    'analytics.levels.title':      'Spread Levels',
    'analytics.log.title':         'BFS Step Log',
    'analytics.centrality.title':  'Centrality Analytics',
    'analytics.influencer':        'Top Influencer (In-Degree)',
    'analytics.active':            'Most Active (Out-Degree)',

    /* Queue tab */
    'queue.current':      'Current Queue State',
    'queue.fifo':         'Queue (FIFO)',
    'queue.dequeue-lbl':  '← Dequeue (front)',
    'queue.enqueue-lbl':  'Enqueue (back) →',
    'queue.empty':        'Queue is empty',
    'queue.how.title':    '🗂 How the Queue Works',
    'queue.how.body':     'BFS uses a <strong style="color:var(--accent-blue)">FIFO Queue</strong> (First In, First Out) to process nodes level-by-level.<br><br><span class="mono text-orange">enqueue(node)</span> → adds to the back<br><span class="mono text-green">dequeue()</span> → removes from the front<br><br>Implemented with <span class="mono text-accent">collections.deque</span> in Python for O(1) operations on both ends.',
    'queue.order.title':  'BFS Visit Order',
    'queue.log.title':    'Live Operation Log',

    /* Adjacency list tab */
    'adj.title':          'Adjacency List (Live)',
    'adj.header':         'Node → Neighbors',
    'adj.explain.title':  '📋 Adjacency List Structure',
    'adj.explain.body':   'Each node maps to a <strong style="color:var(--accent-blue)">list of its neighbors</strong>. This is the core data structure representing the graph.<br><br><span class="mono text-accent">adjacency_list: dict[str, list[str]]</span><br><br>✦ Space: <span class="mono text-gold">O(V + E)</span><br>✦ Add edge: <span class="mono text-gold">O(1)</span><br>✦ Get neighbors: <span class="mono text-gold">O(1)</span><br>✦ Find edge: <span class="mono text-gold">O(degree)</span>',
    'adj.nodes':          'Nodes (V)',
    'adj.edges':          'Edges (E)',

    /* Complexity tab */
    'complex.title':           'BFS Complexity Analysis',
    'complex.bfs.title':       '⏱ BFS Algorithm',
    'complex.time':            'Time Complexity',
    'complex.space':           'Space Complexity',
    'complex.bfs.note':        'V = number of nodes (vertices)\nE = number of edges\n\nTime: Each node is enqueued exactly once → O(V).\nEach edge is examined twice (once per endpoint) → O(E).\nTotal: O(V) + O(E) = O(V + E).\n\nSpace: The Queue holds at most V nodes at any time.\nThe Visited set holds at most V entries.\nTotal extra space: O(V).',
    'complex.graph.title':     '🗂 Graph (Adjacency List)',
    'complex.graph.storage':   'Storage',
    'complex.graph.add-node':  'Add node',
    'complex.graph.add-edge':  'Add edge',
    'complex.graph.del-node':  'Remove node',
    'complex.graph.neighbors': 'Get neighbors',
    'complex.queue.title':     '📭 Queue (collections.deque)',
    'complex.queue.enqueue':   'Enqueue',
    'complex.queue.dequeue':   'Dequeue',
    'complex.queue.peek':      'Peek (front)',
    'complex.queue.space':     'Space',
    'complex.queue.note':      "Python's collections.deque is a doubly-linked list providing O(1) appends and popleft operations — ideal for BFS. Using list.pop(0) would be O(n) and is avoided.",
    'complex.why.title':       '🔍 Why BFS?',
    'complex.why.note':        'BFS explores the graph level by level — exactly how information spreads through a social network. A person at distance d from the source receives information at "round" d.\n\nBFS guarantees the shortest path (minimum hops) between the source and any reachable node — perfect for modeling the earliest possible spread of information.',
    'complex.pseudo.title':    '📄 BFS Pseudocode',
    'complex.pseudo.code':     'BFS(Graph G, source s):\n  queue   ← deque([s])\n  visited ← {s}\n  level[s] ← 0\n\n  while queue is not empty:\n    u ← queue.popleft()    # dequeue\n\n    for each neighbor v of u:\n      if v not in visited:\n        visited.add(v)\n        level[v] ← level[u] + 1\n        queue.append(v)   # enqueue\n\n  return visited, level',

    /* Toast messages */
    'toast.select-source':  'Please select a source node.',
    'toast.bfs-complete':   'BFS complete! {pct}% of network informed.',
    'toast.paused':         'Simulation paused.',
    'toast.resumed':        'Simulation resumed.',
    'toast.reset':          'Simulation reset.',
    'toast.step-ready':     'Step-by-step mode ready. Press "Next Step" to advance.',
    'toast.step-done':      'Step-by-step BFS complete!',
    'toast.node-added':     'Node "{id}" added.',
    'toast.node-deleted':   'Node "{id}" deleted.',
    'toast.edge-added':     'Edge "{src}" ↔ "{tgt}" added.',
    'toast.edge-deleted':   'Edge "{src}" ↔ "{tgt}" deleted.',
    'toast.enter-node':     'Please enter a node name.',
    'toast.enter-edge':     'Both source and target are required.',
    'toast.graph-saved':    'Graph saved to JSON.',
    'toast.graph-loaded':   'Graph loaded from "{name}".',
    'toast.graph-cleared':  'Graph cleared.',
    'toast.graph-random':   'Random graph generated ({n} nodes).',
    'toast.invalid-json':   'Invalid JSON file.',
    'toast.network-error':  'Network error.',
    'toast.save-failed':    'Failed to save graph.',
    'toast.source-set':     'Source set to "{id}".',
    'toast.bfs-failed':     'BFS failed.',
    'toast.bfs-init-failed':'BFS initialization failed.',

    /* Step log messages */
    'log.init':    '▶ Source node "{node}" enqueued. BFS begins.',
    'log.dequeue': '⬅ Dequeued "{node}" (Level {level})',
    'log.enqueue': '→ Enqueued: [{nodes}]',
    'log.done':    '✓ BFS complete. {count} node(s) informed.',
    'log.complete':'✓ BFS complete.',

    /* Confirm dialogs */
    'confirm.delete-node': 'Delete node "{id}" and all its edges?',
    'confirm.clear-graph': 'Clear the entire graph? This cannot be undone.',

    /* Status badge */
    'status.idle':       'Idle',
    'status.simulating': 'Simulating…',
    'status.paused':     'Paused',
    'status.done':       'Complete',
    'status.step':       'Step Mode',

    /* Entity lists */
    'entity.no-nodes': 'No nodes',
    'entity.no-edges': 'No edges',
    'entity.no-graph': 'No nodes in graph',
  },

  /* ════════════════════════════════════════════
     BAHASA INDONESIA
  ════════════════════════════════════════════ */
  id: {
    'page.title': 'Simulator Penyebaran Informasi BFS — Proyek Struktur Data',

    /* Header */
    'header.title':        'Simulator Penyebaran Informasi BFS',
    'header.subtitle':     'Struktur Data · Graf · BFS · Antrian · Daftar Ketetanggaan',
    'header.source-label': 'Node Sumber:',
    'header.btn-simulate': '▶ Mulai Simulasi',
    'header.btn-pause':    '⏸ Jeda',
    'header.btn-resume':   '▶ Lanjut',
    'header.btn-reset':    '↺ Reset',

    /* Sidebar — Add Node */
    'sidebar.add-node.title':       'Tambah Node',
    'sidebar.add-node.label':       'Nama / ID Node',
    'sidebar.add-node.placeholder': 'cth. Budi',
    'sidebar.add-node.btn-title':   'Tambah node',

    /* Sidebar — Add Edge */
    'sidebar.add-edge.title':   'Tambah Edge (Hubungan)',
    'sidebar.add-edge.from':    'Dari',
    'sidebar.add-edge.to':      'Ke',
    'sidebar.add-edge.from-ph': 'Node asal',
    'sidebar.add-edge.to-ph':   'Node tujuan',
    'sidebar.add-edge.btn':     '＋ Tambah Edge',

    /* Sidebar — Delete Edge */
    'sidebar.del-edge.title':   'Hapus Edge',
    'sidebar.del-edge.from':    'Dari',
    'sidebar.del-edge.to':      'Ke',
    'sidebar.del-edge.from-ph': 'Node asal',
    'sidebar.del-edge.to-ph':   'Node tujuan',
    'sidebar.del-edge.btn':     '✕ Hapus Edge',

    /* Sidebar — Random Graph */
    'sidebar.random.title':         'Buat Graf Acak',
    'sidebar.random.nodes-label':   'Jumlah Node',
    'sidebar.random.density-label': 'Kepadatan',
    'sidebar.random.btn':           '⚡ Buat Graf',

    /* Sidebar — File */
    'sidebar.file.title': 'File Graf',
    'sidebar.file.save':  '💾 Simpan ke JSON',
    'sidebar.file.load':  '📂 Muat dari JSON',
    'sidebar.file.clear': '🗑 Hapus Semua',

    /* Sidebar — Step BFS */
    'sidebar.step.title': 'BFS Langkah demi Langkah',
    'sidebar.step.init':  '⚙ Inisialisasi BFS',
    'sidebar.step.next':  '⏭ Langkah Berikutnya',

    /* Sidebar — Speed */
    'sidebar.speed.title': 'Kecepatan Animasi',
    'sidebar.speed.label': 'Jeda',
    'sidebar.speed.fast':  'Cepat (100ms)',
    'sidebar.speed.slow':  'Lambat (2.5d)',

    /* Sidebar — Legend */
    'sidebar.legend.title':      'Keterangan Warna Node',
    'sidebar.legend.source':     'Node sumber (titik awal BFS)',
    'sidebar.legend.uninformed': 'Belum menerima informasi',
    'sidebar.legend.queued':     'Dalam antrian (sudah ditemukan)',
    'sidebar.legend.informed':   'Sudah menerima informasi',

    /* Canvas */
    'canvas.empty.title':  'Graf masih kosong',
    'canvas.empty.desc':   'Tambahkan node melalui sidebar, atau buat graf acak.',
    'canvas.btn.zoom-in':  'Perbesar',
    'canvas.btn.zoom-out': 'Perkecil',
    'canvas.btn.fit':      'Sesuaikan layar',
    'canvas.btn.relayout': 'Atur ulang tata letak',

    /* Right panel tabs */
    'tab.analytics':  'Analitik',
    'tab.queue':      'Antrian',
    'tab.adj':        'Ketetanggaan',
    'tab.complexity': 'Kompleksitas',

    /* Analytics tab */
    'analytics.total-nodes':     'Total Node (V)',
    'analytics.total-edges':     'Total Edge (E)',
    'analytics.visited':         'Node Terinformasi',
    'analytics.depth':           'Kedalaman Penyebaran',
    'analytics.reachability':    'Keterjangkauan Jaringan',
    'analytics.first':           'Pertama Tahu',
    'analytics.last':            'Terakhir Tahu',
    'analytics.bfs-order-chips': 'Urutan Kunjungan BFS',
    'analytics.bfs-order-text':  'Urutan BFS (teks)',
    'analytics.levels.title':    'Tingkat Penyebaran',
    'analytics.log.title':       'Log Langkah BFS',
    'analytics.centrality.title':'Analitik Sentralitas',
    'analytics.influencer':      'Influencer Utama (In-Degree)',
    'analytics.active':          'Paling Aktif (Out-Degree)',

    /* Queue tab */
    'queue.current':     'Status Antrian Saat Ini',
    'queue.fifo':        'Antrian (FIFO)',
    'queue.dequeue-lbl': '← Keluar (depan)',
    'queue.enqueue-lbl': 'Masuk (belakang) →',
    'queue.empty':       'Antrian kosong',
    'queue.how.title':   '🗂 Cara Kerja Antrian',
    'queue.how.body':    'BFS menggunakan <strong style="color:var(--accent-blue)">Antrian FIFO</strong> (First In, First Out) untuk memproses node per level.<br><br><span class="mono text-orange">enqueue(node)</span> → tambah ke belakang<br><span class="mono text-green">dequeue()</span> → ambil dari depan<br><br>Diimplementasikan dengan <span class="mono text-accent">collections.deque</span> di Python untuk operasi O(1) di kedua ujung.',
    'queue.order.title': 'Urutan Kunjungan BFS',
    'queue.log.title':   'Log Operasi Langsung',

    /* Adjacency list tab */
    'adj.title':         'Daftar Ketetanggaan (Real-time)',
    'adj.header':        'Node → Tetangga',
    'adj.explain.title': '📋 Struktur Daftar Ketetanggaan',
    'adj.explain.body':  'Setiap node memetakan ke <strong style="color:var(--accent-blue)">daftar tetangganya</strong>. Ini adalah struktur data inti yang merepresentasikan graf.<br><br><span class="mono text-accent">adjacency_list: dict[str, list[str]]</span><br><br>✦ Ruang: <span class="mono text-gold">O(V + E)</span><br>✦ Tambah edge: <span class="mono text-gold">O(1)</span><br>✦ Ambil tetangga: <span class="mono text-gold">O(1)</span><br>✦ Cari edge: <span class="mono text-gold">O(derajat)</span>',
    'adj.nodes':         'Node (V)',
    'adj.edges':         'Edge (E)',

    /* Complexity tab */
    'complex.title':           'Analisis Kompleksitas BFS',
    'complex.bfs.title':       '⏱ Algoritma BFS',
    'complex.time':            'Kompleksitas Waktu',
    'complex.space':           'Kompleksitas Ruang',
    'complex.bfs.note':        'V = jumlah node (simpul)\nE = jumlah edge (sisi)\n\nWaktu: Setiap node dimasukkan ke antrian tepat sekali → O(V).\nSetiap edge diperiksa dua kali (sekali per ujung) → O(E).\nTotal: O(V) + O(E) = O(V + E).\n\nRuang: Antrian menampung maksimal V node sekaligus.\nSet visited menampung maksimal V entri.\nTotal ruang tambahan: O(V).',
    'complex.graph.title':     '🗂 Graf (Daftar Ketetanggaan)',
    'complex.graph.storage':   'Penyimpanan',
    'complex.graph.add-node':  'Tambah node',
    'complex.graph.add-edge':  'Tambah edge',
    'complex.graph.del-node':  'Hapus node',
    'complex.graph.neighbors': 'Ambil tetangga',
    'complex.queue.title':     '📭 Antrian (collections.deque)',
    'complex.queue.enqueue':   'Masuk (enqueue)',
    'complex.queue.dequeue':   'Keluar (dequeue)',
    'complex.queue.peek':      'Lihat depan (peek)',
    'complex.queue.space':     'Ruang',
    'complex.queue.note':      'collections.deque Python adalah doubly-linked list yang memberikan append dan popleft O(1) — ideal untuk BFS. Menggunakan list.pop(0) akan O(n) dan harus dihindari.',
    'complex.why.title':       '🔍 Mengapa BFS?',
    'complex.why.note':        'BFS mengeksplorasi graf level demi level — persis seperti informasi menyebar di jaringan sosial. Seseorang dengan jarak d dari sumber menerima informasi pada "putaran" ke-d.\n\nBFS menjamin jalur terpendek (lompatan minimum) antara sumber dan setiap node yang dapat dijangkau — sempurna untuk memodelkan penyebaran informasi sedini mungkin.',
    'complex.pseudo.title':    '📄 Pseudocode BFS',
    'complex.pseudo.code':     'BFS(Graf G, sumber s):\n  antrian    ← deque([s])\n  dikunjungi ← {s}\n  level[s]   ← 0\n\n  selama antrian tidak kosong:\n    u ← antrian.popleft()      # keluarkan\n\n    untuk setiap tetangga v dari u:\n      jika v belum dikunjungi:\n        dikunjungi.tambah(v)\n        level[v] ← level[u] + 1\n        antrian.tambah(v)      # masukkan\n\n  kembalikan dikunjungi, level',

    /* Toast messages */
    'toast.select-source':   'Harap pilih node sumber.',
    'toast.bfs-complete':    'BFS selesai! {pct}% jaringan terinformasi.',
    'toast.paused':          'Simulasi dijeda.',
    'toast.resumed':         'Simulasi dilanjutkan.',
    'toast.reset':           'Simulasi direset.',
    'toast.step-ready':      'Mode langkah demi langkah siap. Tekan "Langkah Berikutnya".',
    'toast.step-done':       'BFS langkah demi langkah selesai!',
    'toast.node-added':      'Node "{id}" berhasil ditambahkan.',
    'toast.node-deleted':    'Node "{id}" berhasil dihapus.',
    'toast.edge-added':      'Edge "{src}" ↔ "{tgt}" berhasil ditambahkan.',
    'toast.edge-deleted':    'Edge "{src}" ↔ "{tgt}" berhasil dihapus.',
    'toast.enter-node':      'Harap masukkan nama node.',
    'toast.enter-edge':      'Node asal dan tujuan harus diisi.',
    'toast.graph-saved':     'Graf berhasil disimpan ke JSON.',
    'toast.graph-loaded':    'Graf berhasil dimuat dari "{name}".',
    'toast.graph-cleared':   'Graf berhasil dihapus.',
    'toast.graph-random':    'Graf acak dibuat ({n} node).',
    'toast.invalid-json':    'File JSON tidak valid.',
    'toast.network-error':   'Terjadi kesalahan jaringan.',
    'toast.save-failed':     'Gagal menyimpan graf.',
    'toast.source-set':      'Sumber diatur ke "{id}".',
    'toast.bfs-failed':      'BFS gagal dijalankan.',
    'toast.bfs-init-failed': 'Inisialisasi BFS gagal.',

    /* Step log messages */
    'log.init':    '▶ Node sumber "{node}" dimasukkan. BFS dimulai.',
    'log.dequeue': '⬅ Dikeluarkan "{node}" (Level {level})',
    'log.enqueue': '→ Dimasukkan: [{nodes}]',
    'log.done':    '✓ BFS selesai. {count} node terinformasi.',
    'log.complete':'✓ BFS selesai.',

    /* Confirm dialogs */
    'confirm.delete-node': 'Hapus node "{id}" beserta semua edge-nya?',
    'confirm.clear-graph': 'Hapus seluruh graf? Tindakan ini tidak dapat dibatalkan.',

    /* Status badge */
    'status.idle':       'Siap',
    'status.simulating': 'Mensimulasi…',
    'status.paused':     'Dijeda',
    'status.done':       'Selesai',
    'status.step':       'Mode Langkah',

    /* Entity lists */
    'entity.no-nodes': 'Belum ada node',
    'entity.no-edges': 'Belum ada edge',
    'entity.no-graph': 'Tidak ada node dalam graf',
  }
};
