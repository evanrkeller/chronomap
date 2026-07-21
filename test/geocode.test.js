import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geocodeUrl, parseGeocodeResults, lookupPlace } from '../js/geocode.js';

const SAMPLE = {
  results: [
    {
      name: 'Leeds', latitude: 53.79648, longitude: -1.54785,
      timezone: 'Europe/London', admin1: 'England', country: 'United Kingdom',
    },
    {
      name: 'Leeds', latitude: 33.54816, longitude: -86.54443,
      timezone: 'America/Chicago', admin1: 'Alabama', country: 'United States',
    },
  ],
};

test('geocode URL targets Open-Meteo with the encoded query', () => {
  const url = new URL(geocodeUrl('São Paulo'));
  assert.equal(url.origin, 'https://geocoding-api.open-meteo.com');
  assert.equal(url.pathname, '/v1/search');
  assert.equal(url.searchParams.get('name'), 'São Paulo');
  assert.equal(url.searchParams.get('count'), '5');
  assert.equal(url.searchParams.get('format'), 'json');
});

test('results map to candidates with rounded coordinates', () => {
  const candidates = parseGeocodeResults(SAMPLE);
  assert.equal(candidates.length, 2);
  assert.deepEqual(candidates[1], {
    label: 'Leeds',
    description: 'Alabama, United States',
    lat: 33.5482,
    lon: -86.5444,
    tz: 'America/Chicago',
  });
});

test('description omits a missing admin region', () => {
  const candidates = parseGeocodeResults({
    results: [{
      name: 'Singapore', latitude: 1.28967, longitude: 103.85007,
      timezone: 'Asia/Singapore', country: 'Singapore',
    }],
  });
  assert.equal(candidates[0].description, 'Singapore');
});

test('entries missing coordinates or timezone are skipped', () => {
  const candidates = parseGeocodeResults({
    results: [
      { name: 'NoTz', latitude: 1, longitude: 2 },
      { name: 'NoCoords', timezone: 'UTC' },
      { name: 'Good', latitude: 1, longitude: 2, timezone: 'UTC', country: 'X' },
    ],
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].label, 'Good');
});

test('entries without a usable name are skipped', () => {
  const candidates = parseGeocodeResults({
    results: [
      { latitude: 1, longitude: 2, timezone: 'UTC', country: 'X' },
      { name: '', latitude: 1, longitude: 2, timezone: 'UTC' },
      { name: 'Kept', latitude: 1, longitude: 2, timezone: 'UTC' },
    ],
  });
  assert.deepEqual(candidates.map((c) => c.label), ['Kept']);
});

test('lookupPlace passes an abort signal for the timeout guard', async () => {
  let options = null;
  const fakeFetch = async (url, opts) => {
    options = opts;
    return { ok: true, json: async () => ({ results: [] }) };
  };
  await lookupPlace('Leeds', fakeFetch);
  assert.ok(options.signal instanceof AbortSignal);
});

test('the timeout guard still works without AbortSignal.timeout', async () => {
  const native = AbortSignal.timeout;
  delete AbortSignal.timeout;
  try {
    let options = null;
    const fakeFetch = async (url, opts) => {
      options = opts;
      return { ok: true, json: async () => ({ results: [] }) };
    };
    await lookupPlace('Leeds', fakeFetch);
    assert.ok(options.signal instanceof AbortSignal, 'fallback signal provided');
  } finally {
    AbortSignal.timeout = native;
  }
});

test('an empty or missing results list parses to no candidates', () => {
  assert.deepEqual(parseGeocodeResults({}), []);
  assert.deepEqual(parseGeocodeResults({ results: [] }), []);
  assert.deepEqual(parseGeocodeResults(null), []);
});

test('lookupPlace fetches the query URL and returns candidates', async () => {
  let requested = null;
  const fakeFetch = async (url) => {
    requested = url;
    return { ok: true, json: async () => SAMPLE };
  };
  const candidates = await lookupPlace('Leeds', fakeFetch);
  assert.ok(requested.includes('name=Leeds'));
  assert.equal(candidates.length, 2);
});

test('lookupPlace throws on a non-OK response', async () => {
  const fakeFetch = async () => ({ ok: false, status: 500 });
  await assert.rejects(() => lookupPlace('Leeds', fakeFetch));
});
