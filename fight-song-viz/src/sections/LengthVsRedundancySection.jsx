import LengthVsRedundancyQuadrant from "../charts/LengthVsRedundancyQuadrant";

export default function LengthVsRedundancySection({
  conferenceFilter = "All",
}) {
  return (
    <section className="vizSection">
      <div className="vizSection_inner">
        <div className="vizSection_intro">
          <h2 className="vizSection_title">Length vs Redundancy</h2>
          <p className="vizSection_desc">
            Do longer songs actually say more… or do they repeat the same hype
            louder?
          </p>
        </div>
        <div className="vizSection_chart">
          <LengthVsRedundancyQuadrant
            activeStep={3}
            conferenceFilter={conferenceFilter}
          />
        </div>
      </div>
    </section>
  );
}
