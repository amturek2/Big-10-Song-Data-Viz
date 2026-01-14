import pandas as pd
from pathlib import Path

LYRICS_CSV = Path("data_pipeline/input_files/lyrics_dataset.csv")          
MAIN_CSV   = Path("data_pipeline/output_data/fight-songs-plus-cfb.csv")     
OUT_CSV    = Path("data_pipeline/output_data/final_songs.csv")

lyrics_df = pd.read_csv(LYRICS_CSV)
main_df   = pd.read_csv(MAIN_CSV)


lyrics_df["school_id"] = lyrics_df["school_id"].astype(str).str.strip().str.lower()
main_df["school_id"]   = main_df["school_id"].astype(str).str.strip().str.lower()

lyrics_rename = {
    "song name": "lyrics_song_name",
    "Latitude": "latitude",
    "Longitude": "longitude",
}
lyrics_df = lyrics_df.rename(columns={k: v for k, v in lyrics_rename.items() if k in lyrics_df.columns})


lyrics_df = (
    lyrics_df.sort_values(by=["school_id"])
             .drop_duplicates(subset=["school_id"], keep="first")
)

merged = main_df.merge(
    lyrics_df[["school_id", "lyrics_song_name", "lyrics", "latitude", "longitude"]],
    on="school_id",
    how="left",
    validate="m:1"  
)

missing_lyrics = merged["lyrics"].isna().sum()
missing_geo = merged["latitude"].isna().sum() + merged["longitude"].isna().sum()

print(f"Rows in main: {len(main_df)}")
print(f"Rows in lyrics (deduped): {len(lyrics_df)}")
print(f"Merged rows: {len(merged)}")
print(f"Missing lyrics rows after merge: {missing_lyrics}")
print(f"Missing lat/long cells after merge (lat+lon): {missing_geo}")

merged.to_csv(OUT_CSV, index=False)
print(f"Saved: {OUT_CSV.resolve()}")
