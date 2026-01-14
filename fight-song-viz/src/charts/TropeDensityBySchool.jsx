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

const defaultCsvUrl = new URL(
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

const defaultStepConfig = {
  0: { showBars: false, showValues: false, highlightTop: false, maxBars: 12 },
  1: { showBars: true, showValues: false, highlightTop: false, maxBars: 18 },
  2: { showBars: true, showValues: true, highlightTop: false, maxBars: 30 },
  3: { showBars: true, showValues: true, highlightTop: true, maxBars: 60 },
};

export default function TropeDensityBySchoolVertical({
  activeStep = 0,
  csvUrl = defaultCsvUrl,
  conferenceFilter = "All",

  tropeKeys = defaultTropeKeys,

  topN = 60,
  colorBy = "conference",

  title = "How dense is tradition?",
  subtitle = "Trope density by school (count of tropes present)",

  fallbackColor = "rgba(80, 130, 255, 0.9)",
  highlightColor = "rgba(245, 199, 122, 0.92)",
  mutedColor = "rgba(255,255,255,0.12)",

  barW = 12,
  barGap = 4,

  enableHorizontalScroll = true,
  fixedHeight = 520,

  stepConfig = defaultStepConfig,
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

  const allData = useMemo(() => {
    if (!filteredRows.length) return [];
    const computed = filteredRows
      .map((r) => {
        const school = r.school ?? r.School ?? r.school_name ?? "";
        const conference = r.conference ?? r.Conference ?? "";
        if (!school) return null;

        const density = tropeKeys.reduce(
          (acc, k) => acc + (toBool01(r[k]) ? 1 : 0),
          0
        );

        return { school, conference, density };
      })
      .filter(Boolean);

    computed.sort(
      (a, b) => b.density - a.density || a.school.localeCompare(b.school)
    );

    return topN ? computed.slice(0, topN) : computed;
  }, [filteredRows, tropeKeys, topN]);

  const step = stepConfig[activeStep] ?? stepConfig[3];
  const { showBars, showValues, highlightTop } = step;
  const maxBars = step.maxBars ?? 12;

  const data = useMemo(() => {
    const n = Math.max(1, Math.min(maxBars, allData.length));
    return allData.slice(0, n);
  }, [allData, maxBars]);

  const conferenceColor = useMemo(() => {
    if (colorBy !== "conference") return null;
    return makeConferenceColorScale(allData.map((d) => d.conference));
  }, [allData, colorBy]);

  useEffect(() => {
    if (!svgRef.current || !data.length || !width) return;

    const margin = { top: 58, right: 26, bottom: 84, left: 56 };
    const innerH = fixedHeight - margin.top - margin.bottom;

    const contentW = data.length * (barW + barGap);
    const svgW = enableHorizontalScroll
      ? Math.max(width, margin.left + contentW + margin.right)
      : width;

    const innerW = svgW - margin.left - margin.right;

    const svg = d3.select(svgRef.current);
    svg.attr("width", svgW).attr("height", fixedHeight);
    svg.selectAll("*").remove();

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", 24)
      .attr("font-size", 18)
      .attr("font-weight", 750)
      .attr("fill", "rgba(255,255,255,0.92)")
      .text(title);

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", 44)
      .attr("font-size", 12)
      .attr("fill", "rgba(255,255,255,0.85)")
      .attr("opacity", 0.75)
      .text(subtitle);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxY = d3.max(allData, (d) => d.density) ?? tropeKeys.length;

    const x = d3
      .scaleBand()
      .domain(data.map((d) => d.school))
      .range([0, innerW])
      .paddingInner(barGap / (barW + barGap));

    const y = d3
      .scaleLinear()
      .domain([0, Math.max(maxY, tropeKeys.length)])
      .nice()
      .range([innerH, 0]);

    g.append("g")
      .call(d3.axisLeft(y).ticks(6))
      .call((ax) => ax.select(".domain").attr("opacity", 0.25))
      .call((ax) => ax.selectAll("line").attr("opacity", 0.16))
      .call((ax) =>
        ax.selectAll("text").attr("opacity", 0.8).attr("fill", "white")
      );

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSize(0))
      .call((ax) => ax.select(".domain").attr("opacity", 0.25))
      .call((ax) =>
        ax
          .selectAll("text")
          .attr("fill", "white")
          .attr("opacity", 0.75)
          .style("font-size", "10px")
          .attr("text-anchor", "end")
          .attr("transform", "rotate(-55)")
          .attr("dx", "-0.4em")
          .attr("dy", "0.9em")
      );

    const topSet = new Set(allData.slice(0, 8).map((d) => d.school));

    const bars = g
      .append("g")
      .selectAll("rect.bar")
      .data(data, (d) => d.school)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.school))
      .attr("width", Math.min(barW, x.bandwidth()))
      .attr("y", innerH)
      .attr("height", 0)
      .attr("rx", 6)
      .attr("stroke", "rgba(255,255,255,0.14)")
      .attr("stroke-width", 1)
      .attr("fill", (d) => {
        const confFill =
          colorBy === "conference" && conferenceColor && d.conference
            ? conferenceColor(d.conference)
            : fallbackColor;

        if (!highlightTop) return confFill;
        return topSet.has(d.school) ? highlightColor : mutedColor;
      })
      .attr("opacity", (d) => {
        if (!highlightTop) return 1;
        return topSet.has(d.school) ? 1 : 0.55;
      });

    bars
      .transition()
      .duration(showBars ? 850 : 200)
      .ease(d3.easeCubicOut)
      .attr("y", (d) => (showBars ? y(d.density) : innerH))
      .attr("height", (d) => (showBars ? innerH - y(d.density) : 0));

    const values = g
      .append("g")
      .selectAll("text.value")
      .data(data, (d) => d.school)
      .join("text")
      .attr("class", "value")
      .attr("x", (d) => (x(d.school) ?? 0) + Math.min(barW, x.bandwidth()) / 2)
      .attr("y", (d) => y(d.density) - 6)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("font-weight", 750)
      .attr("fill", "rgba(255,255,255,0.9)")
      .attr("opacity", 0)
      .text((d) => d.density);

    values
      .transition()
      .delay(showValues ? 450 : 0)
      .duration(200)
      .attr("opacity", showValues ? 0.9 : 0);

    g.append("g")
      .selectAll("rect.hit")
      .data(data, (d) => d.school)
      .join("rect")
      .attr("class", "hit")
      .attr("x", (d) => x(d.school))
      .attr("width", Math.min(barW, x.bandwidth()))
      .attr("y", 0)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .style("cursor", "default")
      .on("mousemove", (event, d) => {
        const [mx, my] = d3.pointer(event, svgRef.current);
        setHover({
          x: mx + 12,
          y: my - 12,
          school: d.school,
          conference: d.conference,
          density: d.density,
        });
      })
      .on("mouseleave", () => setHover(null));
  }, [
    data,
    allData,
    width,
    fixedHeight,
    barW,
    barGap,
    tropeKeys.length,
    colorBy,
    title,
    subtitle,
    activeStep,
    showBars,
    showValues,
    highlightTop,
    maxBars,
    conferenceColor,
    fallbackColor,
    highlightColor,
    mutedColor,
    enableHorizontalScroll,
  ]);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100%",
        overflowX: enableHorizontalScroll ? "auto" : "visible",
        overflowY: "hidden",
        paddingBottom: 6,
      }}
    >
      <svg ref={svgRef} style={{ display: "block" }} />

      {hover && (
        <div
          style={{
            position: "absolute",
            left: hover.x,
            top: hover.y,
            pointerEvents: "none",
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(20, 20, 24, 0.92)",
            color: "white",
            fontSize: 12,
            lineHeight: 1.25,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            backdropFilter: "blur(8px)",
            maxWidth: 240,
          }}
        >
          <div style={{ fontWeight: 750, marginBottom: 6 }}>{hover.school}</div>
          {hover.conference && (
            <div style={{ opacity: 0.85, marginBottom: 6 }}>
              {hover.conference}
            </div>
          )}
          <div>
            Trope density: <b>{hover.density}</b>
          </div>
        </div>
      )}
    </div>
  );
}
