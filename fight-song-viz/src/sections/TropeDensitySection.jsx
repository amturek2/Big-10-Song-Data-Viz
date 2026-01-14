import TropeDensityBySchool from "../charts/TropeDensityBySchool";

export default function TropeDensitySection({ conferenceFilter = "All" }) {
  return (
    <section className="vizSection">
      <div className="vizSection_inner">
        <div className="vizSection_intro">
          <h2 className="vizSection_title">How Dense Is Tradition?</h2>
          <p className="vizSection_desc">
            Some fight songs include every trope in the book. Others keep it
            lean.
          </p>
        </div>
        <div className="vizSection_chart">
          <TropeDensityBySchool
            activeStep={3}
            topN={40}
            colorBy="conference"
            conferenceFilter={conferenceFilter}
          />
        </div>
      </div>
    </section>
  );
}
