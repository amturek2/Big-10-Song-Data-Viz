import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

function useResizeObserver(ref) {
  const [size, setSize] = useState({ width: 900, height: 480 });
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

export default function ConferenceHeatmap({ data }) {
  const ref = useRef();
  const { width: containerW, height: containerH } = useResizeObserver(ref);

  useEffect(() => {
    if (!data || data.length === 0 || !containerW) return;

    const outerWidth = containerW > 0 ? containerW : 900;
    const outerHeight = containerH > 0 ? containerH : 480;
    // const margin = {
    //   top: Math.min(70, Math.max(40, Math.round(outerHeight * 0.16))),
    //   right: Math.min(40, Math.max(18, Math.round(outerWidth * 0.05))),
    //   bottom: Math.min(70, Math.max(45, Math.round(outerHeight * 0.2))),
    //   left: Math.min(140, Math.max(80, Math.round(outerWidth * 0.16))),
    // };
    const margin = {
      top: 50,
      right: 20,
      bottom: 50,
      left: 110,
    };
    const width = Math.max(240, outerWidth - margin.left - margin.right);
    const height = Math.max(200, outerHeight - margin.top - margin.bottom);

    const axisFont = Math.max(9, Math.min(12, Math.round(outerWidth / 70)));
    const labelFont = Math.max(10, Math.min(13, Math.round(outerWidth / 60)));
    const titleFont = Math.max(14, Math.min(18, Math.round(outerWidth / 45)));
    const subtitleFont = Math.max(
      10,
      Math.min(12, Math.round(outerWidth / 70))
    );

    // Clear previous content
    d3.select(ref.current).selectAll("*").remove();

    // Wrapper div (for tooltip positioning)
    const container = d3.select(ref.current);

    const svg = container
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tooltip div
    const tooltip = container
      .append("div")
      .attr("class", "heatmap-tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "rgba(15,15,25,0.95)")
      .style("color", "#fff")
      .style("padding", "8px 10px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("line-height", "1.4")
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.4)")
      .style("z-index", "50")
      .style("opacity", 0);

    const categories = [
      "Aggression/Conflict",
      "Unity/Brotherhood",
      "Tradition/Legacy",
      "Pageantry/Spectacle",
      "Institutional Pride",
      "Competitive Glory",
    ];

    const conferences = data.map((d) => d.conference);

    const x = d3.scaleBand().domain(categories).range([0, width]).padding(0.15);
    const y = d3
      .scaleBand()
      .domain(conferences)
      .range([0, height])
      .padding(0.15);

    // Category → score column mapping
    const scoreMap = {
      "Aggression/Conflict": "score_aggression",
      "Unity/Brotherhood": "score_unity",
      "Tradition/Legacy": "score_tradition",
      "Pageantry/Spectacle": "score_pageantry",
      "Institutional Pride": "score_institutional",
      "Competitive Glory": "score_competitive_glory",
    };

    // Category → explanation for tooltip
    const categoryDescriptions = {
      "Aggression/Conflict":
        "Higher values mean the songs use more battle language like fight, defeat, crush, enemy, and faster, harder-driving rhythms.",
      "Unity/Brotherhood":
        "Higher values mean the songs emphasize we, us, our, team, loyalty, and togetherness over attacking the opponent.",
      "Tradition/Legacy":
        "Higher values mean the songs lean into alma mater language, honor, forever, faithful, and slower, ceremonial styles.",
      "Pageantry/Spectacle":
        "Higher values mean more chant-style language like rah, hail, cheer, nonsensical syllables, and crowd call-and-response.",
      "Institutional Pride":
        "Higher values mean more mentions of the school name and colors, foregrounding identity and branding.",
      "Competitive Glory":
        "Higher values mean more references to champions, triumph, glory, and victory without necessarily using raw fight words.",
    };

    // Flatten to cell array
    const cells = [];
    data.forEach((row) => {
      categories.forEach((cat) => {
        const col = scoreMap[cat];
        cells.push({
          conference: row.conference,
          category: cat,
          score: +row[col],
        });
      });
    });

    const scoreRange = d3.extent(cells, (d) => d.score);
    const color = d3
      .scaleSequential()
      .interpolator(d3.interpolateYlGnBu)
      .domain(scoreRange);

    // Axes
    svg
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(
        d3
          .axisBottom(x)
          .tickSize(0)
          .tickFormat((d) => d.replace("/", "\n"))
      )
      .selectAll("text")
      .style("text-anchor", "middle")
      .style("font-size", `${axisFont}px`)
      .style("fill", "rgba(255,255,255,0.9)");

    svg
      .append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll("text")
      .style("font-size", `${axisFont}px`)
      .style("fill", "rgba(255,255,255,0.9)");

    // Axis labels
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 12)
      .attr("text-anchor", "middle")
      .style("font-size", `${labelFont}px`)
      .style("fill", "#fff")
      .text("Hype Style Categories");

    svg
      .append("text")
      .attr("x", -height / 2)
      .attr("y", -Math.max(60, Math.round(margin.left * 0.7)))
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .style("font-size", `${labelFont}px`)
      .style("fill", "#fff")
      .text("Conference");

    // Title + subtitle

    // Tooltip handlers
    const handleMouseOver = (event, d) => {
      tooltip.style("opacity", 1);
    };

    const handleMouseMove = (event, d) => {
      const description = categoryDescriptions[d.category] || "";
      const [mx, my] = d3.pointer(event, container.node());
      const clampedX = Math.max(12, Math.min(mx + 12, outerWidth - 240));
      const clampedY = Math.max(12, Math.min(my - 28, outerHeight - 160));
      tooltip
        .html(
          `<div><strong>${d.conference}</strong></div>
           <div><strong>${d.category}</strong>: ${d.score.toFixed(2)}</div>
           <div style="margin-top:4px;">This is the average ${d.category.toLowerCase()} score for this conference’s fight songs. ${description}</div>
           <div style="margin-top:4px; font-size:11px; opacity:0.8;">
             Scores are on a custom index; higher means more of this style compared to other conferences in this dataset.
           </div>`
        )
        .style("left", `${clampedX}px`)
        .style("top", `${clampedY}px`);
    };

    const handleMouseLeave = () => {
      tooltip.style("opacity", 0);
    };

    // Heatmap rects
    svg
      .selectAll("rect.heat")
      .data(cells)
      .enter()
      .append("rect")
      .attr("class", "heat")
      .attr("x", (d) => x(d.category))
      .attr("y", (d) => y(d.conference))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", (d) => color(d.score))
      .style("stroke", "#222")
      .on("mouseover", handleMouseOver)
      .on("mousemove", handleMouseMove)
      .on("mouseleave", handleMouseLeave);

    // Optional: keep numeric labels inside cells
    svg
      .selectAll("text.cell")
      .data(cells)
      .enter()
      .append("text")
      .attr("class", "cell")
      .attr("x", (d) => x(d.category) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.conference) + y.bandwidth() / 2 + 4)
      .attr("text-anchor", "middle")
      .style("font-size", `${Math.max(9, Math.min(11, axisFont))}px`)
      .style("fill", "#fff")
      .text((d) => d.score.toFixed(2));

    // Color legend
    const legendWidth = 250;
    const legendHeight = 12;

    const legendScale = d3
      .scaleLinear()
      .domain(scoreRange)
      .range([0, legendWidth]);

    const legendAxis = d3
      .axisBottom(legendScale)
      .ticks(4)
      .tickFormat((d) => d.toFixed(2));

    const legend = svg
      .append("g")
      .attr(
        "transform",
        `translate(${width - legendWidth}, ${margin.top - 90})`
      );

    const gradientId = "legendGradient";

    const gradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("x2", "100%");

    gradient
      .selectAll("stop")
      .data(
        d3.ticks(0, 1, 10).map((t) => ({
          offset: `${t * 100}%`,
          color: color(scoreRange[0] + t * (scoreRange[1] - scoreRange[0])),
        }))
      )
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", `url(#${gradientId})`);

    legend
      .append("g")
      .attr("transform", `translate(0, ${legendHeight})`)
      .call(legendAxis)
      .selectAll("text")
      .style("font-size", `${Math.max(9, Math.min(11, axisFont))}px`)
      .style("fill", "rgba(255,255,255,0.75)");
  }, [data, containerW, containerH]);

  return (
    <div
      ref={ref}
      className="conferenceHeatmap"
      style={{ position: "relative", width: "100%", height: "100%" }}
    />
  );
}
