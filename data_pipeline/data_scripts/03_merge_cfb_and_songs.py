from pathlib import Path
import pandas as pd

BASE = Path(__file__).resolve().parent

SONGS_IN = (BASE / "../output_data/fight-songs-cleaned.csv").resolve()
CFB_IN   = (BASE / "../output_data/cfb_home_metrics.csv").resolve()
OUT      = (BASE / "../output_data/fight-songs-plus-cfb.csv").resolve()

songs = pd.read_csv(SONGS_IN)
cfb   = pd.read_csv(CFB_IN)

cfb = cfb.rename(columns={"school_key": "school_id"})

# fix the only mistmatches in the two sets
alias_map = {
    "ole_miss": "mississippi",
    "pittsburgh": "pitt",
    "nc_state": "north_carolina_state",
}

cfb["school_id"] = cfb["school_id"].replace(alias_map)

merged = songs.merge(cfb, on="school_id", how="left")

missing = merged["avg_home_attendance"].isna().sum()
print("Songs missing CFB metrics:", missing)

unmatched = merged.loc[
    merged["avg_home_attendance"].isna(), "school_id"
].unique().tolist()


# ---- write ----
OUT.parent.mkdir(parents=True, exist_ok=True)
merged.to_csv(OUT, index=False)
print("Wrote ->", OUT)
