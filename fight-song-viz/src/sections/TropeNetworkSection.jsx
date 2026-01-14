import TropeNetwork from "../charts/TropeNetwork";

export default function TropeNetworkSection({ conferenceFilter = "All" }) {
  return (
    <section className="vizSection">
      <div className="vizSection_inner">
        <div className="vizSection_intro"></div>
        <div className="vizSection_chart">
          <TropeNetwork conferenceFilter={conferenceFilter} />
        </div>
      </div>
    </section>
  );
}
