import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSET_CENTER_LONGITUDE, lonToX, latToY, xToLon, yToLat, mapOrder, imageRollOffset,
} from '../js/geo.js';

const WIDTH = 2048;
const HEIGHT = 1024;
const LEEDS = ASSET_CENTER_LONGITUDE;

test('the committed assets are centered on Leeds, AL', () => {
  assert.ok(Math.abs(ASSET_CENTER_LONGITUDE - -86.5497) < 0.001);
});

test('the center longitude maps to the horizontal center', () => {
  assert.ok(Math.abs(lonToX(LEEDS, WIDTH, LEEDS) - WIDTH / 2) < 1);
  assert.ok(Math.abs(lonToX(77.209, WIDTH, 77.209) - WIDTH / 2) < 1);
});

test('the antimeridian of the center maps to the edges', () => {
  // 93.4503 E is 180 degrees from Leeds — it is both edges of the map.
  const x = lonToX(93.4503, WIDTH, LEEDS);
  assert.ok(x < 1 || x > WIDTH - 1, `expected edge, got ${x}`);
});

test('longitudes wrap into the visible range', () => {
  // 170 W is 83.45 degrees west of the Leeds center: left of middle.
  const x = lonToX(-170, WIDTH, LEEDS);
  assert.ok(x > 0 && x < WIDTH / 2, `expected left half, got ${x}`);
});

test('recentering moves a fixed longitude across the map', () => {
  // Greenwich sits right of a Leeds center, left of a New Delhi center.
  assert.ok(lonToX(0, WIDTH, LEEDS) > WIDTH / 2);
  assert.ok(lonToX(0, WIDTH, 77.209) < WIDTH / 2);
});

test('equator maps to the vertical center', () => {
  assert.equal(latToY(0, HEIGHT), HEIGHT / 2);
});

test('poles map to top and bottom', () => {
  assert.equal(latToY(90, HEIGHT), 0);
  assert.equal(latToY(-90, HEIGHT), HEIGHT);
});

test('xToLon inverts lonToX to within a pixel at any center', () => {
  for (const center of [LEEDS, 0, 77.209, -150]) {
    for (const longitude of [-170, -86.5497, 0, 45, 120]) {
      const roundTripped = xToLon(lonToX(longitude, WIDTH, center), WIDTH, center);
      let error = Math.abs(roundTripped - longitude);
      if (error > 180) error = 360 - error;
      assert.ok(error < 360 / WIDTH, `lon ${longitude} @ center ${center} -> ${roundTripped}`);
    }
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
  const sorted = [...longitudes].sort((a, b) => mapOrder(a, LEEDS) - mapOrder(b, LEEDS));
  assert.deepEqual(sorted, longitudes);
});

test('mapOrder follows the active center', () => {
  // Centered on New Delhi, Brisbane sits east of home, not at the far west edge.
  assert.ok(mapOrder(153.0251, 77.209) > mapOrder(77.209, 77.209));
});

test('London is right of a Leeds center and in the northern half', () => {
  const x = lonToX(-0.1276, WIDTH, LEEDS);
  const y = latToY(51.5072, HEIGHT);
  assert.ok(x > WIDTH / 2, `expected right half, got ${x}`);
  assert.ok(y < HEIGHT / 2, `expected top half, got ${y}`);
});

test('rolling to the asset center needs no offset', () => {
  assert.equal(imageRollOffset(LEEDS, WIDTH), 0);
});

test('rolling to the antipodal center shifts by half the map', () => {
  assert.ok(Math.abs(imageRollOffset(93.4503, WIDTH) - WIDTH / 2) < 1);
});

test('roll offset always lands within [0, width)', () => {
  for (const center of [-180, -86.5497, -10, 0, 77.209, 179.9]) {
    const offset = imageRollOffset(center, WIDTH);
    assert.ok(offset >= 0 && offset < WIDTH, `center ${center} -> ${offset}`);
  }
});

test('a rolled asset places the new center mid-map', () => {
  // Column that Delhi occupies in the Leeds-centered asset, shifted by
  // the roll, must land at the horizontal center of the display.
  const center = 77.209;
  const assetX = lonToX(center, WIDTH, LEEDS);
  const offset = imageRollOffset(center, WIDTH);
  const screenX = (((assetX - offset) % WIDTH) + WIDTH) % WIDTH;
  assert.ok(Math.abs(screenX - WIDTH / 2) < 1, `got ${screenX}`);
});
