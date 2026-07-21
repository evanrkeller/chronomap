import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CENTER_LONGITUDE, lonToX, latToY, xToLon, yToLat, mapOrder } from '../js/geo.js';

const WIDTH = 2048;
const HEIGHT = 1024;

test('center meridian is Leeds, AL', () => {
  assert.ok(Math.abs(CENTER_LONGITUDE - -86.5497) < 0.001);
});

test('Leeds, AL longitude maps to the horizontal center', () => {
  assert.ok(Math.abs(lonToX(-86.5497, WIDTH) - WIDTH / 2) < 1);
});

test('the antimeridian of Leeds maps to the edges', () => {
  // 93.4503 E is 180 degrees from the center — it is both edges of the map.
  const x = lonToX(93.4503, WIDTH);
  assert.ok(x < 1 || x > WIDTH - 1, `expected edge, got ${x}`);
});

test('longitudes wrap into the visible range', () => {
  // 170 W is 83.45 degrees west of center: left of middle, on the map.
  const x = lonToX(-170, WIDTH);
  assert.ok(x > 0 && x < WIDTH / 2, `expected left half, got ${x}`);
});

test('equator maps to the vertical center', () => {
  assert.equal(latToY(0, HEIGHT), HEIGHT / 2);
});

test('poles map to top and bottom', () => {
  assert.equal(latToY(90, HEIGHT), 0);
  assert.equal(latToY(-90, HEIGHT), HEIGHT);
});

test('xToLon inverts lonToX to within a pixel', () => {
  for (const longitude of [-170, -86.5497, 0, 45, 120]) {
    const roundTripped = xToLon(lonToX(longitude, WIDTH), WIDTH);
    let error = Math.abs(roundTripped - longitude);
    if (error > 180) error = 360 - error;
    assert.ok(error < 360 / WIDTH, `lon ${longitude} round-tripped to ${roundTripped}`);
  }
});

test('yToLat inverts latToY to within a pixel', () => {
  for (const latitude of [-60, 0, 33.5465, 80]) {
    const roundTripped = yToLat(latToY(latitude, HEIGHT), HEIGHT);
    assert.ok(Math.abs(roundTripped - latitude) < 180 / HEIGHT);
  }
});

test('mapOrder sorts cities west to east as drawn on the map', () => {
  // Brisbane, Leeds, Cincinnati, Greenwich (UTC), Istanbul, India.
  const longitudes = [153.0251, -86.5497, -84.512, 0, 28.9784, 77.59];
  const sorted = [...longitudes].sort((a, b) => mapOrder(a) - mapOrder(b));
  assert.deepEqual(sorted, longitudes);
});

test('London is right of center and in the northern half', () => {
  const x = lonToX(-0.1276, WIDTH);
  const y = latToY(51.5072, HEIGHT);
  assert.ok(x > WIDTH / 2, `expected right half, got ${x}`);
  assert.ok(y < HEIGHT / 2, `expected top half, got ${y}`);
});
