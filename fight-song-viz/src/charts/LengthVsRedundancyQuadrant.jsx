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

const defaultCsvUrl = new URL(
  "../data/song_data.csv",
  import.meta.url
).toString();

export default function LengthVsRedundancyQuadrant({
  activeStep = 0,

  csvUrl = defaultCsvUrl,
  conferenceFilter = "All",
  durationCol = "sec_duration",
  fightsCol = "number_fights",
  ratePerSeconds = 60,

  dotRadius = 5,
  colorBy = "conference",
  labelCount = 4,
}) {
  const wrapperRef = useRef(null);
  const svgRef = useRef(null);
  const { width, height } = useResizeObserver(wrapperRef);

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
    const fightVals = data.map((d) => d.fights).filter(Number.isFinite);
    if (!fightVals.length) return () => dotRadius;

    const min = d3.min(fightVals);
    const max = d3.max(fightVals);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return () => dotRadius;

    const scale = d3.scaleSqrt().domain([min, max]).range([3, 9]);
    return (v) => (Number.isFinite(v) ? scale(v) : dotRadius);
  }, [data, dotRadius]);

  const conferenceColor = useMemo(() => {
    if (colorBy !== "conference") return null;
    return makeConferenceColorScale(data.map((d) => d.conference));
  }, [data, colorBy]);

  useEffect(() => {
    if (!svgRef.current || !data.length || !width) return;

    const showDots = activeStep >= 2;

    const chartHeight =
      height > 0 ? height : Math.max(560, Math.round(width * 0.65));
    const margin = { top: 30, right: 10, bottom: 50, left: 45 };
    const innerW = Math.max(280, width - margin.left - margin.right);
    const innerH = chartHeight - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.attr("width", width).attr("height", chartHeight);
    svg.selectAll("*").remove();

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

    const quadPanels = [
      {
        x0: 0,
        y0: 0,
        x1: xMid,
        y1: yMid,
        fill: "rgba(245, 199, 122, 0.06)",
      },
      {
        x0: xMid,
        y0: 0,
        x1: innerW,
        y1: yMid,
        fill: "rgba(120, 170, 255, 0.06)",
      },
      {
        x0: 0,
        y0: yMid,
        x1: xMid,
        y1: innerH,
        fill: "rgba(120, 255, 190, 0.05)",
      },
      {
        x0: xMid,
        y0: yMid,
        x1: innerW,
        y1: innerH,
        fill: "rgba(255, 130, 130, 0.05)",
      },
    ];

    g.append("g")
      .selectAll("rect.quad")
      .data(quadPanels)
      .join("rect")
      .attr("class", "quad")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("width", (d) => d.x1 - d.x0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("fill", (d) => d.fill)
      .attr("stroke", "rgba(255,255,255,0.06)")
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

    // Axis labels with professional styling
    svg
      .append("text")
      .attr("x", margin.left + innerW / 2)
      .attr("y", chartHeight - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .attr("font-weight", 600)
      .attr("fill", "rgba(255,255,255,0.85)")
      .attr("letter-spacing", "0.02em")
      .text("Song Duration (seconds)");

    svg
      .append("text")
      .attr(
        "transform",
        `translate(16, ${margin.top + innerH / 2}) rotate(-90)`
      )
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .attr("font-weight", 600)
      .attr("fill", "rgba(255,255,255,0.85)")
      .attr("letter-spacing", "0.02em")
      .text(`"Fight" Repetition Rate (per ${ratePerSeconds}s)`);

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

    const placed = data.map((d) => {
      const [jx, jy] = seededJitter(d.school, 10, 10);
      return { ...d, px: x(d.duration) + jx, py: y(d.fightRate) + jy };
    });

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
      .attr("r", (d) => (showDots ? rScale(d.fights) : 0))
      .attr("opacity", showDots ? 1 : 0);

    if (showDots) {
      g.append("g")
        .selectAll("circle.hit")
        .data(placed, (d) => d.school)
        .join("circle")
        .attr("class", "hit")
        .attr("cx", (d) => d.px)
        .attr("cy", (d) => d.py)
        .attr("r", (d) => rScale(d.fights) + 8)
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
      const legendItems = confs.slice(0, 8);
      const columnCount = legendItems.length > 4 ? 2 : 1;
      const rowCount = Math.ceil(legendItems.length / columnCount);
      const columnWidth = 74;
      const itemHeight = 12;
      const headerHeight = 12;
      const sizeBlockHeight = 34;
      const legendWidth = columnCount * columnWidth + 16;
      const legendHeight =
        headerHeight + rowCount * itemHeight + sizeBlockHeight + 18;

      const legend = svg
        .append("g")
        .attr(
          "transform",
          `translate(${width - legendWidth - 50},${margin.top - 28})`
        );

      legend
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .attr("rx", 8)
        .attr("fill", "rgba(182, 181, 176, 0.43)")
        .attr("stroke", "rgba(255,255,255,0.12)")
        .attr("stroke-width", 1);

      legend
        .append("text")
        .attr("x", 8)
        .attr("y", 10)
        .attr("font-size", 9)
        .attr("font-weight", 700)
        .attr("fill", "rgba(255,255,255,0.9)")
        .attr("letter-spacing", "0.08em")
        .text("CONFERENCES");

      legendItems.forEach((c, i) => {
        const col = Math.floor(i / rowCount);
        const row = i % rowCount;
        const xx = 8 + col * columnWidth;
        const yy = headerHeight + 8 + row * itemHeight;

        legend
          .append("circle")
          .attr("cx", xx)
          .attr("cy", yy)
          .attr("r", 3.6)
          .attr("fill", conferenceColor(c))
          .attr("stroke", "white")
          .attr("stroke-width", 0.8);

        legend
          .append("text")
          .attr("x", xx + 7)
          .attr("y", yy + 4)
          .attr("font-size", 9)
          .attr("fill", "rgba(255,255,255,0.82)")
          .text(c);
      });

      if (confs.length > legendItems.length) {
        legend
          .append("text")
          .attr("x", 8)
          .attr("y", headerHeight + rowCount * itemHeight + 8)
          .attr("font-size", 9)
          .attr("opacity", 0.6)
          .attr("fill", "rgba(255,255,255,0.7)")
          .text(`+${confs.length - legendItems.length} more`);
      }

      const sizeY = headerHeight + rowCount * itemHeight + 16;
      const fightVals = data.map((d) => d.fights).filter(Number.isFinite);
      const minFight = d3.min(fightVals);
      const maxFight = d3.max(fightVals);
      const minLabel = Number.isFinite(minFight) ? Math.round(minFight) : 0;
      const maxLabel = Number.isFinite(maxFight) ? Math.round(maxFight) : 0;

      legend
        .append("text")
        .attr("x", 8)
        .attr("y", sizeY)
        .attr("font-size", 9)
        .attr("font-weight", 700)
        .attr("fill", "rgba(255,255,255,0.9)")
        .attr("letter-spacing", "0.08em")
        .text("FIGHT COUNT");

      const sizeGroup = legend
        .append("g")
        .attr("transform", `translate(8, ${sizeY + 10})`);

      sizeGroup
        .append("circle")
        .attr("cx", 6)
        .attr("cy", 8)
        .attr("r", rScale(minFight))
        .attr("fill", "rgba(255,255,255,0.22)")
        .attr("stroke", "rgba(255,255,255,0.6)")
        .attr("stroke-width", 0.8);

      sizeGroup
        .append("text")
        .attr("x", 16)
        .attr("y", 11)
        .attr("font-size", 9)
        .attr("fill", "rgba(255,255,255,0.8)")
        .text(minLabel);

      sizeGroup
        .append("circle")
        .attr("cx", 56)
        .attr("cy", 8)
        .attr("r", rScale(maxFight))
        .attr("fill", "rgba(255,255,255,0.22)")
        .attr("stroke", "rgba(255,255,255,0.6)")
        .attr("stroke-width", 0.8);

      sizeGroup
        .append("text")
        .attr("x", 66)
        .attr("y", 11)
        .attr("font-size", 9)
        .attr("fill", "rgba(255,255,255,0.8)")
        .text(maxLabel);
    }
  }, [
    data,
    width,
    height,
    conferenceColor,
    ratePerSeconds,
    rScale,
    activeStep,
  ]);

  const tooltipWidth = 270;
  const tooltipHeight = 160;
  const tooltipLeft = hover
    ? Math.max(12, Math.min(hover.x, width - tooltipWidth - 12))
    : 0;
  const tooltipTop = hover
    ? Math.max(12, Math.min(hover.y, height - tooltipHeight - 12))
    : 0;

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <svg ref={svgRef} style={{ width: "100%", display: "block" }} />

      {hover && (
        <div
          style={{
            position: "absolute",
            left: tooltipLeft,
            top: tooltipTop,
            width: tooltipWidth,
            pointerEvents: "none",
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(20, 20, 24, 0.92)",
            color: "white",
            fontSize: 12,
            lineHeight: 1.25,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            backdropFilter: "blur(8px)",
            zIndex: 10,
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
            "Fight" count: <b>{Math.round(hover.fights)}</b>
          </div>
          <div>
            Fight rate: <b>{hover.rate.toFixed(2)}</b> per {ratePerSeconds}s
          </div>
        </div>
      )}
    </div>
  );
}
