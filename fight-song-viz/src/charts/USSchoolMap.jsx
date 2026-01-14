import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import {
  conferenceColors,
  makeConferenceColorScale,
} from "../utils/conferenceColors";

const unknownColor = "rgba(255,255,255,0.35)";

function hexToRgb(hex) {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

function rgbaFromHex(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(245, 199, 122, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function toBool01(v) {
  if (v == null) return false;
  return String(v).trim() === "1";
}

function useResizeObserver(ref) {
  const [size, setSize] = useState({ width: 900, height: 600 });
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setSize({ width: cr.width, height: cr.height });
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return size;
}

const defaultTopoUrl = new URL(
  "../data/us-states-10m.json",
  import.meta.url
).toString();
const defaultSongsCsvUrl = new URL(
  "../data/song_data.csv",
  import.meta.url
).toString();

const defaultTropeKeys = [
  "fight",
  "victory",
  "win_won",
  "rah",
  "spelling",
  "colors",
  "opponents",
  "men",
  "nonsense",
];

export default function USSchoolMap({
  activeStep = 0,

  usTopoUrl = defaultTopoUrl,
  songsCsvUrl = defaultSongsCsvUrl,
  tropeKeys = defaultTropeKeys,
  conferenceFilter = "All",
}) {
  const wrapperRef = useRef(null);
  const svgRef = useRef(null);
  const { width } = useResizeObserver(wrapperRef);

  const [usTopo, setUsTopo] = useState(null);
  const [songsRows, setSongsRows] = useState([]);
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showLyrics, setShowLyrics] = useState(false);

  useEffect(() => {
    d3.json(usTopoUrl).then(setUsTopo).catch(console.error);
  }, [usTopoUrl]);

  useEffect(() => {
    d3.csv(songsCsvUrl, (d) => {
      const latitude = +d.latitude;
      let longitude = +d.longitude;
      if (Number.isFinite(longitude) && longitude > 0) longitude = -longitude;

      return { ...d, latitude, longitude };
    })
      .then(setSongsRows)
      .catch(console.error);
  }, [songsCsvUrl]);

  useEffect(() => {
    setHover(null);
    setSelected(null);
    setShowLyrics(false);
  }, [conferenceFilter]);

  const filteredSongs = useMemo(() => {
    if (!conferenceFilter || conferenceFilter === "All") return songsRows;
    return songsRows.filter((r) => r.conference === conferenceFilter);
  }, [songsRows, conferenceFilter]);

  const points = useMemo(() => {
    if (!filteredSongs.length) return [];

    return filteredSongs
      .map((r) => {
        const lat = r.latitude;
        const lon = r.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

        const dna = tropeKeys.map((k) => ({
          key: k,
          label: k.replace(/_/g, " "),
          value: toBool01(r[k]) ? 1 : 0,
        }));

        return {
          school: r.school,
          conference: r.conference,
          spotifyId: r.spotify_id ?? "",
          lyrics: r.lyrics ?? "",
          lat,
          lon,
          dna,
        };
      })
      .filter(Boolean);
  }, [filteredSongs, tropeKeys]);

  const conferences = useMemo(
    () => Array.from(new Set(points.map((d) => d.conference))).filter(Boolean),
    [points]
  );

  const conferenceColor = useMemo(() => {
    return makeConferenceColorScale(conferences);
  }, [conferences]);

  useEffect(() => {
    if (!svgRef.current || !usTopo || !points.length || !width) return;

    const showDots = activeStep >= 1;
    const showLegend = activeStep >= 2;
    const allowHover = activeStep >= 1;

    const height = Math.max(520, Math.round(width * 0.62));
    const svg = d3.select(svgRef.current);
    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    const statesGeo = getUsStatesGeo(usTopo);
    const projection = d3.geoAlbersUsa().fitSize([width, height], statesGeo);
    const path = d3.geoPath(projection);

    // states
    svg
      .append("g")
      .selectAll("path")
      .data(statesGeo.features)
      .join("path")
      .attr("d", path)
      .attr("fill", "rgba(255,255,255,0.04)")
      .attr("stroke", "rgba(255,255,255,0.14)")
      .attr("stroke-width", 0.7);

    // dots layer
    const gDots = svg.append("g");

    const dots = gDots
      .selectAll("circle")
      .data(points, (d) => d.school)
      .join("circle")
      .attr("cx", (d) => {
        const p = projection([d.lon, d.lat]);
        return p ? p[0] : -999;
      })
      .attr("cy", (d) => {
        const p = projection([d.lon, d.lat]);
        return p ? p[1] : -999;
      })
      .attr("r", 0)
      .attr("opacity", 0)
      .attr("fill", (d) =>
        conferenceColor && d.conference
          ? conferenceColor(d.conference)
          : unknownColor
      )
      .attr("stroke", "white")
      .attr("stroke-width", 1.2);

    dots
      .transition()
      .duration(showDots ? 650 : 200)
      .ease(d3.easeCubicOut)
      .attr("r", showDots ? 4.6 : 0)
      .attr("opacity", showDots ? 1 : 0);

    if (allowHover) {
      dots
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
          if (selected) return;
          const [mx, my] = d3.pointer(event, svgRef.current);
          setHover({
            x: mx + 12,
            y: my - 12,
            school: d.school,
            conference: d.conference,
            dna: d.dna,
            spotifyId: d.spotifyId,
            lyrics: d.lyrics,
          });

          if (activeStep >= 3) {
            d3.select(event.currentTarget)
              .attr("stroke", "rgba(245, 199, 122, 0.95)")
              .attr("stroke-width", 2.2);
          }
        })
        .on("mouseleave", (event) => {
          if (!selected) setHover(null);
          d3.select(event.currentTarget)
            .attr("stroke", "white")
            .attr("stroke-width", 1.2);
        })
        .on("click", (event, d) => {
          event.stopPropagation();
          const [mx, my] = d3.pointer(event, svgRef.current);
          const next = {
            x: mx + 12,
            y: my - 12,
            school: d.school,
            conference: d.conference,
            dna: d.dna,
            spotifyId: d.spotifyId,
            lyrics: d.lyrics,
          };
          const isSame = selected?.school === d.school;
          setSelected(isSame ? null : next);
          setShowLyrics(false);
        });
    } else {
      setHover(null);
    }

    if (showLegend && conferenceColor) {
      const legendItems = conferences.slice(0, 12);

      const legend = svg
        .append("g")
        .attr("transform", `translate(18, 18)`)
        .attr("opacity", 0);

      legendItems.forEach((c, i) => {
        const y = i * 18;

        legend
          .append("circle")
          .attr("cx", 0)
          .attr("cy", y)
          .attr("r", 5)
          .attr("fill", conferenceColor(c))
          .attr("stroke", "white")
          .attr("stroke-width", 1);

        legend
          .append("text")
          .attr("x", 12)
          .attr("y", y + 4)
          .attr("font-size", 12)
          .attr("opacity", 0.82)
          .attr("fill", "rgba(255,255,255,0.9)")
          .text(c);
      });

      legend.transition().duration(300).attr("opacity", 1);
    }
  }, [usTopo, points, width, conferences, conferenceColor, activeStep]);

  const dnaMode = activeStep >= 3 ? "all" : "present";
  const cardData = selected || hover;
  const isPinned = Boolean(selected);

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width: "100%" }}
      onClick={() => {
        setSelected(null);
        setShowLyrics(false);
      }}
    >
      <svg ref={svgRef} style={{ width: "100%", display: "block" }} />

      {cardData && activeStep >= 1 && (
        <DNASwatchCard
          data={cardData}
          mode={dnaMode}
          pinned={isPinned}
          showLyrics={showLyrics}
          onToggleLyrics={() => setShowLyrics((s) => !s)}
        />
      )}
    </div>
  );
}

function getUsStatesGeo(usTopo) {
  const objKey = usTopo.objects?.states
    ? "states"
    : usTopo.objects?.states10m
    ? "states10m"
    : usTopo.objects?.land
    ? "land"
    : Object.keys(usTopo.objects || {})[0];

  return feature(usTopo, usTopo.objects[objKey]);
}

function DNASwatchCard({ data, mode, pinned, showLyrics, onToggleLyrics }) {
  const sentence = buildIdentitySentence(data.dna);
  const pills = buildDNAPills(data.dna, mode);
  const confName = data.conference || "Independent";
  const confColor = conferenceColors[confName] ?? "#F5C77A";
  const spotifyUrl = data.spotifyId
    ? `https://open.spotify.com/embed/track/${data.spotifyId}?utm_source=generator`
    : "";

  return (
    <div
      style={{
        position: "absolute",
        left: data.x,
        top: data.y,
        width: 285,
        pointerEvents: pinned ? "auto" : "none",
        padding: "12px 12px",
        borderRadius: 16,
        background: "rgba(14, 16, 22, 0.95)",
        color: "white",
        boxShadow: `0 14px 40px rgba(0,0,0,0.35), 0 0 18px ${rgbaFromHex(
          confColor,
          0.35
        )}`,
        backdropFilter: "blur(10px)",
        border: pinned ? `1px solid ${rgbaFromHex(confColor, 0.55)}` : "none",
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div style={{ fontWeight: 800 }}>{data.school}</div>
      <div style={{ opacity: 0.7, fontSize: 12, marginTop: 2 }}>{confName}</div>
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
        "{sentence}"
      </div>
      <DNAPills pills={pills} accent={confColor} />
      {pinned && (
        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleLyrics();
            }}
            style={pillButtonStyle}
          >
            {showLyrics ? "Hide lyrics" : "Read lyrics"}
          </button>
          {spotifyUrl ? (
            <iframe
              title={`${data.school} fight song`}
              style={{ borderRadius: 12, border: "none" }}
              src={spotifyUrl}
              width="100%"
              height="80"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          ) : (
            <div
              style={{
                ...pillButtonStyle,
                opacity: 0.6,
                textAlign: "center",
              }}
            >
              Spotify link unavailable
            </div>
          )}
          {showLyrics && (
            <div
              style={{
                maxHeight: 140,
                overflow: "auto",
                padding: "8px 10px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                fontSize: 11,
                lineHeight: 1.45,
                opacity: 0.88,
              }}
            >
              {data.lyrics || "Lyrics unavailable."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildIdentitySentence(dna) {
  const lookup = new Map(dna.map((d) => [d.key, d.value]));
  const hasChaos = lookup.get("rah") || lookup.get("nonsense");
  const hasColors = lookup.get("colors");
  const hasVictory = lookup.get("victory") || lookup.get("win_won");
  const hasFight = lookup.get("fight");
  const bits = [];

  if (hasChaos) bits.push("Chaos-leaning");
  if (hasColors) bits.push("color-loud");
  if (!hasChaos && hasVictory) bits.push("victory-first");
  if (!bits.length && hasFight) bits.push("tradition-heavy");
  if (!bits.length) bits.push("midfield vibes");

  return `${bits.join(", ")} chant`;
}

function buildDNAPills(dna, mode) {
  const present = dna.filter((d) => d.value > 0);
  const items = mode === "all" ? dna : present.length ? present : dna;
  return items.map((d) => ({
    key: d.key,
    label: d.label,
    value: d.value,
  }));
}

function DNAPills({ pills, accent }) {
  const accentColor = accent ?? "#F5C77A";
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
      {pills.map((pill) => (
        <div
          key={pill.key}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px",
            borderRadius: 999,
            border: pill.value
              ? `1px solid ${rgbaFromHex(accentColor, 0.7)}`
              : "1px solid rgba(255,255,255,0.18)",
            background: pill.value
              ? rgbaFromHex(accentColor, 0.15)
              : "rgba(255,255,255,0.04)",
            fontSize: 11,
            opacity: pill.value ? 0.95 : 0.65,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: pill.value ? rgbaFromHex(accentColor, 0.95) : "none",
              border: pill.value
                ? `1px solid ${rgbaFromHex(accentColor, 0.95)}`
                : "1px solid rgba(255,255,255,0.3)",
            }}
          />
          <span style={{ textTransform: "capitalize" }}>{pill.label}</span>
        </div>
      ))}
    </div>
  );
}

const pillButtonStyle = {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  fontSize: 11,
  letterSpacing: "0.02em",
};
