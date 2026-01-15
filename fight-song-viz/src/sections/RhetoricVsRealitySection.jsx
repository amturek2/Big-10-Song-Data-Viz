import RhetoricVsRealityScatter from "../charts/RhetoricVsRealityScatter";

export default function RhetoricVsRealitySection({ conferenceFilter = "All" }) {
  return (
    <section className="vizSection vizSection-final">
      <div className="identitySection_inner">
        <header className="languageSection_header">
          <h2 className="languageSection_title">
            When the Talk Meets the Scoreboard
          </h2>
          <p className="vizSection_desc">
            A field-ready look at how competitive language stacks up against
            home win percentage.
          </p>
        </header>

        <div className="vizSection_chart vizSection_chart-full">
          <RhetoricVsRealityScatter
            activeStep={3}
            conferenceFilter={conferenceFilter}
          />
        </div>

        <div className="vizSection_note">
          <div className="vizSection_noteTitle">How the Index works</div>
          <p className="vizSection_noteText">
            The Competitive Language Index counts the “fight” vocabulary in a
            song (fight + victory + win/won), then normalizes by song length to
            a per-60-seconds rate. Higher scores mean more competitive language
            per second.
          </p>
        </div>
      </div>
    </section>
  );
}
