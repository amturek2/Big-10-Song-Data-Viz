import os
import re
import pandas as pd

INFILE  = "../input_files/fight-songs-raw.csv"
OUTFILE = "../output_data/fight-songs-cleaned.csv"

YES = {"y","yes","true","1","t"}
NO  = {"n","no","false","0","f",""}

def to_school_key(s: str) -> str:
    # normalize 
    s = str(s).strip().lower()
    s = re.sub(r"&", "and", s)
    s = re.sub(r"[^a-z0-9]+", "_", s)

    return s.strip("_")

def normalize_bools(x):
    if pd.isna(x): return 0
    v = str(x).strip().lower()
    if v in YES: return 1
    if v in NO: return 0
    
    return 0

def main():
    df = pd.read_csv(INFILE)

  
    df["school_id"] = df["school"].apply(to_school_key)

    bool_cols = [
        "student_writer", "official_song", "contest", "fight", "victory", "win_won", "victory_win_won","rah", 
        "nonsense", "colors", "men", "opponents", "spelling"
    
    ]

    for c in bool_cols:
        if c in df.columns:
            df[c] = df[c].apply(normalize_bools)

    num_cols = ["year", "bpm", "sec_duration", "number_fights", "trope_count"]
    for c in num_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")

    os.makedirs(os.path.dirname(OUTFILE), exist_ok=True)
    df.to_csv(OUTFILE, index=False)
    print(f"Wrote {len(df)} rows -> {OUTFILE}")

if __name__ == "__main__":
    main()
