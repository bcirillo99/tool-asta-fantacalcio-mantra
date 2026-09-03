// ════════════════════════════════════════════════════════════════
// TABELLONE — tutti i giocatori per ruolo, da spuntare durante l'asta
// (equivalente interattivo dell'output di crea_riassunti.py)
// ════════════════════════════════════════════════════════════════

// Ordine colonne: difensivo → offensivo (come crea_riassunti.py).
const BOARD_ORDER = ["Por","B","Dd","Ds","Dc","E","M","C","T","W","A","Pc"];
const BOARD_LABELS = {
  Por:"Portieri", B:"Braccetti", Dd:"Terz. Dx", Ds:"Terz. Sx",
  Dc:"Dif. Centrali", E:"Esterni", M:"Mediani", C:"Centrocamp.",
  T:"Trequart.", W:"Ali / Fant.", A:"Attaccanti", Pc:"Punte",
};

// ── stato "preso da altri" ────────────────────────────────────────────────────
let taken = [];
const takenKey = p => `${p.Nome}|${p.Squadra}|${p.RM}`;
function loadTaken() { try { taken = JSON.parse(localStorage.getItem("fc_taken")) || []; } catch(e) { taken = []; } }
function saveTaken() { localStorage.setItem("fc_taken", JSON.stringify(taken)); }

// ── stato "obiettivo" (modalità punta) ───────────────────────────────────────
let targets = [];
const targetKey = p => `${p.Nome}|${p.Squadra}|${p.RM}`;
function loadTargets() { try { targets = JSON.parse(localStorage.getItem("fc_targets")) || []; } catch(e) { targets = []; } }
function saveTargets() { localStorage.setItem("fc_targets", JSON.stringify(targets)); }

let targetMode = false;

const isTaken  = p => taken.includes(takenKey(p));
const isMine   = p => squad.some(sp => samePlayer(sp.player, p));
const isTarget = p => targets.includes(targetKey(p));

function toggleTarget(p) {
  const k = targetKey(p);
  if (targets.includes(k)) targets = targets.filter(x => x !== k);
  else targets.push(k);
  saveTargets(); renderBoard();
}

function markTaken(p) { const k = takenKey(p); if (!taken.includes(k)) taken.push(k); saveTaken(); renderBoard(); }
function unmark(p)    { const k = takenKey(p); taken = taken.filter(x => x !== k); saveTaken(); renderBoard(); }
function removeFromSquad(p) {
  const i = squad.findIndex(sp => samePlayer(sp.player, p));
  if (i < 0) return;
  squad.splice(i, 1);
  save(); renderRoster(); renderPitch(); renderBoard();
}

// N per ruolo (configurabile, persistito)
function boardN() {
  const v = parseInt(document.getElementById("board-n").value);
  return (v && v > 0) ? v : 20;
}

// Layout: "rows" = sezioni verticali (scroll ↕) · "cols" = 12 colonne (scroll ↔)
let boardLayoutMode = localStorage.getItem("fc_boardLayout") || "rows";

// stat disponibili per l'ordinamento
const BOARD_STATS = {
  qta:        { label: "Qt.A",       get: p => p.QtaM || p.QtA || 0,           asc: false },
  fm:         { label: "FM",         get: p => parseFloat(p.Fm_2526)  || 0,     asc: false },
  mv:         { label: "Mv",         get: p => parseFloat(p.Mv_2526)  || 0,     asc: false },
  pv:         { label: "Pv",         get: p => parseFloat(p.Pv_2526)  || 0,     asc: false },
  xg:         { label: "xG",         get: p => parseFloat(p.xG)       || 0,     asc: false },
  xa:         { label: "xA",         get: p => parseFloat(p.xA)       || 0,     asc: false },
  gol:        { label: "Gol",        get: p => parseFloat(p.Gf_2526)  || 0,     asc: false },
  efficienza: { label: "Efficienza", get: p => parseFloat(p.Efficienza)|| 0,    asc: false },
  xgdiff:    { label: "xG_diff",    get: p => parseFloat(p.xG_diff)  ?? Infinity, asc: true },
};

function boardSortKey() { return localStorage.getItem("fc_boardSort") || "qta"; }

function playersForRole(role, N) {
  const key  = boardSortKey();
  const stat = BOARD_STATS[key] || BOARD_STATS.qta;
  return players
    .filter(p => primaryRole(p) === role)
    .sort((a, b) => {
      const va = stat.get(a), vb = stat.get(b);
      // chi non ha il dato va in fondo sempre
      const aNaN = va === 0 || va === Infinity || isNaN(va);
      const bNaN = vb === 0 || vb === Infinity || isNaN(vb);
      if (aNaN && bNaN) return 0;
      if (aNaN) return 1;
      if (bNaN) return -1;
      return stat.asc ? va - vb : vb - va;
    })
    .slice(0, N);
}

// ── render griglia ──────────────────────────────────────────────
function renderBoard() {
  const grid = document.getElementById("board-grid");
  if (!grid) return;
  grid.className = boardLayoutMode;   // "rows" | "cols"
  grid.innerHTML = "";

  if (!players.length) {
    grid.innerHTML = `<div class="board-empty">Carica prima la lista giocatori (pannello a sinistra).</div>`;
    return;
  }

  const N = boardN();
  BOARD_ORDER.forEach(role => {
    const list = playersForRole(role, N);
    if (!list.length) return;
    grid.appendChild(boardLayoutMode === "cols" ? buildCol(role, list)
                                                : buildSection(role, list));
  });
  const c = buildConsigli();
  if (c) grid.appendChild(c);
}

// vista 12 colonne (scroll orizzontale)
function buildCol(role, list) {
  const col = document.createElement("div");
  col.className = "bcol";
  col.style.setProperty("--rc", roleColor(role));
  col.innerHTML =
    `<div class="bcol-head">` +
      `<span class="bcol-name">${BOARD_LABELS[role]}</span>` +
      `<span class="bcol-role">${role}</span>` +
      `<span class="bcol-count">${list.length}</span>` +
    `</div>`;
  const body = document.createElement("div");
  body.className = "bcol-body";
  list.forEach(p => body.appendChild(makeRow(p)));
  col.appendChild(body);
  return col;
}

// vista verticale: sezioni impilate, header sticky, griglia multi-colonna
function buildSection(role, list) {
  const sec = document.createElement("div");
  sec.className = "bsec";
  sec.style.setProperty("--rc", roleColor(role));
  sec.innerHTML =
    `<div class="bsec-head">` +
      `<span class="bsec-name">${BOARD_LABELS[role].toUpperCase()}</span>` +
      `<span class="bsec-role">${role}</span>` +
      `<span class="bsec-count">${list.length}</span>` +
    `</div>`;
  const g = document.createElement("div");
  g.className = "bsec-grid";
  list.forEach(p => g.appendChild(makeRow(p)));
  sec.appendChild(g);
  return sec;
}

function makeRow(p) {
  const mine   = isMine(p);
  const taken  = isTaken(p) && !mine;
  const tgt    = isTarget(p) && !mine && !taken;
  const row = document.createElement("div");
  row.className = "brow" + (mine ? " mine" : "") + (taken ? " taken" : "") + (tgt ? " target" : "");

  const rig = p.Rigorista > 0 ? `<span class="brow-rig">R${p.Rigorista}</span>` : "";
  const nw  = p.Nuovo_Arrivo === "True" ? `<span class="brow-new">N</span>` : "";
  const tag = mine  ? `<span class="brow-tag mine">MIO</span>`
            : taken ? `<span class="brow-tag out">PRESO</span>` : "";

  const rl   = roles(p).sort((a,b) => ri(a) - ri(b));
  const mult = rl.length > 1 ? `<span class="brow-roles">${rl.join("/")}</span>` : "";

  // valore mostrato = stat selezionata (con Qt.A in subscript se diversa)
  const skey = boardSortKey();
  const stat = BOARD_STATS[skey] || BOARD_STATS.qta;
  const rawV = stat.get(p);
  const qta  = p.QtaM || p.QtA;
  let valHtml;
  if (skey === "qta" || !rawV || rawV === Infinity || isNaN(rawV)) {
    valHtml = `<span class="brow-qta">${qta}</span>`;
  } else {
    const disp = Number.isInteger(rawV) ? rawV : rawV.toFixed(2);
    valHtml = `<span class="brow-qta">${disp}<sub class="brow-sub">${qta}</sub></span>`;
  }

  row.innerHTML =
    `<span class="brow-name">${p.Nome}${rig}${nw}</span>${mult}` +
    `${valHtml}${tag}`;
  row.title = `${p.Nome} · ${p.Squadra} · ${p.RM} · FVM ${p.FvmM || "—"}`;
  row.addEventListener("click", e => {
    if (targetMode) { toggleTarget(p); return; }
    openBoardMenu(p, e);
  });
  return row;
}

// ── mini-menu contestuale (scegli destino) ──────────────────────
function getPop() {
  let pop = document.getElementById("board-pop");
  if (!pop) {
    pop = document.createElement("div");
    pop.id = "board-pop";
    document.body.appendChild(pop);
  }
  return pop;
}
function hidePop() { const p = document.getElementById("board-pop"); if (p) p.style.display = "none"; }

function openBoardMenu(p, e) {
  e.stopPropagation();
  const pop  = getPop();
  const mine = isMine(p);
  const out  = isTaken(p) && !mine;
  const tgt  = isTarget(p) && !mine && !out;

  let btns;
  if (mine)     btns = `<button data-a="unmine">↺ Rimuovi dalla rosa</button>`;
  else if (out) btns = `<button data-a="free">↺ Rimetti disponibile</button>`;
  else          btns = `<button data-a="me">✓ Preso da ME</button>` +
                       `<button data-a="out">✕ Preso da ALTRI</button>` +
                       (tgt ? `<button data-a="untgt">◇ Rimuovi obiettivo</button>`
                            : `<button data-a="tgt">◆ Segna come obiettivo</button>`);

  pop.innerHTML = `<div class="bpop-head">${p.Nome}<span>${p.Squadra} · ${p.RM}</span></div>${btns}`;
  pop.querySelectorAll("button").forEach(b => b.addEventListener("click", ev => {
    ev.stopPropagation();
    switch (b.dataset.a) {
      case "me":     hidePop(); openModal(p); break;
      case "out":    markTaken(p); hidePop(); break;
      case "free":   unmark(p); hidePop(); break;
      case "unmine": removeFromSquad(p); hidePop(); break;
      case "tgt":    toggleTarget(p); hidePop(); break;
      case "untgt":  toggleTarget(p); hidePop(); break;
    }
  }));

  pop.style.display = "block";
  const w = pop.offsetWidth || 190, h = pop.offsetHeight || 120;
  pop.style.left = Math.min(e.clientX, window.innerWidth  - w - 8) + "px";
  pop.style.top  = Math.min(e.clientY, window.innerHeight - h - 8) + "px";
}

// ── Lista Consigli — caricamento automatico ──────────────────────
let consigliPlayers = [];

function parseConsigliRows(rows) {
  return rows
    .filter(r => r.Nome && r.RM)
    .map(r => ({
      Nome: r.Nome, R: r.R, RM: r.RM, Squadra: r.Squadra,
      QtA:  parseFloat(r.QtA)  || 1,
      FVM:  parseFloat(r.FVM)  || 0,
      QtaM: parseFloat(r.QtA)  || 0,
      QtiM: parseFloat(r.QtI)  || 0,
      FvmM: parseFloat(r.FVM)  || 0,
      Rigorista:    parseInt(r.Rigorista)    || 0,
      Nuovo_Arrivo: r.Nuovo_Arrivo,
      Fm_2526: r.FM,  Mv_2526: r.Mv, Pv_2526: r.Pv,
      Gf_2526: r.Gol, Ass_2526: r.Assist, Amm_2526: r.Amm,
      Gs_2526: r.GolSubiti, Esp_2526: r.Esp,
      xG: r.xG, xA: r.xA, xG90: r.xG90, xA90: r.xA90,
      xG_diff: r.xG_diff, Efficienza: r.Efficienza,
      fb_90s: r["90s"],
    }));
}

function loadConsigli() {
  fetch("stagione2627/Lista_Consigli_2627.csv")
    .then(r => { if (!r.ok) throw new Error(); return r.text(); })
    .then(txt => {
      consigliPlayers = parseConsigliRows(Papa.parse(txt, { header: true, skipEmptyLines: true }).data);
      if (document.getElementById("board").classList.contains("open")) renderBoard();
    })
    .catch(() => {
      consigliPlayers = [];
      document.getElementById("consigli-btn").classList.add("visible");
    });
}

document.getElementById("consigli-input").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    consigliPlayers = parseConsigliRows(Papa.parse(ev.target.result, { header: true, skipEmptyLines: true }).data);
    document.getElementById("consigli-btn").classList.remove("visible");
    if (document.getElementById("board").classList.contains("open")) renderBoard();
  };
  reader.readAsText(file);
  e.target.value = "";
});

function buildConsigli() {
  if (!consigliPlayers.length) return null;
  const stat   = BOARD_STATS[boardSortKey()] || BOARD_STATS.qta;
  const sorted = [...consigliPlayers].sort((a, b) => {
    const va = stat.get(a), vb = stat.get(b);
    const aNaN = !va || va === Infinity || isNaN(va);
    const bNaN = !vb || vb === Infinity || isNaN(vb);
    if (aNaN && bNaN) return 0; if (aNaN) return 1; if (bNaN) return -1;
    return stat.asc ? va - vb : vb - va;
  });

  if (boardLayoutMode === "cols") {
    const col = document.createElement("div");
    col.className = "bcol bcol-consigli";
    col.style.setProperty("--rc", "#a78bfa");
    col.innerHTML =
      `<div class="bcol-head">` +
        `<span class="bcol-name">Consigli</span>` +
        `<span class="bcol-role">💡</span>` +
        `<span class="bcol-count">${sorted.length}</span>` +
      `</div>`;
    const body = document.createElement("div");
    body.className = "bcol-body";
    sorted.forEach(p => body.appendChild(makeRow(p)));
    col.appendChild(body);
    return col;
  } else {
    const sec = document.createElement("div");
    sec.className = "bsec bsec-consigli";
    sec.style.setProperty("--rc", "#a78bfa");
    sec.innerHTML =
      `<div class="bsec-head">` +
        `<span class="bsec-name">I MIEI CONSIGLI</span>` +
        `<span class="bsec-role">💡</span>` +
        `<span class="bsec-count">${sorted.length}</span>` +
      `</div>`;
    const g = document.createElement("div");
    g.className = "bsec-grid";
    sorted.forEach(p => g.appendChild(makeRow(p)));
    sec.appendChild(g);
    return sec;
  }
}

// ── apertura / chiusura vista ───────────────────────────────────
const boardEl = document.getElementById("board");
function openBoard()  { boardEl.classList.add("open");  renderBoard(); }
function closeBoard() { boardEl.classList.remove("open"); hidePop(); }

document.getElementById("board-target-btn").addEventListener("click", () => {
  targetMode = !targetMode;
  document.getElementById("board-target-btn").classList.toggle("active", targetMode);
  document.getElementById("board-grid").classList.toggle("target-mode", targetMode);
});
document.getElementById("board-open").addEventListener("click", openBoard);
document.getElementById("board-close").addEventListener("click", closeBoard);
document.getElementById("board-n").addEventListener("input", () => {
  localStorage.setItem("fc_boardN", boardN());
  renderBoard();
});
document.getElementById("board-sort").addEventListener("change", e => {
  localStorage.setItem("fc_boardSort", e.target.value);
  renderBoard();
});
document.querySelectorAll("#board-layout button").forEach(b => {
  b.addEventListener("click", () => {
    boardLayoutMode = b.dataset.l;
    localStorage.setItem("fc_boardLayout", boardLayoutMode);
    syncLayoutButtons();
    renderBoard();
  });
});
function syncLayoutButtons() {
  document.querySelectorAll("#board-layout button").forEach(b =>
    b.classList.toggle("active", b.dataset.l === boardLayoutMode));
}
document.addEventListener("click", e => { if (!e.target.closest("#board-pop")) hidePop(); });
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && boardEl.classList.contains("open")) {
    if (document.getElementById("board-pop")?.style.display === "block") hidePop();
    else closeBoard();
  }
});

// ── init ────────────────────────────────────────────────────────
loadTaken();
loadTargets();
loadConsigli();
const savedN = parseInt(localStorage.getItem("fc_boardN"));
if (savedN && savedN > 0) document.getElementById("board-n").value = savedN;
const savedSort = localStorage.getItem("fc_boardSort");
if (savedSort) document.getElementById("board-sort").value = savedSort;
syncLayoutButtons();
