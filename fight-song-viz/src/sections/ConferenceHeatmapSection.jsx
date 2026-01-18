import { useState, useEffect } from "react";
import * as d3 from "d3";
import ConferenceHeatmap from "../charts/ConferenceHeatmap";

export default function ConferenceByHeatmapSection() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const csvUrl = new URL(
      "../data/conference_trope_summary_1.csv",
      import.meta.url,
    ).toString();
    d3.csv(csvUrl).then((rows) => {
      const parsed = rows.map((d) => ({
        ...d,
        score_aggression: +d.score_aggression,
        score_unity: +d.score_unity,
        score_tradition: +d.score_tradition,
        score_chant_cheer: +d.score_chant_cheer,
        score_institutional: +d.score_institutional,
        score_competitive_glory: +d.score_competitive_glory,
      }));
      setData(parsed);
    });
  }, []);

  return (
    <section className="vizSection">
      <div className="vizSection_inner">
        <div className="vizSection_intro">
          <h2 className="vizSection_title">xxx</h2>
          <p className="vizSection_desc">xxx</p>
        </div>
        <div className="vizSection_chart">
          <ConferenceHeatmap data={data} />
        </div>
      </div>
    </section>
  );
}
