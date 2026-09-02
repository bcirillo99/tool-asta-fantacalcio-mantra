// ════════════════════════════════════════════════════════════════
// ASSIGNMENT
// Titolari: match perfetto (score=0), più vincolato prima, QtA↓ tiebreaker.
// Riserve per slot: chi non è titolare ma copre quel ruolo, QtA↓.
// Chi non copre nessuno slot → "senza slot" in fondo.
// ════════════════════════════════════════════════════════════════
function qtaOf(sp) { return parseInt(sp.player.QtA) || 0; }

function assign(squadList, f) {
  const slots  = FORMS[f];
  const result = new Array(slots.length).fill(null);
  const used   = new Set();

  // Ruoli-slot presenti nel modulo (unione di tutti gli slot).
  const formRoles = new Set(slots.flatMap(s => s.roles));

  // targetRole: il ruolo PIÙ DIFENSIVO del giocatore che il modulo prevede come slot.
  // Es. B;Dd;E in un 3-difese (slot Dc,Dc,Dc/B): unico ruolo-slot coperto = B → target B.
  // Il giocatore competerà SOLO per gli slot che accettano il suo target, mai per uno
  // più offensivo. Così un secondo B;Dd;E finisce riserva di B, non titolare a E.
  // Ruoli effettivi: se l'utente ha forzato un ruolo (sp.forced), il giocatore è mono-ruolo.
  const spRoles = sp => sp.forced ? [sp.forced] : roles(sp.player);

  function targetRole(sp) {
    const pr = spRoles(sp).sort((a,b) => ri(a) - ri(b));
    for (const r of pr) if (formRoles.has(r)) return r;
    return null; // nessuno slot naturale nel modulo
  }
  function eligible(sp, slot) {
    const t = targetRole(sp);
    return t !== null && slot.roles.includes(t);
  }

  // Waste: quanti ruoli PIÙ DIFENSIVI del giocatore lo slot NON usa.
  // Un puro-ruolo (0 sprechi) batte un adattato. NON usa l'indice assoluto del ruolo:
  // in slot A/Pc un Pc (Lautaro) e un A (Berardi) sono entrambi naturali (waste 0),
  // quindi decide la QtA → titolare il più forte, non il "più difensivo".
  function waste(sp, slot) {
    const pr = spRoles(sp).sort((a,b) => ri(a) - ri(b));
    for (let i = 0; i < pr.length; i++) if (slot.roles.includes(pr[i])) return i;
    return 99;
  }

  // Candidati per uno slot (solo chi ha quel ruolo come target), ordinati:
  // waste ASC (meno sprechi = più adatto), poi QtA DESC (il più forte titolare).
  function candidates(si) {
    return squadList
      .filter(sp => !used.has(sp) && eligible(sp, slots[si]))
      .sort((a,b) => {
        const wa = waste(a, slots[si]);
        const wb = waste(b, slots[si]);
        if (wa !== wb) return wa - wb;
        return qtaOf(b) - qtaOf(a);
      });
  }

  // Most-constrained slot first.
  // Tie-break: slot più difensivo prima (min roleIndex tra i ruoli accettati).
  // Così Dc/B viene processato prima di E, anche con stesso numero di candidati.
  function order() {
    return slots.map((_,i)=>i)
      .filter(i => result[i] === null)
      .sort((a,b) => {
        const ca = squadList.filter(sp => !used.has(sp) && eligible(sp, slots[a])).length;
        const cb = squadList.filter(sp => !used.has(sp) && eligible(sp, slots[b])).length;
        if (ca !== cb) return ca - cb;
        // stesso numero di candidati → slot più difensivo prima
        const da = Math.min(...slots[a].roles.map(r => ri(r)));
        const db = Math.min(...slots[b].roles.map(r => ri(r)));
        return da - db;
      });
  }

  for (const si of order()) {
    const best = candidates(si)[0];
    if (best) { result[si] = best; used.add(best); }
  }

  // Pull-forward (opzionale): riempi gli slot rimasti vuoti tirando avanti i polivalenti,
  // spostando se serve anche i titolari (matching bipartito, algoritmo di Kuhn).
  // Es. 3-5-1-1 con Pulisic (T;A) titolare su T e Baturina (T) riserva: lo slot A/Pc è vuoto
  // → Pulisic va avanti su A, Baturina scala titolare su T. Un buco riempito, nessuno nuovo.
  // "natural" = il giocatore copre davvero quel ruolo (waste < 99), ignorando il target.
  const natural = (sp, slot) => waste(sp, slot) < 99;
  if (pullForward) {
    // candidati per uno slot: meno fuori-ruolo (waste) e QtA più alta prima
    const natCands = si => squadList
      .filter(sp => natural(sp, slots[si]))
      .sort((a,b) => {
        const wa = waste(a, slots[si]);
        const wb = waste(b, slots[si]);
        if (wa !== wb) return wa - wb;
        return qtaOf(b) - qtaOf(a);
      });
    const playerSlot = sp => result.findIndex(x => x === sp);
    function augment(si, seen) {
      for (const sp of natCands(si)) {
        if (seen.has(sp)) continue;
        seen.add(sp);
        const cur = playerSlot(sp);              // slot che occupa ora (-1 = libero)
        if (cur === -1 || augment(cur, seen)) {  // libero, o il suo slot si può riassegnare
          result[si] = sp;
          return true;
        }
      }
      return false;
    }
    slots.forEach((_, si) => { if (result[si] === null) augment(si, new Set()); });
    used.clear();
    result.forEach(sp => { if (sp) used.add(sp); });
  }

  // Riserve: ogni non-titolare va in UN SOLO slot — il migliore per lui
  // (waste minimo, poi slot più difensivo). A parità di idoneità le riserve si
  // BILANCIANO tra slot uguali: va in quello con meno riserve già assegnate
  // (es. con 2 slot Dc e 6 riserve → 3 e 3, non 6 e 1).
  const reserves = slots.map(() => []);
  squadList
    .filter(sp => !used.has(sp) && targetRole(sp) !== null)
    .forEach(sp => {
      let bi = -1, bw = 99, br = 99, bl = Infinity;
      slots.forEach((slot, i) => {
        if (!eligible(sp, slot)) return;
        const w  = waste(sp, slot);
        const rr = Math.min(...slot.roles.map(r => ri(r)));
        const ld = reserves[i].length;                 // carico attuale dello slot
        if (w < bw ||
            (w === bw && rr < br) ||
            (w === bw && rr === br && ld < bl)) {
          bw = w; br = rr; bl = ld; bi = i;
        }
      });
      if (bi >= 0) reserves[bi].push(sp);
    });
  reserves.forEach((list, i) =>
    list.sort((a,b) => {
      const wa = waste(a, slots[i]);
      const wb = waste(b, slots[i]);
      if (wa !== wb) return wa - wb;
      return qtaOf(b) - qtaOf(a);
    })
  );

  // Senza slot: chi non ha alcun ruolo-slot nel modulo
  const noSlot = squadList.filter(sp =>
    !used.has(sp) && targetRole(sp) === null
  );

  return { assigned: result, reserves, noSlot };
}

