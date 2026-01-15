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
            A look at how competitive language stacks up against home win
            percentage.
          </p>
        </header>

        <div className="vizSection_chart vizSection_chart-full">
          <RhetoricVsRealityScatter
            activeStep={3}
            conferenceFilter={conferenceFilter}
          />
        </div>

        <div className="vizSection_footer">
          <div className="vizSection_note">
            <div className="vizSection_noteTitle">How the Index works</div>
            <div className="vizSection_noteText vizSection_noteMath">
              <div className="vizSection_noteLine">
                CLI = ((Fight + Victory + Win/Won) / DurationSeconds) × 60
              </div>
              <div className="vizSection_noteLine">
                Inputs are raw word counts from lyrics; duration is song length
                in seconds.
              </div>
              <div className="vizSection_noteLine">
                Higher CLI = more competitive language per minute.
              </div>
            </div>
          </div>

          <div className="vizSection_source">
            <div className="vizSection_sourceTitle">
              Data Source: Kaggle + cfbfastR
            </div>
            <p className="vizSection_sourceText">
              Home win percentages were computed by processing a public Kaggle
              dataset of NCAA FBS games (2001–present), originally built using
              the SportsDataVerse <em>cfbfastR</em> package and NCAA Statistics.
              Dataset:
              <a
                className="vizSection_sourceLink"
                href="https://www.kaggle.com/datasets/nilnomics/cfb-attendance-data"
                target="_blank"
                rel="noopener noreferrer"
              >
                kaggle.com/…
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
