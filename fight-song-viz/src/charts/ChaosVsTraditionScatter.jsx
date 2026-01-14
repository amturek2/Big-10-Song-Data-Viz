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

function toBool01(v) {
  if (v == null) return false;
  return String(v).trim() === "1";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function seededJitter(seedStr, amt = 20) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const t = (h >>> 0) / 4294967295;
  const u = (t * 2 - 1) * amt;
  const t2 = ((t * 9301 + 49297) % 233280) / 233280;
  const v = (t2 * 2 - 1) * amt;
  return [u, v];
}

const defaultCsvUrl = new URL(
  "../data/song_data.csv",
  import.meta.url
).toString();

const defaultChaosKeys = ["nonsense", "rah"];
const defaultTraditionKeys = ["victory", "win_won"];

export default function ChaosVsTraditionScatter({
  activeStep = 0,
  csvUrl = defaultCsvUrl,
  conferenceFilter = "All",
  title = "Chaos vs Tradition",
  subtitle = "Chaos markers (rah/nonsense) vs victory language (victory/win-won)",
  chaosKeys = defaultChaosKeys,
  traditionKeys = defaultTraditionKeys,
  dotRadius = 4.8,
  colorByConference = true,
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

  const points = useMemo(() => {
    if (!filteredRows.length) return [];

    return filteredRows
      .map((r) => {
        const school = r.school;
        if (!school) return null;

        const conference = r.conference ?? "";

        const hasChaos = chaosKeys.some((k) => toBool01(r[k]));
        const hasTrad = traditionKeys.some((k) => toBool01(r[k]));

        const quad =
          (hasTrad ? "Top" : "Bottom") + "-" + (hasChaos ? "Right" : "Left");

        return {
          school,
          conference,
          hasChaos,
          hasTrad,
          quad,
        };
      })
      .filter(Boolean);
  }, [filteredRows, chaosKeys, traditionKeys]);

  const conferenceColor = useMemo(() => {
    return makeConferenceColorScale(points.map((d) => d.conference));
  }, [points]);

  const quadCounts = useMemo(() => {
    const counts = new Map();
    for (const p of points) counts.set(p.quad, (counts.get(p.quad) ?? 0) + 1);
    return counts;
  }, [points]);

  useEffect(() => {
    if (!svgRef.current || !points.length || !width) return;

    const height = Math.max(520, Math.round(width * 0.62));
    const margin = { top: 56, right: 22, bottom: 30, left: 22 };

    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const showDots = activeStep >= 1;
    const showSpotlight = activeStep >= 2;
    const showQuadrantShading = activeStep >= 3;

    const panelFill = showQuadrantShading
      ? "rgba(255,255,255,0.04)"
      : "rgba(255,255,255,0.01)";
    const panelStroke = showQuadrantShading
      ? "rgba(255,255,255,0.12)"
      : "rgba(255,255,255,0.07)";
    const captionOpacity = showQuadrantShading
      ? 0.9
      : activeStep >= 2
      ? 0.65
      : 0.25;
    const countOpacity = showQuadrantShading
      ? 0.75
      : activeStep >= 2
      ? 0.5
      : 0.15;

    const svg = d3.select(svgRef.current);
    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    // Titles
    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", 24)
      .attr("font-size", 18)
      .attr("font-weight", 650)
      .text(title);

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", 44)
      .attr("font-size", 12)
      .attr("opacity", captionOpacity)

      .text(subtitle);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Quadrant boundaries
    const midX = innerW / 2;
    const midY = innerH / 2;

    // background panels
    const panels = [
      {
        quad: "Top-Left",
        x: 0,
        y: 0,
        w: midX,
        h: midY,
        label: "Tradition without chaos",
      },
      {
        quad: "Top-Right",
        x: midX,
        y: 0,
        w: midX,
        h: midY,
        label: "Tradition + chaos",
      },
      {
        quad: "Bottom-Left",
        x: 0,
        y: midY,
        w: midX,
        h: midY,
        label: "Minimalist / chant-like",
      },
      {
        quad: "Bottom-Right",
        x: midX,
        y: midY,
        w: midX,
        h: midY,
        label: "Chaos without victory talk",
      },
    ];

    g.append("g")
      .selectAll("rect.panel")
      .data(panels)
      .join("rect")
      .attr("class", "panel")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("width", (d) => d.w)
      .attr("height", (d) => d.h)
      .attr("fill", panelFill)
      .attr("stroke", panelStroke)

      .attr("stroke-width", 1);

    // Axis labels (categorical)
    g.append("text")
      .attr("x", 0)
      .attr("y", -10)
      .attr("font-size", 12)
      .attr("opacity", captionOpacity)
      .text("Victory language ↓ / ↑");

    g.append("text")
      .attr("x", innerW)
      .attr("y", innerH + 22)
      .attr("text-anchor", "end")
      .attr("font-size", 12)
      .attr("opacity", captionOpacity)
      .text("No chaos markers ← / → Chaos markers (rah/nonsense)");

    // Quadrant captions + counts
    const cap = g.append("g");
    cap
      .selectAll("text.qcap")
      .data(panels)
      .join("text")
      .attr("class", "qcap")
      .attr("x", (d) => d.x + 12)
      .attr("y", (d) => d.y + 22)
      .attr("font-size", 12)
      .attr("font-weight", 650)
      .attr("opacity", captionOpacity)
      .text((d) => `${d.label}`);

    cap
      .selectAll("text.qcount")
      .data(panels)
      .join("text")
      .attr("class", "qcount")
      .attr("x", (d) => d.x + 12)
      .attr("y", (d) => d.y + 42)
      .attr("font-size", 12)

      .attr("opacity", captionOpacity)
      .text((d) => `${quadCounts.get(d.quad) ?? 0} schools`);

    const placed = points.map((p) => {
      const panel = panels.find((q) => q.quad === p.quad);
      const [jx, jy] = seededJitter(
        p.school,
        Math.min(36, Math.max(16, innerW / 22))
      );

      // center of the panel
      const cx = panel.x + panel.w / 2;
      const cy = panel.y + panel.h / 2;

      // keep inside panel bounds
      const pad = 18;
      const x = clamp(panel.x + pad, cx + jx, panel.x + panel.w - pad);
      const y = clamp(panel.y + pad, cy + jy, panel.y + panel.h - pad);

      return { ...p, x, y };
    });

    // Draw dots
    const dots = g.append("g");

    const dotFinalR = showDots ? dotRadius : 0;

    dots
      .selectAll("circle.dot")
      .data(placed, (d) => d.school)
      .join("circle")
      .attr("class", "dot")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 0)
      .attr("fill", (d) => {
        if (!colorByConference || !conferenceColor || !d.conference)
          return "rgba(80,130,255,0.85)";
        return conferenceColor(d.conference);
      })
      .attr("stroke", "white")
      .attr("stroke-width", 1.1)
      .transition()
      .duration(showDots ? 650 : 250)
      .ease(d3.easeCubicOut)
      .attr("r", dotFinalR)
      .attr("opacity", showDots ? 1 : 0);

    // Hover hit targets
    if (showDots) {
      g.append("g")
        .selectAll("circle.hit")
        .data(placed, (d) => d.school)
        .join("circle")
        .attr("class", "hit")
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y)
        .attr("r", dotRadius + 8)
        .attr("fill", "transparent")
        .style("cursor", "default")
        .on("mousemove", (event, d) => {
          const [mx, my] = d3.pointer(event, svgRef.current);
          setHover({
            x: mx + 12,
            y: my - 12,
            school: d.school,
            conference: d.conference,
            quad: d.quad,
          });
        })
        .on("mouseleave", () => setHover(null));
    } else {
      setHover(null);
    }

    if (showSpotlight) {
      const spotlightQuads = new Set(["Top-Right", "Bottom-Left"]);

      g.append("g")
        .selectAll("rect.spot")
        .data(panels.filter((p) => spotlightQuads.has(p.quad)))
        .join("rect")
        .attr("class", "spot")
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y)
        .attr("width", (d) => d.w)
        .attr("height", (d) => d.h)
        .attr("fill", "rgba(245, 199, 122, 0.05)")
        .attr("stroke", "rgba(245, 199, 122, 0.22)")
        .attr("stroke-width", 1.2);

      const labelSet = placed
        .filter((d) => spotlightQuads.has(d.quad))
        .sort((a, b) => a.school.localeCompare(b.school))
        .slice(0, 8);

      const labels = g.append("g");

      labels
        .selectAll("text.label")
        .data(labelSet, (d) => d.school)
        .join("text")
        .attr("class", "label")
        .attr("x", (d) => d.x + 8)
        .attr("y", (d) => d.y - 8)
        .attr("font-size", 11)
        .attr("font-weight", 650)
        .attr("fill", "rgba(255,255,255,0.9)")
        .attr("paint-order", "stroke")
        .attr("stroke", "rgba(0,0,0,0.55)")
        .attr("stroke-width", 3)
        .attr("opacity", 0)
        .text((d) => d.school)
        .transition()
        .duration(450)
        .attr("opacity", 1);
    }

    if (colorByConference && conferenceColor) {
      const confs = conferenceColor.domain();
      const legendItems = confs.slice(0, 10);

      const legend = svg
        .append("g")
        .attr("transform", `translate(${width - 180},${margin.top + 10})`);

      legendItems.forEach((c, i) => {
        const y = i * 16;
        legend
          .append("circle")
          .attr("cx", 0)
          .attr("cy", y)
          .attr("r", 4.8)
          .attr("fill", conferenceColor(c))
          .attr("stroke", "white")
          .attr("stroke-width", 1);

        legend
          .append("text")
          .attr("x", 10)
          .attr("y", y + 4)
          .attr("font-size", 11)
          .attr("opacity", captionOpacity)
          .text(c);
      });

      if (confs.length > legendItems.length) {
        legend
          .append("text")
          .attr("x", 10)
          .attr("y", legendItems.length * 16 + 4)
          .attr("font-size", 11)
          .attr("opacity", captionOpacity)
          .text(`+${confs.length - legendItems.length} more`);
      }
    }
  }, [
    points,
    width,
    quadCounts,
    conferenceColor,
    colorByConference,
    title,
    subtitle,
    dotRadius,
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
            width: 260,
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
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{hover.school}</div>
          {hover.conference && (
            <div style={{ opacity: 0.8, marginBottom: 6 }}>
              {hover.conference}
            </div>
          )}
          <div style={{ opacity: 0.85 }}>{hover.quad}</div>
        </div>
      )}
    </div>
  );
}
