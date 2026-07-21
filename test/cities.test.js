import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cities = JSON.parse(
  readFileSync(new URL('../config/cities.json', import.meta.url), 'utf8'),
);

test('there is at least one city and Leeds is first (home)', () => {
  assert.ok(cities.length >= 1);
  assert.equal(cities[0].name, 'Leeds');
});

test('every city has a name, valid coordinates, and a real IANA timezone', () => {
  for (const city of cities) {
    assert.ok(typeof city.name === 'string' && city.name.length > 0);
    assert.ok(city.lat >= -90 && city.lat <= 90, `${city.name} lat`);
    assert.ok(city.lon >= -180 && city.lon <= 180, `${city.name} lon`);
    // Throws RangeError for unknown timezone identifiers.
    new Intl.DateTimeFormat('en-US', { timeZone: city.tz });
  }
});

test('city names are unique', () => {
  const names = new Set(cities.map((city) => city.name));
  assert.equal(names.size, cities.length);
});
