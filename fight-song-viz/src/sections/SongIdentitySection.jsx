// src/sections/SongIdentitySection.jsx
import { useEffect, useState } from "react";
import * as d3 from "d3";
import TropeDensityBySchool from "../charts/TropeDensityBySchool";
import USSchoolMap from "../charts/USSchoolMap";
import LengthVsRedundancyQuadrant from "../charts/LengthVsRedundancyQuadrant";
import ConferenceHeatmap from "../charts/ConferenceHeatmap";
import "./SongIdentitySection.css";

export default function SongIdentitySection({ conferenceFilter = "All" }) {
  const [heatmapData, setHeatmapData] = useState([]);

  useEffect(() => {
    const csvUrl = new URL(
      "../data/conference_trope_summary_1.csv",
      import.meta.url
    ).toString();

    d3.csv(csvUrl).then((rows) => {
      const parsed = rows.map((d) => ({
        ...d,
        score_aggression: +d.score_aggression,
        score_unity: +d.score_unity,
        score_tradition: +d.score_tradition,
        score_pageantry: +d.score_pageantry,
        score_institutional: +d.score_institutional,
        score_competitive_glory: +d.score_competitive_glory,
      }));
      setHeatmapData(parsed);
    });
  }, []);

  return (
    <section className="identitySection" id="identity-section">
      <div className="identitySection_inner">
        <header className="languageSection_header">
          <h2 className="languageSection_title">
            How Schools Script Their Identity
          </h2>
          <p className="identitySection_subtitle">
            Same genre, different identities. Some schools pack every trope into
            a dense hype script, others keep it minimal. This section maps how
            each school shows up in lyrics, structure, geography, and
            conference-wide style.
          </p>
        </header>
        <div className="languageSection_kpiRow" role="status"></div>

        {/* BENTO GRID */}
        <div className="identityGrid identityGrid--bento">
          {/* DENSITY – left, 2 row units */}
          <article className="identityCard identityCard--primary identityCard--density">
            <div className="identityCard_intro">
              <h3 className="identityCard_title">How Dense Is Tradition?</h3>
              <p className="identityCard_desc">
                Some fight songs include every trope in the book. Others keep it
                lean.
              </p>
            </div>
            <div className="identityCard_chart identityCard_chart--tall">
              <TropeDensityBySchool
                activeStep={3}
                topN={40}
                colorBy="conference"
                conferenceFilter={conferenceFilter}
              />
            </div>
          </article>

          {/* MAP – right, 4 row units */}
          <article className="identityCard identityCard--primary identityCard--map">
            <div className="identityCard_intro">
              <h3 className="identityCard_title">The DNA of a School</h3>
              <p className="identityCard_desc">
                Same genre, different identities. Hover schools to see their
                trope DNA.
              </p>
            </div>
            <div className="identityCard_chart identityCard_chart--map">
              <USSchoolMap activeStep={3} conferenceFilter={conferenceFilter} />
            </div>
          </article>

          {/* LENGTH VS REDUNDANCY – left, 4 row units */}
          <article className="identityCard identityCard--length">
            <div className="identityCard_intro">
              <h3 className="identityCard_title">Length vs Redundancy</h3>
              <p className="identityCard_desc">
                Do longer songs actually say more, or do they repeat the same
                hype louder?
              </p>
            </div>
            <div className="identityCard_chart identityCard_chart--scatter">
              <LengthVsRedundancyQuadrant
                activeStep={3}
                conferenceFilter={conferenceFilter}
              />
            </div>
            <p className="identityCard_caption">
              Right means longer songs; up means more “fight” repetition per
              60 seconds. Bigger dots indicate more total fight words.
            </p>
          </article>

          {/* HEATMAP – right, 2 row units */}
          <article className="identityCard identityCard--heatmap">
            <div className="identityCard_intro">
              <h3 className="identityCard_title">
                Hype Profiles by Conference
              </h3>
              <p className="identityCard_desc">
                Cells show how strongly each conference leans into different
                hype styles.
              </p>
            </div>
            <div className="identityCard_chart identityCard_chart--heatmap">
              <ConferenceHeatmap data={heatmapData} />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
