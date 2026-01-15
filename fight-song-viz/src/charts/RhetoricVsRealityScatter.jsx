import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { makeConferenceColorScale } from "../utils/conferenceColors";

function formatK(n) {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) < 1000) return Math.round(n).toString();
  return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
}

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
function toBool01(v) {
  if (v == null) return false;
  return String(v).trim() === "1";
}

function linearRegression(xs, ys) {
  const n = xs.length;
  if (!n) return null;
  const xBar = d3.mean(xs);
  const yBar = d3.mean(ys);
  if (!Number.isFinite(xBar) || !Number.isFinite(yBar)) return null;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xBar;
    num += dx * (ys[i] - yBar);
    den += dx * dx;
  }
  if (den === 0) return null;
  const m = num / den;
  const b = yBar - m * xBar;
  return { m, b };
}

const defaultCsvUrl = new URL(
  "../data/song_data.csv",
  import.meta.url
).toString();

export default function RhetoricVsRealityScatter({
  activeStep = 0,

  csvUrl = defaultCsvUrl,
  conferenceFilter = "All",

  durationCol = "sec_duration",
  fightCountCol = "number_fights",
  victoryFlagCol = "victory",
  winFlagCol = "win_won",

  winPctCol = "home_win_pct",
  attendanceCol = "avg_home_attendance",
  conferenceCol = "conference",

  perSeconds = 60,

  wFight = 1,
  wVictory = 1,
  wWin = 1,

  colorByConference = true,
  title = "Rhetoric vs Reality",
  subtitle = "Competitive Language Index vs Home Win % (size = attendance)",
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
    return rows.filter((r) => r[conferenceCol] === conferenceFilter);
  }, [rows, conferenceFilter, conferenceCol]);

  const data = useMemo(() => {
    if (!filteredRows.length) return [];

    return filteredRows
      .map((r) => {
        const school = r.school;
        if (!school) return null;

        const dur = toNumber(r[durationCol]);
        const fightCount = toNumber(r[fightCountCol]);
        const vFlag = toBool01(r[victoryFlagCol]) ? 1 : 0;
        const wFlag = toBool01(r[winFlagCol]) ? 1 : 0;

        const winPct = toNumber(r[winPctCol]);
        const att = toNumber(r[attendanceCol]);

        if (!Number.isFinite(dur) || dur <= 0) return null;
        if (!Number.isFinite(fightCount) || fightCount < 0) return null;
        if (!Number.isFinite(winPct)) return null;

        const y = winPct <= 1.2 ? winPct * 100 : winPct;

        const raw = wFight * fightCount + wVictory * vFlag + wWin * wFlag;
        const x = (raw / dur) * perSeconds;

        return {
          school,
          conference: r[conferenceCol] ?? "",
          x,
          y,
          att: Number.isFinite(att) ? att : NaN,
          dur,
          fightCount,
          vFlag,
          wFlag,
        };
      })
      .filter(Boolean);
  }, [
    filteredRows,
    durationCol,
    fightCountCol,
    victoryFlagCol,
    winFlagCol,
    winPctCol,
    attendanceCol,
    conferenceCol,
    perSeconds,
    wFight,
    wVictory,
    wWin,
  ]);

  const conferenceColor = useMemo(() => {
    if (!colorByConference) return null;
    return makeConferenceColorScale(data.map((d) => d.conference));
  }, [data, colorByConference]);

  useEffect(() => {
    if (!svgRef.current || !data.length || !width) return;

    const showPoints = activeStep >= 1;
    const showLegend = activeStep >= 2;
    const spotlight = activeStep >= 3;
    const showTrend = activeStep >= 3;

    const margin = { top: 60, right: 130, bottom: 54, left: 70 };
    const height = Math.max(560, Math.round(width * 0.62));
    const innerW = Math.max(260, width - margin.left - margin.right);
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

    const xMax = d3.max(data, (d) => d.x) ?? 1;
    const x = d3.scaleLinear().domain([0, xMax]).nice().range([0, innerW]);

    const y = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

    const attVals = data.map((d) => d.att).filter(Number.isFinite);
    const r = attVals.length
      ? d3
          .scaleSqrt()
          .domain([d3.min(attVals), d3.max(attVals)])
          .range([4, 12])
      : () => 6;

    // Field background
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "fieldGradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#0c1d16");
    gradient.append("stop").attr("offset", "50%").attr("stop-color", "#0a1914");
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#091410");

    g.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", innerW)
      .attr("height", innerH)
      .attr("rx", 14)
      .attr("fill", "url(#fieldGradient)")
      .attr("stroke", "rgba(255,255,255,0.08)");

    const yardTicks = d3.range(10, 100, 10);
    const hashTicks = d3.range(5, 100, 5).filter((d) => d % 10 !== 0);

    const yardLines = g
      .append("g")
      .selectAll("line.yard")
      .data(yardTicks)
      .join("line")
      .attr("class", "yard")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", (d) =>
        d === 50 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.14)"
      )
      .attr("stroke-width", (d) => (d === 50 ? 1.6 : 0.8))
      .attr("opacity", 0);

    yardLines.transition().duration(380).attr("opacity", 1);

    const hashMarks = g
      .append("g")
      .selectAll("line.hash")
      .data(hashTicks)
      .join("line")
      .attr("class", "hash")
      .attr("x1", 0)
      .attr("x2", 14)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "rgba(255,255,255,0.08)")
      .attr("stroke-width", 0.7)
      .attr("opacity", 0);

    hashMarks.transition().duration(380).delay(80).attr("opacity", 1);

    g.append("g")
      .selectAll("line.hash-right")
      .data(hashTicks)
      .join("line")
      .attr("class", "hash-right")
      .attr("x1", innerW - 14)
      .attr("x2", innerW)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "rgba(255,255,255,0.08)")
      .attr("stroke-width", 0.7)
      .attr("opacity", 0)
      .transition()
      .duration(380)
      .delay(80)
      .attr("opacity", 1);

    // End zones
    const endZoneW = Math.max(32, innerW * 0.07);
    const endZones = g.append("g");

    endZones
      .append("rect")
      .attr("x", -endZoneW)
      .attr("y", 0)
      .attr("width", endZoneW)
      .attr("height", innerH)
      .attr("rx", 14)
      .attr("fill", "rgba(120, 170, 255, 0.08)")
      .attr("opacity", 0)
      .transition()
      .duration(420)
      .delay(200)
      .attr("x", 0)
      .attr("opacity", 1);

    endZones
      .append("rect")
      .attr("x", innerW)
      .attr("y", 0)
      .attr("width", endZoneW)
      .attr("height", innerH)
      .attr("rx", 14)
      .attr("fill", "rgba(245, 199, 122, 0.08)")
      .attr("opacity", 0)
      .transition()
      .duration(420)
      .delay(200)
      .attr("x", innerW - endZoneW)
      .attr("opacity", 1);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6))
      .call((ax) => ax.select(".domain").attr("opacity", 0.25))
      .call((ax) => ax.selectAll("line").attr("opacity", 0.12))
      .call((ax) =>
        ax.selectAll("text").attr("opacity", 0.75).attr("fill", "white")
      );

    const yAxis = g
      .append("g")
      .call(
        d3
          .axisLeft(y)
          .tickValues([20, 40, 50, 60, 80, 100])
          .tickFormat((d) => `${d}%`)
      )
      .call((ax) => ax.select(".domain").attr("opacity", 0.15))
      .call((ax) => ax.selectAll("line").attr("opacity", 0));

    yAxis
      .selectAll("text")
      .attr("opacity", 0.75)
      .attr("fill", "white")
      .attr("font-weight", (d) => (d === 50 ? 800 : 600));

    const callouts = svg.append("g").attr("class", "axis-callouts");
    const calloutFill = "rgba(10, 12, 18, 0.85)";
    const calloutStroke = "rgba(255,255,255,0.2)";
    const calloutText = "rgba(255,255,255,0.9)";

    function addCallout({ text, x, y, lineTo, anchor = "start" }) {
      const group = callouts
        .append("g")
        .attr("transform", `translate(${x},${y})`);
      const textEl = group
        .append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("text-anchor", anchor)
        .attr("font-size", 12)
        .attr("font-weight", 650)
        .attr("letter-spacing", "0.04em")
        .attr("fill", calloutText)
        .attr("dominant-baseline", "hanging")
        .text(text);

      const bbox = textEl.node()?.getBBox();
      if (!bbox) return;

      group
        .insert("rect", "text")
        .attr("x", bbox.x - 10)
        .attr("y", bbox.y - 6)
        .attr("width", bbox.width + 20)
        .attr("height", bbox.height + 12)
        .attr("rx", 10)
        .attr("fill", calloutFill)
        .attr("stroke", calloutStroke);

      if (lineTo) {
        callouts
          .append("line")
          .attr("x1", x + (anchor === "end" ? -bbox.width / 2 : bbox.width / 2))
          .attr("y1", y + bbox.height + 6)
          .attr("x2", lineTo[0])
          .attr("y2", lineTo[1])
          .attr("stroke", "rgba(245, 199, 122, 0.65)")
          .attr("stroke-width", 1.1)
          .attr("stroke-dasharray", "4 4");
      }
    }

    addCallout({
      text: `Talk Game (Competitive Language per ${perSeconds}s)`,
      x: margin.left + innerW - 260,
      y: margin.top + innerH + 12,
      lineTo: [margin.left + innerW * 0.82, margin.top + innerH - 10],
      anchor: "start",
    });

    addCallout({
      text: "On-Field Execution (%)",
      x: 14,
      y: 10,
      lineTo: [margin.left + innerW * 0.22, margin.top + innerH * 0.22],
      anchor: "start",
    });

    endZones
      .append("text")
      .attr("x", 12)
      .attr("y", 18)
      .attr("font-size", 10)
      .attr("letter-spacing", "0.12em")
      .attr("fill", "rgba(255,255,255,0.72)")
      .attr("opacity", 0)
      .text("LOW TALK GAME")
      .transition()
      .duration(420)
      .delay(260)
      .attr("opacity", 0.9);

    endZones
      .append("text")
      .attr("x", innerW - 12)
      .attr("y", 18)
      .attr("text-anchor", "end")
      .attr("font-size", 10)
      .attr("letter-spacing", "0.12em")
      .attr("fill", "rgba(255,255,255,0.72)")
      .attr("opacity", 0)
      .text("HIGH TALK GAME")
      .transition()
      .duration(420)
      .delay(260)
      .attr("opacity", 0.9);

    // Medians
    const xMed = d3.median(data, (d) => d.x) ?? 0;
    const yMed = d3.median(data, (d) => d.y) ?? 0;

    const xMedPx = x(xMed);
    const yMedPx = y(yMed);

    g.append("line")
      .attr("x1", xMedPx)
      .attr("x2", xMedPx)
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", "rgba(255,255,255,0.18)")
      .attr("stroke-dasharray", "4 4");

    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", yMedPx)
      .attr("y2", yMedPx)
      .attr("stroke", "rgba(255,255,255,0.18)")
      .attr("stroke-dasharray", "4 4");

    if (spotlight) {
      const quads = [
        { x0: xMedPx, y0: 0, x1: innerW, y1: yMedPx, t: "Talk big + win big" },
        { x0: 0, y0: 0, x1: xMedPx, y1: yMedPx, t: "Win big, talk less" },
        { x0: xMedPx, y0: yMedPx, x1: innerW, y1: innerH, t: "All talk?" },
        { x0: 0, y0: yMedPx, x1: xMedPx, y1: innerH, t: "Quiet + struggling" },
      ];

      g.append("g")
        .selectAll("rect.qpanel")
        .data(quads)
        .join("rect")
        .attr("class", "qpanel")
        .attr("x", (d) => d.x0)
        .attr("y", (d) => d.y0)
        .attr("width", (d) => d.x1 - d.x0)
        .attr("height", (d) => d.y1 - d.y0)
        .attr("fill", "rgba(255,255,255,0.03)")
        .attr("stroke", "rgba(255,255,255,0.10)")
        .attr("stroke-width", 1);

      g.append("g")
        .selectAll("text.qcap")
        .data(quads)
        .join("text")
        .attr("class", "qcap")
        .attr("x", (d) => d.x0 + 10)
        .attr("y", (d) => d.y0 + 20)
        .attr("font-size", 12)
        .attr("font-weight", 750)
        .attr("fill", "rgba(255,255,255,0.86)")
        .attr("opacity", 0)
        .text((d) => d.t)
        .transition()
        .duration(250)
        .attr("opacity", 0.85);
    }

    if (showTrend) {
      const xs = data.map((d) => d.x);
      const ys = data.map((d) => d.y);
      const lr = linearRegression(xs, ys);

      if (lr) {
        const x0 = 0;
        const x1 = xMax;
        const y0 = lr.m * x0 + lr.b;
        const y1 = lr.m * x1 + lr.b;

        const clampY = (val) => Math.max(0, Math.min(100, val));

        const scrimmage = g
          .append("line")
          .attr("x1", x(x0))
          .attr("y1", y(clampY(y0)))
          .attr("x2", x(x1))
          .attr("y2", y(clampY(y1)))
          .attr("stroke", "rgba(245, 199, 122, 0.75)")
          .attr("stroke-width", 1.6)
          .attr("stroke-linecap", "round")
          .attr("stroke-dasharray", "6 6")
          .attr("opacity", 0.9);

        const total = scrimmage.node()?.getTotalLength?.() ?? 0;
        if (total) {
          scrimmage
            .attr("stroke-dasharray", `${total} ${total}`)
            .attr("stroke-dashoffset", total)
            .transition()
            .duration(520)
            .delay(520)
            .ease(d3.easeCubicOut)
            .attr("stroke-dashoffset", 0);
        }

        const trendLabel = g
          .append("g")
          .attr("class", "trend-label")
          .attr("opacity", 0);

        const label = trendLabel
          .append("text")
          .attr("x", x(xMax) - 8)
          .attr("y", y(clampY(y1)) - 14)
          .attr("text-anchor", "end")
          .attr("font-size", 11)
          .attr("font-weight", 700)
          .attr("fill", "rgba(245, 199, 122, 0.9)")
          .text("Trend line: Talk more != win more");

        const bbox = label.node()?.getBBox?.();
        if (bbox) {
          trendLabel
            .insert("rect", "text")
            .attr("x", bbox.x - 6)
            .attr("y", bbox.y - 4)
            .attr("width", bbox.width + 12)
            .attr("height", bbox.height + 8)
            .attr("rx", 8)
            .attr("fill", "rgba(10, 12, 18, 0.7)")
            .attr("stroke", "rgba(245, 199, 122, 0.35)");
        }

        trendLabel.transition().duration(350).delay(620).attr("opacity", 1);
      }
    }

    // Points
    const pts = g.append("g");

    const circles = pts
      .selectAll("circle.pt")
      .data(data, (d) => d.school)
      .join("circle")
      .attr("class", "pt")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y) - 36)
      .attr("r", 0)
      .attr("opacity", showPoints ? 0.92 : 0)
      .attr("fill", (d) => {
        if (!conferenceColor || !d.conference) return "rgba(80,130,255,0.85)";
        return conferenceColor(d.conference);
      })
      .attr("stroke", "white")
      .attr("stroke-width", 1.1);

    circles
      .transition()
      .duration(showPoints ? 700 : 200)
      .delay(showPoints ? 420 : 0)
      .ease(d3.easeCubicOut)
      .attr("cy", (d) => y(d.y))
      .attr("r", (d) =>
        showPoints ? (Number.isFinite(d.att) ? r(d.att) : 6) : 0
      )
      .attr("opacity", showPoints ? 0.92 : 0);

    if (spotlight) {
      circles.attr("opacity", (d) => {
        const dx = Math.abs(d.x - xMed) / (xMax || 1);
        const dy = Math.abs(d.y - yMed) / 100;
        const dist = dx + dy;
        return dist < 0.35 ? 0.35 : 0.95;
      });
    }

    if (showPoints) {
      g.append("g")
        .selectAll("circle.hit")
        .data(data, (d) => d.school)
        .join("circle")
        .attr("class", "hit")
        .attr("cx", (d) => x(d.x))
        .attr("cy", (d) => y(d.y))
        .attr("r", (d) => (Number.isFinite(d.att) ? r(d.att) : 6) + 10)
        .attr("fill", "transparent")
        .style("cursor", "default")
        .on("mousemove", (event, d) => {
          const [mx, my] = d3.pointer(event, svgRef.current);
          setHover({
            x: mx + 12,
            y: my - 12,
            school: d.school,
            conference: d.conference,
            cli: d.x,
            win: d.y,
            att: d.att,
            fights: d.fightCount,
            victory: d.vFlag,
            winFlag: d.wFlag,
            duration: d.dur,
          });
        })
        .on("mouseleave", (event) => {
          setHover(null);
          // reset all strokes quickly
          pts
            .selectAll("circle.pt")
            .attr("stroke", "white")
            .attr("stroke-width", 1.1);
        });
    } else {
      setHover(null);
    }

    if (showLegend && conferenceColor) {
      const confs = conferenceColor.domain();
      const legendItems = confs.slice(0, 10);

      const columnCount = legendItems.length > 6 ? 2 : 1;
      const rowCount = Math.ceil(legendItems.length / columnCount);
      const columnWidth = 86;
      const itemHeight = 14;
      const headerHeight = 14;
      const sizeBlockHeight = 42;
      const legendWidth = 90;
      const legendHeight =
        headerHeight + rowCount * itemHeight + sizeBlockHeight + 18;

      const legend = svg
        .append("g")
        .attr(
          "transform",
          `translate(${width - legendWidth - 18},${margin.top + 6})`
        )
        .attr("opacity", 0);

      legend
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .attr("rx", 10)
        .attr("fill", "rgba(12, 14, 20, 0.82)")
        .attr("stroke", "rgba(255,255,255,0.14)");

      legend
        .append("text")
        .attr("x", 8)
        .attr("y", 10)
        .attr("font-size", 9.5)
        .attr("font-weight", 700)
        .attr("letter-spacing", "0.08em")
        .attr("fill", "rgba(255,255,255,0.85)")
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
          .attr("r", 3.8)
          .attr("fill", conferenceColor(c))
          .attr("stroke", "white")
          .attr("stroke-width", 0.8);

        legend
          .append("text")
          .attr("x", xx + 7)
          .attr("y", yy + 4)
          .attr("font-size", 9.5)
          .attr("opacity", 0.78)
          .attr("fill", "rgba(255,255,255,0.9)")
          .text(c);
      });

      if (confs.length > legendItems.length) {
        legend
          .append("text")
          .attr("x", 8)
          .attr("y", headerHeight + rowCount * itemHeight + 8)
          .attr("font-size", 9)
          .attr("opacity", 0.6)
          .attr("fill", "rgba(255,255,255,0.75)")
          .text(`+${confs.length - legendItems.length} more`);
      }

      const sizeY = headerHeight + rowCount * itemHeight + 16;
      const attVals = data.map((d) => d.att).filter(Number.isFinite);
      const minAtt = d3.min(attVals);
      const maxAtt = d3.max(attVals);
      const minLabel = formatK(minAtt);
      const maxLabel = formatK(maxAtt);

      legend
        .append("text")
        .attr("x", 8)
        .attr("y", sizeY)
        .attr("font-size", 9.5)
        .attr("font-weight", 700)
        .attr("letter-spacing", "0.08em")
        .attr("fill", "rgba(255,255,255,0.85)")
        .text("ATTENDANCE");

      const sizeGroup = legend
        .append("g")
        .attr("transform", `translate(8, ${sizeY + 12})`);

      sizeGroup
        .append("circle")
        .attr("cx", 6)
        .attr("cy", 8)
        .attr("r", Number.isFinite(minAtt) ? r(minAtt) : 4)
        .attr("fill", "rgba(255,255,255,0.25)")
        .attr("stroke", "rgba(255,255,255,0.65)")
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
        .attr("cx", 50)
        .attr("cy", 8)
        .attr("r", Number.isFinite(maxAtt) ? r(maxAtt) : 10)
        .attr("fill", "rgba(255,255,255,0.25)")
        .attr("stroke", "rgba(255,255,255,0.65)")
        .attr("stroke-width", 0.8);

      sizeGroup
        .append("text")
        .attr("x", 64)
        .attr("y", 11)
        .attr("font-size", 9)
        .attr("fill", "rgba(255,255,255,0.8)")
        .text(maxLabel);

      legend.transition().duration(250).attr("opacity", 1);
    }
  }, [data, width, conferenceColor, perSeconds, title, subtitle, activeStep]);

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <svg ref={svgRef} style={{ width: "100%", display: "block" }} />

      {hover && activeStep >= 1 && (
        <div
          style={{
            position: "absolute",
            left: hover.x,
            top: hover.y,
            width: 300,
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
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{hover.school}</div>
          {hover.conference && (
            <div style={{ opacity: 0.8, marginBottom: 8 }}>
              {hover.conference}
            </div>
          )}

          <div>
            CLI: <b>{hover.cli.toFixed(2)}</b> (per {perSeconds}s)
          </div>
          <div>
            Home win %: <b>{hover.win.toFixed(1)}%</b>
          </div>
          {Number.isFinite(hover.att) && (
            <div>
              Avg attendance: <b>{Math.round(hover.att).toLocaleString()}</b>
            </div>
          )}

          <div style={{ marginTop: 8, opacity: 0.8 }}>
            (fight count + victory/win flags, normalized by duration)
          </div>
        </div>
      )}
    </div>
  );
}
