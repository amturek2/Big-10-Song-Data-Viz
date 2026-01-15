import * as d3 from "d3";

export const conferenceColors = {
  "Big Ten": "#4DA3FF",
  "Big 12": "#FF6B4A",
  SEC: "#FFCF57",
  ACC: "#4FF2E8",
  "Pac-12": "#7B5CFF",
  Independent: "#B7BCD1",
};

export const tropeNetworkColors = {
  Fight: "#E35A47",
  Victory: "#5CE1E6",
  "Win / Won": "#E7A84E",
  Spelling: "#E76BA9",
  Men: "#4A7BCE",
  "School Colors": "#B88A5B",
  Rah: "#C8F47A",
  Opponents: "#8CAFD5",
  Nonsense: "#C9B0FF",
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
