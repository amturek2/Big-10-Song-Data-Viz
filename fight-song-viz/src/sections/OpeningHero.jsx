import { useEffect, useMemo, useState } from "react";
import "./OpeningHero.css";
import { conferenceColors } from "../utils/conferenceColors";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
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
  conferenceCount = 0,
  conferenceCountLabel = "",
  stats = [
    { label: "Schools", value: "65" },
    { label: "Tropes tracked", value: "9" },
    { label: "Conferences", value: "6" },
  ],
}) {
  const progress = useScrollProgress();

  const scorePct = useMemo(() => Math.round(progress * 100), [progress]);
  const filterGlow = useMemo(() => {
    if (conferenceFilter === "All") return "#F5C77A";
    return conferenceColors[conferenceFilter] ?? "#F5C77A";
  }, [conferenceFilter]);
  const filterGlowVars = useMemo(() => {
    const rgb = hexToRgb(filterGlow) ?? { r: 245, g: 199, b: 122 };
    return {
      "--conf-glow": filterGlow,
      "--conf-glow-soft": `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`,
      "--conf-glow-strong": `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.65)`,
    };
  }, [filterGlow]);

  return (
    <section className="hero">
      <div className="hero_bg" aria-hidden="true" />
      <div className="hero_grain" aria-hidden="true" />

      <div className="scorebug" aria-hidden="true" style={filterGlowVars}>
        <div className="scorebug_left">
          <span className="scorebug_tag">NCAA FIGHT SONG LAB</span>
          <span className="scorebug_dot" />
          <span className="scorebug_small">
            {conferenceCountLabel || conferenceCount}
          </span>
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
          <span className="hero_badge hero_badge-ghost">CREATIVE DATA VIZ</span>
        </div>

        <h1 className="hero_title">{title}</h1>
        <p className="hero_subtitle">{subtitle}</p>

        <p className="hero_deck">{deck}</p>

        <div className="hero_pills">
          {stats.map((s) => (
            <StatPill key={s.label} label={s.label} value={s.value} />
          ))}
        </div>

        <a className="hero_cta" href="#language-section">
          <div className="hero_chev" aria-hidden="true">
            ⌄
          </div>
          <div className="hero_ctaText">{cta}</div>
        </a>
      </div>
    </section>
  );
}
