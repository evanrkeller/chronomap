import { test } from 'node:test';
import assert from 'node:assert/strict';
import { msUntilDailyReload, RELOAD_HOUR } from '../js/kiosk.js';

// Dates below are constructed in the machine's local timezone, matching
// how the kiosk computes its reload time.

test('reload hour is in the dead of night', () => {
  assert.ok(RELOAD_HOUR >= 0 && RELOAD_HOUR <= 5);
});

test('an evening clock waits until the small hours', () => {
  const evening = new Date(2026, 6, 20, 22, 0, 0);
  const delay = msUntilDailyReload(evening);
  const firesAt = new Date(evening.getTime() + delay);
  assert.equal(firesAt.getHours(), RELOAD_HOUR);
  assert.equal(firesAt.getDate(), 21);
});

test('just after the reload hour it waits nearly a full day', () => {
  const justAfter = new Date(2026, 6, 20, RELOAD_HOUR, 0, 1);
  const delay = msUntilDailyReload(justAfter);
  assert.ok(delay > 23.9 * 3600 * 1000 && delay <= 24 * 3600 * 1000);
});

test('the delay is always positive', () => {
  for (const hour of [0, 1, RELOAD_HOUR, 12, 23]) {
    const delay = msUntilDailyReload(new Date(2026, 6, 20, hour, 30));
    assert.ok(delay > 0, `hour ${hour} gave ${delay}`);
  }
});
