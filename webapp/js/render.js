// ════════════════════════════════════════════════════════════════
// PITCH RENDER
// ════════════════════════════════════════════════════════════════
function renderPitch() {
  const wrap  = document.getElementById("pitch-wrap");
  const pitch = document.getElementById("pitch");

  const cw = wrap.clientWidth  - 24;
  const ch = wrap.clientHeight - 24;
  // maintain 2:3 aspect (w:h)
  let pw, ph;
  if (cw * 1.5 <= ch) { pw = cw; ph = cw * 1.5; }
  else                 { ph = ch; pw = ch / 1.5; }
  pitch.style.width  = pw + "px";
  pitch.style.height = ph + "px";
  pitch.innerHTML    = "";

  // markings
  const mkLine = (top,left,w,h) => {
    const d = document.createElement("div");
    d.className = "pline";
    Object.assign(d.style,{top,left,width:w,height:h});
    pitch.appendChild(d);
  };
  mkLine("50%","5%","90%","2px");         // halfway
  mkLine("7%","20%","60%","2px");         // top box
  mkLine("80%","20%","60%","2px");        // bottom box
  mkLine("7%","20%","2px","14%");
  mkLine("7%","80%","2px","14%");
  mkLine("80%","20%","2px","14%");
  mkLine("80%","80%","2px","14%");

  const cc = document.createElement("div");
  cc.className = "pcircle";
  const cr = pw * 0.18;
  Object.assign(cc.style,{
    width:cr+"px",height:cr+"px",
    top:"50%",left:"50%",transform:"translate(-50%,-50%)"
  });
  pitch.appendChild(cc);

  const slots = FORMS[formation];
  const {assigned, reserves, noSlot} = assign(squad, formation);

  slots.forEach((slot, i) => {
    const sp  = assigned[i];
    const el  = document.createElement("div");
    el.className = "pslot" + (sp?" filled":"");
    if (sp) {
      if (sp.player.Rigorista==1)           el.classList.add("rig1");
      if (sp.player.Nuovo_Arrivo==="True")  el.classList.add("nuovo");
    }
    el.style.left = slot.x + "%";
    el.style.top  = slot.y + "%";

    const slotLabel = slot.roles.join("/");
    const col       = roleColor(slot.roles[0]);   // colore reparto dello slot

    const roleTag = document.createElement("div");
    roleTag.className = "pslot-role";
    roleTag.textContent = slotLabel;
    el.appendChild(roleTag);

    const circ = document.createElement("div");
    circ.className = "pslot-circle";
    if (sp) {
      const nm = sp.player.Nome.split(/[\s\-\.]/)[0];
      circ.textContent = nm.length > 7 ? nm.slice(0,6)+"." : nm;
      circ.style.color = col;
      // il bordo resta ai badge Rigorista/Nuovo se presenti, altrimenti colore ruolo
      if (!el.classList.contains("rig1") && !el.classList.contains("nuovo"))
        circ.style.borderColor = col;
    } else {
      circ.textContent = slotLabel;
      circ.style.color = col;
    }
    el.appendChild(circ);

    if (sp) {
      const nameEl = document.createElement("div");
      nameEl.className = "pslot-name";
      nameEl.textContent = sp.player.Nome.split(" ")[0];
      el.appendChild(nameEl);

      const prEl = document.createElement("div");
      prEl.className = "pslot-price";
      prEl.textContent = sp.price + " FM";
      el.appendChild(prEl);
    }

    // riserve per questo slot
    const res = reserves[i] || [];
    if (res.length > 0) {
      const resWrap = document.createElement("div");
      resWrap.className = "pslot-reserves";
      res.forEach(rsp => {
        const r = document.createElement("div");
        r.className = "pslot-res";
        r.textContent = rsp.player.Nome.split(" ")[0] + " " + rsp.price + "FM";
        r.title = rsp.player.Nome + " · " + rsp.player.RM + " · Qt.A " + rsp.player.QtA;
        resWrap.appendChild(r);
      });
      el.appendChild(resWrap);
    }

    pitch.appendChild(el);
  });

  // bench — solo chi non copre nessuno slot nel modulo
  const benchEl = document.getElementById("bench");
  const n = noSlot.length;
  benchEl.classList.toggle("has-nofit", n > 0);
  benchEl.innerHTML = `<span id='bench-lbl'>SENZA SLOT${n ? ` <span class="bench-count">${n}</span>` : ""}</span>`;
  if (n === 0) {
    const empty = document.createElement("span");
    empty.style.cssText = "font-size:11px;color:var(--text-faint)";
    empty.textContent = "— tutti schierabili";
    benchEl.appendChild(empty);
  }
  noSlot.forEach(sp => {
    const el = document.createElement("div");
    el.className = "bp nofit";
    el.innerHTML = `<span class="bp-role">${primaryRole(sp.player)}</span>${sp.player.Nome} <span class="bp-price">${sp.price}FM</span>`;
    benchEl.appendChild(el);
  });
}

// ════════════════════════════════════════════════════════════════
// ROSTER LIST
// ════════════════════════════════════════════════════════════════
function renderRoster() {
  const list = document.getElementById("roster-list");
  list.innerHTML = "";

  [...squad]
    .sort((a,b) => ri(primaryRole(a.player)) - ri(primaryRole(b.player)))
    .forEach(sp => {
      const p   = sp.player;
      const idx = squad.indexOf(sp);
      const el  = document.createElement("div");
      el.className = "rp";

      const rigBadge  = p.Rigorista > 0 ? `<span class="rp-rig">R${p.Rigorista}</span> ` : "";
      const newBadge  = p.Nuovo_Arrivo==="True" ? `<span class="rp-new">NEW</span> ` : "";
      const rl        = roles(p);
      const pr        = sp.forced || primaryRole(p);   // badge riflette il ruolo forzato
      const col       = roleColor(pr);

      // Dropdown ruolo solo per i multi-ruolo: Auto + ogni ruolo del giocatore.
      const roleSel = rl.length > 1 ? `
        <select class="rp-role" title="Schiera come (Auto = più difensivo)">
          <option value="">Auto</option>
          ${rl.map(r => `<option value="${r}" ${sp.forced===r?"selected":""}>${r}</option>`).join("")}
        </select>` : "";

      el.innerHTML = `
        <div class="rp-badge" style="color:${col};background:${col}22">${pr}</div>
        <div class="rp-info">
          <div class="rp-name">${rigBadge}${newBadge}${p.Nome}</div>
          <div class="rp-sub">${p.Squadra} · ${p.RM} · FVM ${p.FvmM || "—"}</div>
        </div>
        ${roleSel}
        <div class="rp-price">${sp.price}FM</div>
        <div class="rp-del" data-idx="${idx}">×</div>
      `;
      el.querySelector(".rp-del").addEventListener("click", e => {
        squad.splice(parseInt(e.target.dataset.idx), 1);
        save(); renderRoster(); renderPitch();
      });
      const sel = el.querySelector(".rp-role");
      if (sel) sel.addEventListener("change", e => {
        e.stopPropagation();
        sp.forced = e.target.value || null;
        save(); renderRoster(); renderPitch();
      });
      list.appendChild(el);
    });

  // budget
  const spent = squad.reduce((s,sp)=>s+sp.price,0);
  const rem   = budget - spent;
  const over  = rem < 0;
  document.getElementById("spent-val").textContent = spent;
  document.getElementById("rem-val").textContent   = rem;
  document.getElementById("rem-val").style.color   = over ? "var(--neg)" : "var(--pos)";
  const nGk  = squad.filter(sp => roles(sp.player).includes("Por")).length;
  document.getElementById("gk-val").textContent  = nGk;
  document.getElementById("mov-val").textContent = squad.length - nGk;

  const fill = document.getElementById("budget-fill");
  const pct  = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  fill.style.width = pct + "%";
  fill.classList.toggle("over", over);
}

