import pandas as pd
import numpy as np
import re
from pathlib import Path

BASE = Path(__file__).resolve().parent
PROJECT_ROOT = BASE.parent

# ---- INPUT: single file with everything (lyrics included) ----
songs_path = PROJECT_ROOT / "output_data" / "final_songs.csv"
songs = pd.read_csv(songs_path)

# ---------- Helpers ----------

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
    except Exception:
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


merged = songs.copy()

merged["lyrics_norm"] = merged["lyrics"].map(normalize_text)
merged["tokens"] = merged["lyrics_norm"].map(tokenize)
merged["n_words"] = merged["tokens"].map(len).replace(0, np.nan)

LEX = {
    "aggression": {
        "fight", "beat", "crush", "defeat", "strike", "down", "smash",
        "battle", "enemy", "foe",
        "hit", "hits", "hitting",
        "charge", "charges", "charging",
        "plunge", "plunges", "plunging",
        "drive", "drives", "driving",
        "push", "pushed", "pushing",
        "attack", "attacks", "attacking",
        "rush", "rushing",
        "smack", "slam",
        "crushes", "crushing",
        "knock", "knocks", "knocking",
        "line",  
        "war", "warpath",
        "hell", 
        "wreck", "wrecks", "wrecking",
        "downed", "downing",
        "kill" 
    },

    "unity": {
        "we", "our", "us", "together", "stand", "united", "one", "team",
        "loyal", "true", "hearts", "brothers", "brotherhood", "friends",
        "sons", "daughters", "boys", "girls",
        "fans", "fellows", "comrades", "mates", "gang",
        "all", "everyone", "everybody",
        "side",  
        "band", "crew",
        "forever", "ever", "always", 
        "together", "along",
        "we'll", "were", "weve"  
    },

    "tradition": {
        "alma", "mater", "tradition", "old", "forever", "honor", "faithful",
        "glory", "fame", "heroes", "hero",
        "valiant", "loyal", "true", "ever", "always",
        "again", "echoes", "echo", 
        "crown", "crowned",
        "heritage", "legend", "legacy",
        "old", "dear", "own",
        "hail"  
    },

    "chant_cheer": {
        "rah", "hey", "hail", "hooray", "hurray", "cheer", "yell",
        "hoorah", "hurrah", "whoo", "woo", "whOO", 
        "yay", "yeah",
        "roar", "roaring",
        "shout", "shouting",
        "clap", "claps", "clapping",
        "bells", "bell",
        "thunder", "thunders",
        "echo", "echoes",
        "song", "sing", "singing", "chant", "chanting",
        "hymn", "chorus",
        "hooperay", "sis", "boom", "boomers",
        "yea", "yay", "who-rah", "whoo-rah"
    },

    "competitive_glory": {
        "champion", "champions", "glory", "victory", "wins", "won", "triumph",
        "victor", "victors", "victorious",
        "championship", "championships",
        "best", "great", "greatest",
        "leaders", "leading",
        "conquering",
        "heroes", "hero",
        "fame", "honor", "pride",
        "title", "crown", "crowned",
        "valiant", "mighty", "strong", "stronger",
        "win", "winning" 
    },
}

COLOR_WORDS = {
    "blue", "red", "green", "gold", "yellow", "orange", "purple", "white", "black",
    "scarlet", "crimson", "navy", "maroon", "silver", "gray", "grey", "cardinal",
    "garnet", "teal",
    "golden",
    "bronze", "brown", "tan",
    "cream",
    "azure", "indigo",
    "royal", 
    "old",   
}
COLOR_WORDS = {
    "blue", "red", "green", "gold", "yellow", "orange", "purple", "white", "black",
    "scarlet", "crimson", "navy", "maroon", "silver", "gray", "grey", "cardinal",
    "garnet", "teal",
    "golden",
    "bronze", "brown", "tan",
    "cream",
    "azure", "indigo",
}

for k, lexset in LEX.items():
    merged[f"lex_{k}_freq"] = merged["tokens"].map(
        lambda toks, s=lexset: lexicon_freq(toks, s)
    )

# School tokens for institutional pride
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

# Binary trope flags
for col in ["fight","victory","win_won","opponents","rah","nonsense","colors","men","official_song"]:
    if col in merged.columns:
        merged[col] = merged[col].map(to01)
    else:
        merged[col] = 0

# BPM / duration
merged["bpm"] = pd.to_numeric(merged.get("bpm", np.nan), errors="coerce")
merged["sec_duration"] = pd.to_numeric(merged.get("sec_duration", np.nan), errors="coerce")
merged["bpm_z"] = zscore(merged["bpm"]) if "bpm" in merged else 0
merged["dur_z"] = zscore(merged["sec_duration"]) if "sec_duration" in merged else 0

# ---------- Scores ----------

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

merged["score_chant_cheer"] = (
    1.5*merged["rah"] + 1.0*merged["nonsense"]
    + 8.0*merged["lex_chant_cheer_freq"]
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
    "score_chant_cheer","score_institutional","score_competitive_glory"
]

label_map = {
    "score_aggression": "Aggression/Conflict",
    "score_unity": "Unity/Brotherhood",
    "score_tradition": "Tradition/Legacy",
    "score_chant_cheer": "Chant/Cheer",
    "score_institutional": "School Pride",
    "score_competitive_glory": "Winning & Glory",
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

# ---------- Conference-level summary for heat map ----------

conf_dist = (
    merged.groupby(["conference","primary_bucket"])
    .size()
    .reset_index(name="n_songs")
)
conf_tot = merged.groupby("conference").size().rename("total").reset_index()
conf_dist = conf_dist.merge(conf_tot, on="conference", how="left")
conf_dist["pct"] = conf_dist["n_songs"] / conf_dist["total"]

conf_pivot = conf_dist.pivot_table(
    index="conference",
    columns="primary_bucket",
    values="pct",
    fill_value=0
).reset_index()

conf_scores = merged.groupby("conference")[score_cols].mean(numeric_only=True).reset_index()
conf_summary = conf_pivot.merge(conf_scores, on="conference", how="left")

# ---------- Outputs ----------

out_dir = PROJECT_ROOT / "output_data"
out_dir.mkdir(parents=True, exist_ok=True)

song_out_path = out_dir / "fight_song_trope_classification_1.csv"
conf_out_path = out_dir / "conference_trope_summary_1.csv"

# keep all original columns + new score columns
extra_cols = [
    "primary_bucket", "secondary_bucket",
    "score_aggression", "score_unity", "score_tradition",
    "score_chant_cheer", "score_institutional", "score_competitive_glory",
    "lex_aggression_freq", "lex_unity_freq", "lex_tradition_freq",
    "lex_chant_cheer_freq", "lex_institutional_freq", "lex_competitive_glory_freq",
]

base_cols = list(songs.columns)
out_cols = base_cols + [c for c in extra_cols if c not in base_cols]

song_out = merged[out_cols].copy()
song_out.to_csv(song_out_path, index=False)
conf_summary.to_csv(conf_out_path, index=False)

print(f"Wrote: {song_out_path}")
print(f"Wrote: {conf_out_path}")
