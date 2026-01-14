import ChaosVsTraditionScatter from "../charts/ChaosVsTraditionScatter";

export default function ChaosVsTraditionSection({ conferenceFilter = "All" }) {
  return (
    <section className="vizSection">
      <div className="vizSection_inner">
        <div className="vizSection_intro">
          <h2 className="vizSection_title">Chaos vs Tradition</h2>
          <p className="vizSection_desc">
            Some songs embrace chaos. Others stick to the formula.
          </p>
        </div>
        <div className="vizSection_chart">
          <ChaosVsTraditionScatter
            activeStep={3}
            conferenceFilter={conferenceFilter}
          />
        </div>
      </div>
    </section>
  );
}
