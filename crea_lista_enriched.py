#!/usr/bin/env python3
"""
Genera stagione2627/Lista_Enriched_2627.csv partendo da soli 5 file:
  - stagione2627/Quotazioni_Fantacalcio_Stagione_2026_27.xlsx  → lista + quote
  - stagione2526/Statistiche_Fantacalcio_Stagione_2025_26.xlsx → stat fanta 25/26
  - stagione2526/stats_players/fbref_top5_combined.csv          → gol/assist/tiri (5 leghe)
  - stagione2526/stats_players/fbref_serieb_2526.csv            → stat Serie B
  - stagione2526/stats_players/understat_top5_combined.csv      → xG / xA
"""

import pandas as pd
import numpy as np
import unicodedata
import re
from rapidfuzz import process as rfproc, fuzz

BASE      = "/Users/benedettocirillo/Desktop/fantacalcio"
MATCH_THR = 82   # soglia minima rapidfuzz per accettare un match

# ── helpers normalizzazione ───────────────────────────────────────────────────

_CHAR_MAP = str.maketrans("øØıðÐþæÆßłđ", "oOidDtaesld")

def normalize(s):
    if pd.isna(s): return ""
    s = str(s).translate(_CHAR_MAP)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 \-]", "", s.lower().strip())

def surname_fanta(nome):
    """'Martinez Jo.' → 'martinez'  |  'De Ketelaere' → 'ketelaere'"""
    original = str(nome) if not pd.isna(nome) else ""
    tokens = original.strip().split()
    while tokens and (("." in tokens[-1]) or len(tokens[-1].replace(".", "")) <= 2):
        tokens.pop()
    return normalize(" ".join(tokens)).split()[-1] if tokens else ""

def surname_fbref(full_name):
    """'Marco Verratti' → 'verratti'"""
    parts = normalize(full_name).split()
    return parts[-1] if parts else ""

def fuzzy_find(query, keys, thr=MATCH_THR):
    if not query: return None, 0
    r = rfproc.extractOne(query, keys, scorer=fuzz.token_sort_ratio)
    return (r[0], r[1]) if r and r[1] >= thr else (None, 0)

# ── 1. QUOTAZIONI 26/27 — lista base ─────────────────────────────────────────

print("1. Quotazioni 26/27 + Lista-FantaAsta (base completa)...")
q = pd.read_excel(f"{BASE}/stagione2627/Quotazioni_Fantacalcio_Stagione_2026_27.xlsx", header=1)
q.columns = ["Id","R","RM","Nome","Squadra","QtA","QtI","Diff_Q","QtA_M","QtI_M","Diff_M","FVM","FVM_M"]
q_clean = q[["Id","R","RM","Nome","Squadra","QtA_M","QtI_M","FVM_M"]].copy()
q_clean.rename(columns={"QtA_M":"QtA","QtI_M":"QtI","FVM_M":"FVM"}, inplace=True)

# Lista-FantaAsta: base completa (590) — include giocatori assenti dalle quotazioni
lista_raw = pd.read_csv(f"{BASE}/stagione2627/Lista-FantaAsta-Fantacalcio.csv", header=None)
lista_base = pd.DataFrame({
    "Id":      lista_raw[0],
    "Nome":    lista_raw[1].str.strip(),
    "R":       lista_raw[3].str.strip(),
    "RM":      lista_raw[4].str.strip(),
    "Squadra": lista_raw[9].str.strip(),
    "QtA":     pd.to_numeric(lista_raw[8], errors="coerce").fillna(pd.to_numeric(lista_raw[6], errors="coerce")),
    "QtI":     pd.to_numeric(lista_raw[7], errors="coerce"),
    "FVM":     pd.to_numeric(lista_raw[11], errors="coerce").fillna(pd.to_numeric(lista_raw[10], errors="coerce")),
})
# preferisci quote da Quotazioni (più precise per Mantra), ma tieni tutti i 590
df = lista_base.merge(q_clean[["Id","QtA","QtI","FVM"]], on="Id", how="left", suffixes=("_lista","_q"))
df["QtA"] = df["QtA_q"].fillna(df["QtA_lista"])
df["QtI"] = df["QtI_q"].fillna(df["QtI_lista"])
df["FVM"] = df["FVM_q"].fillna(df["FVM_lista"])
df.drop(columns=["QtA_lista","QtI_lista","FVM_lista","QtA_q","QtI_q","FVM_q"], inplace=True)
print(f"   {len(df)} giocatori ({len(q_clean)} da Quotazioni + {len(df)-len(q_clean)} solo da Lista)")

# chiavi matching per fbref/understat
df["_surn"] = df["Nome"].apply(surname_fanta)
SQUAD_MAP = {"hellas verona":"verona","h verona":"verona"}
df["_squad"] = df["Squadra"].apply(lambda s: SQUAD_MAP.get(normalize(s), normalize(s)))

# ── 2. STATISTICHE 25/26 — stat fanta join per Id ────────────────────────────

print("2. Statistiche Fanta 25/26...")
s26 = pd.read_excel(f"{BASE}/stagione2526/Statistiche_Fantacalcio_Stagione_2025_26.xlsx", header=1)
s26.columns = ["Id","R","Rm","Nome","Squadra","Pv","Mv","Fm","Gf","Gs","Rp","Rc","Rp2","Rm2","Ass","Amm","Esp","Au"]
s26 = s26[["Id","Pv","Mv","Fm","Gf","Gs","Ass","Amm","Esp"]].copy()
s26.columns = ["Id","Pv_2526","Mv_2526","Fm_2526","Gf_2526","Gs_2526","Ass_2526","Amm_2526","Esp_2526"]

df = df.merge(s26, on="Id", how="left")
df["Nuovo_Arrivo"] = df["Fm_2526"].isna()
matched_s = df["Fm_2526"].notna().sum()
print(f"   {matched_s}/{len(df)} con stat fanta 25/26")

# ── 3. FBREF TOP5 + SERIE B — gol/assist/cartellini/90s ──────────────────────

print("3. FBref top5 + Serie B...")

def load_fbref(path, double_header=False):
    hdr = 1 if double_header else 0
    fb = pd.read_csv(path, header=hdr)
    fb = fb[fb["Player"] != "Player"].dropna(subset=["Player"])
    for c in ["90s","Gls","Ast","CrdY","CrdR"]:
        if c in fb.columns:
            fb[c] = pd.to_numeric(fb[c], errors="coerce")
    fb = fb.sort_values("90s", ascending=False).drop_duplicates(subset="Player", keep="first")
    fb["_surn"]  = fb["Player"].apply(surname_fbref)
    fb["_squad"] = fb["Squad"].apply(lambda s: SQUAD_MAP.get(normalize(s), normalize(s)))
    return fb

fbref_top5  = load_fbref(f"{BASE}/stagione2526/stats_players/fbref_top5_combined.csv",  double_header=True)
fbref_serieb = load_fbref(f"{BASE}/stagione2526/stats_players/fbref_serieb_2526.csv",   double_header=False)
fbref = pd.concat([fbref_top5, fbref_serieb], ignore_index=True)
fbref = fbref.sort_values("90s", ascending=False).drop_duplicates(subset="_surn", keep="first")

fb_by_surn_squad = fbref.set_index(["_surn","_squad"])
fb_by_surn       = fbref.set_index("_surn")
fb_norms         = list(fbref["_surn"].unique())

FB_COLS = ["90s","Gls","Ast","CrdY","CrdR"]
fb_rows, fb_flags = [], []

for _, row in df.iterrows():
    surn  = row["_surn"]
    squad = row["_squad"]
    m = None

    # 1. cognome + squadra
    if (surn, squad) in fb_by_surn_squad.index:
        m = fb_by_surn_squad.loc[(surn, squad)]
        m = m.iloc[0] if isinstance(m, pd.DataFrame) else m
    # 2. cognome solo
    elif surn in fb_by_surn.index:
        m = fb_by_surn.loc[surn]
        m = m.iloc[0] if isinstance(m, pd.DataFrame) else m
    # 3. fuzzy
    else:
        best, _ = fuzzy_find(surn, fb_norms)
        if best and best in fb_by_surn.index:
            m = fb_by_surn.loc[best]
            m = m.iloc[0] if isinstance(m, pd.DataFrame) else m

    if m is not None:
        fb_rows.append({c: m.get(c, np.nan) for c in FB_COLS})
        fb_flags.append(True)
    else:
        fb_rows.append({c: np.nan for c in FB_COLS})
        fb_flags.append(False)

fbref_df = pd.DataFrame(fb_rows)
fbref_df.columns = [f"fb_{c}" for c in FB_COLS]
fbref_df["fbref_match"] = fb_flags
df = pd.concat([df.reset_index(drop=True), fbref_df], axis=1)
print(f"   {sum(fb_flags)}/{len(df)} con stat fbref")

# ── 4. UNDERSTAT — xG / xA ───────────────────────────────────────────────────

print("4. Understat (xG/xA)...")
under = pd.read_csv(f"{BASE}/stagione2526/stats_players/understat_top5_combined.csv", sep=";")
under["_n"]    = under["player"].apply(normalize)
under["_surn"] = under["_n"].apply(lambda s: s.split()[-1] if s else "")
under["_squad"]= under["team"].apply(lambda s: SQUAD_MAP.get(normalize(s), normalize(s)))
under = under.sort_values("min", ascending=False)

# indici: cognome+squadra, cognome solo, nome completo
under_by_surn_squad = under.set_index(["_surn","_squad"])
under_by_surn       = under.groupby("_surn").first()   # più minuti = più rilevante
under_by_norm       = under.set_index("_n")
under_full_keys     = list(under["_n"].unique())

xg_data, under_flags = {c:[] for c in ["xG","xA","xG90","xA90"]}, []

for _, row in df.iterrows():
    surn  = row["_surn"]
    squad = row["_squad"]
    u = None

    # 1. cognome + squadra (più preciso)
    if (surn, squad) in under_by_surn_squad.index:
        m = under_by_surn_squad.loc[(surn, squad)]
        u = m.iloc[0] if isinstance(m, pd.DataFrame) else m
    # 2. cognome solo
    elif surn in under_by_surn.index:
        u = under_by_surn.loc[surn]
    # 3. fuzzy sul nome completo normalizzato
    else:
        best, _ = fuzzy_find(normalize(row["Nome"]), under_full_keys)
        if best and best in under_by_norm.index:
            m = under_by_norm.loc[best]
            u = m.iloc[0] if isinstance(m, pd.DataFrame) else m

    if u is not None:
        for c in ["xG","xA","xG90","xA90"]: xg_data[c].append(u[c])
        under_flags.append(True)
    else:
        for c in ["xG","xA","xG90","xA90"]: xg_data[c].append(np.nan)
        under_flags.append(False)

df["xG_2526"]    = xg_data["xG"]
df["xA_2526"]    = xg_data["xA"]
df["xG90_2526"]  = xg_data["xG90"]
df["xA90_2526"]  = xg_data["xA90"]
df["under_match"]= under_flags
print(f"   {sum(under_flags)}/{len(df)} con xG/xA")

# ── 5. METRICHE DERIVATE ─────────────────────────────────────────────────────

df["Efficienza"] = (
    pd.to_numeric(df["Fm_2526"], errors="coerce") /
    pd.to_numeric(df["QtA"],     errors="coerce")
).round(2)

gol_reali = pd.to_numeric(df["Gf_2526"], errors="coerce").fillna(
            pd.to_numeric(df["fb_Gls"],  errors="coerce"))
df["xG_diff"] = (pd.to_numeric(df["xG_2526"], errors="coerce") - gol_reali).round(2)

# ── 6. COLONNE OUTPUT ─────────────────────────────────────────────────────────

COLS_RENAME = {
    "Fm_2526":  "FM",
    "Mv_2526":  "Mv",
    "Pv_2526":  "Pv",
    "Gf_2526":  "Gol",
    "Ass_2526": "Assist",
    "Amm_2526": "Amm",
    "Esp_2526": "Esp",
    "Gs_2526":  "GolSubiti",
    "fb_90s":   "90s",
    "xG_2526":  "xG",
    "xA_2526":  "xA",
    "xG90_2526":"xG90",
    "xA90_2526":"xA90",
}

RIGORISTI = {
    ("calhanoglu","inter"):1, ("zielinski","inter"):2,
    ("muani","juventus"):1, ("locatelli","juventus"):2, ("yildiz","juventus"):3,
    ("zaccagni","lazio"):1, ("taylor","lazio"):2, ("pinamonti","lazio"):3,
    ("bruyne","napoli"):1, ("hojlund","napoli"):2,
    ("ramos","milan"):1, ("pulisic","milan"):2,
    ("dybala","roma"):1, ("malen","roma"):2,
    ("orsolini","bologna"):1,
    ("cunha","como"):1, ("kean","como"):2,
    ("vlasic","torino"):1,
    ("kessie","atalanta"):1, ("scamacca","atalanta"):2,
    ("mandragora","fiorentina"):1,
    ("colombo","genoa"):1,
    ("pessina","monza"):1,
    ("fazzini","cagliari"):1,
    ("davis","udinese"):1,
    ("busio","venezia"):1,
}
df["Rigorista"] = df.apply(lambda r: RIGORISTI.get((r["_surn"], r["_squad"]), 0), axis=1)

out = df.rename(columns=COLS_RENAME)

FINAL = [
    "Nome","R","RM","Squadra","QtA","QtI","FVM",
    "Rigorista","Nuovo_Arrivo",
    "Pv","Mv","FM","Efficienza",
    "Gol","Assist","Amm","Esp","GolSubiti",
    "90s","xG","xA","xG90","xA90","xG_diff",
    "under_match","fbref_match",
]
out = out[[c for c in FINAL if c in out.columns]]

# arrotondamenti
for c in ["Mv","FM","Efficienza","xG","xA","xG90","xA90","xG_diff","90s"]:
    if c in out.columns:
        out[c] = pd.to_numeric(out[c], errors="coerce").round(2)

# ordina per ruolo poi QtA desc
ROLE_ORDER = ["Por","B","Dd","Ds","Dc","E","M","C","T","W","A","Pc"]
def primary(rm):
    rs = [r.strip() for r in str(rm).split(";") if r.strip()]
    for r in ROLE_ORDER:
        if r in rs: return r
    return rs[0] if rs else "?"
out["_r"] = out["RM"].apply(lambda rm: ROLE_ORDER.index(primary(rm)) if primary(rm) in ROLE_ORDER else 99)
out = out.sort_values(["_r","QtA"], ascending=[True,False]).drop(columns=["_r"])

# ── 7. EXPORT ─────────────────────────────────────────────────────────────────

out_path = f"{BASE}/stagione2627/Lista_Enriched_2627.csv"
out.to_csv(out_path, index=False)

print(f"\n{'─'*55}")
print(f"Output : {out_path}")
print(f"Totale : {len(out)} giocatori | {len(out.columns)} colonne")
print(f"Colonne: {list(out.columns)}")
print()
for c,label in [("Pv","Pv"),("FM","FM"),("xG","xG"),("GolSubiti","GolSubiti"),("90s","90s")]:
    if c in out.columns:
        n = out[c].notna().sum()
        print(f"  {label:12}: {n:3}/{len(out)} ({n/len(out)*100:.0f}%)")
print()
print("Top 10 xG attaccanti:")
att = out[out["R"]=="A"].dropna(subset=["xG"]).nlargest(10,"xG")[["Nome","Squadra","Gol","FM","xG","xA","xG_diff"]]
print(att.to_string(index=False))
