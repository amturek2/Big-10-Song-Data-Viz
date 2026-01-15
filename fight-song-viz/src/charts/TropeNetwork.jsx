import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { tropeNetworkColors } from "../utils/conferenceColors";

function useResizeObserver(ref) {
  const [size, setSize] = useState({ width: 900, height: 580 });
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

const defaultTropeColumns = [
  { key: "fight", label: "Fight" },
  { key: "victory", label: "Victory" },
  { key: "win_won", label: "Win / Won" },
  { key: "rah", label: "Rah" },
  { key: "nonsense", label: "Nonsense" },
  { key: "spelling", label: "Spelling" },
  { key: "colors", label: "School Colors" },
  { key: "opponents", label: "Opponents" },
  { key: "men", label: "Men" },
];

export default function TropeNetwork({
  csvUrl = defaultCsvUrl,
  conferenceFilter = "All",
  tropeColumns = defaultTropeColumns,
  title = "Trope Co-Occurrence Network",
  subtitle = "Links show how often tropes appear together across songs",
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

  const { nodes, links, totalSongs } = useMemo(() => {
    const total = filteredRows.length || 0;
    if (!total) return { nodes: [], links: [], totalSongs: 0 };

    const nodesOut = tropeColumns.map(({ key, label }) => {
      let yes = 0;
      for (const r of filteredRows) if (toBool01(r[key])) yes += 1;
      return {
        id: label,
        key,
        totalCount: yes,
        pct: total ? (yes / total) * 100 : 0,
      };
    });

    const linksOut = [];
    for (let i = 0; i < tropeColumns.length; i += 1) {
      for (let j = i + 1; j < tropeColumns.length; j += 1) {
        const a = tropeColumns[i];
        const b = tropeColumns[j];
        let count = 0;
        for (const r of filteredRows) {
          if (toBool01(r[a.key]) && toBool01(r[b.key])) count += 1;
        }
        if (count > 0) {
          linksOut.push({
            source: a.label,
            target: b.label,
            value: count,
          });
        }
      }
    }

    return { nodes: nodesOut, links: linksOut, totalSongs: total };
  }, [filteredRows, tropeColumns]);

  useEffect(() => {
    if (!svgRef.current || !nodes.length || !width) return;

    const height = Math.max(580, Math.round(width * 0.62));
    const margin = { top: 50, right: 24, bottom: 44, left: 24 };
    const innerW = Math.max(410, width - margin.left - margin.right);
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");

    const gradient = defs
      .append("radialGradient")
      .attr("id", "networkVignette")
      .attr("cx", "50%")
      .attr("cy", "45%")
      .attr("r", "60%");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "rgba(16, 24, 40, 0.95)");
    gradient
      .append("stop")
      .attr("offset", "70%")
      .attr("stop-color", "rgba(7, 10, 18, 0.98)");
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "rgba(5, 6, 12, 1)");

    const glow = defs
      .append("filter")
      .attr("id", "nodeGlow")
      .attr("x", "-40%")
      .attr("y", "-40%")
      .attr("width", "180%")
      .attr("height", "180%");

    glow
      .append("feGaussianBlur")
      .attr("stdDeviation", 4)
      .attr("result", "blur");
    glow
      .append("feColorMatrix")
      .attr("type", "matrix")
      .attr("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.7 0")
      .attr("result", "glow");
    const merge = glow.append("feMerge");
    merge.append("feMergeNode").attr("in", "glow");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const backdrop = g
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", innerW)
      .attr("height", innerH)
      .attr("rx", 18)
      .attr("fill", "url(#networkVignette)");

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

    const nodeCounts = nodes.map((d) => d.totalCount);
    const linkCounts = links.map((d) => d.value);
    const size = d3
      .scaleSqrt()
      .domain([d3.min(nodeCounts), d3.max(nodeCounts)])
      .range([14, 34]);

    const linkWidth = d3
      .scaleLinear()
      .domain([d3.min(linkCounts), d3.max(linkCounts)])
      .range([1.2, 8.2]);

    const linkColor = d3
      .scaleLinear()
      .domain([d3.min(linkCounts), d3.max(linkCounts)])
      .range(["rgba(255,255,255,0.25)", "rgba(245, 199, 122, 0.95)"]);

    const linkDistance = d3
      .scaleLinear()
      .domain([d3.min(linkCounts), d3.max(linkCounts)])
      .range([140, 80]);

    const linkStrength = d3
      .scaleLinear()
      .domain([d3.min(linkCounts), d3.max(linkCounts)])
      .range([0.2, 0.45]);

    const color = d3.scaleOrdinal(
      nodes.map((d) => d.id),
      nodes.map((d) => tropeNetworkColors[d.id] ?? "#f0c267")
    );

    const link = g
      .append("g")
      .attr("stroke-linecap", "round")
      .selectAll("line")
      .data(links, (d) => `${d.source}-${d.target}`)
      .join("line")
      .attr("stroke", (d) => linkColor(d.value))
      .attr("stroke-width", (d) => linkWidth(d.value))
      .attr("opacity", 0.85);

    const node = g
      .append("g")
      .selectAll("g.node")
      .data(nodes, (d) => d.id)
      .join("g")
      .attr("class", "node");

    node
      .append("circle")
      .attr("r", (d) => size(d.totalCount))
      .attr("fill", (d) => color(d.id))
      .attr("stroke", "rgba(0,0,0,0.55)")
      .attr("stroke-width", 1.2)
      .attr("filter", "url(#nodeGlow)");

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("y", (d) => size(d.totalCount) + 18)
      .attr("font-size", 12)
      .attr("fill", "white")
      .attr("opacity", 0.92)
      .attr("paint-order", "stroke")
      .attr("stroke", "rgba(0,0,0,0.45)")
      .attr("stroke-width", 3)
      .text((d) => d.id);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance((d) => linkDistance(d.value))
          .strength((d) => linkStrength(d.value))
      )
      .force("charge", d3.forceManyBody().strength(-620))
      .force("center", d3.forceCenter(innerW / 2, innerH / 2))
      .force(
        "collide",
        d3.forceCollide().radius((d) => size(d.totalCount) + 12)
      );

    const ticked = () => {
      node.attr("transform", (d) => {
        const r = size(d.totalCount);
        d.x = Math.max(r, Math.min(innerW - r, d.x));
        d.y = Math.max(r, Math.min(innerH - r, d.y));
        return `translate(${d.x},${d.y})`;
      });

      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
    };

    simulation.on("tick", ticked);

    const drag = d3
      .drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.25).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    const connected = new Map();
    links.forEach((l) => {
      const a = l.source.id ?? l.source;
      const b = l.target.id ?? l.target;
      connected.set(`${a}--${b}`, true);
      connected.set(`${b}--${a}`, true);
    });

    const isConnected = (a, b) => connected.get(`${a}--${b}`);

    const resetFocus = () => {
      setHover(null);
      node.attr("opacity", 1);
      link
        .attr("opacity", 0.85)
        .attr("stroke-width", (d) => linkWidth(d.value));
    };

    backdrop.on("mousemove", resetFocus);

    node.on("mousemove", (event, d) => {
      const [mx, my] = d3.pointer(event, svgRef.current);
      setHover({
        x: mx + 12,
        y: my - 12,
        name: d.id,
        pct: d.pct,
      });

      node.attr("opacity", (n) =>
        n.id === d.id || isConnected(n.id, d.id) ? 1 : 0.4
      );

      link
        .attr("opacity", (l) =>
          l.source.id === d.id || l.target.id === d.id ? 0.9 : 0.1
        )
        .attr("stroke-width", (l) =>
          l.source.id === d.id || l.target.id === d.id
            ? linkWidth(l.value) + 1.2
            : linkWidth(l.value)
        );
    });

    node.on("mouseleave", resetFocus);

    const legend = svg
      .append("g")
      .attr("transform", `translate(${width - 240},${margin.top + 380})`);

    legend
      .append("rect")
      .attr("x", -10)
      .attr("y", -12)
      .attr("width", 230)
      .attr("height", 78)
      .attr("rx", 12)
      .attr("fill", "rgba(255,255,255,0.08)")
      .attr("stroke", "rgba(255,255,255,0.2)")
      .attr("stroke-width", 1);

    legend
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .attr("fill", "rgba(255,255,255,0.85)")
      .text("Legend");

    legend
      .append("circle")
      .attr("cx", 8)
      .attr("cy", 18)
      .attr("r", 6)
      .attr("fill", "rgba(255,255,255,0.7)");
    legend
      .append("circle")
      .attr("cx", 36)
      .attr("cy", 18)
      .attr("r", 12)
      .attr("fill", "rgba(255,255,255,0.3)");
    legend
      .append("text")
      .attr("x", 60)
      .attr("y", 22)
      .attr("font-size", 10)
      .attr("opacity", 0.7)
      .attr("fill", "white")
      .text("Node size = trope frequency");

    legend
      .append("line")
      .attr("x1", 2)
      .attr("x2", 42)
      .attr("y1", 40)
      .attr("y2", 40)
      .attr("stroke", "rgba(255,255,255,0.3)")
      .attr("stroke-width", 1.2);
    legend
      .append("line")
      .attr("x1", 2)
      .attr("x2", 42)
      .attr("y1", 52)
      .attr("y2", 52)
      .attr("stroke", "rgba(245, 199, 122, 0.95)")
      .attr("stroke-width", 3);
    legend
      .append("text")
      .attr("x", 60)
      .attr("y", 56)
      .attr("font-size", 10)
      .attr("opacity", 0.7)
      .attr("fill", "white")
      .text("Line thickness = co-occurrence");

    return () => simulation.stop();
  }, [nodes, links, width, title, subtitle]);

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <svg ref={svgRef} style={{ width: "100%", display: "block" }} />

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
            maxWidth: 220,
          }}
        >
          <div style={{ fontWeight: 750, marginBottom: 6 }}>{hover.name}</div>
          <div>Appears in {hover.pct.toFixed(0)}% of songs</div>
          <div style={{ opacity: 0.75 }}>{totalSongs} songs total</div>
        </div>
      )}
    </div>
  );
}
