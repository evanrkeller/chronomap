// Position and phase of the moon, from the truncated series in Meeus /
// the Astronomical Almanac. Accurate to well under a degree — a small
// fraction of one map pixel per longitude, and far finer than the icon.

const DEGREES = Math.PI / 180;

function daysSinceJ2000(date) {
  return (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000;
}

function wrapDegrees(angle) {
  return ((angle + 540) % 360) - 180;
}

// Geocentric ecliptic longitude/latitude of the moon, degrees.
function moonEcliptic(n) {
  const meanLongitude = 218.316 + 13.176396 * n;
  const meanAnomaly = (134.963 + 13.064993 * n) * DEGREES;
  const argumentOfLatitude = (93.272 + 13.22935 * n) * DEGREES;
  return {
    longitude: meanLongitude + 6.289 * Math.sin(meanAnomaly),
    latitude: 5.128 * Math.sin(argumentOfLatitude),
  };
}

// Geocentric ecliptic longitude of the sun, degrees.
function sunEclipticLongitude(n) {
  const meanLongitude = 280.46 + 0.9856474 * n;
  const meanAnomaly = (357.528 + 0.9856003 * n) * DEGREES;
  return meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly);
}

// The point on Earth where the moon is directly overhead right now.
export function sublunarPoint(date) {
  const n = daysSinceJ2000(date);
  const ecliptic = moonEcliptic(n);
  const obliquity = (23.439 - 0.0000004 * n) * DEGREES;

  const eclipticLongitude = ecliptic.longitude * DEGREES;
  const eclipticLatitude = ecliptic.latitude * DEGREES;

  const sinDec =
    Math.sin(eclipticLatitude) * Math.cos(obliquity) +
    Math.cos(eclipticLatitude) * Math.sin(obliquity) * Math.sin(eclipticLongitude);
  const declination = Math.asin(sinDec) / DEGREES;
  const rightAscension =
    Math.atan2(
      Math.sin(eclipticLongitude) * Math.cos(obliquity) -
        Math.tan(eclipticLatitude) * Math.sin(obliquity),
      Math.cos(eclipticLongitude),
    ) / DEGREES;

  // Greenwich mean sidereal time, degrees.
  const siderealTime = 280.46061837 + 360.98564736629 * n;

  return {
    latitude: declination,
    longitude: wrapDegrees(rightAscension - siderealTime),
  };
}

// Phase from the sun–moon elongation: fraction of the disc illuminated,
// and whether the moon is waxing (heading toward full).
export function moonPhase(date) {
  const n = daysSinceJ2000(date);
  const elongation = (moonEcliptic(n).longitude - sunEclipticLongitude(n)) * DEGREES;
  return {
    illuminatedFraction: (1 - Math.cos(elongation)) / 2,
    waxing: Math.sin(elongation) > 0,
  };
}
