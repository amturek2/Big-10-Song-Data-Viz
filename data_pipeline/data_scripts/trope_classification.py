import pandas as pd
import numpy as np
import re
from pathlib import Path


BASE = Path(__file__).resolve().parent


PROJECT_ROOT = BASE.parent  
songs_path  = PROJECT_ROOT / "output_data" / "fight-songs-plus-cfb.csv"
lyrics_path = PROJECT_ROOT / "input_files" / "lyrics_dataset.csv"

songs = pd.read_csv(songs_path)
lyrics = pd.read_csv(lyrics_path)

def to01(x):
    if pd.isna(x): 
        return 0
    if isinstance(x, (int, float, np.integer, np.floating)):
        return int(x != 0)
    s = str(x).strip().lower()
    if s in {"yes","y","true","t","1"}:
        return 1
    if s in {"no","n","false","f","0",""}:
        return 0
    try:
        return int(float(s) != 0)
    except:
        return 0

def normalize_text(s):
    if pd.isna(s): 
        return ""
    s = str(s).lower()
    s = re.sub(r"[\u2019\u2018]", "'", s)
    s = re.sub(r"[^a-z0-9'\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def tokenize(s):
    s = normalize_text(s)
    return s.split() if s else []

def zscore(s):
    mu = s.mean(skipna=True)
    sd = s.std(skipna=True)
    if sd == 0 or pd.isna(sd):
        return s * 0
    return (s - mu) / sd

def lexicon_freq(tokens, lexset):
    if not tokens:
        return 0.0
    cnt = sum(1 for t in tokens if t in lexset)
    return cnt / len(tokens)

def count_tokens(tokens, lexset):
    return sum(1 for t in tokens if t in lexset)

songs2 = songs.copy()
lyrics2 = lyrics.copy()

songs2["school_id_norm"] = songs2["school_id"].astype(str).str.strip().str.lower()
lyrics2["school_id_norm"] = lyrics2["school_id"].astype(str).str.strip().str.lower()

merged = songs2.merge(
    lyrics2[["school_id_norm", "lyrics"]],
    on="school_id_norm",
    how="left"
)

merged["lyrics_norm"] = merged["lyrics"].map(normalize_text)
merged["tokens"] = merged["lyrics_norm"].map(tokenize)
merged["n_words"] = merged["tokens"].map(len).replace(0, np.nan)

LEX = {
    "aggression": {"fight","beat","crush","defeat","win","won","conquer","kill","strike","down","smash","battle","enemy","foe"},
    "unity": {"we","our","us","together","stand","united","one","team","loyal","true","hearts","brothers","brotherhood","friends"},
    "tradition": {"alma","mater","tradition","old","forever","honor","faithful"},
    "pageantry": {"rah","hey","hail","hooray","hurray","cheer","yell"},
    "competitive_glory": {"champion","champions","glory","victory","win","wins","won","triumph"},
}

COLOR_WORDS = {
    "blue","red","green","gold","yellow","orange","purple","white","black","scarlet","crimson","navy","maroon",
    "silver","gray","grey","cardinal","garnet","teal"
}

for k, lexset in LEX.items():
    merged[f"lex_{k}_freq"] = merged["tokens"].map(lambda toks, s=lexset: lexicon_freq(toks, s))

merged["school_norm"] = merged["school"].astype(str).map(normalize_text)
merged["school_tokens"] = merged["school_norm"].map(tokenize)

STOP_SCHOOL = {"university","college","state","of","the","and","at"}

def institutional_pride_freq(row):
    toks = row["tokens"] if isinstance(row["tokens"], list) else []
    if not toks:
        return 0.0
    school_toks = set([t for t in row["school_tokens"] if t not in STOP_SCHOOL])
    lex = school_toks | COLOR_WORDS
    return count_tokens(toks, lex) / len(toks)

merged["lex_institutional_freq"] = merged.apply(institutional_pride_freq, axis=1)

for col in ["fight","victory","win_won","opponents","rah","nonsense","colors","men","official_song"]:
    if col in merged.columns:
        merged[col] = merged[col].map(to01)
    else:
        merged[col] = 0

merged["bpm"] = pd.to_numeric(merged.get("bpm", np.nan), errors="coerce")
merged["sec_duration"] = pd.to_numeric(merged.get("sec_duration", np.nan), errors="coerce")
merged["bpm_z"] = zscore(merged["bpm"]) if "bpm" in merged else 0
merged["dur_z"] = zscore(merged["sec_duration"]) if "sec_duration" in merged else 0

merged["score_aggression"] = (
    2.0*merged["fight"] + 1.5*merged["opponents"] + 1.0*merged["win_won"] + 1.0*merged["victory"]
    + 8.0*merged["lex_aggression_freq"]
    + 0.25*merged["bpm_z"].fillna(0)
)

merged["score_unity"] = (
    1.0*merged["men"] + 0.5*merged["colors"] - 0.5*merged["opponents"]
    + 8.0*merged["lex_unity_freq"]
)

merged["score_tradition"] = (
    2.0*merged["official_song"]
    + 8.0*merged["lex_tradition_freq"]
    + 0.20*merged["dur_z"].fillna(0)
    - 0.20*merged["bpm_z"].fillna(0)
)

merged["score_pageantry"] = (
    1.5*merged["rah"] + 1.0*merged["nonsense"]
    + 8.0*merged["lex_pageantry_freq"]
    + 0.20*merged["bpm_z"].fillna(0)
)

merged["score_institutional"] = (
    1.0*merged["colors"] + 0.5*merged["official_song"] - 0.25*merged["opponents"]
    + 8.0*merged["lex_institutional_freq"]
)

merged["score_competitive_glory"] = (
    1.0*merged["victory"] + 1.0*merged["win_won"]
    + 8.0*merged["lex_competitive_glory_freq"]
    - 1.5*merged["fight"]
    - 4.0*merged["lex_aggression_freq"]
)

score_cols = [
    "score_aggression","score_unity","score_tradition",
    "score_pageantry","score_institutional","score_competitive_glory"
]

label_map = {
    "score_aggression": "Aggression/Conflict",
    "score_unity": "Unity/Brotherhood",
    "score_tradition": "Tradition/Legacy",
    "score_pageantry": "Pageantry/Spectacle",
    "score_institutional": "Institutional Pride",
    "score_competitive_glory": "Competitive Glory",
}

merged["primary_bucket"] = merged[score_cols].idxmax(axis=1).map(label_map)

max_scores = merged[score_cols].max(axis=1)
second_scores = merged[score_cols].apply(lambda r: r.nlargest(2).iloc[-1], axis=1)
second_cols = merged[score_cols].apply(lambda r: r.nlargest(2).index[-1], axis=1)

merged["secondary_bucket"] = np.where(
    (max_scores - second_scores) <= 0.5,
    second_cols.map(label_map),
    ""
)

conf_dist = (
    merged.groupby(["conference","primary_bucket"])
    .size()
    .reset_index(name="n_songs")
)
conf_tot = merged.groupby("conference").size().rename("total").reset_index()
conf_dist = conf_dist.merge(conf_tot, on="conference", how="left")
conf_dist["pct"] = conf_dist["n_songs"] / conf_dist["total"]

conf_pivot = conf_dist.pivot_table(index="conference", columns="primary_bucket", values="pct", fill_value=0).reset_index()
conf_scores = merged.groupby("conference")[score_cols].mean(numeric_only=True).reset_index()
conf_summary = conf_pivot.merge(conf_scores, on="conference", how="left")


out_dir = PROJECT_ROOT / "output_data"
out_dir.mkdir(parents=True, exist_ok=True)

song_out_path = out_dir / "fight_song_trope_classification.csv"
conf_out_path = out_dir / "conference_trope_summary.csv"

keep_cols = [
    "school", "school_id", "conference", "song_name",

    "bpm", "sec_duration",

    "fight", "victory", "win_won", "opponents", "rah", "nonsense", "colors", "men", "official_song",

    # bucket labels
    "primary_bucket", "secondary_bucket",

    # scores (main outputs)
    "score_aggression", "score_unity", "score_tradition",
    "score_pageantry", "score_institutional", "score_competitive_glory",

    "lex_aggression_freq", "lex_unity_freq", "lex_tradition_freq",
    "lex_pageantry_freq", "lex_institutional_freq", "lex_competitive_glory_freq",
]

keep_cols = [c for c in keep_cols if c in merged.columns]

song_out = merged[keep_cols].copy()
song_out.to_csv(song_out_path, index=False)

conf_summary.to_csv(conf_out_path, index=False)

print(f"Wrote: {song_out_path}")
print(f"Wrote: {conf_out_path}")
