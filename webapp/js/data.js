// ════════════════════════════════════════════════════════════════
// DATA & STATE
// ════════════════════════════════════════════════════════════════
let players = [];
let squad   = [];   // [{player, price}]
let pending = null;
let formation = "3-5-2";
let budget  = 500;
let pullForward = false;   // true = riempi slot offensivi vuoti tirando avanti i polivalenti

const ROLE_ORDER = ["Por","Dc","B","Dd","Ds","E","M","C","W","T","A","Pc"];
const ri = r => ROLE_ORDER.indexOf(r);

// Colore per reparto (toni chiari, leggibili su sfondo scuro).
const ROLE_COLORS = {
  Por:"#fbbf24",                                   // portiere → arancione
  Dc:"#4ade80", B:"#4ade80", Dd:"#4ade80", Ds:"#4ade80", // difensori → verde
  E:"#60a5fa",  M:"#60a5fa", C:"#60a5fa",          // centrocampo → blu
  W:"#c084fc",  T:"#c084fc",                        // ali/trequarti → viola
  A:"#f87171",  Pc:"#f87171",                       // attaccanti → rosso
};
const roleColor = r => ROLE_COLORS[r] || "#9ca3af";

function roles(p) { return (p.RM||"").split(";").map(s=>s.trim()).filter(Boolean); }
function primaryRole(p) {
  return roles(p).sort((a,b) => ri(a)-ri(b))[0] || "?";
}


// ════════════════════════════════════════════════════════════════
// FILE LOAD
// ════════════════════════════════════════════════════════════════
// Lista-FantaAsta-Fantacalcio.csv: NESSUN header, colonne per indice:
// 0 Id · 1 Nome · 2 NomeCompleto · 3 R · 4 RM · 5 QtI · 6 QtA · 7 QtI_M · 8 QtA_M
// 9 Squadra · 10 FVM · 11 FVM_M · 12 piede · 13 nazione · 14 nascita · 15 img · ...
function fromLista(rows) {
  return rows
    .filter(r => r.length >= 10 && r[1] && r[4])
    .map(r => ({
      Nome: (r[1]||"").trim(),
      R:    (r[3]||"").trim(),
      RM:   (r[4]||"").trim(),
      Squadra: (r[9]||"").trim(),
      QtA:  parseInt(r[8]) || parseInt(r[6]) || 1,   // Mantra attuale, fallback classic
      FVM:  parseInt(r[11]) || parseInt(r[10]) || 0, // FVM Mantra, fallback classic
      QtaM: parseInt(r[8]) || 0, QtiM: parseInt(r[7]) || 0, FvmM: parseInt(r[11]) || 0,
      Rigorista: 0, Nuovo_Arrivo: "False", Fm_2526: ""
    }));
}
// riassuntivo_asta_2627.csv: header con Nome/RM/QtA/... → mappatura per intestazione
function fromHeader(rows) {
  const head = rows[0].map(h => (h||"").trim());
  const idx  = {}; head.forEach((h,i) => idx[h] = i);
  const get  = (r,k) => idx[k] != null ? r[idx[k]] : "";
  return rows.slice(1)
    .filter(r => (get(r,"Nome")||"").trim())
    .map(r => ({
      Nome: get(r,"Nome"), R: get(r,"R"), RM: get(r,"RM"), Squadra: get(r,"Squadra"),
      QtA: parseInt(get(r,"QtA")) || 1, FVM: parseInt(get(r,"FVM")) || 0,
      QtaM: parseInt(get(r,"QtA_M")) || 0, QtiM: parseInt(get(r,"QtI_M")) || 0, FvmM: parseInt(get(r,"FVM_M")) || 0,
      Rigorista: parseInt(get(r,"Rigorista")) || 0,
      Nuovo_Arrivo: get(r,"Nuovo_Arrivo"),
      Fm_2526: get(r,"Fm_2526"),
      Pv_2526: get(r,"Pv_2526"), Gf_2526: get(r,"Gf_2526"),
      Ass_2526: get(r,"Ass_2526"), Amm_2526: get(r,"Amm_2526")
    }));
}

document.getElementById("file-input").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  Papa.parse(file, {
    header: false, skipEmptyLines: true,
    complete: r => {
      const rows = r.data;
      const first = (rows[0] || []).map(c => (c||"").trim());
      const hasHeader = first.includes("Nome") && first.includes("RM");
      players = hasHeader ? fromHeader(rows) : fromLista(rows);
      const fs = document.getElementById("file-status");
      if (players.length) {
        fs.textContent = `✓ ${players.length} giocatori caricati` +
                         (hasHeader ? "" : " (Lista Asta)");
        fs.style.color = "var(--pos)";
      } else {
        fs.textContent = "⚠ Nessun giocatore riconosciuto nel file";
        fs.style.color = "var(--neg)";
      }
    },
    error: () => {
      document.getElementById("file-status").textContent = "⚠ Errore nel file";
      document.getElementById("file-status").style.color = "var(--neg)";
    }
  });
});

