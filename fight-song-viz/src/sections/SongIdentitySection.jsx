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
  const [showHeatmapExplain, setShowHeatmapExplain] = useState(false);

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
            This section shows how each school shapes its own fight-song
            identity. Some lean into every trope, others keep it minimal; some
            stretch their songs long, others repeat their message fast. Across
            structure, lyrics, geography, and conference style, these charts
            reveal the musical DNA that defines each school's spirit.
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
                Do long fight songs pack more meaning, or just more “fight!
                fight! fight!” per minute?
              </p>
            </div>
            <div className="identityCard_chart identityCard_chart--scatter">
              <LengthVsRedundancyQuadrant
                activeStep={3}
                conferenceFilter={conferenceFilter}
              />
            </div>
            <p className="identityCard_caption">
              Right means longer songs; up means more “fight” repetition per 60
              seconds. Bigger dots indicate more total fight words.
            </p>
          </article>

          {/* HEATMAP – right, 2 row units */}
          <article className="identityCard identityCard--heatmap">
            <div className="identityCard_intro">
              <h3 className="identityCard_title">
                Lyric Themes by Conference{" "}
              </h3>
              <p className="identityCard_desc">
                The heatmap compares conferences on six lyric themes. Darker
                cells mean that theme shows up more often in that conference’s
                fight songs than in others in this dataset.
              </p>
            </div>
            <div className="identityCard_chart identityCard_chart--heatmap">
              <ConferenceHeatmap data={heatmapData} />
            </div>
            <div className="identityCard_actions">
              <button
                type="button"
                className="identityCard_button"
                onClick={() => setShowHeatmapExplain(true)}
              >
                Explain the scores
              </button>
            </div>
          </article>
        </div>
      </div>
      {showHeatmapExplain && (
        <div
          className="identityModal_backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Heatmap score explanation"
          onClick={() => setShowHeatmapExplain(false)}
        >
          <div
            className="identityModal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="identityModal_header">
              <h3 className="identityModal_title">
                How the Heatmap Scores Work
              </h3>
              <button
                type="button"
                className="identityModal_close"
                onClick={() => setShowHeatmapExplain(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="identityModal_text identityModal_math">
              <strong>How we calculate the scores:</strong> for each fight song,
              we scan the lyrics and count how often certain kinds of words
              appear (for example, battle words like <i>fight</i> or{" "}
              <i>crush</i>, unity words like <i>we</i> or <i>together</i>,
              school-name and color mentions, and so on). We then mix in a few
              musical details like tempo and song length to nudge some themes up
              or down (longer, slower songs tend to feel more traditional;
              faster songs tend to feel more aggressive). Those ingredients are
              combined into six theme scores for each song, and the heatmap
              shows the average of those scores for all schools in a conference.
            </p>

            <div className="identityModal_grid">
              <div className="identityModal_item">
                <div className="identityModal_label">Aggression / Conflict</div>
                <div className="identityModal_desc">
                  Battle language: fight, beat, crush, defeat, enemy, smash.
                </div>
              </div>
              <div className="identityModal_item">
                <div className="identityModal_label">Unity / Brotherhood</div>
                <div className="identityModal_desc">
                  We, us, our, together, loyal, stand, team, brothers.
                </div>
              </div>
              <div className="identityModal_item">
                <div className="identityModal_label">Tradition / Legacy</div>
                <div className="identityModal_desc">
                  Alma mater, honor, faithful, forever, old, legacy, tradition.
                </div>
              </div>
              <div className="identityModal_item">
                <div className="identityModal_label">Pageantry / Spectacle</div>
                <div className="identityModal_desc">
                  Rah, hail, cheer, yell, chant, crowd-call, nonsense syllables.
                </div>
              </div>
              <div className="identityModal_item">
                <div className="identityModal_label">Institutional Pride</div>
                <div className="identityModal_desc">
                  School name, colors, mascot, campus, home, alma mater
                  references.
                </div>
              </div>
              <div className="identityModal_item">
                <div className="identityModal_label">Competitive Glory</div>
                <div className="identityModal_desc">
                  Champion, victory, glory, win, triumph, titles, being the
                  best.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
