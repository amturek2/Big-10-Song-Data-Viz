import USSchoolMap from "../charts/USSchoolMap";

export default function MapSection({ conferenceFilter = "All" }) {
  return (
    <section className="vizSection">
      <div className="vizSection_nner">
        <div className="vizSection_ntro">
          <h2 className="vizSection_title">The DNA of a School</h2>
          <p className="vizSection_desc">
            Same genre. Different identities. Hover schools to see their trope
            DNA.
          </p>
        </div>
        <div className="vizSection_chart">
          <USSchoolMap activeStep={3} conferenceFilter={conferenceFilter} />
        </div>
      </div>
    </section>
  );
}
