// User settings persisted in localStorage — pure logic, no DOM. The
// display must survive anything found in storage: corrupt JSON, stale
// schemas, or hand-edited values all fall back to the built-in defaults
// rather than stranding the kiosk.
export const SETTINGS_KEY = 'chronomap.settings.v1';

const DEFAULT_HOME_LABEL = 'Home';

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

// The city list the display actually renders: the built-in defaults
// with any valid user home swapped in for the default home entry.
export function effectiveCities(defaults, settings) {
  const home = settings?.home;
  if (!home || validateLocation(home).length > 0) return defaults;
  const userHome = {
    name: typeof home.label === 'string' && home.label.trim() !== ''
      ? home.label.trim()
      : DEFAULT_HOME_LABEL,
    lat: home.lat,
    lon: home.lon,
    tz: home.tz,
    home: true,
  };
  return defaults.map((city) => (city.home ? userHome : city));
}
