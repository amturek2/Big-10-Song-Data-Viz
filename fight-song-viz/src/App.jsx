import { useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import BaselineSection from "./sections/BaselineSection";
import TropeNetworkSection from "./sections/TropeNetworkSection";
import OpeningHero from "./sections/OpeningHero";
import "./App.css";
import SongIdentitySection from "./sections/SongIdentitySection";
import RhetoricVsRealitySection from "./sections/RhetoricVsRealitySection";

export default function App() {
  const [conferenceFilter, setConferenceFilter] = useState("All");
  const [conferenceOptions, setConferenceOptions] = useState(["All"]);
  const [languageKpi, setLanguageKpi] = useState(null);
  const [songRows, setSongRows] = useState([]);

  useEffect(() => {
    const csvUrl = new URL("./data/song_data.csv", import.meta.url).toString();
    d3.csv(csvUrl).then((rows) => {
      setSongRows(rows);
      const counts = new Map();
      rows.forEach((r) => {
        const conf = (r.conference || "").trim();
        if (!conf) return;
        counts.set(conf, (counts.get(conf) || 0) + 1);
      });
      const ordered = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);
      setConferenceOptions(["All", ...ordered]);
    });
  }, []);

  const conferenceCount = useMemo(() => {
    if (!songRows.length) return 0;
    if (conferenceFilter === "All") return songRows.length;
    return songRows.filter((r) => r.conference === conferenceFilter).length;
  }, [songRows, conferenceFilter]);
  const conferenceCountLabel = useMemo(
    () => `${conferenceCount} Schools Visualized`,
    [conferenceCount]
  );

  useEffect(() => {
    if (!songRows.length) return;
    const filteredRows =
      conferenceFilter === "All"
        ? songRows
        : songRows.filter((r) => r.conference === conferenceFilter);
    const total = filteredRows.length;
    const avgTropeCount =
      total > 0
        ? filteredRows.reduce((sum, r) => sum + Number(r.trope_count || 0), 0) /
          total
        : 0;
    setLanguageKpi({
      label: "Average trope count per song",
      value: avgTropeCount.toFixed(1),
    });
  }, [songRows, conferenceFilter]);

  return (
    <div className="siteShell">
      <div className="siteBg" aria-hidden="true" />
      <div className="siteTexture" aria-hidden="true" />
      <div className="siteContent">
        {" "}
        <OpeningHero
          conferenceOptions={conferenceOptions}
          conferenceFilter={conferenceFilter}
          onConferenceChange={setConferenceFilter}
          conferenceCount={conferenceCount}
          conferenceCountLabel={conferenceCountLabel}
        />
        <section className="languageSection" id="language-section">
          <div className="languageSection_inner">
            <header className="languageSection_header">
              <h2 className="languageSection_title">
                How Fight Songs Use Language
              </h2>
              <p className="languageSection_subtitle">
                Most fight songs lean on the same core script—fight, school
                colors, and winning—while chants and nonsense syllables take a
                backseat.
              </p>
            </header>
            {languageKpi ? (
              <div className="languageSection_kpiRow" role="status">
                <span className="languageSection_kpiMetric">
                  {languageKpi.label}: {languageKpi.value}
                </span>
                <span className="languageSection_kpiDivider">|</span>
                <span className="languageSection_kpiNote">
                  Bars show how common each trope is. The network shows which
                  tropes tend to appear together in the same song.
                </span>
              </div>
            ) : null}
            <div className="sectionRow sectionRow-language">
              <BaselineSection conferenceFilter={conferenceFilter} />

              <TropeNetworkSection conferenceFilter={conferenceFilter} />
            </div>
            <div className="languageSection_keybar">
              <span className="languageSection_keyLabel">KEY INSIGHT</span>
              <span className="languageSection_keyText">
                The baseline ranks the most common tropes, while the network
                shows how those ideas cluster into a shared hype grammar.
              </span>
            </div>
          </div>
        </section>
        <SongIdentitySection conferenceFilter={conferenceFilter} />
        <RhetoricVsRealitySection conferenceFilter={conferenceFilter} />
        {/* <ConferenceByHeatmapSection></ConferenceByHeatmapSection> */}
      </div>
    </div>
  );
}
