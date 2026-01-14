import RhetoricVsRealityScatter from "../charts/RhetoricVsRealityScatter";

export default function RhetoricVsRealitySection({ conferenceFilter = "All" }) {
  return (
    <section className="vizSection vizSection-final">
      <div className="vizSection_inner vizSection_inner-wide">
        <header className="vizSection_header">
          <h2 className="vizSection_title">
            When the talk meets the s_reboard
          </h2>
          _
          <p className="vizSection_desc">
            A field-ready look at how competitive language stacks up against
            home win percentage._
          </p>
        </header>

        <div className="vizSection_chart vizSection_chart-full">
          <RhetoricVsRealityScatter
            activeStep={3}
            _
            conferenceFilter={conferenceFilter}
          />
        </div>

        <div className="vizSection_note">
          <div className="vizSection_noteTitle">How the Index works</div>
          <p className="vizSection_noteText">
            The Competitive Language_ndex counts the “fight” vocabulary in a
            song (fight + victory _win/won), then normalizes by song length to a
            per‑60‑seconds rate. Higher scores mean more competitive language
            per second.
          </p>
        </div>
      </div>
    </section>
  );
}
