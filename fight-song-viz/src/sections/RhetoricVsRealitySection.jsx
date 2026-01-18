import { useState } from "react";
import RhetoricVsRealityScatter from "../charts/RhetoricVsRealityScatter";

export default function RhetoricVsRealitySection({ conferenceFilter = "All" }) {
  const [isIndexHover, setIsIndexHover] = useState(false);

  return (
    <section className="vizSection vizSection-final">
      <div className="identitySection_inner">
        <header className="languageSection_header">
          <h2 className="languageSection_title">
            When the Talk Meets the Scoreboard
          </h2>
          <p className="vizSection_desc">
            A look at how competitive language stacks up against home win
            percentage. Home win percentage is used since fight songs are
            performed in home stadiums, where their energy is expected to have
            the most impact.
          </p>
        </header>

        <div className="vizSection_chart vizSection_chart-full">
          <RhetoricVsRealityScatter
            activeStep={3}
            conferenceFilter={conferenceFilter}
            onIndexHoverChange={setIsIndexHover}
          />
        </div>

        <div className="vizSection_index">
          <div className="vizSection_note">
            <div
              className={`vizSection_noteTitle cliIndexTitle${
                isIndexHover ? " cliIndexTitle--active" : ""
              }`}
            >
              How the Index Works | Higher values = more competitive language
              per minute.
            </div>
            <div
              className={`cliIndexFlow cliIndexDescription${
                isIndexHover ? " cliIndexDescription--active" : ""
              }`}
            >
              <div className="cliIndexFlowRow">
                <div className="cliIndexChip">1. Count competitive words</div>
                <div className="cliIndexArrow" aria-hidden="true">
                  →
                </div>
                <div className="cliIndexChip">2. Divide by song length</div>
                <div className="cliIndexChip">3. Scale to per-minute rate</div>
              </div>
            </div>
            <div
              className={`cliIndexNote cliIndexDescription${
                isIndexHover ? " cliIndexDescription--active" : ""
              }`}
            ></div>
          </div>
        </div>
      </div>
    </section>
  );
}
