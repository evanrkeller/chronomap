import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SETTINGS_KEY,
  validateLocation,
  loadSettings,
  saveSettings,
  effectiveCities,
} from '../js/settings.js';

const DEFAULTS = [
  { name: 'Brisbane', lat: -27.4698, lon: 153.0251, tz: 'Australia/Brisbane' },
  { name: 'Leeds', lat: 33.5465, lon: -86.5497, tz: 'America/Chicago', home: true },
  { name: 'UTC', tz: 'UTC' },
];

function fakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
  };
}

test('a valid location passes validation', () => {
  const errors = validateLocation({
    label: 'Leeds', lat: 33.5465, lon: -86.5497, tz: 'America/Chicago',
  });
  assert.deepEqual(errors, []);
});

test('latitude outside [-90, 90] is rejected', () => {
  assert.ok(validateLocation({ lat: 91, lon: 0, tz: 'UTC' }).length > 0);
  assert.ok(validateLocation({ lat: -90.1, lon: 0, tz: 'UTC' }).length > 0);
});

test('longitude outside [-180, 180] is rejected', () => {
  assert.ok(validateLocation({ lat: 0, lon: 181, tz: 'UTC' }).length > 0);
  assert.ok(validateLocation({ lat: 0, lon: -180.5, tz: 'UTC' }).length > 0);
});

test('non-numeric coordinates are rejected', () => {
  assert.ok(validateLocation({ lat: 'abc', lon: 0, tz: 'UTC' }).length > 0);
  assert.ok(validateLocation({ lat: 0, lon: NaN, tz: 'UTC' }).length > 0);
});

test('an unknown timezone is rejected', () => {
  assert.ok(validateLocation({ lat: 0, lon: 0, tz: 'Mars/Olympus_Mons' }).length > 0);
  assert.ok(validateLocation({ lat: 0, lon: 0, tz: '' }).length > 0);
});

test('settings round-trip through storage', () => {
  const storage = fakeStorage();
  const settings = {
    home: { label: 'HQ', lat: 40.7, lon: -74.0, tz: 'America/New_York' },
  };
  saveSettings(storage, settings);
  assert.deepEqual(loadSettings(storage), settings);
});

test('missing settings load as null', () => {
  assert.equal(loadSettings(fakeStorage()), null);
});

test('corrupt stored JSON loads as null, never throws', () => {
  const storage = fakeStorage({ [SETTINGS_KEY]: '{not json' });
  assert.equal(loadSettings(storage), null);
});

test('non-object stored value loads as null', () => {
  const storage = fakeStorage({ [SETTINGS_KEY]: '"a string"' });
  assert.equal(loadSettings(storage), null);
});

test('a storage that throws loads as null', () => {
  const storage = {
    getItem: () => { throw new Error('quota'); },
  };
  assert.equal(loadSettings(storage), null);
});

test('with no settings the defaults pass through untouched', () => {
  assert.deepEqual(effectiveCities(DEFAULTS, null), DEFAULTS);
});

test('a configured home replaces the default home entry', () => {
  const cities = effectiveCities(DEFAULTS, {
    home: { label: 'Chicago', lat: 41.8781, lon: -87.6298, tz: 'America/Chicago' },
  });
  const homes = cities.filter((city) => city.home);
  assert.equal(homes.length, 1);
  assert.equal(homes[0].name, 'Chicago');
  assert.equal(homes[0].lat, 41.8781);
  assert.equal(homes[0].lon, -87.6298);
  assert.ok(cities.some((city) => city.name === 'Brisbane'), 'other defaults kept');
  assert.ok(!cities.some((city) => city.name === 'Leeds'), 'default home replaced');
});

test('a home with no label is called Home', () => {
  const cities = effectiveCities(DEFAULTS, {
    home: { lat: 51.5, lon: -0.13, tz: 'Europe/London' },
  });
  assert.equal(cities.find((city) => city.home).name, 'Home');
});

test('an invalid stored home is ignored, defaults stand', () => {
  const cities = effectiveCities(DEFAULTS, {
    home: { lat: 999, lon: 0, tz: 'UTC' },
  });
  assert.equal(cities.find((city) => city.home).name, 'Leeds');
});
