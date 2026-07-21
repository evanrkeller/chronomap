import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subsolarPoint, sinAltitude } from '../js/solar.js';

// Reference values from standard astronomical tables (NOAA/USNO).

test('declination is near zero at the March 2026 equinox', () => {
  const { latitude } = subsolarPoint(new Date(Date.UTC(2026, 2, 20, 14, 46)));
  assert.ok(Math.abs(latitude) < 0.5, `declination ${latitude}`);
});

test('declination peaks near +23.43 at the June solstice', () => {
  const { latitude } = subsolarPoint(new Date(Date.UTC(2026, 5, 21, 8, 25)));
  assert.ok(Math.abs(latitude - 23.43) < 0.2, `declination ${latitude}`);
});

test('declination bottoms near -23.43 at the December solstice', () => {
  const { latitude } = subsolarPoint(new Date(Date.UTC(2026, 11, 21, 20, 50)));
  assert.ok(Math.abs(latitude + 23.43) < 0.2, `declination ${latitude}`);
});

test('subsolar longitude reflects the equation of time in early November', () => {
  // Nov 3: sun runs ~16.4 min fast, so at 12:00 UTC the subsolar point
  // is ~4.1 degrees west of Greenwich.
  const { longitude } = subsolarPoint(new Date(Date.UTC(2026, 10, 3, 12, 0)));
  assert.ok(Math.abs(longitude - -4.1) < 0.4, `longitude ${longitude}`);
});

test('subsolar longitude reflects the equation of time in mid February', () => {
  // Feb 11: sun runs ~14.2 min slow, so at 12:00 UTC the subsolar point
  // is ~3.6 degrees east of Greenwich.
  const { longitude } = subsolarPoint(new Date(Date.UTC(2026, 1, 11, 12, 0)));
  assert.ok(Math.abs(longitude - 3.6) < 0.4, `longitude ${longitude}`);
});

test('subsolar longitude sweeps 15 degrees west per hour', () => {
  const noon = subsolarPoint(new Date(Date.UTC(2026, 6, 20, 12, 0)));
  const later = subsolarPoint(new Date(Date.UTC(2026, 6, 20, 14, 0)));
  let delta = noon.longitude - later.longitude;
  if (delta < 0) delta += 360;
  assert.ok(Math.abs(delta - 30) < 0.1, `delta ${delta}`);
});

test('the sun is directly overhead at the subsolar point', () => {
  const sub = subsolarPoint(new Date(Date.UTC(2026, 6, 20, 18, 0)));
  assert.ok(sinAltitude(sub.latitude, sub.longitude, sub) > 0.9999);
});

test('the sun is directly underfoot at the antipode', () => {
  const sub = subsolarPoint(new Date(Date.UTC(2026, 6, 20, 18, 0)));
  const antipodeLon = sub.longitude > 0 ? sub.longitude - 180 : sub.longitude + 180;
  assert.ok(sinAltitude(-sub.latitude, antipodeLon, sub) < -0.9999);
});

test('the terminator is 90 degrees from the subsolar point', () => {
  const sub = subsolarPoint(new Date(Date.UTC(2026, 2, 20, 14, 46)));
  // At an equinox the poles sit on the terminator.
  assert.ok(Math.abs(sinAltitude(90, 0, sub)) < 0.01);
});
