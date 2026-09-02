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

// ── stato "preso da altri": chiavi Nome|Squadra|RM in localStorage ──
let taken = [];
const takenKey = p => `${p.Nome}|${p.Squadra}|${p.RM}`;
function loadTaken() { try { taken = JSON.parse(localStorage.getItem("fc_taken")) || []; } catch(e) { taken = []; } }
function saveTaken() { localStorage.setItem("fc_taken", JSON.stringify(taken)); }

const isTaken = p => taken.includes(takenKey(p));
const isMine  = p => squad.some(sp => samePlayer(sp.player, p));

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

function playersForRole(role, N) {
  return players
    .filter(p => primaryRole(p) === role)
    .sort((a,b) => (b.QtaM || b.QtA) - (a.QtaM || a.QtA))
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
  const mine  = isMine(p);
  const taken = isTaken(p) && !mine;
  const row = document.createElement("div");
  row.className = "brow" + (mine ? " mine" : "") + (taken ? " taken" : "");

  const qta = p.QtaM || p.QtA;
  const rig = p.Rigorista > 0 ? `<span class="brow-rig">R${p.Rigorista}</span>` : "";
  const nw  = p.Nuovo_Arrivo === "True" ? `<span class="brow-new">N</span>` : "";
  const tag = mine  ? `<span class="brow-tag mine">MIO</span>`
            : taken ? `<span class="brow-tag out">PRESO</span>` : "";

  // multiruolo: mostra tutti i ruoli coperti accanto al nome (ordine difensivo→offensivo)
  const rl   = roles(p).sort((a,b) => ri(a) - ri(b));
  const mult = rl.length > 1 ? `<span class="brow-roles">${rl.join("/")}</span>` : "";

  row.innerHTML =
    `<span class="brow-name">${p.Nome}${rig}${nw}</span>${mult}` +
    `<span class="brow-qta">${qta}</span>${tag}`;
  row.title = `${p.Nome} · ${p.Squadra} · ${p.RM} · FVM ${p.FvmM || "—"}`;
  row.addEventListener("click", e => openBoardMenu(p, e));
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

  let btns;
  if (mine)      btns = `<button data-a="unmine">↺ Rimuovi dalla rosa</button>`;
  else if (out)  btns = `<button data-a="free">↺ Rimetti disponibile</button>`;
  else           btns = `<button data-a="me">✓ Preso da ME</button>` +
                        `<button data-a="out">✕ Preso da ALTRI</button>`;

  pop.innerHTML = `<div class="bpop-head">${p.Nome}<span>${p.Squadra} · ${p.RM}</span></div>${btns}`;
  pop.querySelectorAll("button").forEach(b => b.addEventListener("click", ev => {
    ev.stopPropagation();
    switch (b.dataset.a) {
      case "me":     hidePop(); openModal(p); break;   // apre modal prezzo → confirmAdd
      case "out":    markTaken(p); hidePop(); break;
      case "free":   unmark(p); hidePop(); break;
      case "unmine": removeFromSquad(p); hidePop(); break;
    }
  }));

  pop.style.display = "block";
  const w = pop.offsetWidth || 190, h = pop.offsetHeight || 120;
  pop.style.left = Math.min(e.clientX, window.innerWidth  - w - 8) + "px";
  pop.style.top  = Math.min(e.clientY, window.innerHeight - h - 8) + "px";
}

// ── apertura / chiusura vista ───────────────────────────────────
const boardEl = document.getElementById("board");
function openBoard()  { boardEl.classList.add("open");  renderBoard(); }
function closeBoard() { boardEl.classList.remove("open"); hidePop(); }

document.getElementById("board-open").addEventListener("click", openBoard);
document.getElementById("board-close").addEventListener("click", closeBoard);
document.getElementById("board-n").addEventListener("input", () => {
  localStorage.setItem("fc_boardN", boardN());
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
const savedN = parseInt(localStorage.getItem("fc_boardN"));
if (savedN && savedN > 0) document.getElementById("board-n").value = savedN;
syncLayoutButtons();
