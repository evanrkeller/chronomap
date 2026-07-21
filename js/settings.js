// User settings persisted in localStorage — pure logic, no DOM. The
// display must survive anything found in storage: corrupt JSON, stale
// schemas, or hand-edited values all fall back to the built-in defaults
// rather than stranding the kiosk.
export const SETTINGS_KEY = 'chronomap.settings.v1';

const DEFAULT_HOME_LABEL = 'Home';

export const MAX_ADDITIONAL_LOCATIONS = 4;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || timeZone.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

// Human-readable problems with a location entry; empty array = valid.
export function validateLocation({ lat, lon, tz } = {}) {
  const errors = [];
  if (!isFiniteNumber(lat) || lat < -90 || lat > 90) {
    errors.push('Latitude must be a number between -90 and 90.');
  }
  if (!isFiniteNumber(lon) || lon < -180 || lon > 180) {
    errors.push('Longitude must be a number between -180 and 180.');
  }
  if (!isValidTimeZone(tz)) {
    errors.push('Time zone must be a valid IANA name like America/Chicago.');
  }
  return errors;
}

export function loadSettings(storage) {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSettings(storage, settings) {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Map centering mode: the map keeps home mid-screen ('home') or keeps
// the subsolar longitude mid-screen so the imagery rolls beneath a
// fixed day-night outline ('sun'). Anything unrecognized means home.
export function mapMode(settings) {
  return settings?.mode === 'sun' ? 'sun' : 'home';
}

function displayName(location, fallback) {
  return typeof location.label === 'string' && location.label.trim() !== ''
    ? location.label.trim()
    : fallback;
}

function asCity(location, fallback, home = false) {
  const city = {
    name: displayName(location, fallback),
    lat: location.lat,
    lon: location.lon,
    tz: location.tz,
  };
  if (home) city.home = true;
  return city;
}

// The city list the display actually renders. The built-in defaults
// stand until the user configures something: a valid stored home
// replaces the default home entry, and once a curated `locations` list
// exists it replaces the default extras entirely — home and UTC are
// always kept, giving at most six scoreboard entries.
export function effectiveCities(defaults, settings) {
  const storedHome = settings?.home;
  const homeIsValid = storedHome && validateLocation(storedHome).length === 0;
  const homeCity = homeIsValid
    ? asCity(storedHome, DEFAULT_HOME_LABEL, true)
    : defaults.find((city) => city.home);

  if (!Array.isArray(settings?.locations)) {
    return homeIsValid
      ? defaults.map((city) => (city.home ? homeCity : city))
      : defaults;
  }

  const utc = defaults.find((city) => city.lat === undefined && city.lon === undefined)
    ?? { name: 'UTC', tz: 'UTC' };
  const extras = settings.locations
    .filter((location) => location && typeof location === 'object'
      && validateLocation(location).length === 0)
    .slice(0, MAX_ADDITIONAL_LOCATIONS)
    .map((location) => asCity(location, `${location.lat}, ${location.lon}`));

  return [homeCity, utc, ...extras].filter(Boolean);
}
