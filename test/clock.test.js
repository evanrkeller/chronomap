import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCityTime, localDateKey } from '../js/clock.js';

// 2026-07-21 03:20 UTC: the evening of Monday July 20 in the US,
// already Tuesday July 21 in Tokyo.
const instant = new Date(Date.UTC(2026, 6, 21, 3, 20));

test('formats Central time as h:mm AM/PM with weekday', () => {
  const { time, weekday } = formatCityTime(instant, 'America/Chicago');
  assert.equal(time, '10:20 PM');
  assert.equal(weekday, 'Mon');
});

test('formats Tokyo time across the date line', () => {
  const { time, weekday } = formatCityTime(instant, 'Asia/Tokyo');
  assert.equal(time, '12:20 PM');
  assert.equal(weekday, 'Tue');
});

test('localDateKey distinguishes cities on different calendar days', () => {
  assert.notEqual(localDateKey(instant, 'Asia/Tokyo'), localDateKey(instant, 'America/Chicago'));
  assert.equal(localDateKey(instant, 'America/New_York'), localDateKey(instant, 'America/Chicago'));
});
