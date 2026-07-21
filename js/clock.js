// Local-time display for the scoreboard, backed by the browser's own
// IANA timezone data via Intl — no timezone tables to maintain.

const formatterCache = new Map();

function formatterFor(timeZone) {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      weekday: 'short',
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function formatCityTime(date, timeZone) {
  const parts = formatterFor(timeZone).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    time: `${get('hour')}:${get('minute')} ${get('dayPeriod')}`,
    weekday: get('weekday'),
  };
}

const dateKeyFormatterCache = new Map();

// A key that changes when the local calendar date changes, for spotting
// cities living in tomorrow (or yesterday) relative to home.
export function localDateKey(date, timeZone) {
  let formatter = dateKeyFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dateKeyFormatterCache.set(timeZone, formatter);
  }
  return formatter.format(date);
}
