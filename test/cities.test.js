import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cities = JSON.parse(
  readFileSync(new URL('../config/cities.json', import.meta.url), 'utf8'),
);

test('exactly one home city exists and it is Leeds', () => {
  const homes = cities.filter((city) => city.home);
  assert.equal(homes.length, 1);
  assert.equal(homes[0].name, 'Leeds');
});

test('a UTC card is configured, scoreboard-only (no coordinates)', () => {
  const utc = cities.find((city) => city.name === 'UTC');
  assert.ok(utc, 'UTC entry missing');
  assert.equal(utc.tz, 'UTC');
  assert.equal(utc.lat, undefined);
  assert.equal(utc.lon, undefined);
});

test('every city has a name and a real IANA timezone', () => {
  for (const city of cities) {
    assert.ok(typeof city.name === 'string' && city.name.length > 0);
    // Throws RangeError for unknown timezone identifiers.
    new Intl.DateTimeFormat('en-US', { timeZone: city.tz });
  }
});

test('entries with coordinates have valid ones', () => {
  for (const city of cities) {
    if (city.lat === undefined && city.lon === undefined) continue;
    assert.ok(city.lat >= -90 && city.lat <= 90, `${city.name} lat`);
    assert.ok(city.lon >= -180 && city.lon <= 180, `${city.name} lon`);
  }
});

test('city names are unique', () => {
  const names = new Set(cities.map((city) => city.name));
  assert.equal(names.size, cities.length);
});
