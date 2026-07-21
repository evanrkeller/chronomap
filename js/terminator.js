// The twilight band: fully day while the sun is above the horizon,
// fading to fully night by 9 degrees below — a bit past civil twilight,
// which reads naturally against the city-lights imagery.
export const SIN_NIGHT_LIMIT = Math.sin((-9 * Math.PI) / 180);

// Opacity of the night layer at a point: 0 in daylight, 1 in full night,
// smoothstep-blended through the twilight band.
export function nightAlpha(sinAlt) {
  if (sinAlt >= 0) return 0;
  if (sinAlt <= SIN_NIGHT_LIMIT) return 1;
  const t = sinAlt / SIN_NIGHT_LIMIT;
  return t * t * (3 - 2 * t);
}
