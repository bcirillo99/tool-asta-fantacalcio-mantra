// ════════════════════════════════════════════════════════════════
// SEARCH
// ════════════════════════════════════════════════════════════════
const searchIn  = document.getElementById("search-input");
const searchRes = document.getElementById("search-results");

searchIn.addEventListener("input", () => {
  const q = searchIn.value.trim().toLowerCase();
  searchRes.className = "";
  searchRes.innerHTML = "";
  if (q.length < 2 || !players.length) return;

  const hits = players
    .filter(p => p.Nome && p.Nome.toLowerCase().includes(q))
    .slice(0, 14);

  if (!hits.length) return;
  searchRes.classList.add("open");

  hits.forEach(p => {
    const el  = document.createElement("div");
    el.className = "sr-item";
    const rig = p.Rigorista > 0 ? `<span class="sr-rig">R${p.Rigorista}</span>` : "";
    const nw  = p.Nuovo_Arrivo==="True" ? `<span class="sr-new">NEW</span>` : "";
    el.innerHTML = `
      <div>
        <div class="sr-name">${p.Nome} ${rig} ${nw}</div>
        <div class="sr-meta">${p.Squadra} · ${p.RM} · FVM ${p.FvmM || "—"}</div>
      </div>
      <div class="sr-qta">${p.QtaM || p.QtA} FM</div>
    `;
    el.addEventListener("click", () => { searchRes.classList.remove("open"); openModal(p); });
    searchRes.appendChild(el);
  });
});

document.addEventListener("click", e => {
  if (!e.target.closest("#search-area")) searchRes.classList.remove("open");
});

// ════════════════════════════════════════════════════════════════
// MODAL
// ════════════════════════════════════════════════════════════════
function openModal(p) {
  pending = p;
  searchIn.value = "";
  document.getElementById("modal-title").textContent = p.Nome;
  document.getElementById("modal-sub").textContent   = `${p.Squadra} · ${p.RM}`;

  const qtaM = p.QtaM || p.QtA;

  document.getElementById("modal-stats").innerHTML = `
    Qt.A: <span>${qtaM} FM</span>  ·  Qt.I: <span>${p.QtiM || "—"}</span><br>
    FVM: <span>${p.FvmM || "—"}</span>  ·  Ruolo: <span>${p.RM}</span>
  `;

  const pi = document.getElementById("price-input");
  pi.value = qtaM || "";
  document.getElementById("modal").classList.add("open");
  pi.focus(); pi.select();
}

function confirmAdd() {
  const price = parseInt(document.getElementById("price-input").value);
  if (!pending || !price || price < 1) return;
  squad.push({ player: pending, price });
  document.getElementById("modal").classList.remove("open");
  pending = null;
  save(); renderRoster(); renderPitch();
}

document.getElementById("btn-ok").addEventListener("click", confirmAdd);
document.getElementById("btn-no").addEventListener("click", () => {
  document.getElementById("modal").classList.remove("open");
});
document.getElementById("price-input").addEventListener("keydown", e => {
  if (e.key === "Enter")  confirmAdd();
  if (e.key === "Escape") document.getElementById("modal").classList.remove("open");
});


// ════════════════════════════════════════════════════════════════
// FORMATION BUTTONS
// ════════════════════════════════════════════════════════════════
document.querySelectorAll(".fb").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".fb").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    formation = btn.dataset.f;
    save(); renderPitch();
  });
});

document.getElementById("budget-input").addEventListener("change", e => {
  budget = parseInt(e.target.value) || 500;
  save(); renderRoster();
});

document.getElementById("pf-check").addEventListener("change", e => {
  pullForward = e.target.checked;
  save(); renderPitch();
});

// ════════════════════════════════════════════════════════════════
// EXPORT CSV
// ════════════════════════════════════════════════════════════════
function exportCSV() {
  if (!squad.length) { alert("Rosa vuota: niente da esportare."); return; }
  const esc = v => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const header = ["Nome","Squadra","RM","Ruolo_Scelto","Prezzo_FM","QtA"];
  const rows = [...squad]
    .sort((a,b) => ri(primaryRole(a.player)) - ri(primaryRole(b.player)))
    .map(sp => [
      sp.player.Nome, sp.player.Squadra, sp.player.RM,
      sp.forced || "Auto", sp.price, sp.player.QtA
    ].map(esc).join(","));
  const csv  = [header.join(","), ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `squad_${formation}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
document.getElementById("export-btn").addEventListener("click", exportCSV);

// ════════════════════════════════════════════════════════════════
// PERSIST
// ════════════════════════════════════════════════════════════════
function save() {
  localStorage.setItem("fc_squad",     JSON.stringify(squad));
  localStorage.setItem("fc_formation", formation);
  localStorage.setItem("fc_budget",    budget);
  localStorage.setItem("fc_pullfwd",   pullForward ? "1" : "0");
}

function load() {
  try { squad = JSON.parse(localStorage.getItem("fc_squad")) || []; } catch(e) { squad=[]; }
  const f = localStorage.getItem("fc_formation");
  if (f && FORMS[f]) {
    formation = f;
    document.querySelectorAll(".fb").forEach(b => b.classList.toggle("active", b.dataset.f===f));
  }
  const b = localStorage.getItem("fc_budget");
  if (b) { budget = parseInt(b); document.getElementById("budget-input").value = budget; }
  pullForward = localStorage.getItem("fc_pullfwd") === "1";
  document.getElementById("pf-check").checked = pullForward;
  const w = parseInt(localStorage.getItem("fc_leftwidth"));
  if (w && window.innerWidth > 820) document.getElementById("left").style.width = w + "px";
}

window.addEventListener("resize", renderPitch);

// ── Ridimensiona pannello sinistro (trascina il bordo) ──
(function() {
  const left = document.getElementById("left");
  const rez  = document.getElementById("left-resizer");
  let dragging = false;
  const clamp = x => Math.max(300, Math.min(window.innerWidth * 0.7, x));

  rez.addEventListener("mousedown", e => {
    dragging = true; rez.classList.add("dragging");
    document.body.classList.add("resizing");
    e.preventDefault();
  });
  window.addEventListener("mousemove", e => {
    if (!dragging) return;
    left.style.width = clamp(e.clientX - left.getBoundingClientRect().left) + "px";
    renderPitch();
  });
  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false; rez.classList.remove("dragging");
    document.body.classList.remove("resizing");
    localStorage.setItem("fc_leftwidth", parseInt(left.style.width));
  });
})();

load(); renderRoster(); renderPitch();
