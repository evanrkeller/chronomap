import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nightAlpha, SIN_NIGHT_LIMIT } from '../js/terminator.js';

test('daylight is fully transparent', () => {
  assert.equal(nightAlpha(0.5), 0);
  assert.equal(nightAlpha(0), 0);
});

test('deep night is fully opaque', () => {
  assert.equal(nightAlpha(SIN_NIGHT_LIMIT), 1);
  assert.equal(nightAlpha(-0.9), 1);
});

test('twilight blends smoothly and monotonically', () => {
  const midway = nightAlpha(SIN_NIGHT_LIMIT / 2);
  assert.ok(midway > 0.4 && midway < 0.6, `midway ${midway}`);
  let previous = -0.001;
  for (let step = 0; step <= 20; step += 1) {
    const alpha = nightAlpha((SIN_NIGHT_LIMIT * step) / 20);
    assert.ok(alpha >= previous, `alpha not monotonic at step ${step}`);
    previous = alpha;
  }
});
