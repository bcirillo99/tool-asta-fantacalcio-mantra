#!/usr/bin/env python3
"""
Arricchisce riassuntivo_asta_2627.csv con:
  1. xG, xA, xG90, xA90 da understat_top5_combined.csv  (nuovi per tutti)
  2. fb_* coverage migliorata per chi era fbref_match=False:
       – da fbref_top5_combined  (nuovi arrivi dall'estero)
       – da fbref_serieb_2526    (giocatori ex-Serie B)

Output: stagione2627/riassuntivo_enriched_2627.csv
"""

import pandas as pd
import numpy as np
import unicodedata
import re
from rapidfuzz import process as rfproc, fuzz

BASE = "/Users/benedettocirillo/Desktop/fantacalcio"

MATCH_THRESHOLD = 82   # score minimo rapidfuzz per accettare un match

# ── normalizzazione ───────────────────────────────────────────────────────────

_CHAR_MAP = str.maketrans("øØıðÐþæÆßłđ", "oOidDtaesld")

def normalize(s):
    if pd.isna(s): return ""
    s = str(s).translate(_CHAR_MAP)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 \-]", "", s.lower().strip())

# ── fuzzy match: cerca 'name' in dizionario {norm_key: original_row} ─────────

def fuzzy_match(name, lookup_keys, scorer=fuzz.token_sort_ratio):
    """Ritorna (chiave_migliore, score) o (None, 0)."""
    norm = normalize(name)
    if not norm: return None, 0
    result = rfproc.extractOne(norm, lookup_keys, scorer=scorer)
    if result and result[1] >= MATCH_THRESHOLD:
        return result[0], result[1]
    return None, 0

# ── carico file base ──────────────────────────────────────────────────────────

print("Carico riassuntivo base...")
df = pd.read_csv(f"{BASE}/stagione2627/riassuntivo_asta_2627.csv")

# bridge: fanta short name → full name dal listone
lista = pd.read_csv(f"{BASE}/stagione2627/Lista-FantaAsta-Fantacalcio.csv", header=None)
name_bridge = dict(zip(lista[1].str.strip(), lista[2].str.strip()))
df["_fullname"] = df["Nome"].map(name_bridge)
df["_fullname_norm"] = df["_fullname"].apply(normalize)

# ── 1. UNDERSTAT — xG / xA ───────────────────────────────────────────────────

print("Match understat (xG/xA)...")
under = pd.read_csv(f"{BASE}/stagione2526/stats_players/understat_top5_combined.csv", sep=";")
under_sa = under[under["league"] == "it Serie A"].copy()
under_sa["_norm"] = under_sa["player"].apply(normalize)
under_sa = under_sa.drop_duplicates(subset="_norm", keep="first")

under_lookup = dict(zip(under_sa["_norm"], under_sa.index))
under_keys   = list(under_lookup.keys())

xg_cols = ["xG", "xA", "xG90", "xA90"]
xg_data = {c: [] for c in xg_cols}
under_match_flag = []
under_match_name = []

for _, row in df.iterrows():
    norm = row["_fullname_norm"]

    # 1a. match esatto
    if norm in under_lookup:
        idx = under_lookup[norm]
        for c in xg_cols:
            xg_data[c].append(under_sa.loc[idx, c])
        under_match_flag.append(True)
        under_match_name.append(under_sa.loc[idx, "player"])
        continue

    # 1b. fuzzy
    best, score = fuzzy_match(norm, under_keys)
    if best:
        idx = under_lookup[best]
        for c in xg_cols:
            xg_data[c].append(under_sa.loc[idx, c])
        under_match_flag.append(True)
        under_match_name.append(f"~{under_sa.loc[idx, 'player']} ({score:.0f})")
    else:
        for c in xg_cols:
            xg_data[c].append(np.nan)
        under_match_flag.append(False)
        under_match_name.append("")

df["xG_2526"]      = xg_data["xG"]
df["xA_2526"]      = xg_data["xA"]
df["xG90_2526"]    = xg_data["xG90"]
df["xA90_2526"]    = xg_data["xA90"]
df["under_match"]  = under_match_flag
df["_under_name"]  = under_match_name   # debug, rimosso in output

matched_u = sum(under_match_flag)
print(f"  Understat: {matched_u}/{len(df)} giocatori matchati")

# ── 2. FBREF TOP5 + SERIE B — migliora copertura fb_* ────────────────────────

print("Match fbref top5 + Serie B (fill missing)...")

def load_fbref_extra(path):
    # fbref_top5 ha doppio header (riga 0 = categorie, riga 1 = nomi colonna)
    # fbref_serieb ha header singolo — prova header=1, fallback header=0
    try:
        df_f = pd.read_csv(path, header=1)
        if "Player" not in df_f.columns:
            raise ValueError
    except (ValueError, KeyError):
        df_f = pd.read_csv(path, header=0)
    df_f = df_f[df_f["Player"] != "Player"].dropna(subset=["Player"])
    cols_want = ["Player", "Squad", "90s", "Gls", "Ast", "CrdY", "CrdR"]
    cols_have = [c for c in cols_want if c in df_f.columns]
    df_f = df_f[cols_have].copy()
    for c in cols_have[2:]:
        df_f[c] = pd.to_numeric(df_f[c], errors="coerce")
    df_f["90s"] = pd.to_numeric(df_f.get("90s", np.nan), errors="coerce")
    df_f = df_f.sort_values("90s", ascending=False).drop_duplicates(subset="Player", keep="first")
    df_f["_norm"] = df_f["Player"].apply(normalize)
    return df_f

fbref_extra = load_fbref_extra(f"{BASE}/stagione2526/stats_players/fbref_top5_combined.csv")
fbref_serieb = load_fbref_extra(f"{BASE}/stagione2526/stats_players/fbref_serieb_2526.csv")
fbref_all = pd.concat([fbref_extra, fbref_serieb], ignore_index=True)
fbref_all = fbref_all.sort_values("90s", ascending=False).drop_duplicates(subset="_norm", keep="first")

fb_lookup = dict(zip(fbref_all["_norm"], fbref_all.index))
fb_keys   = list(fb_lookup.keys())

FB_FILL_COLS = ["90s", "Gls", "Ast", "CrdY", "CrdR"]

# solo per chi non aveva già fbref_match=True
needs_fill = df["fbref_match"] == False
fill_count = 0

for idx, row in df[needs_fill].iterrows():
    norm = row["_fullname_norm"]

    best_idx = None
    if norm in fb_lookup:
        best_idx = fb_lookup[norm]
    else:
        best, score = fuzzy_match(norm, fb_keys)
        if best:
            best_idx = fb_lookup[best]

    if best_idx is not None:
        m = fbref_all.loc[best_idx]
        for c in FB_FILL_COLS:
            dest = f"fb_{c}" if f"fb_{c}" in df.columns else None
            if dest and pd.isna(df.at[idx, dest]):
                df.at[idx, dest] = m.get(c, np.nan)
        df.at[idx, "fbref_match"] = True
        fill_count += 1

print(f"  fbref extra: {fill_count} nuovi match (erano False)")

# ── 3. metriche xG derivate ──────────────────────────────────────────────────

# xG - Gls: indica over/underperformance realizzativa
df["xG_diff_2526"] = (
    pd.to_numeric(df["xG_2526"], errors="coerce") -
    pd.to_numeric(df["fb_Gls"],  errors="coerce")
).round(2)

# ── 4. ordine colonne ─────────────────────────────────────────────────────────

PRIORITY = [
    "Nome", "R", "RM", "Squadra",
    "QtA", "FVM", "Rigorista", "Nuovo_Arrivo",
    "Pv_2526", "Mv_2526", "Fm_2526",
    "Gf_2526", "Gs_2526", "Ass_2526", "Amm_2526", "Esp_2526",
    "Efficienza_2526", "Gol90_2526",
    "Pv_2627", "Fm_2627", "Gf_2627", "Ass_2627", "Amm_2627",
    # understat (nuovo)
    "xG_2526", "xA_2526", "xG90_2526", "xA90_2526", "xG_diff_2526",
    "under_match",
    # fbref
    "fb_Min%", "fb_90s", "fb_Sh/90", "fb_SoT/90",
    "fb_G/Sh", "fb_G/SoT", "fb_+/-90", "fb_On-Off", "fb_PPM",
    "fb_Gls", "fb_Ast", "fb_CrdY", "fb_CrdR", "fb_Sh", "fb_SoT", "fb_SoT%",
    "fbref_match",
]
debug_cols  = [c for c in df.columns if c.startswith("_")]
other_cols  = [c for c in df.columns if c not in PRIORITY and c not in debug_cols]
final_cols  = [c for c in PRIORITY if c in df.columns] + other_cols
df = df[final_cols]

# ── 5. export ─────────────────────────────────────────────────────────────────

out = f"{BASE}/stagione2627/riassuntivo_enriched_2627.csv"
df.to_csv(out, index=False)

print(f"\n{'─'*60}")
print(f"Output: {out}")
print(f"Giocatori totali  : {len(df)}")
print(f"under_match=True  : {df['under_match'].sum()}")
print(f"fbref_match=True  : {(df['fbref_match']==True).sum()}")
print(f"fbref_match=extra : {(df['fbref_match']=='extra').sum()}")
print(f"fbref_match=False : {(df['fbref_match']==False).sum()}")
print(f"\nTop 10 per xG_2526:")
top = df.dropna(subset=["xG_2526"]).nlargest(10, "xG_2526")[["Nome","Squadra","xG_2526","xA_2526","Gf_2526"]]
print(top.to_string(index=False))
