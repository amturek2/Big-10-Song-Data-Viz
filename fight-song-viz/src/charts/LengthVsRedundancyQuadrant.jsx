import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { makeConferenceColorScale } from "../utils/conferenceColors";

function useResizeObserver(ref) {
  const [size, setSize] = useState({ width: 900, height: 520 });
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

function toNumber(v) {
  if (v == null) return NaN;
  const n = +String(v).trim();
  return Number.isFinite(n) ? n : NaN;
}

function seededJitter(seedStr, amtX = 10, amtY = 10) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const t = (h >>> 0) / 4294967295;
  const u = (t * 2 - 1) * amtX;
  const t2 = ((t * 9301 + 49297) % 233280) / 233280;
  const v = (t2 * 2 - 1) * amtY;
  return [u, v];
}

function pickLabelSet(data, k = 4) {
  const byDurHi = [...data].sort((a, b) => b.duration - a.duration).slice(0, k);
  const byDurLo = [...data].sort((a, b) => a.duration - b.duration).slice(0, k);
  const byRateHi = [...data]
    .sort((a, b) => b.fightRate - a.fightRate)
    .slice(0, k);
  const byRateLo = [...data]
    .sort((a, b) => a.fightRate - b.fightRate)
    .slice(0, k);

  const s = new Set();
  [...byDurHi, ...byDurLo, ...byRateHi, ...byRateLo].forEach((d) =>
    s.add(d.school)
  );
  return s;
}

const defaultCsvUrl = new URL(
  "../data/song_data.csv",
  import.meta.url
).toString();

export default function LengthVsRedundancyQuadrant({
  activeStep = 0,

  csvUrl = defaultCsvUrl,
  conferenceFilter = "All",
  title = "Length vs Redundancy",
  subtitle = "Do longer songs say more - or just repeat “fight” louder?",
  durationCol = "sec_duration",
  fightsCol = "number_fights",
  ratePerSeconds = 60,

  dotRadius = 5,
  colorBy = "conference",
  labelCount = 4,
}) {
  const wrapperRef = useRef(null);
  const svgRef = useRef(null);
  const { width } = useResizeObserver(wrapperRef);

  const [rows, setRows] = useState([]);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    let alive = true;
    d3.csv(csvUrl).then((data) => {
      if (!alive) return;
      setRows(data);
    });
    return () => {
      alive = false;
    };
  }, [csvUrl]);

  const filteredRows = useMemo(() => {
    if (!conferenceFilter || conferenceFilter === "All") return rows;
    return rows.filter((r) => r.conference === conferenceFilter);
  }, [rows, conferenceFilter]);

  const data = useMemo(() => {
    if (!filteredRows.length) return [];

    return filteredRows
      .map((r) => {
        const school = r.school;
        if (!school) return null;

        const duration = toNumber(r[durationCol]);
        const fights = toNumber(r[fightsCol]);
        const bpm = toNumber(r.bpm);

        if (!Number.isFinite(duration) || duration <= 0) return null;
        if (!Number.isFinite(fights) || fights < 0) return null;

        const fightRate = (fights / duration) * ratePerSeconds;

        return {
          school,
          conference: r.conference ?? "",
          duration,
          fights,
          fightRate,
          bpm,
        };
      })
      .filter(Boolean);
  }, [filteredRows, durationCol, fightsCol, ratePerSeconds]);

  const rScale = useMemo(() => {
    const bpmVals = data.map((d) => d.bpm).filter(Number.isFinite);
    if (!bpmVals.length) return () => dotRadius;

    const min = d3.min(bpmVals);
    const max = d3.max(bpmVals);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return () => dotRadius;

    const scale = d3.scaleSqrt().domain([min, max]).range([4, 10]);
    return (v) => (Number.isFinite(v) ? scale(v) : dotRadius);
  }, [data, dotRadius]);

  const labelSet = useMemo(
    () => pickLabelSet(data, labelCount),
    [data, labelCount]
  );

  const conferenceColor = useMemo(() => {
    if (colorBy !== "conference") return null;
    return makeConferenceColorScale(data.map((d) => d.conference));
  }, [data, colorBy]);

  useEffect(() => {
    if (!svgRef.current || !data.length || !width) return;

    const showPanels = activeStep >= 1;
    const showDots = activeStep >= 2;
    const showLabels = activeStep >= 3;

    const height = Math.max(560, Math.round(width * 0.65));
    const margin = { top: 60, right: 28, bottom: 54, left: 66 };
    const innerW = Math.max(280, width - margin.left - margin.right);
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    // Titles
    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", 26)
      .attr("font-size", 18)
      .attr("font-weight", 750)
      .attr("fill", "rgba(255,255,255,0.92)")
      .text(title);

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", 46)
      .attr("font-size", 12)
      .attr("opacity", 0.75)
      .attr("fill", "rgba(255,255,255,0.85)")
      .text(subtitle);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xMax = d3.max(data, (d) => d.duration) ?? 1;
    const yMax = d3.max(data, (d) => d.fightRate) ?? 1;

    const x = d3.scaleLinear().domain([0, xMax]).nice().range([0, innerW]);
    const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

    const xMidVal = d3.median(data, (d) => d.duration) ?? xMax / 2;
    const yMidVal = d3.median(data, (d) => d.fightRate) ?? yMax / 2;

    const xMid = x(xMidVal);
    const yMid = y(yMidVal);

    const panels = [
      {
        key: "LongLow",
        name: "Long + Low repetition",
        x0: xMid,
        x1: innerW,
        y0: 0,
        y1: yMid,
        caption: "Uses time for variety / ceremony",
      },
      {
        key: "ShortLow",
        name: "Short + Low repetition",
        x0: 0,
        x1: xMid,
        y0: yMid,
        y1: innerH,
        caption: "Minimalist, tight lyrics",
      },
      {
        key: "ShortHigh",
        name: "Short + High repetition",
        x0: 0,
        x1: xMid,
        y0: 0,
        y1: yMid,
        caption: "Pure hype chant energy",
      },
      {
        key: "LongHigh",
        name: "Long + High repetition",
        x0: xMid,
        x1: innerW,
        y0: yMid,
        y1: innerH,
        caption: "Ritual chants (repeating louder)",
      },
    ];

    const panelFill = showPanels
      ? "rgba(255,255,255,0.04)"
      : "rgba(255,255,255,0.01)";
    const panelStroke = showPanels
      ? "rgba(255,255,255,0.12)"
      : "rgba(255,255,255,0.06)";
    const capOpacity = showPanels ? 0.85 : 0.25;

    g.append("g")
      .selectAll("rect.panel")
      .data(panels)
      .join("rect")
      .attr("class", "panel")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("fill", panelFill)
      .attr("stroke", panelStroke)
      .attr("stroke-width", 1);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6))
      .call((ax) => ax.select(".domain").attr("opacity", 0.25))
      .call((ax) => ax.selectAll("line").attr("opacity", 0.16))
      .call((ax) =>
        ax.selectAll("text").attr("opacity", 0.75).attr("fill", "white")
      );

    g.append("g")
      .call(d3.axisLeft(y).ticks(6))
      .call((ax) => ax.select(".domain").attr("opacity", 0.25))
      .call((ax) => ax.selectAll("line").attr("opacity", 0.16))
      .call((ax) =>
        ax.selectAll("text").attr("opacity", 0.75).attr("fill", "white")
      );

    // Axis labels
    g.append("text")
      .attr("x", innerW)
      .attr("y", innerH + 44)
      .attr("text-anchor", "end")
      .attr("font-size", 12)
      .attr("opacity", 0.75)
      .attr("fill", "rgba(255,255,255,0.85)")
      .text("Song duration (seconds)");

    g.append("text")
      .attr("x", -10)
      .attr("y", -14)
      .attr("text-anchor", "start")
      .attr("font-size", 12)
      .attr("opacity", 0.75)
      .attr("fill", "rgba(255,255,255,0.85)")
      .text(`Fight repetition (fights per ${ratePerSeconds}s)`);

    // Median guide lines
    g.append("line")
      .attr("x1", xMid)
      .attr("x2", xMid)
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", "rgba(255,255,255,0.18)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 4");

    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", yMid)
      .attr("y2", yMid)
      .attr("stroke", "rgba(255,255,255,0.18)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4 4");

    // Panel captions
    const cap = g.append("g");

    cap
      .selectAll("text.pname")
      .data(panels)
      .join("text")
      .attr("class", "pname")
      .attr("x", (d) => d.x0 + 12)
      .attr("y", (d) => d.y0 + 22)
      .attr("font-size", 12)
      .attr("font-weight", 750)
      .attr("opacity", capOpacity)
      .attr("fill", "rgba(255,255,255,0.9)")
      .text((d) => d.name);

    cap
      .selectAll("text.pcap")
      .data(panels)
      .join("text")
      .attr("class", "pcap")
      .attr("x", (d) => d.x0 + 12)
      .attr("y", (d) => d.y0 + 40)
      .attr("font-size", 12)
      .attr("opacity", showPanels ? 0.68 : 0.18)
      .attr("fill", "rgba(255,255,255,0.85)")
      .text((d) => d.caption);

    const placed = data.map((d) => {
      const [jx, jy] = seededJitter(d.school, 10, 10);
      return { ...d, px: x(d.duration) + jx, py: y(d.fightRate) + jy };
    });

    if (showLabels) {
      const spotlight = new Set(["ShortHigh", "LongHigh"]);
      g.append("g")
        .selectAll("rect.spot")
        .data(panels.filter((p) => spotlight.has(p.key)))
        .join("rect")
        .attr("class", "spot")
        .attr("x", (d) => d.x0)
        .attr("y", (d) => d.y0)
        .attr("width", (d) => d.x1 - d.x0)
        .attr("height", (d) => d.y1 - d.y0)
        .attr("fill", "rgba(245, 199, 122, 0.05)")
        .attr("stroke", "rgba(245, 199, 122, 0.20)")
        .attr("stroke-width", 1.2);
    }

    // Dots
    const dots = g.append("g");

    dots
      .selectAll("circle.dot")
      .data(placed, (d) => d.school)
      .join("circle")
      .attr("class", "dot")
      .attr("cx", (d) => d.px)
      .attr("cy", (d) => d.py)
      .attr("r", 0)
      .attr("opacity", showDots ? 1 : 0)
      .attr("fill", (d) => {
        if (!conferenceColor || !d.conference) return "rgba(80,130,255,0.85)";
        return conferenceColor(d.conference);
      })
      .attr("stroke", "white")
      .attr("stroke-width", 1.1)
      .transition()
      .duration(showDots ? 650 : 200)
      .ease(d3.easeCubicOut)
      .attr("r", (d) => (showDots ? rScale(d.bpm) : 0))
      .attr("opacity", showDots ? 1 : 0);

    if (showLabels) {
      const labeled = placed.filter((d) => labelSet.has(d.school));

      g.append("g")
        .selectAll("text.label")
        .data(labeled, (d) => d.school)
        .join("text")
        .attr("class", "label")
        .attr("x", (d) => d.px + 8)
        .attr("y", (d) => d.py - 8)
        .attr("font-size", 11)
        .attr("font-weight", 750)
        .attr("fill", "rgba(255,255,255,0.92)")
        .attr("paint-order", "stroke")
        .attr("stroke", "rgba(0,0,0,0.55)")
        .attr("stroke-width", 3)
        .attr("opacity", 0)
        .text((d) => d.school)
        .transition()
        .duration(350)
        .attr("opacity", 0.9);
    }

    if (showDots) {
      g.append("g")
        .selectAll("circle.hit")
        .data(placed, (d) => d.school)
        .join("circle")
        .attr("class", "hit")
        .attr("cx", (d) => d.px)
        .attr("cy", (d) => d.py)
        .attr("r", (d) => rScale(d.bpm) + 8)
        .attr("fill", "transparent")
        .style("cursor", "default")
        .on("mousemove", (event, d) => {
          const [mx, my] = d3.pointer(event, svgRef.current);
          const quad =
            (d.duration >= xMidVal ? "Long" : "Short") +
            " + " +
            (d.fightRate >= yMidVal ? "High repetition" : "Low repetition");

          setHover({
            x: mx + 12,
            y: my - 12,
            school: d.school,
            conference: d.conference,
            duration: d.duration,
            fights: d.fights,
            rate: d.fightRate,
            quad,
          });
        })
        .on("mouseleave", () => setHover(null));
    } else {
      setHover(null);
    }

    if (showDots && conferenceColor) {
      const confs = conferenceColor.domain();
      const legendItems = confs.slice(0, 10);

      const legend = svg
        .append("g")
        .attr("transform", `translate(${width - 190},${margin.top + 6})`);

      legendItems.forEach((c, i) => {
        const yy = i * 16;
        legend
          .append("circle")
          .attr("cx", 0)
          .attr("cy", yy)
          .attr("r", 4.8)
          .attr("fill", conferenceColor(c))
          .attr("stroke", "white")
          .attr("stroke-width", 1);

        legend
          .append("text")
          .attr("x", 10)
          .attr("y", yy + 4)
          .attr("font-size", 11)
          .attr("opacity", 0.75)
          .attr("fill", "rgba(255,255,255,0.9)")
          .text(c);
      });

      if (confs.length > legendItems.length) {
        legend
          .append("text")
          .attr("x", 10)
          .attr("y", legendItems.length * 16 + 4)
          .attr("font-size", 11)
          .attr("opacity", 0.6)
          .attr("fill", "rgba(255,255,255,0.85)")
          .text(`+${confs.length - legendItems.length} more`);
      }
    }
  }, [
    data,
    width,
    title,
    subtitle,
    conferenceColor,
    ratePerSeconds,
    labelSet,
    rScale,
    activeStep,
  ]);

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <svg ref={svgRef} style={{ width: "100%", display: "block" }} />

      {hover && (
        <div
          style={{
            position: "absolute",
            left: hover.x,
            top: hover.y,
            width: 270,
            pointerEvents: "none",
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(20, 20, 24, 0.92)",
            color: "white",
            fontSize: 12,
            lineHeight: 1.25,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ fontWeight: 750, marginBottom: 6 }}>{hover.school}</div>
          {hover.conference && (
            <div style={{ opacity: 0.8, marginBottom: 6 }}>
              {hover.conference}
            </div>
          )}
          <div style={{ opacity: 0.85, marginBottom: 8 }}>{hover.quad}</div>
          <div>
            Duration: <b>{Math.round(hover.duration)}s</b>
          </div>
          <div>
            “Fight” count: <b>{Math.round(hover.fights)}</b>
          </div>
          <div>
            Fight rate: <b>{hover.rate.toFixed(2)}</b> per {ratePerSeconds}s
          </div>
        </div>
      )}
    </div>
  );
}
