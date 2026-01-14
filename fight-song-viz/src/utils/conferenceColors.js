import * as d3 from "d3";

export const conferenceColors = {
  "Big Ten": "#4DA3FF",
  "Big 12": "#FF6B4A",
  SEC: "#FFCF57",
  ACC: "#4FF2E8",
  "Pac-12": "#7B5CFF",
  Independent: "#B7BCD1",
};

export function makeConferenceColorScale(conferences) {
  const confs = Array.from(new Set(conferences)).filter(Boolean);
  if (!confs.length) return null;

  const missing = confs.filter((c) => !conferenceColors[c]);
  const fallback =
    missing.length > 0
      ? d3.quantize(d3.interpolateRainbow, missing.length)
      : [];

  let fallbackIndex = 0;
  const palette = confs.map((c) => {
    if (conferenceColors[c]) return conferenceColors[c];
    const color = fallback[fallbackIndex] ?? "#B7BCD1";
    fallbackIndex += 1;
    return color;
  });

  return d3.scaleOrdinal(confs, palette);
}
