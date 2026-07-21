import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sublunarPoint, moonPhase } from '../js/moon.js';
import { subsolarPoint } from '../js/solar.js';

// New moon 2026-07-14 ~19h UT and full moon 2026-07-29 ~13h UT, derived
// from the J2000 lunation epoch (2000-01-06 18:14 UT) plus 328 and
// 328.5 synodic months.
const NEW_MOON = new Date(Date.UTC(2026, 6, 14, 19, 0));
const FULL_MOON = new Date(Date.UTC(2026, 6, 29, 13, 0));

test('the disc is dark at new moon and lit at full moon', () => {
  assert.ok(moonPhase(NEW_MOON).illuminatedFraction < 0.05);
  assert.ok(moonPhase(FULL_MOON).illuminatedFraction > 0.95);
});

test('the moon waxes after new and wanes after full', () => {
  const threeDays = 3 * 86400000;
  assert.equal(moonPhase(new Date(NEW_MOON.getTime() + threeDays)).waxing, true);
  assert.equal(moonPhase(new Date(FULL_MOON.getTime() + threeDays)).waxing, false);
});

test('a full moon stands roughly opposite the sun', () => {
  const moon = sublunarPoint(FULL_MOON);
  const sun = subsolarPoint(FULL_MOON);
  let separation = Math.abs(moon.longitude - (sun.longitude + 180));
  separation = Math.min(separation % 360, 360 - (separation % 360));
  assert.ok(separation < 15, `separation ${separation}`);
});

test('the sublunar latitude stays within the moon\'s declination range', () => {
  for (let day = 0; day < 28; day += 1) {
    const { latitude } = sublunarPoint(new Date(Date.UTC(2026, 6, 1 + day)));
    assert.ok(Math.abs(latitude) < 29, `day ${day}: ${latitude}`);
  }
});

test('the sublunar point circles the globe about once a day', () => {
  const at = (h) => sublunarPoint(new Date(Date.UTC(2026, 6, 20, h))).longitude;
  let delta = at(12) - at(18);
  if (delta < 0) delta += 360;
  // ~6 hours of rotation minus the moon's own orbital motion: ~87 degrees.
  assert.ok(delta > 80 && delta < 95, `delta ${delta}`);
});
