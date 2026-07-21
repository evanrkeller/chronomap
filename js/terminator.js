// The twilight band: fully day while the sun is above the horizon,
// fading to fully night by 9 degrees below — a bit past civil twilight,
// which reads naturally against the city-lights imagery.
export const SIN_NIGHT_LIMIT = Math.sin((-9 * Math.PI) / 180);

// End of civil twilight: sun 6 degrees below the horizon.
export const CIVIL_TWILIGHT_RADIUS_DEGREES = 96;

const DEGREES = Math.PI / 180;

// The civil-twilight boundary is a circle of angular radius 96 degrees
// around the subsolar point. Walk it by bearing (destination-point
// formula) so the projected polyline is smooth everywhere, poles
// included.
export function civilTwilightCircle(subsolar, samples = 720) {
  const centerLat = subsolar.latitude * DEGREES;
  const centerLon = subsolar.longitude * DEGREES;
  const distance = CIVIL_TWILIGHT_RADIUS_DEGREES * DEGREES;
  const sinCenter = Math.sin(centerLat);
  const cosCenter = Math.cos(centerLat);
  const sinDistance = Math.sin(distance);
  const cosDistance = Math.cos(distance);

  const points = [];
  for (let i = 0; i < samples; i += 1) {
    const bearing = (i / samples) * 2 * Math.PI;
    const sinLat = sinCenter * cosDistance + cosCenter * sinDistance * Math.cos(bearing);
    const latitude = Math.asin(sinLat);
    const longitude =
      centerLon +
      Math.atan2(
        Math.sin(bearing) * sinDistance * cosCenter,
        cosDistance - sinCenter * sinLat,
      );
    points.push({ latitude: latitude / DEGREES, longitude: longitude / DEGREES });
  }
  return points;
}

// Day-part bucket for the scoreboard indicator, using the same
// thresholds as the map's twilight band.
export function dayPart(sinAlt) {
  if (sinAlt >= 0) return 'day';
  if (sinAlt > SIN_NIGHT_LIMIT) return 'twilight';
  return 'night';
}

// Opacity of the night layer at a point: 0 in daylight, 1 in full night,
// smoothstep-blended through the twilight band.
export function nightAlpha(sinAlt) {
  if (sinAlt >= 0) return 0;
  if (sinAlt <= SIN_NIGHT_LIMIT) return 1;
  const t = sinAlt / SIN_NIGHT_LIMIT;
  return t * t * (3 - 2 * t);
}
