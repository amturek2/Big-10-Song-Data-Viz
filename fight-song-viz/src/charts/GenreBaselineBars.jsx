import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

function useResizeObserver(ref) {
  const [size, setSize] = useState({ width: 800, height: 400 });

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
  if (typeof v === "number") return v === 1;
  const s = String(v).trim();
  if (s === "1") return true;
  if (s === "0" || s === "") return false;
  return false;
}

const defaultCsvUrl = new URL(
  "../data/song_data.csv",
  import.meta.url
).toString();

const defaultTropeColumns = [
  { key: "fight", label: "Fight" },
  { key: "victory", label: "Victory" },
  { key: "win_won", label: "Win / Won" },
  { key: "rah", label: "Rah" },
  { key: "spelling", label: "Spelling" },
  { key: "colors", label: "School Colors" },
  { key: "opponents", label: "Opponents" },
  { key: "men", label: "Men" },
  { key: "nonsense", label: "Nonsense Syllables" },
];

export default function GenreBaselineBars({
  activeStep = 0,
  csvUrl = defaultCsvUrl,
  conferenceFilter = "All",
  tropeColumns = defaultTropeColumns,
  title = "The Genre Baseline",
  subtitle = "Percent of songs containing each trope",
  barColor = "rgba(245, 199, 122, 0.88)",
  mutedBarColor = "rgba(255,255,255,0.12)",
  highlightTopN = 3,
}) {
  const wrapperRef = useRef(null);
  const svgRef = useRef(null);
  const { width, height } = useResizeObserver(wrapperRef);

  // const { width } = useResizeObserver(wrapperRef);

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

  const stats = useMemo(() => {
    const n = filteredRows.length || 0;
    if (n === 0) return [];

    const out = tropeColumns.map(({ key, label }) => {
      let yes = 0;
      for (const r of filteredRows) if (toBool01(r[key])) yes += 1;
      const pct = n ? (yes / n) * 100 : 0;
      return { key, label, yes, n, pct };
    });

    out.sort((a, b) => b.pct - a.pct);
    return out;
  }, [filteredRows, tropeColumns]);

  useEffect(() => {
    if (!svgRef.current || !stats.length || !width || !height) return;

    const showBars = activeStep >= 0;
    const showValues = activeStep >= 1;

    const margin = { top: 100, right: 30, bottom: 0, left: 120 };

    const innerW = Math.max(260, width - margin.left - margin.right);
    const innerH = Math.max(0, height - margin.top - margin.bottom);

    const gap = 10;

    const svg = d3.select(svgRef.current);
    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    const titleX = 24;
    svg
      .append("text")
      .attr("x", titleX)
      .attr("y", 24)
      .attr("font-size", 24)
      .attr("font-weight", 750)
      .attr("fill", "rgba(255,255,255,0.92)")
      .text(title);

    svg
      .append("text")
      .attr("x", titleX)
      .attr("y", 44)
      .attr("font-size", 18)
      .attr("opacity", 0.75)
      .attr("fill", "rgba(255,255,255,0.85)")
      .text(subtitle);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const labelGap = 18;
    const maxPct = d3.max(stats, (d) => d.pct) || 0;

    const x = d3
      .scaleLinear()
      .domain([0, maxPct])
      .nice()
      .range([0, innerW - labelGap]);

    const y = d3
      .scaleBand()
      .domain(stats.map((d) => d.label))
      .range([0, innerH])
      .padding(0.22);

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(5)
          .tickFormat((d) => `${d.toFixed(0)}%`)
      )
      .call((ax) => ax.select(".domain").attr("opacity", 0.25))
      .call((ax) => ax.selectAll("line").attr("opacity", 0.16))
      .call((ax) =>
        ax.selectAll("text").attr("opacity", 0.75).attr("fill", "white")
      );

    g.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .call((ax) => ax.select(".domain").remove())
      .call((ax) =>
        ax.selectAll("text").attr("opacity", 0.92).attr("fill", "white")
      );

    const topKeys = new Set(stats.slice(0, highlightTopN).map((d) => d.key));

    const bars = g
      .append("g")
      .selectAll("rect.bar")
      .data(stats, (d) => d.key)
      .join("rect")
      .attr("class", "bar")
      .attr("x", labelGap)
      .attr("y", (d) => y(d.label))
      .attr("height", y.bandwidth())
      .attr("rx", 10)
      .attr("fill", (d) => {
        if (!showValues) return mutedBarColor;
        return topKeys.has(d.key) ? barColor : "rgba(255,255,255,0.18)";
      })
      .attr("stroke", "rgba(255,255,255,0.16)")
      .attr("stroke-width", 1)
      .attr("width", 0);

    bars
      .transition()
      .duration(showBars ? 900 : 250)
      .ease(d3.easeCubicOut)
      .attr("width", (d) => (showBars ? x(d.pct) : 0))
      .attr("opacity", showBars ? 1 : 0.15);

    const values = g
      .append("g")
      .selectAll("text.value")
      .data(stats, (d) => d.key)
      .join("text")
      .attr("class", "value")
      .attr("x", (d) => labelGap + x(d.pct) + 10)
      .attr("y", (d) => y(d.label) + y.bandwidth() / 2)
      .attr("dominant-baseline", "middle")
      .attr("font-size", 12)
      .attr("font-weight", 700)
      .attr("fill", "rgba(255,255,255,0.9)")
      .attr("opacity", 0)
      .text((d) => `${d.pct.toFixed(0)}%`);

    values
      .transition()
      .delay(showValues ? 650 : 0)
      .duration(300)
      .attr("opacity", showValues ? 0.9 : 0);

    if (showBars) {
      g.append("g")
        .selectAll("rect.hitbox")
        .data(stats, (d) => d.key)
        .join("rect")
        .attr("class", "hitbox")
        .attr("x", labelGap)
        .attr("y", (d) => y(d.label))
        .attr("height", y.bandwidth())
        .attr("width", (d) => x(d.pct))
        .attr("fill", "transparent")
        .style("cursor", "default")
        .on("mousemove", (event, d) => {
          const [mx, my] = d3.pointer(event, svgRef.current);
          setHover({
            x: mx + 12,
            y: my - 12,
            label: d.label,
            pct: d.pct,
            countYes: d.yes,
            n: d.n,
          });
        })
        .on("mouseleave", () => setHover(null));
    } else {
      setHover(null);
    }
  }, [
    stats,
    width,
    height,
    title,
    subtitle,
    activeStep,
    barColor,
    mutedBarColor,
    highlightTopN,
  ]);

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          overflow: "visible",
        }}
      />
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
          <div style={{ fontWeight: 750, marginBottom: 6 }}>{hover.label}</div>
          <div>{hover.pct.toFixed(1)}% of songs</div>
          <div style={{ opacity: 0.85 }}>
            {hover.countYes} of {hover.n}
          </div>
        </div>
      )}
    </div>
  );
}
