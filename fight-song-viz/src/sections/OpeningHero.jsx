import { useEffect, useMemo, useState } from "react";
import "./OpeningHero.css";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function useScrollProgress() {
  const [p, setP] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const prog = h > 0 ? y / h : 0;
      setP(clamp(prog, 0, 1));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return p;
}

function StatPill({ label, value }) {
  return (
    <div className="pill">
      <div className="pill_value">{value}</div>
      <div className="pill_label">{label}</div>
    </div>
  );
}

export default function OpeningHero({
  title = "Fight Songs, Quantified",
  subtitle = "A visual tour of what colleges sing when they want to feel unstoppable.",
  deck = "We treat fight songs like data: tropes, repetition, “rah” energy, and competitive language - then compare the rhetoric to reality.",
  cta = "Explore the charts",
  conferenceOptions = ["All"],
  conferenceFilter = "All",
  onConferenceChange = () => {},
  stats = [
    { label: "Schools", value: "130+" },
    { label: "Tropes tracked", value: "9" },
    { label: "Conferences", value: "6" },
  ],
}) {
  const progress = useScrollProgress();

  const scorePct = useMemo(() => Math.round(progress * 100), [progress]);

  return (
    <section className="hero">
      <div className="hero_bg" aria-hidden="true" />
      <div className="hero_grain" aria-hidden="true" />

      <div className="scorebug" aria-hidden="true">
        <div className="scorebug_left">
          <span className="scorebug_tag">NCAA FIGHT SONG LAB</span>
          <span className="scorebug_dot" />
          <span className="scorebug_small">LIVE</span>
        </div>
        <div className="scorebug_right">
          <span className="scorebug_small">{scorePct}%</span>
          <div className="scorebug_bar">
            <div className="scorebug_fill" style={{ width: `${scorePct}%` }} />
          </div>
          <div className="scorebug_filter">
            <label className="scorebug_label" htmlFor="confFilter">
              Conference
            </label>
            <select
              id="confFilter"
              className="scorebug_select"
              value={conferenceFilter}
              onChange={(event) => onConferenceChange(event.target.value)}
            >
              {conferenceOptions.map((conf) => (
                <option key={conf} value={conf}>
                  {conf === "All" ? "All Conferences" : conf}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="hero_inner">
        <div className="hero_topline">
          <span className="hero_badge">DATA VIZ • D3 • REACT</span>
          <span className="hero_badge hero_badge--ghost">
            CREATIVE DATA VIZ
          </span>
        </div>

        <h1 className="hero_title">{title}</h1>
        <p className="hero_subtitle">{subtitle}</p>

        <p className="hero_deck">{deck}</p>

        <div className="hero_pills">
          {stats.map((s) => (
            <StatPill key={s.label} label={s.label} value={s.value} />
          ))}
        </div>

        <div className="hero_cta">
          <div className="hero_chev" aria-hidden="true">
            ⌄
          </div>
          <div className="hero_ctaText">{cta}</div>
        </div>
      </div>
    </section>
  );
}
