// Position of the sun, accurate to well under half a degree — far finer
// than one pixel of the map. Low-precision formulas from the Astronomical
// Almanac (also used by NOAA's solar calculator).

const DEGREES = Math.PI / 180;

function daysSinceJ2000(date) {
  return (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000;
}

function wrapDegrees(angle) {
  return ((angle + 540) % 360) - 180;
}

// The point on Earth where the sun is directly overhead right now.
export function subsolarPoint(date) {
  const n = daysSinceJ2000(date);
  const meanLongitude = (280.46 + 0.9856474 * n) % 360;
  const meanAnomaly = (357.528 + 0.9856003 * n) * DEGREES;
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * DEGREES;
  const obliquity = (23.439 - 0.0000004 * n) * DEGREES;

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude)) / DEGREES;
  const rightAscension =
    Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude)) /
    DEGREES;

  // Equation of time, in degrees of longitude (positive = sun runs fast).
  const equationOfTime = wrapDegrees(meanLongitude - rightAscension);

  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const longitude = wrapDegrees(-15 * (utcHours - 12) - equationOfTime);

  return { latitude: declination, longitude };
}

// Sine of the sun's altitude at a location, given the subsolar point.
// Positive above the horizon, negative below; no asin needed to shade
// the twilight band.
export function sinAltitude(latitude, longitude, subsolar) {
  const phi = latitude * DEGREES;
  const delta = subsolar.latitude * DEGREES;
  const hourAngle = (longitude - subsolar.longitude) * DEGREES;
  return (
    Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(hourAngle)
  );
}
