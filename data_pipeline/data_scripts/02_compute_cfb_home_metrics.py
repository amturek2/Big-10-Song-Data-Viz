import re
from pathlib import Path
import pandas as pd


BASE = Path(__file__).resolve().parent  
CFB_IN = (BASE / "../input_files/CFBAttendanceData.csv").resolve()
OUT = (BASE / "../output_data/cfb_home_metrics.csv").resolve()


def to_school_key(s: str) -> str:
    # normalize 
    s = str(s).strip().lower()
    s = re.sub(r"&", "and", s)
    s = re.sub(r"[^a-z0-9]+", "_", s)

    return s.strip("_")

def normalize_bool_true_false_na(x) -> bool:
    if pd.isna(x):
        return False
    v = str(x).strip().lower()
    return v in {"true", "t", "1", "yes", "y"}

def normalize_completed(x) -> bool:
    # treat n/a as not completed 
    if pd.isna(x):
        return False
    v = str(x).strip().lower()
    if v in {"true", "t", "1", "yes", "y"}:
        return True
    if v in {"false", "f", "0", "no", "n", "n/a", "na", ""}:
        return False
    return False

def main():
    df = pd.read_csv(CFB_IN, low_memory=False)

    # normalize bool values
    df["completed"] = df["completed"].apply(normalize_completed)
    df["neutral_site"] = df["neutral_site"].apply(normalize_bool_true_false_na)

    # normalize numeric
    df["attendance"] = pd.to_numeric(df["attendance"], errors="coerce")
    df["home_points"] = pd.to_numeric(df["home_points"], errors="coerce")
    df["away_points"] = pd.to_numeric(df["away_points"], errors="coerce")

    before = len(df)

    # we filter to valid home games with attendance and final scores 
    df = df[
        (df["completed"]) &
        (~df["neutral_site"]) &
        (df["attendance"].notna()) &
        (df["home_points"].notna()) &
        (df["away_points"].notna()) &
        (df["home_team"].notna())
    ].copy()

    after = len(df)

    print(f"\nRows before filter: {before}")
    print(f"Rows after  filter: {after}")


    # join key
    df["school_key"] = df["home_team"].apply(to_school_key)

    # define home win 
    df["home_win"] = df["home_points"] > df["away_points"]

    # aggregate per school 
    agg = df.groupby("school_key", as_index=False).agg(
        avg_home_attendance=("attendance", "mean"),
        attendance_sd=("attendance", "std"),
        home_games=("attendance", "count"),
        home_wins=("home_win", "sum"),
    )

    agg["home_win_pct"] = agg["home_wins"] / agg["home_games"]

    agg["avg_home_attendance"] = agg["avg_home_attendance"].round(2)
    agg["attendance_sd"] = agg["attendance_sd"].round(2)
    agg["home_win_pct"] = agg["home_win_pct"].round(4)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    agg.to_csv(OUT, index=False)

    # Print top 5 as a quick check
    print("\nTop 5 by avg_home_attendance:")
    print(agg.sort_values("avg_home_attendance", ascending=False).head(5))

if __name__ == "__main__":
    main()
