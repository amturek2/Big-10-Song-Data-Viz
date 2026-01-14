import GenreBaselineBars from "../charts/GenreBaselineBars";

export default function BaselineSection({ conferenceFilter = "All" }) {
  return (
    <section className="vizSection">
      <div className="vizSection_inner">
        <div className="vizSection_intro"></div>
        <div className="vizSection_chart">
          <GenreBaselineBars
            activeStep={1}
            conferenceFilter={conferenceFilter}
          />
        </div>
      </div>
    </section>
  );
}
