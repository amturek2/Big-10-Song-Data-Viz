# Big Ten Fight Song Data Viz

A data pipeline and interactive visualization that explores how Big Ten
fight songs use language, tradition, and identity. The project cleans raw song
metadata, enriches it with CFB attendance context and lyric geography, then
translates lyrics into thematic scores you can explore across schools and
conferences.

## Live Visualization

Visit Here --> https://amturek2.github.io/Big-10-Song-Data-Viz/

## Highlights

- Lyric DNA map with hover + click details, Spotify embeds, and full lyrics.
- Conference heatmap comparing six lyric themes.
- Density, length, and redundancy charts to show how songs stack up.
- Lexicon-based scoring for themes like aggression, unity, and tradition.

## Repo Layout

data_pipeline/
data_scripts/
input_files/
output_data/
fight-song-viz/
public/
src/
charts/
data/
sections/
styles/
utils/
README.md

- `data_pipeline/` data cleaning, enrichment, and scoring scripts.
- `data_pipeline/input_files/` raw inputs (fight songs, CFB attendance, lyrics).
- `data_pipeline/output_data/` generated clean + merged datasets.
- `fight-song-viz/` React + Vite frontend and static assets.

## Data Pipeline

Run these scripts from the repo root so paths resolve correctly:

```bash
python data_pipeline/data_scripts/01_clean_fight_songs.py
python data_pipeline/data_scripts/02_compute_cfb_home_metrics.py
python data_pipeline/data_scripts/03_merge_cfb_and_songs.py
python data_pipeline/data_scripts/04_merge_lat_long.py
python data_pipeline/data_scripts/trope_classification.py
```

Outputs land in `data_pipeline/output_data/` and drive the charts, including:

- `final_songs.csv` merged lyrics + song metadata + CFB context.
- `conference_trope_summary.csv` conference-level theme averages.
- `fight_song_trope_classification.csv` per-song theme scores.

Python dependencies used in the pipeline: `pandas`, `numpy`.

## Frontend App (fight-song-viz)

```bash
cd fight-song-viz
npm install
npm run dev
```

The app reads data from `fight-song-viz/src/data/` (CSV + topojson). If you
rebuild the pipeline, copy updated outputs into that folder as needed.

## Data Inputs

- `data_pipeline/input_files/fight-songs-raw.csv`
- `data_pipeline/input_files/CFBAttendanceData.csv`
- `data_pipeline/input_files/lyrics_dataset.csv`

## Notes

- The map uses `us-states-10m.json` for basemap geometry.
- Theme scoring comes from a curated lyric lexicon in
  `data_pipeline/data_scripts/trope_classification.py`.
