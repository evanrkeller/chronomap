// Place lookup via the Open-Meteo Geocoding API — free, keyless, and
// CORS-open, and the response carries the IANA timezone alongside the
// coordinates, so one user-initiated request fills a whole location
// row. Only the settings dialog ever calls this; the display loop
// stays fully offline.
const GEOCODE_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
const RESULT_COUNT = 5;

export function geocodeUrl(query) {
  const url = new URL(GEOCODE_ENDPOINT);
  url.searchParams.set('name', query);
  url.searchParams.set('count', String(RESULT_COUNT));
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');
  return url.toString();
}

// Four decimal places (~11 m) is far below the map's ~50 km pixels.
function round(value) {
  return Math.round(value * 10000) / 10000;
}

// Response entries → candidates the dialog can offer: place name, a
// "region, country" line to disambiguate (Leeds, England vs Leeds,
// Alabama), and the values that fill the form.
export function parseGeocodeResults(json) {
  const results = Array.isArray(json?.results) ? json.results : [];
  const candidates = [];
  for (const result of results) {
    if (typeof result?.latitude !== 'number' || typeof result?.longitude !== 'number') continue;
    if (typeof result.timezone !== 'string' || result.timezone === '') continue;
    candidates.push({
      label: result.name ?? '',
      description: [result.admin1, result.country].filter(Boolean).join(', '),
      lat: round(result.latitude),
      lon: round(result.longitude),
      tz: result.timezone,
    });
  }
  return candidates;
}

export async function lookupPlace(query, fetchFn = fetch) {
  const response = await fetchFn(geocodeUrl(query));
  if (!response.ok) throw new Error(`geocoding failed: ${response.status}`);
  return parseGeocodeResults(await response.json());
}
